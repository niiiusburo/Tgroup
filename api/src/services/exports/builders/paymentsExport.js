'use strict';

const { query } = require('../../../db');
const { createWorkbook, populateDataSheet, populateSummarySheet, toVNDate } = require('../exportWorkbook');

const MAX_ROWS = 100_000;

const COLUMNS = [
  { key: 'referenceCode', header: 'Mã phiếu thu', width: 16 },
  { key: 'paymentDate', header: 'Ngày thanh toán', width: 16, style: 'date' },
  { key: 'customerCode', header: 'Mã KH', width: 12 },
  { key: 'customerName', header: 'Khách hàng', width: 24 },
  { key: 'customerPhone', header: 'SĐT', width: 14 },
  { key: 'amount', header: 'Số tiền', width: 16, style: 'vnd' },
  { key: 'cashAmount', header: 'Tiền mặt', width: 16, style: 'vnd' },
  { key: 'bankAmount', header: 'Chuyển khoản', width: 16, style: 'vnd' },
  { key: 'depositUsed', header: 'Đặt cọc', width: 16, style: 'vnd' },
  { key: 'method', header: 'Phương thức', width: 14 },
  { key: 'status', header: 'Trạng thái', width: 12 },
  { key: 'saleOrderName', header: 'Số phiếu điều trị', width: 18 },
  { key: 'notes', header: 'Nội dung', width: 28 },
  { key: 'companyName', header: 'Chi nhánh', width: 20 },
];

const METHOD_LABELS = {
  cash: 'Tiền mặt',
  bank: 'Chuyển khoản',
  bank_transfer: 'Chuyển khoản',
  card: 'Thẻ',
  deposit: 'Cọc',
  momo: 'MoMo',
  vnpay: 'VNPay',
  zalopay: 'ZaloPay',
};

const STATUS_LABELS = {
  posted: 'Đã ghi sổ',
  draft: 'Nháp',
  voided: 'Đã hủy',
  cancelled: 'Đã hủy',
};

function buildWhere(filters) {
  const conditions = ['1=1'];
  const params = [];
  let idx = 1;

  if (filters.dateFrom) {
    conditions.push(`p.payment_date >= $${idx}`);
    params.push(filters.dateFrom);
    idx++;
  }

  if (filters.dateTo) {
    conditions.push(`p.payment_date <= $${idx}`);
    params.push(filters.dateTo);
    idx++;
  }

  if (filters.search) {
    conditions.push(
      `(p.reference_code ILIKE $${idx} OR pr.name ILIKE $${idx} OR pr.phone ILIKE $${idx})`
    );
    params.push(`%${filters.search}%`);
    idx++;
  }

  if (filters.status) {
    conditions.push(`p.status = $${idx}`);
    params.push(filters.status);
    idx++;
  }

  // Company filter via service_id -> saleorders
  if (filters.companyId && filters.companyId !== 'all') {
    conditions.push(`(so.companyid = $${idx} OR (so.id IS NULL AND pr.companyid = $${idx}))`);
    params.push(filters.companyId);
    idx++;
  }

  return { where: conditions.join(' AND '), params, nextIdx: idx };
}

async function getRows(filters) {
  const { where, params } = buildWhere(filters);
  const sql = `
    SELECT
      p.id,
      p.reference_code,
      p.payment_date,
      p.created_at,
      p.amount,
      p.notes,
      p.status,
      p.method,
      p.cash_amount,
      p.bank_amount,
      p.deposit_used,
      pr.ref AS partnercode,
      pr.name AS partnername,
      pr.displayname AS partnerdisplayname,
      pr.phone AS partnerphone,
      c.name AS companyname,
      COALESCE(
        (SELECT STRING_AGG(DISTINCT COALESCE(NULLIF(so2.code, ''), so2.name), ', ')
         FROM payment_allocations pa
         JOIN saleorders so2 ON so2.id = pa.invoice_id
         WHERE pa.payment_id = p.id),
        COALESCE(NULLIF(so.code, ''), so.name)
      ) AS saleordername
    FROM payments p
    LEFT JOIN partners pr ON pr.id = p.customer_id
    LEFT JOIN saleorders so ON so.id = p.service_id
    LEFT JOIN companies c ON c.id = COALESCE(so.companyid, pr.companyid)
    WHERE ${where}
    ORDER BY p.payment_date DESC NULLS LAST, p.created_at DESC NULLS LAST
    LIMIT ${MAX_ROWS + 1}
  `;
  return query(sql, params);
}

