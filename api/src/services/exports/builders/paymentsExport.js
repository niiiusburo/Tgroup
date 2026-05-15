'use strict';

const { query } = require('../../../db');
const { toVNDate } = require('../exportWorkbook');
const { createExportBuilder, MAX_ROWS } = require('../exportBuilder');

const COLUMNS = [
  { key: 'referenceCode', header: 'Mã phiếu thu', width: 16 },
  { key: 'paymentDate', header: 'Ngày thanh toán', width: 16, style: 'date' },
  { key: 'createdAt', header: 'Giờ tạo', width: 18, style: 'datetime' },
  { key: 'customerCode', header: 'Mã KH', width: 12 },
  { key: 'customerName', header: 'Khách hàng', width: 24 },
  { key: 'customerPhone', header: 'SĐT', width: 14 },
  { key: 'amount', header: 'Số tiền', width: 16, style: 'vnd' },
  { key: 'cashAmount', header: 'Tiền mặt', width: 14, style: 'vnd' },
  { key: 'bankAmount', header: 'Chuyển khoản', width: 14, style: 'vnd' },
  { key: 'depositUsed', header: 'Dùng đặt cọc', width: 14, style: 'vnd' },
  { key: 'method', header: 'Phương thức', width: 14 },
  { key: 'paymentCategory', header: 'Loại phiếu', width: 14 },
  { key: 'depositType', header: 'Loại đặt cọc', width: 14 },
  { key: 'receiptNumber', header: 'Số biên nhận', width: 18 },
  { key: 'status', header: 'Trạng thái', width: 12 },
  { key: 'saleOrderName', header: 'Số phiếu điều trị', width: 18 },
  { key: 'doctorName', header: 'Bác sĩ', width: 18 },
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

const CATEGORY_LABELS = {
  payment: 'Thanh toán',
  deposit: 'Đặt cọc',
};

const DEPOSIT_TYPE_LABELS = {
  deposit: 'Nạp đặt cọc',
  refund: 'Hoàn đặt cọc',
  usage: 'Dùng đặt cọc',
};

function isDepositExport(filters) {
  return filters.paymentCategory === 'deposit';
}

function buildWhere(filters) {
  const conditions = ['1=1'];
  const params = [];
  let idx = 1;

  if (filters.dateFrom) {
    conditions.push(`COALESCE(p.payment_date, p.created_at::date) >= $${idx}`);
    params.push(filters.dateFrom);
    idx++;
  }

  if (filters.dateTo) {
    conditions.push(`COALESCE(p.payment_date, p.created_at::date) <= $${idx}`);
    params.push(filters.dateTo);
    idx++;
  }

  if (filters.timeFrom) {
    conditions.push(`COALESCE(p.created_at::time, TIME '00:00') >= $${idx}::time`);
    params.push(filters.timeFrom);
    idx++;
  }

  if (filters.timeTo) {
    conditions.push(`COALESCE(p.created_at::time, TIME '23:59:59') <= $${idx}::time`);
    params.push(filters.timeTo);
    idx++;
  }

  if (filters.search) {
    conditions.push(
      `(p.reference_code ILIKE $${idx} OR p.receipt_number ILIKE $${idx} OR p.notes ILIKE $${idx} OR pr.name ILIKE $${idx} OR pr.phone ILIKE $${idx} OR pr.ref ILIKE $${idx})`
    );
    params.push(`%${filters.search}%`);
    idx++;
  }

  if (filters.status) {
    conditions.push(`p.status = $${idx}`);
    params.push(filters.status);
    idx++;
  }

  if (filters.paymentCategory === 'payment') {
    conditions.push(`COALESCE(p.payment_category, 'payment') = 'payment'`);
  } else if (filters.paymentCategory === 'deposit' && filters.depositType !== 'usage') {
    conditions.push(`p.payment_category = 'deposit'`);
  }

  if (filters.depositType) {
    conditions.push(`p.deposit_type = $${idx}`);
    params.push(filters.depositType);
    idx++;
  }

  // Company filter via direct service, allocation invoice, or customer branch.
  if (filters.companyId && filters.companyId !== 'all') {
    conditions.push(`(
      so.companyid = $${idx}
      OR EXISTS (
        SELECT 1
        FROM payment_allocations company_pa
        JOIN saleorders company_so ON company_so.id = company_pa.invoice_id
        WHERE company_pa.payment_id = p.id
          AND company_so.companyid = $${idx}
      )
      OR (so.id IS NULL AND pr.companyid = $${idx})
    )`);
    params.push(filters.companyId);
    idx++;
  }

  if (filters.doctorId) {
    conditions.push(`(
      so.doctorid = $${idx}
      OR EXISTS (
        SELECT 1
        FROM payment_allocations doctor_pa
        JOIN saleorders doctor_so ON doctor_so.id = doctor_pa.invoice_id
        WHERE doctor_pa.payment_id = p.id
          AND doctor_so.doctorid = $${idx}
      )
    )`);
    params.push(filters.doctorId);
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
      p.receipt_number,
      p.deposit_type,
      p.payment_category,
      pr.ref AS partnercode,
      pr.name AS partnername,
      pr.displayname AS partnerdisplayname,
      pr.phone AS partnerphone,
      COALESCE(c.name, alloc_doc.companyname) AS companyname,
      COALESCE(so.name, alloc_doc.saleordername) AS saleordername,
      direct_doc.name AS direct_doctorname,
      alloc_doc.name AS allocation_doctorname
    FROM payments p
    LEFT JOIN partners pr ON pr.id = p.customer_id
    LEFT JOIN saleorders so ON so.id = p.service_id
    LEFT JOIN employees direct_doc ON direct_doc.id = so.doctorid
    LEFT JOIN LATERAL (
      SELECT doc.name
        , so_doc.name AS saleordername
        , company_doc.name AS companyname
      FROM payment_allocations pa_doc
      JOIN saleorders so_doc ON so_doc.id = pa_doc.invoice_id
      LEFT JOIN employees doc ON doc.id = so_doc.doctorid
      LEFT JOIN companies company_doc ON company_doc.id = so_doc.companyid
      WHERE pa_doc.payment_id = p.id
      ORDER BY doc.name NULLS LAST
      LIMIT 1
    ) alloc_doc ON TRUE
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
      COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'posted'), 0) AS total_amount,
      COALESCE(SUM(p.cash_amount) FILTER (WHERE p.status = 'posted'), 0) AS cash_amount,
      COALESCE(SUM(p.bank_amount) FILTER (WHERE p.status = 'posted'), 0) AS bank_amount,
      COALESCE(SUM(p.deposit_used) FILTER (WHERE p.status = 'posted'), 0) AS deposit_used
    FROM payments p
    LEFT JOIN partners pr ON pr.id = p.customer_id
    LEFT JOIN saleorders so ON so.id = p.service_id
    WHERE ${where}
  `;
  const rows = await query(sql, params);
  return rows[0];
}

function toDataRow(r) {
  return {
    referenceCode: r.reference_code || '',
    paymentDate: r.payment_date ? toVNDate(r.payment_date) : r.created_at ? toVNDate(r.created_at) : null,
    createdAt: r.created_at ? toVNDate(r.created_at) : null,
    customerCode: r.partnercode || '',
    customerName: r.partnerdisplayname || r.partnername || '',
    customerPhone: r.partnerphone || '',
    amount: parseFloat(r.amount || 0),
    cashAmount: parseFloat(r.cash_amount || 0),
    bankAmount: parseFloat(r.bank_amount || 0),
    depositUsed: parseFloat(r.deposit_used || 0),
    method: METHOD_LABELS[r.method?.toLowerCase()] || r.method || 'Tiền mặt',
    paymentCategory: CATEGORY_LABELS[r.payment_category] || r.payment_category || '',
    depositType: DEPOSIT_TYPE_LABELS[r.deposit_type] || r.deposit_type || '',
    receiptNumber: r.receipt_number || '',
    status: STATUS_LABELS[r.status] || r.status || '',
    saleOrderName: r.saleordername || '',
    doctorName: r.direct_doctorname || r.allocation_doctorname || '',
    notes: r.notes || '',
    companyName: r.companyname || '',
  };
}

function getWorkbookLabel(filters) {
  return isDepositExport(filters) ? 'Danh sách đặt cọc' : 'Danh sách thanh toán';
}

function getFilterMeta(filters) {
  return [
    { label: 'Tìm kiếm', value: filters.search || 'Tất cả' },
    { label: 'Chi nhánh', value: filters.companyId === 'all' ? 'Tất cả' : filters.companyId },
    { label: 'Từ ngày', value: filters.dateFrom || 'Tất cả' },
    { label: 'Đến ngày', value: filters.dateTo || 'Tất cả' },
    { label: 'Từ giờ tạo', value: filters.timeFrom || 'Tất cả' },
    { label: 'Đến giờ tạo', value: filters.timeTo || 'Tất cả' },
    { label: 'Bác sĩ', value: filters.doctorId || 'Tất cả' },
    { label: 'Loại phiếu', value: CATEGORY_LABELS[filters.paymentCategory] || filters.paymentCategory || 'Tất cả' },
    { label: 'Loại đặt cọc', value: filters.depositType ? DEPOSIT_TYPE_LABELS[filters.depositType] || filters.depositType : 'Tất cả' },
    { label: 'Trạng thái', value: filters.status ? STATUS_LABELS[filters.status] || filters.status : 'Tất cả' },
  ];
}

function getSummaryRows(summary) {
  const label = isDepositExport(summary) ? 'Tổng phiếu đặt cọc' : 'Tổng phiếu thu';
  return [
    { label, value: parseInt(summary.total, 10) },
    { label: 'Đã ghi sổ', value: parseInt(summary.posted_count, 10) },
    { label: 'Đã hủy', value: parseInt(summary.voided_count, 10) },
    { label: 'Nháp', value: parseInt(summary.draft_count, 10) },
    { label: 'Tổng tiền (đã ghi sổ)', value: parseFloat(summary.total_amount) },
    { label: 'Tiền mặt', value: parseFloat(summary.cash_amount) },
    { label: 'Chuyển khoản', value: parseFloat(summary.bank_amount) },
    { label: 'Dùng đặt cọc', value: parseFloat(summary.deposit_used) },
  ];
}

module.exports = createExportBuilder({
  columns: COLUMNS,
  buildWhere,
  getRows,
  getSummary,
  toDataRow,
  getWorkbookLabel,
  getFilterMeta,
  getSummaryRows,
});
