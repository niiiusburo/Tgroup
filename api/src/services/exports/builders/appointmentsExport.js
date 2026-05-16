'use strict';

const { query } = require('../../../db');
const { createWorkbook, populateDataSheet, populateSummarySheet, toVNDate } = require('../exportWorkbook');

const MAX_ROWS = 100_000;

const COLUMNS = [
  { key: 'id', header: 'Mã lịch hẹn', width: 16 },
  { key: 'datetime', header: 'Ngày giờ hẹn', width: 18, style: 'datetime' },
  { key: 'customerCode', header: 'Mã KH', width: 12 },
  { key: 'customerName', header: 'Khách hàng', width: 24 },
  { key: 'customerPhone', header: 'SĐT', width: 14 },
  { key: 'serviceName', header: 'Dịch vụ', width: 24 },
  { key: 'doctorName', header: 'Bác sĩ', width: 18 },
  { key: 'assistantName', header: 'Phụ tá', width: 18 },
  { key: 'dentalAideName', header: 'Trợ lý BS', width: 18 },
  { key: 'companyName', header: 'Chi nhánh', width: 20 },
  { key: 'type', header: 'Loại hẹn', width: 14 },
  { key: 'status', header: 'Trạng thái', width: 14 },
  { key: 'content', header: 'Nội dung', width: 28 },
  { key: 'notes', header: 'Ghi chú', width: 28 },
];

const STATUS_LABELS = {
  draft: 'Nháp',
  scheduled: 'Đã lên lịch',
  confirmed: 'Xác nhận',
  arrived: 'Đã đến',
  'in Examination': 'Đang khám',
  'in-progress': 'Đang điều trị',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

function buildWhere(filters) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (filters.companyId && filters.companyId !== 'all') {
    conditions.push(`a.companyid = $${idx}`);
    params.push(filters.companyId);
    idx++;
  }

  if (filters.dateFrom) {
    conditions.push(`a.date >= $${idx}`);
    params.push(filters.dateFrom);
    idx++;
  }

  if (filters.dateTo) {
    const dtVal = filters.dateTo.length <= 10 ? `${filters.dateTo} 23:59:59` : filters.dateTo;
    conditions.push(`a.date <= $${idx}`);
    params.push(dtVal);
    idx++;
  }

  if (filters.state) {
    conditions.push(`a.state = $${idx}`);
    params.push(filters.state);
    idx++;
  }

  if (filters.search) {
    conditions.push(
      `(a.name ILIKE $${idx} OR a.note ILIKE $${idx} OR a.reason ILIKE $${idx} OR p.name ILIKE $${idx} OR p.namenosign ILIKE $${idx} OR p.ref ILIKE $${idx})`
    );
    params.push(`%${filters.search}%`);
    idx++;
  }

  if (filters.doctorId) {
    conditions.push(`a.doctorid = $${idx}`);
    params.push(filters.doctorId);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params, nextIdx: idx };
}

async function getRows(filters) {
  const { where, params } = buildWhere(filters);
  const sql = `
    SELECT
      a.id,
      a.name AS code,
      a.date,
      a.time,
      a.datetimeappointment,
      a.state,
      a.reason,
      a.note,
      a.isrepeatcustomer,
      a.color,
      a.customercarestatus,
      p.ref AS partnercode,
      p.name AS partnername,
      p.displayname AS partnerdisplayname,
      p.phone AS partnerphone,
      c.name AS companyname,
      doc.name AS doctorname,
      asst.name AS assistantname,
      da.name AS dentalaidename,
      prod.name AS productname
    FROM appointments a
    LEFT JOIN partners p ON p.id = a.partnerid
    LEFT JOIN companies c ON c.id = a.companyid
    LEFT JOIN employees doc ON doc.id = a.doctorid
    LEFT JOIN employees asst ON asst.id = a.assistantid
    LEFT JOIN employees da ON da.id = a.dentalaideid
    LEFT JOIN products prod ON prod.id = a.productid
    ${where}
    ORDER BY a.date DESC, a.time DESC NULLS LAST
    LIMIT ${MAX_ROWS + 1}
  `;
  return query(sql, params);
}

