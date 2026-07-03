'use strict';

/**
 * @crossref:domain[reports-analytics]
 * @crossref:used-in[shared report validators/filters: all api/src/routes/reports/*.js sub-routers (dashboard, revenue, revenueBreakdowns, cashFlow, appointments, doctors, customers, employeesOverview, servicesBreakdown, locationsComparison)]
 * @crossref:uses[api/src/services/permissionService.js (resolveEffectivePermissions), product-map/domains/reports-analytics.yaml]
 */
const {
  hasAllLocationAccess,
  resolveLocationScope,
} = require('../../services/locationScope');

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

// NOTE on timestamps + ::date casts:
// Every timestamp column in this DB (appointments.date, saleorders.datecreated,
// payments.created_at, etc.) is `timestamp without time zone` storing the literal
// Vietnam wall-clock value at insert time. The `::date` cast therefore already
// returns the correct Vietnam-local date — DO NOT wrap with `AT TIME ZONE 'UTC'
// AT TIME ZONE 'Asia/Ho_Chi_Minh'`. That would treat the naive timestamp as UTC
// and shift every value +7h, pushing all evening appointments to the next day.
// Verified 2026-05-17: hour-of-day histograms peak at 9–18 (clinic working hours)
// across appointments/saleorders/payments — confirms VN-local-naive storage.
function dateCompanyFilter(dateFrom, dateTo, companyId, dateCol = 'datecreated', companyCol = 'companyid') {
  const conds = [];
  const params = [];
  let idx = 1;
  if (dateFrom) { conds.push(`${dateCol}::date >= $${idx}`); params.push(dateFrom); idx++; }
  if (dateTo) { conds.push(`${dateCol}::date <= $${idx}`); params.push(dateTo); idx++; }
  if (companyId) { conds.push(`${companyCol} = $${idx}`); params.push(companyId); idx++; }
  return { where: conds.length ? 'AND ' + conds.join(' AND ') : '', params, idx };
}

function hasAllLocationReportAccess(permissionState = {}) {
  return hasAllLocationAccess(permissionState);
}

async function resolveReportCompanyScope(req, res, companyId) {
  const scope = await resolveLocationScope(req, companyId);
  if (scope.error) {
    err(res, 403, 'Location not allowed');
    return null;
  }
  return { companyIds: scope.companyIds };
}

function datePaymentScopeFilter(dateFrom, dateTo, scope = {}, dateCol = 'p.payment_date', paymentAlias = 'p') {
  const conds = [];
  const params = [];
  let idx = 1;

  if (dateFrom) {
    conds.push(`${dateCol}::date >= $${idx}`);
    params.push(dateFrom);
    idx++;
  }
  if (dateTo) {
    conds.push(`${dateCol}::date <= $${idx}`);
    params.push(dateTo);
    idx++;
  }

  if (Array.isArray(scope.companyIds)) {
    if (scope.companyIds.length === 0) {
      conds.push('false');
      return { where: conds.length ? 'AND ' + conds.join(' AND ') : '', params, idx };
    }
    const locationParam = idx;
    params.push(scope.companyIds);
    idx++;
    conds.push(`(
      EXISTS (
        SELECT 1
        FROM dbo.partners report_customer
        WHERE report_customer.id = ${paymentAlias}.customer_id
          AND report_customer.companyid = ANY($${locationParam}::uuid[])
      )
      OR EXISTS (
        SELECT 1
        FROM dbo.payment_allocations report_pa
        LEFT JOIN dbo.saleorders report_so ON report_so.id = report_pa.invoice_id
        LEFT JOIN dbo.dotkhams report_dk ON report_dk.id = report_pa.dotkham_id
        WHERE report_pa.payment_id = ${paymentAlias}.id
          AND COALESCE(report_so.companyid, report_dk.companyid) = ANY($${locationParam}::uuid[])
      )
    )`);
  }

  return { where: conds.length ? 'AND ' + conds.join(' AND ') : '', params, idx };
}

module.exports = {
  err,
  validDate,
  validUUID,
  dateCompanyFilter,
  resolveReportCompanyScope,
  datePaymentScopeFilter,
};
