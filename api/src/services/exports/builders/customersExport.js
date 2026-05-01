'use strict';

const { query } = require('../../../db');
const { createWorkbook, populateDataSheet, populateSummarySheet } = require('../exportWorkbook');

const MAX_ROWS = 100_000;

const COLUMNS = [
  { key: 'code', header: 'Mã KH', width: 14 },
  { key: 'displayname', header: 'Tên khách hàng', width: 28 },
  { key: 'phone', header: 'SĐT', width: 14 },
  { key: 'gender', header: 'Giới tính', width: 10 },
  { key: 'birthday', header: 'Ngày sinh', width: 14, style: 'date' },
  { key: 'sourcename', header: 'Nguồn', width: 18 },
  { key: 'salestaffname', header: 'Sale', width: 18 },
  { key: 'cskhname', header: 'CSKH', width: 18 },
  { key: 'companyname', header: 'Chi nhánh', width: 22 },
  { key: 'address', header: 'Địa chỉ', width: 36 },
  { key: 'comment', header: 'Ghi chú', width: 32 },
  { key: 'datecreated', header: 'Ngày tạo', width: 14, style: 'datetime' },
  { key: 'status', header: 'Trạng thái', width: 12 },
];

function buildWhere(filters) {
  const conditions = ['p.customer = true', 'p.isdeleted = false'];
  const params = [];
  let idx = 1;

  if (filters.search) {
    conditions.push(
      `(p.displayname ILIKE $${idx} OR p.name ILIKE $${idx} OR p.phone ILIKE $${idx} OR p.ref ILIKE $${idx})`
    );
    params.push(`%${filters.search}%`);
    idx++;
  }

  if (filters.status === 'active') {
    conditions.push('p.active = true');
  } else if (filters.status === 'inactive') {
    conditions.push('p.active = false');
  }

  if (filters.companyId && filters.companyId !== 'all') {
    conditions.push(`p.companyid = $${idx}`);
    params.push(filters.companyId);
    idx++;
  }

  return { where: conditions.join(' AND '), params, nextIdx: idx };
}

function formatGender(gender) {
  if (!gender) return '';
  const g = String(gender).toLowerCase().trim();
  if (g === 'male' || g === 'nam') return 'Nam';
  if (g === 'female' || g === 'nữ' || g === 'nu') return 'Nữ';
  return gender;
}

function buildBirthday(row) {
  if (!row.birthyear) return null;
  const year = parseInt(row.birthyear, 10);
  const month = row.birthmonth ? parseInt(row.birthmonth, 10) : 1;
  const day = row.birthday ? parseInt(row.birthday, 10) : 1;
  if (Number.isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

async function getRows(filters) {
  const { where, params } = buildWhere(filters);
  const sql = `
    SELECT
      p.id,
      p.ref AS code,
      p.displayname,
      p.name,
      p.phone,
      p.gender,
      p.birthyear,
      p.birthmonth,
      p.birthday,
      p.street,
      p.cityname,
      p.districtname,
      p.wardname,
      p.comment,
      p.note,
      p.active,
      p.datecreated,
      p.lastupdated,
      cs.name AS sourcename,
      sales_staff.name AS salestaffname,
      cskh_staff.name AS cskhname,
      c.name AS companyname
    FROM partners p
    LEFT JOIN customersources cs ON cs.id = p.sourceid
    LEFT JOIN partners sales_staff ON sales_staff.id = p.salestaffid
    LEFT JOIN partners cskh_staff ON cskh_staff.id = p.cskhid
    LEFT JOIN companies c ON c.id = p.companyid
    WHERE ${where}
    ORDER BY p.datecreated DESC NULLS LAST
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
      COUNT(*) FILTER (WHERE p.phone IS NOT NULL AND p.phone != '') AS with_phone,
      COUNT(*) FILTER (WHERE p.birthyear IS NOT NULL) AS with_birthday
    FROM partners p
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
      { label: 'Tổng khách hàng', value: total },
      { label: 'Đang hoạt động', value: parseInt(summary.active_count, 10) },
      { label: 'Ngừng hoạt động', value: parseInt(summary.inactive_count, 10) },
      { label: 'Có SĐT', value: parseInt(summary.with_phone, 10) },
      { label: 'Có ngày sinh', value: parseInt(summary.with_birthday, 10) },
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

  const workbook = createWorkbook('Danh sách khách hàng', {
    exportedBy: user?.name || user?.email || '',
    filters: [
      { label: 'Tìm kiếm', value: filters.search || 'Tất cả' },
      { label: 'Trạng thái', value: filters.status === 'active' ? 'Hoạt động' : filters.status === 'inactive' ? 'Ngừng' : 'Tất cả' },
      { label: 'Chi nhánh', value: filters.companyId === 'all' ? 'Tất cả' : filters.companyId },
    ],
  });

  const dataRows = rows.map((r) => {
    const parts = [r.street, r.districtname, r.cityname].filter(Boolean);
    return {
      code: r.code || '',
      displayname: r.displayname || r.name || '',
      phone: r.phone || '',
      gender: formatGender(r.gender),
      birthday: buildBirthday(r),
      sourcename: r.sourcename || '',
      salestaffname: r.salestaffname || '',
      cskhname: r.cskhname || '',
      companyname: r.companyname || '',
      address: parts.join(', '),
      comment: r.comment || r.note || '',
      datecreated: r.datecreated ? new Date(r.datecreated) : null,
      status: r.active ? 'Hoạt động' : 'Ngừng',
    };
  });

  populateDataSheet(workbook.getWorksheet('Data'), COLUMNS, dataRows);

  populateSummarySheet(workbook.getWorksheet('Summary'), [
    { label: 'Tổng khách hàng', value: parseInt(summary.total, 10) },
    { label: 'Đang hoạt động', value: parseInt(summary.active_count, 10) },
    { label: 'Ngừng hoạt động', value: parseInt(summary.inactive_count, 10) },
    { label: 'Có SĐT', value: parseInt(summary.with_phone, 10) },
    { label: 'Có ngày sinh', value: parseInt(summary.with_birthday, 10) },
  ]);

  return { workbook, rowCount: dataRows.length };
}

module.exports = { preview, build };
