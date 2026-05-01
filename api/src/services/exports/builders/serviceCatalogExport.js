'use strict';

const { query } = require('../../../db');
const { createWorkbook, populateDataSheet, populateSummarySheet } = require('../exportWorkbook');

const MAX_ROWS = 100_000;

const COLUMNS = [
  { key: 'defaultcode', header: 'Mã dịch vụ', width: 16 },
  { key: 'name', header: 'Tên dịch vụ', width: 36 },
  { key: 'categname', header: 'Nhóm dịch vụ', width: 24 },
  { key: 'uomname', header: 'Đơn vị', width: 12 },
  { key: 'listprice', header: 'Giá niêm yết', width: 16, style: 'vnd' },
  { key: 'saleprice', header: 'Giá bán', width: 16, style: 'vnd' },
  { key: 'laboprice', header: 'Giá labo', width: 16, style: 'vnd' },
  { key: 'companyname', header: 'Chi nhánh', width: 24 },
  { key: 'active', header: 'Trạng thái', width: 12 },
  { key: 'datecreated', header: 'Ngày tạo', width: 14, style: 'date' },
  { key: 'lastupdated', header: 'Cập nhật lần cuối', width: 18, style: 'datetime' },
];

function normalizeVietnamese(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function buildWhere(filters) {
  const conditions = ['1=1'];
  const params = [];
  let idx = 1;

  if (filters.active === 'true') {
    conditions.push(`p.active = true`);
  } else if (filters.active === 'false') {
    conditions.push(`p.active = false`);
  }

  if (filters.categId) {
    conditions.push(`(
      p.categid = $${idx}
      OR EXISTS (
        SELECT 1 FROM dbo.productcategories spc
        JOIN dbo.productcategories ppc ON COALESCE(spc.parentid::text,'') || '|' || LOWER(COALESCE(NULLIF(TRIM(spc.completename),''), NULLIF(TRIM(spc.name),''), spc.id::text)) =
                                            COALESCE(ppc.parentid::text,'') || '|' || LOWER(COALESCE(NULLIF(TRIM(ppc.completename),''), NULLIF(TRIM(ppc.name),''), ppc.id::text))
        WHERE spc.id = $${idx} AND ppc.id = p.categid
      )
    )`);
    params.push(filters.categId);
    idx++;
  }

  if (filters.companyId && filters.companyId !== 'all') {
    conditions.push(`p.companyid = $${idx}`);
    params.push(filters.companyId);
    idx++;
  }

  if (filters.search) {
    const ns = `%${filters.search}%`;
    const nns = `%${normalizeVietnamese(filters.search)}%`;
    conditions.push(`(p.name ILIKE $${idx} OR p.defaultcode ILIKE $${idx} OR p.namenosign ILIKE $${idx + 1})`);
    params.push(ns, nns);
    idx += 2;
  }

  return { where: conditions.join(' AND '), params, nextIdx: idx };
}

async function getRows(filters) {
  const { where, params } = buildWhere(filters);
  const sql = `
    SELECT
      p.id,
      p.name,
      p.defaultcode,
      p.listprice,
      p.saleprice,
      p.laboprice,
      p.uomname,
      p.active,
      p.datecreated,
      p.lastupdated,
      COALESCE(c.name, '') AS companyname,
      COALESCE(pc.name, '') AS categname
    FROM dbo.products p
    LEFT JOIN dbo.companies c ON c.id = p.companyid
    LEFT JOIN dbo.productcategories pc ON pc.id = p.categid
    WHERE ${where}
    ORDER BY p.name ASC
    LIMIT ${MAX_ROWS + 1}
  `;
  return query(sql, params);
}

async function getSummary(filters) {
  const { where, params } = buildWhere(filters);
  const sql = `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE p.active = true) AS active_count,
      COUNT(*) FILTER (WHERE p.active = false) AS inactive_count,
      COUNT(DISTINCT p.categid) AS category_count
    FROM dbo.products p
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
      { label: 'Tổng dịch vụ', value: total },
      { label: 'Đang hoạt động', value: parseInt(summary.active_count, 10) },
      { label: 'Ngừng hoạt động', value: parseInt(summary.inactive_count, 10) },
      { label: 'Số nhóm', value: parseInt(summary.category_count, 10) },
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

  const workbook = createWorkbook('Danh mục dịch vụ', {
    exportedBy: user?.name || user?.email || '',
    filters: [
      { label: 'Tìm kiếm', value: filters.search || 'Tất cả' },
      { label: 'Chi nhánh', value: filters.companyId === 'all' ? 'Tất cả' : filters.companyId },
      { label: 'Trạng thái', value: filters.active === 'true' ? 'Hoạt động' : filters.active === 'false' ? 'Ngừng' : 'Tất cả' },
    ],
  });

  const dataRows = rows.map((r) => ({
    defaultcode: r.defaultcode || '',
    name: r.name || '',
    categname: r.categname || '',
    uomname: r.uomname || '',
    listprice: r.listprice || 0,
    saleprice: r.saleprice || 0,
    laboprice: r.laboprice || 0,
    companyname: r.companyname || '',
    active: r.active ? 'Hoạt động' : 'Ngừng',
    datecreated: r.datecreated ? new Date(r.datecreated) : null,
    lastupdated: r.lastupdated ? new Date(r.lastupdated) : null,
  }));

  populateDataSheet(workbook.getWorksheet('Data'), COLUMNS, dataRows);

  populateSummarySheet(workbook.getWorksheet('Summary'), [
    { label: 'Tổng dịch vụ', value: parseInt(summary.total, 10) },
    { label: 'Đang hoạt động', value: parseInt(summary.active_count, 10) },
    { label: 'Ngừng hoạt động', value: parseInt(summary.inactive_count, 10) },
    { label: 'Số nhóm', value: parseInt(summary.category_count, 10) },
  ]);

  return { workbook };
}

module.exports = { preview, build };
