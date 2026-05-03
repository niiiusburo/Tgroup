'use strict';

function err(res, status, msg) {
  return res.status(status).json({ success: false, error: msg });
}

function validDate(s) {
  if (s === undefined || s === null) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
}

function validUUID(s) {
  if (s === undefined || s === null) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function dateCompanyFilter(dateFrom, dateTo, companyId, dateCol = 'datecreated', companyCol = 'companyid') {
  const conds = [];
  const params = [];
  let idx = 1;
  if (dateFrom) { conds.push(`${dateCol}::date >= $${idx}`); params.push(dateFrom); idx++; }
  if (dateTo) { conds.push(`${dateCol}::date <= $${idx}`); params.push(dateTo); idx++; }
  if (companyId) { conds.push(`${companyCol} = $${idx}`); params.push(companyId); idx++; }
  return { where: conds.length ? 'AND ' + conds.join(' AND ') : '', params, idx };
}

module.exports = {
  err,
  validDate,
  validUUID,
  dateCompanyFilter,
};
