'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 backend service function: api/src/services/exports/builders/ctvPayoutsExport]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
/**
 * ctvPayoutsExport.js — Excel export for the "Chi trả" (CTV payout cycles) tab.
 * Mirrors routes/payouts.js across both LOB DBs (no cross-DB SQL).
 */

const { getDb } = require('../../../db');
const { createWorkbook, populateDataSheet, populateSummarySheet, toVNDate } = require('../exportWorkbook');

const LOB_LABELS = { dental: 'Nha khoa', cosmetic: 'Thẩm mỹ' };
const MAX_ROWS = 100_000;

const COLUMNS = [
  { key: 'cycleLabel', header: 'Chu kỳ', width: 24 },
  { key: 'lob', header: 'Lĩnh vực', width: 14 },
  { key: 'paidAt', header: 'Ngày chi trả', width: 16, style: 'date' },
  { key: 'totalAmount', header: 'Tổng tiền', width: 18, style: 'vnd' },
  { key: 'earningsCount', header: 'Số thu nhập', width: 12 },
  { key: 'createdBy', header: 'Người tạo', width: 22 },
  { key: 'notes', header: 'Ghi chú', width: 28 },
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
  if (filters.dateFrom) {
    conditions.push(`p.paid_at::date >= $${idx++}`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`p.paid_at::date <= $${idx++}`);
    params.push(filters.dateTo);
  }
  return { where: conditions.join(' AND '), params };
}

async function listForLob(lob, filters) {
  const db = getDb(lob);
  const { where, params } = buildWhere(filters);
  const rows = await queryRows(db, `
    SELECT p.id, p.cycle_label, p.paid_at, p.total_amount, p.notes, p.created_at,
           creator.name AS created_by_name,
           (SELECT COUNT(*) FROM dbo.earnings e WHERE e.payout_id = p.id) AS earnings_count
    FROM dbo.payouts p
    LEFT JOIN dbo.partners creator ON creator.id = p.created_by_partner_id
    WHERE ${where}
    ORDER BY p.created_at DESC
    LIMIT ${MAX_ROWS + 1}
  `, params);
  return rows.map((r) => ({ ...r, lob, total_amount: parseFloat(r.total_amount || 0) }));
}

async function fetchAll(filters) {
  const lob = filters.lob === 'dental' || filters.lob === 'cosmetic' ? filters.lob : 'all';
  const lobs = lob === 'all' ? ['dental', 'cosmetic'] : [lob];
  const parts = await Promise.all(lobs.map((l) => listForLob(l, filters)));
  return parts.flat().sort(
    (a, b) => new Date(b.paid_at || b.created_at || 0) - new Date(a.paid_at || a.created_at || 0)
  );
}

async function preview(filters, _user) {
  const rows = await fetchAll(filters);
  const total = rows.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  return {
    rowCount: rows.length,
    summary: [
      { label: 'Tổng chu kỳ', value: rows.length },
      { label: 'Tổng đã chi trả', value: Math.round(total) },
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

  const workbook = createWorkbook('Chi trả CTV', {
    exportedBy: user?.name || user?.email || '',
    filters: [
      { label: 'Lĩnh vực', value: filters.lob && filters.lob !== 'all' ? (LOB_LABELS[filters.lob] || filters.lob) : 'Tất cả' },
      { label: 'Từ ngày', value: filters.dateFrom || 'Tất cả' },
      { label: 'Đến ngày', value: filters.dateTo || 'Tất cả' },
    ],
  });

  const dataRows = rows.map((r) => ({
    cycleLabel: r.cycle_label || '',
    lob: LOB_LABELS[r.lob] || r.lob,
    paidAt: r.paid_at ? toVNDate(r.paid_at) : null,
    totalAmount: r.total_amount || 0,
    earningsCount: parseInt(r.earnings_count || 0, 10) || 0,
    createdBy: r.created_by_name || '',
    notes: r.notes || '',
  }));

  populateDataSheet(workbook.getWorksheet('Data'), COLUMNS, dataRows);
  populateSummarySheet(workbook.getWorksheet('Summary'), [
    { label: 'Tổng chu kỳ', value: dataRows.length },
    { label: 'Tổng đã chi trả', value: Math.round(rows.reduce((s, r) => s + (r.total_amount || 0), 0)) },
  ]);

  return { workbook, rowCount: dataRows.length };
}

module.exports = { preview, build };