async function getSummary(filters) {
  const { where, params } = buildWhere(filters);
  const sql = `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE p.status = 'posted') AS posted_count,
      COUNT(*) FILTER (WHERE p.status = 'voided') AS voided_count,
      COUNT(*) FILTER (WHERE p.status = 'draft') AS draft_count,
      COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'posted'), 0) AS total_amount
    FROM payments p
    LEFT JOIN partners pr ON pr.id = p.customer_id
    LEFT JOIN saleorders so ON so.id = p.service_id
    WHERE ${where}
  `;
  const rows = await query(sql, params);
  return rows[0];
}

async function preview(filters, user) {
  const summary = await getSummary(filters);
  const total = parseInt(summary.total, 10);
  return {
    rowCount: total,
    summary: [
      { label: 'Tổng phiếu thu', value: total },
      { label: 'Đã ghi sổ', value: parseInt(summary.posted_count, 10) },
      { label: 'Đã hủy', value: parseInt(summary.voided_count, 10) },
      { label: 'Nháp', value: parseInt(summary.draft_count, 10) },
      { label: 'Tổng tiền (đã ghi sổ)', value: parseFloat(summary.total_amount) },
    ],
    exceedsMax: total > MAX_ROWS,
  };
}

async function build(filters, user) {
  const [rows, summary] = await Promise.all([
    getRows(filters),
    getSummary(filters),
  ]);

  if (rows.length > MAX_ROWS) {
    const err = new Error(`Kết quả vượt quá ${MAX_ROWS.toLocaleString('vi-VN')} dòng. Vui lòng thu hẹp bộ lọc.`);
    err.code = 'EXPORT_ROW_LIMIT_EXCEEDED';
    throw err;
  }

  const workbook = createWorkbook('Danh sách thanh toán', {
    exportedBy: user?.name || user?.email || '',
    filters: [
      { label: 'Tìm kiếm', value: filters.search || 'Tất cả' },
      { label: 'Chi nhánh', value: filters.companyId === 'all' ? 'Tất cả' : filters.companyId },
      { label: 'Từ ngày', value: filters.dateFrom || 'Tất cả' },
      { label: 'Đến ngày', value: filters.dateTo || 'Tất cả' },
      { label: 'Trạng thái', value: filters.status ? STATUS_LABELS[filters.status] || filters.status : 'Tất cả' },
    ],
  });

  const dataRows = rows.map((r) => ({
    referenceCode: r.reference_code || '',
    paymentDate: r.payment_date ? toVNDate(r.payment_date) : r.created_at ? toVNDate(r.created_at) : null,
    customerCode: r.partnercode || '',
    customerName: r.partnerdisplayname || r.partnername || '',
    customerPhone: r.partnerphone || '',
    amount: parseFloat(r.amount || 0),
    cashAmount: parseFloat(r.cash_amount || 0),
    bankAmount: parseFloat(r.bank_amount || 0),
    depositUsed: parseFloat(r.deposit_used || 0),
    method: METHOD_LABELS[r.method?.toLowerCase()] || r.method || 'Tiền mặt',
    status: STATUS_LABELS[r.status] || r.status || '',
    saleOrderName: r.saleordername || '',
    notes: r.notes || '',
    companyName: r.companyname || '',
  }));

  populateDataSheet(workbook.getWorksheet('Data'), COLUMNS, dataRows);

  populateSummarySheet(workbook.getWorksheet('Summary'), [
    { label: 'Tổng phiếu thu', value: parseInt(summary.total, 10) },
    { label: 'Đã ghi sổ', value: parseInt(summary.posted_count, 10) },
    { label: 'Đã hủy', value: parseInt(summary.voided_count, 10) },
    { label: 'Nháp', value: parseInt(summary.draft_count, 10) },
    { label: 'Tổng tiền (đã ghi sổ)', value: parseFloat(summary.total_amount) },
  ]);

  return { workbook, rowCount: dataRows.length };
}

module.exports = { preview, build };
