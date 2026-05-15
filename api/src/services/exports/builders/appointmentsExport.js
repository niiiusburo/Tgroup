'use strict';

const { query } = require('../../../db');
const { toVNDate } = require('../exportWorkbook');
const { createExportBuilder } = require('../exportBuilder');

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

  if (filters.timeFrom) {
    conditions.push(`a.date::time >= $${idx}::time`);
    params.push(filters.timeFrom);
    idx++;
  }

  if (filters.timeTo) {
    conditions.push(`a.date::time <= $${idx}::time`);
    params.push(filters.timeTo);
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
    LIMIT ${100_000 + 1}
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
  if (row.time) {
    const dateStr = row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10);
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours = 0, minutes = 0, seconds = 0] = String(row.time).split(':').map(Number);
    const dt = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // Use the full timestamp from row.date, preserving the time component.
  return toVNDate(row.date);
}

function toDataRow(r) {
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
}

function getFilterMeta(filters) {
  return [
    { label: 'Tìm kiếm', value: filters.search || 'Tất cả' },
    { label: 'Chi nhánh', value: filters.companyId === 'all' ? 'Tất cả' : filters.companyId },
    { label: 'Từ ngày', value: filters.dateFrom || 'Tất cả' },
    { label: 'Đến ngày', value: filters.dateTo || 'Tất cả' },
    { label: 'Từ giờ', value: filters.timeFrom || 'Tất cả' },
    { label: 'Đến giờ', value: filters.timeTo || 'Tất cả' },
    { label: 'Bác sĩ', value: filters.doctorId || 'Tất cả' },
    { label: 'Trạng thái', value: filters.state ? STATUS_LABELS[filters.state] || filters.state : 'Tất cả' },
  ];
}

function getSummaryRows(summary) {
  return [
    { label: 'Tổng lịch hẹn', value: parseInt(summary.total, 10) },
    { label: 'Đã lên lịch', value: parseInt(summary.scheduled_count, 10) },
    { label: 'Đã đến', value: parseInt(summary.arrived_count, 10) },
    { label: 'Hoàn thành', value: parseInt(summary.done_count, 10) },
    { label: 'Đã hủy', value: parseInt(summary.cancelled_count, 10) },
    { label: 'Tái khám', value: parseInt(summary.repeat_count, 10) },
  ];
}

const builder = createExportBuilder({
  columns: COLUMNS,
  buildWhere,
  getRows,
  getSummary,
  toDataRow,
  getWorkbookLabel: () => 'Danh sách lịch hẹn',
  getFilterMeta,
  getSummaryRows,
});

module.exports = { ...builder, buildAppointmentDate };
