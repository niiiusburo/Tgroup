'use strict';

const { query } = require('../../../db');
const { createWorkbook, populateDataSheet, populateSummarySheet } = require('../exportWorkbook');

const MAX_ROWS = 100_000;

const COLUMNS = [
  { key: 'name', header: 'Số phiếu', width: 16 },
  { key: 'datecreated', header: 'Ngày tạo', width: 14, style: 'datetime' },
  { key: 'customerCode', header: 'Mã KH', width: 12 },
  { key: 'customerName', header: 'Khách hàng', width: 24 },
  { key: 'productName', header: 'Dịch vụ', width: 28 },
  { key: 'quantity', header: 'Số lượng', width: 10 },
  { key: 'tooth', header: 'Răng', width: 16 },
  { key: 'doctorName', header: 'Bác sĩ', width: 18 },
  { key: 'assistantName', header: 'Phụ tá', width: 18 },
  { key: 'dentalAideName', header: 'Trợ lý BS', width: 18 },
  { key: 'sourcename', header: 'Nguồn', width: 18 },
  { key: 'amountTotal', header: 'Tổng tiền', width: 16, style: 'vnd' },
  { key: 'totalPaid', header: 'Đã thu', width: 16, style: 'vnd' },
  { key: 'residual', header: 'Còn lại', width: 16, style: 'vnd' },
  { key: 'state', header: 'Trạng thái', width: 14 },
  { key: 'companyName', header: 'Chi nhánh', width: 20 },
  { key: 'notes', header: 'Ghi chú', width: 28 },
];

const STATE_LABELS = {
  draft: 'Nháp',
  sent: 'Đã gửi',
  sale: 'Đã bán',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

function buildWhere(filters) {
  const conditions = ['so.isdeleted = false'];
  const params = [];
  let idx = 1;

  if (filters.companyId && filters.companyId !== 'all') {
    conditions.push(`so.companyid = $${idx}`);
    params.push(filters.companyId);
    idx++;
  }

  if (filters.dateFrom) {
    conditions.push(`so.datecreated >= $${idx}`);
    params.push(filters.dateFrom);
    idx++;
  }

  if (filters.dateTo) {
    conditions.push(`so.datecreated <= $${idx}`);
    params.push(filters.dateTo);
    idx++;
  }

  if (filters.search) {
    conditions.push(`(so.name ILIKE $${idx} OR p.name ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  if (filters.state) {
    conditions.push(`so.state = $${idx}`);
    params.push(filters.state);
    idx++;
  }

  return { where: conditions.join(' AND '), params, nextIdx: idx };
}

async function getRows(filters) {
  const { where, params } = buildWhere(filters);
  const sql = `
    SELECT
      so.id,
      so.name,
      so.state,
      so.amounttotal,
      so.totalpaid,
      so.residual,
      so.quantity,
      so.notes,
      so.datecreated,
      so.datestart,
      so.dateend,
      p.ref AS partnercode,
      p.name AS partnername,
      p.displayname AS partnerdisplayname,
      c.name AS companyname,
      doc.name AS doctorname,
      asst.name AS assistantname,
      da.name AS dentalaidename,
      cs.name AS sourcename,
      (SELECT sol.productname FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productname,
      (SELECT sol.tooth_numbers FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_numbers,
      (SELECT sol.tooth_comment FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_comment
    FROM saleorders so
    LEFT JOIN partners p ON p.id = so.partnerid
    LEFT JOIN companies c ON c.id = so.companyid
    LEFT JOIN employees doc ON doc.id = so.doctorid
    LEFT JOIN employees asst ON asst.id = so.assistantid
    LEFT JOIN employees da ON da.id = so.dentalaideid
    LEFT JOIN customersources cs ON cs.id = COALESCE(so.sourceid, p.sourceid)
    WHERE ${where}
    ORDER BY so.datecreated DESC NULLS LAST
    LIMIT ${MAX_ROWS + 1}
  `;
  return query(sql, params);
}

async function getSummary(filters) {
  const { where, params } = buildWhere(filters);
  const sql = `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE so.state = 'sale') AS active_count,
      COUNT(*) FILTER (WHERE so.state = 'done') AS completed_count,
      COUNT(*) FILTER (WHERE so.state = 'cancelled') AS cancelled_count,
      COALESCE(SUM(so.amounttotal), 0) AS total_amount,
      COALESCE(SUM(so.totalpaid), 0) AS total_paid,
      COALESCE(SUM(so.residual), 0) AS total_residual
    FROM saleorders so
    LEFT JOIN partners p ON p.id = so.partnerid
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
      { label: 'Tổng phiếu', value: total },
      { label: 'Đang điều trị', value: parseInt(summary.active_count, 10) },
      { label: 'Hoàn thành', value: parseInt(summary.completed_count, 10) },
      { label: 'Đã hủy', value: parseInt(summary.cancelled_count, 10) },
      { label: 'Tổng tiền', value: parseFloat(summary.total_amount) },
      { label: 'Đã thu', value: parseFloat(summary.total_paid) },
      { label: 'Còn lại', value: parseFloat(summary.total_residual) },
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

  const workbook = createWorkbook('Phiếu điều trị', {
    exportedBy: user?.name || user?.email || '',
    filters: [
      { label: 'Tìm kiếm', value: filters.search || 'Tất cả' },
      { label: 'Chi nhánh', value: filters.companyId === 'all' ? 'Tất cả' : filters.companyId },
      { label: 'Từ ngày', value: filters.dateFrom || 'Tất cả' },
      { label: 'Đến ngày', value: filters.dateTo || 'Tất cả' },
      { label: 'Trạng thái', value: filters.state ? STATE_LABELS[filters.state] || filters.state : 'Tất cả' },
    ],
  });

  const dataRows = rows.map((r) => {
    const toothParts = [r.tooth_numbers, r.tooth_comment].filter(Boolean);
    return {
      name: r.name || '',
      datecreated: r.datecreated ? new Date(r.datecreated) : null,
      customerCode: r.partnercode || '',
      customerName: r.partnerdisplayname || r.partnername || '',
      productName: r.productname || '',
      quantity: r.quantity || 0,
      tooth: toothParts.join(' — ') || '',
      doctorName: r.doctorname || '',
      assistantName: r.assistantname || '',
      dentalAideName: r.dentalaidename || '',
      sourcename: r.sourcename || '',
      amountTotal: parseFloat(r.amounttotal || 0),
      totalPaid: parseFloat(r.totalpaid || 0),
      residual: parseFloat(r.residual || 0),
      state: STATE_LABELS[r.state] || r.state || '',
      companyName: r.companyname || '',
      notes: r.notes || '',
    };
  });

  populateDataSheet(workbook.getWorksheet('Data'), COLUMNS, dataRows);

  populateSummarySheet(workbook.getWorksheet('Summary'), [
    { label: 'Tổng phiếu', value: parseInt(summary.total, 10) },
    { label: 'Đang điều trị', value: parseInt(summary.active_count, 10) },
    { label: 'Hoàn thành', value: parseInt(summary.completed_count, 10) },
    { label: 'Đã hủy', value: parseInt(summary.cancelled_count, 10) },
    { label: 'Tổng tiền', value: parseFloat(summary.total_amount) },
    { label: 'Đã thu', value: parseFloat(summary.total_paid) },
    { label: 'Còn lại', value: parseFloat(summary.total_residual) },
  ]);

  return { workbook };
}

module.exports = { preview, build };
