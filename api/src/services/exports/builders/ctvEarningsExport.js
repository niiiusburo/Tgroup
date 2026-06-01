'use strict';

/**
 * ctvEarningsExport.js — Excel export for the "Thu nhập" (CTV earnings) tab.
 * Mirrors routes/earnings.js listForLob across both LOB DBs (no cross-DB SQL).
 */

const { getDb } = require('../../../db');
const { createWorkbook, populateDataSheet, populateSummarySheet, toVNDate } = require('../exportWorkbook');

const LOB_LABELS = { dental: 'Nha khoa', cosmetic: 'Thẩm mỹ' };
const STATUS_LABELS = { pending: 'Chờ chi trả', paid: 'Đã chi trả', reversed: 'Đã hoàn' };
const MAX_ROWS = 100_000;

const COLUMNS = [
  { key: 'ctvName', header: 'CTV', width: 26 },
  { key: 'clientName', header: 'Khách hàng', width: 26 },
  { key: 'serviceName', header: 'Dịch vụ', width: 28 },
  { key: 'lob', header: 'Lĩnh vực', width: 14 },
  { key: 'level', header: 'Cấp', width: 8 },
  { key: 'amount', header: 'Số tiền', width: 16, style: 'vnd' },
  { key: 'status', header: 'Trạng thái', width: 14 },
  { key: 'earnedAt', header: 'Ngày phát sinh', width: 16, style: 'date' },
];

function toRows(result) {
  if (Array.isArray(result)) return result;
  if (result && result.rows) return result.rows;
  return [];
}

async function queryRows(db, sql, params = []) {
  if (typeof db.queryRows === 'function') return db.queryRows(sql, params);
  return toRows(await db.query(sql, params));
}

function buildWhere(filters) {
  const conditions = ['1=1'];
  const params = [];
  let idx = 1;
  if (filters.status) {
    conditions.push(`e.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.dateFrom) {
    conditions.push(`COALESCE(e.earned_at, e.created_at)::date >= $${idx++}`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`COALESCE(e.earned_at, e.created_at)::date <= $${idx++}`);
    params.push(filters.dateTo);
  }
  return { where: conditions.join(' AND '), params };
}

async function listForLob(lob, filters) {
  const db = getDb(lob);
  const { where, params } = buildWhere(filters);
  const rows = await queryRows(db, `
    SELECT e.id, e.level, e.amount, e.status, e.earned_at, e.created_at,
           client.name AS client_name,
           recipient.name AS recipient_name,
           product.name AS product_name
    FROM dbo.earnings e
    LEFT JOIN dbo.partners client ON client.id = e.client_id
    LEFT JOIN dbo.partners recipient ON recipient.id = e.recipient_partner_id
    LEFT JOIN dbo.saleorderlines sol ON sol.id = e.service_line_id
    LEFT JOIN dbo.products product ON product.id = sol.productid
    WHERE ${where}
    ORDER BY COALESCE(e.earned_at, e.created_at) DESC
    LIMIT ${MAX_ROWS + 1}
  `, params);
  return rows.map((r) => ({ ...r, lob, amount: parseFloat(r.amount || 0) }));
}

async function fetchAll(filters) {
  const lob = filters.lob === 'dental' || filters.lob === 'cosmetic' ? filters.lob : 'all';
  const lobs = lob === 'all' ? ['dental', 'cosmetic'] : [lob];
  const parts = await Promise.all(lobs.map((l) => listForLob(l, filters)));
  return parts.flat().sort(
    (a, b) => new Date(b.earned_at || b.created_at || 0) - new Date(a.earned_at || a.created_at || 0)
  );
}

async function preview(filters, _user) {
  const rows = await fetchAll(filters);
  const total = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  return {
    rowCount: rows.length,
    summary: [
      { label: 'Tổng dòng', value: rows.length },
      { label: 'Tổng tiền', value: Math.round(total) },
    ],
    exceedsMax: rows.length > MAX_ROWS,
  };
}

async function build(filters, user) {
  const rows = await fetchAll(filters);
  if (rows.length > MAX_ROWS) {
    const err = new Error(`Kết quả vượt quá ${MAX_ROWS.toLocaleString('vi-VN')} dòng. Vui lòng thu hẹp bộ lọc.`);
    err.code = 'EXPORT_ROW_LIMIT_EXCEEDED';
    throw err;
  }

  const workbook = createWorkbook('Thu nhập CTV', {
    exportedBy: user?.name || user?.email || '',
    filters: [
      { label: 'Lĩnh vực', value: filters.lob && filters.lob !== 'all' ? (LOB_LABELS[filters.lob] || filters.lob) : 'Tất cả' },
      { label: 'Trạng thái', value: filters.status ? (STATUS_LABELS[filters.status] || filters.status) : 'Tất cả' },
      { label: 'Từ ngày', value: filters.dateFrom || 'Tất cả' },
      { label: 'Đến ngày', value: filters.dateTo || 'Tất cả' },
    ],
  });

  const dataRows = rows.map((r) => ({
    ctvName: r.recipient_name || '',
    clientName: r.client_name || '',
    serviceName: r.product_name || '',
    lob: LOB_LABELS[r.lob] || r.lob,
    level: r.level ?? '',
    amount: r.amount || 0,
    status: STATUS_LABELS[r.status] || r.status || '',
    earnedAt: r.earned_at ? toVNDate(r.earned_at) : r.created_at ? toVNDate(r.created_at) : null,
  }));

  populateDataSheet(workbook.getWorksheet('Data'), COLUMNS, dataRows);
  populateSummarySheet(workbook.getWorksheet('Summary'), [
    { label: 'Tổng dòng', value: dataRows.length },
    { label: 'Tổng tiền', value: Math.round(rows.reduce((s, r) => s + (r.amount || 0), 0)) },
  ]);

  return { workbook, rowCount: dataRows.length };
}

module.exports = { preview, build };