async function getSummary(filters) {
  const { where, params } = buildWhere(filters);
  const sql = `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE a.state = 'scheduled') AS scheduled_count,
      COUNT(*) FILTER (WHERE a.state = 'done') AS done_count,
      COUNT(*) FILTER (WHERE a.state = 'cancelled') AS cancelled_count,
      COUNT(*) FILTER (WHERE a.state = 'arrived') AS arrived_count,
      COUNT(*) FILTER (WHERE a.isrepeatcustomer = true) AS repeat_count
    FROM appointments a
    LEFT JOIN partners p ON p.id = a.partnerid
    ${where}
  `;
  const rows = await query(sql, params);
  return rows[0];
}

function getVisitTypeLabel(isRepeat) {
  return isRepeat ? 'Tái khám' : 'Khám mới';
}

function buildAppointmentDate(row) {
  if (row.datetimeappointment) {
    return toVNDate(row.datetimeappointment);
  }

  if (!row.date) return null;

  // row.date is a timestamp without timezone (OID 1114), not a plain DATE.
  // It stores the full appointment datetime (e.g. 2025-05-22 13:00:00).
  // When row.time is provided (legacy), combine date + time explicitly.
  // Use wall-clock components from the server-local interpretation (matches toVNDate),
  // never toISOString — that would shift to UTC and drop a day on a +07:00 server.
  if (row.time) {
    const d = row.date instanceof Date ? row.date : new Date(row.date);
    if (Number.isNaN(d.getTime())) return null;
    const [hours = '0', minutes = '0', seconds = '0'] = String(row.time).split(':');
    return new Date(Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      Number(hours) || 0,
      Number(minutes) || 0,
      Number(seconds) || 0,
    ));
  }

  // Use the full timestamp from row.date, preserving the time component.
  return toVNDate(row.date);
}

async function preview(filters, user) {
  const summary = await getSummary(filters);
  const total = parseInt(summary.total, 10);
  return {
    rowCount: total,
    summary: [
      { label: 'Tổng lịch hẹn', value: total },
      { label: 'Đã lên lịch', value: parseInt(summary.scheduled_count, 10) },
      { label: 'Đã đến', value: parseInt(summary.arrived_count, 10) },
      { label: 'Hoàn thành', value: parseInt(summary.done_count, 10) },
      { label: 'Đã hủy', value: parseInt(summary.cancelled_count, 10) },
      { label: 'Tái khám', value: parseInt(summary.repeat_count, 10) },
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

  const workbook = createWorkbook('Danh sách lịch hẹn', {
    exportedBy: user?.name || user?.email || '',
    filters: [
      { label: 'Tìm kiếm', value: filters.search || 'Tất cả' },
      { label: 'Chi nhánh', value: filters.companyId === 'all' ? 'Tất cả' : filters.companyId },
      { label: 'Từ ngày', value: filters.dateFrom || 'Tất cả' },
      { label: 'Đến ngày', value: filters.dateTo || 'Tất cả' },
      { label: 'Trạng thái', value: filters.state ? STATUS_LABELS[filters.state] || filters.state : 'Tất cả' },
    ],
  });

  const dataRows = rows.map((r) => {
    return {
      id: r.code || r.id || '',
      datetime: buildAppointmentDate(r),
      customerCode: r.partnercode || '',
      customerName: r.partnerdisplayname || r.partnername || '',
      customerPhone: r.partnerphone || '',
      serviceName: r.productname || '',
      doctorName: r.doctorname || '',
      assistantName: r.assistantname || '',
      dentalAideName: r.dentalaidename || '',
      companyName: r.companyname || '',
      type: getVisitTypeLabel(r.isrepeatcustomer),
      status: STATUS_LABELS[r.state] || r.state || '',
      content: r.reason || '',
      notes: r.note || '',
    };
  });

  populateDataSheet(workbook.getWorksheet('Data'), COLUMNS, dataRows);

  populateSummarySheet(workbook.getWorksheet('Summary'), [
    { label: 'Tổng lịch hẹn', value: parseInt(summary.total, 10) },
    { label: 'Đã lên lịch', value: parseInt(summary.scheduled_count, 10) },
    { label: 'Đã đến', value: parseInt(summary.arrived_count, 10) },
    { label: 'Hoàn thành', value: parseInt(summary.done_count, 10) },
    { label: 'Đã hủy', value: parseInt(summary.cancelled_count, 10) },
    { label: 'Tái khám', value: parseInt(summary.repeat_count, 10) },
  ]);

  return { workbook, rowCount: dataRows.length };
}

module.exports = { preview, build, buildAppointmentDate };
