'use strict';

const { resolveEffectivePermissions } = require('../../services/permissionService');

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

function hasAllLocationReportAccess(permissionState = {}) {
  const groupName = String(permissionState.groupName || '').trim().toLowerCase();
  const permissions = new Set(permissionState.effectivePermissions || []);
  return permissions.has('*') || groupName === 'admin' || groupName === 'super admin';
}

async function resolveReportCompanyScope(req, res, companyId) {
  const permissionState = await resolveEffectivePermissions(req.user?.employeeId);

  if (hasAllLocationReportAccess(permissionState)) {
    return { companyIds: companyId ? [companyId] : null };
  }

  const allowedCompanyIds = (permissionState.locations || [])
    .map(location => location.id)
    .filter(Boolean);

  if (companyId && !allowedCompanyIds.includes(companyId)) {
    err(res, 403, 'Location not allowed');
    return null;
  }

  return { companyIds: companyId ? [companyId] : allowedCompanyIds };
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

  if (Array.isArray(scope.companyIds) && scope.companyIds.length > 0) {
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
