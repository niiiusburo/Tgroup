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

async function resolveReportCompanyScope(req, res, companyId) {
  const employeeId = req.user?.employeeId;
  const { groupName, effectivePermissions, locations } = await resolveEffectivePermissions(employeeId);
  const allowedIds = (locations || []).map(l => l.id).filter(Boolean);
  const normalizedGroupName = typeof groupName === 'string' ? groupName.trim().toLowerCase() : '';
  const isAdminGroup = normalizedGroupName === 'admin' || normalizedGroupName === 'super admin';
  const canViewAll = effectivePermissions.includes('*') || isAdminGroup;

  if (canViewAll) {
    return companyId ? { all: false, companyIds: [companyId] } : { all: true, companyIds: [] };
  }

  if (companyId && !allowedIds.includes(companyId)) {
    err(res, 403, 'Location not allowed');
    return null;
  }

  const scopedIds = companyId ? [companyId] : allowedIds;
  if (scopedIds.length === 0) {
    err(res, 403, 'No location scope');
    return null;
  }

  return { all: false, companyIds: scopedIds };
}

function dateCompanyScopeFilter(dateFrom, dateTo, scope, dateCol = 'datecreated', companyCol = 'companyid') {
  const conds = [];
  const params = [];
  let idx = 1;
  if (dateFrom) { conds.push(`${dateCol}::date >= $${idx}`); params.push(dateFrom); idx++; }
  if (dateTo) { conds.push(`${dateCol}::date <= $${idx}`); params.push(dateTo); idx++; }
  if (scope && !scope.all) {
    conds.push(`${companyCol} = ANY($${idx}::uuid[])`);
    params.push(scope.companyIds);
    idx++;
  }
  return { where: conds.length ? 'AND ' + conds.join(' AND ') : '', params, idx };
}

function companyScopeFilter(scope, companyCol = 'companyid', startIdx = 1) {
  if (!scope || scope.all) return { where: '', params: [], idx: startIdx };
  return {
    where: `AND ${companyCol} = ANY($${startIdx}::uuid[])`,
    params: [scope.companyIds],
    idx: startIdx + 1,
  };
}

function datePaymentScopeFilter(dateFrom, dateTo, scope, dateCol = 'COALESCE(p.payment_date, p.created_at)', paymentAlias = 'p') {
  const conds = [];
  const params = [];
  let idx = 1;
  if (dateFrom) { conds.push(`${dateCol}::date >= $${idx}`); params.push(dateFrom); idx++; }
  if (dateTo) { conds.push(`${dateCol}::date <= $${idx}`); params.push(dateTo); idx++; }
  if (scope && !scope.all) {
    conds.push(`(
      EXISTS (
        SELECT 1
        FROM dbo.partners report_customer
        WHERE report_customer.id = ${paymentAlias}.customer_id
          AND report_customer.companyid = ANY($${idx}::uuid[])
      )
      OR EXISTS (
        SELECT 1
        FROM dbo.payment_allocations report_pa
        LEFT JOIN dbo.saleorders report_so ON report_so.id = report_pa.invoice_id
        LEFT JOIN dbo.dotkhams report_dk ON report_dk.id = report_pa.dotkham_id
        WHERE report_pa.payment_id = ${paymentAlias}.id
          AND COALESCE(report_so.companyid, report_dk.companyid) = ANY($${idx}::uuid[])
      )
    )`);
    params.push(scope.companyIds);
    idx++;
  }
  return { where: conds.length ? 'AND ' + conds.join(' AND ') : '', params, idx };
}

module.exports = {
  err,
  validDate,
  validUUID,
  dateCompanyFilter,
  resolveReportCompanyScope,
  dateCompanyScopeFilter,
  companyScopeFilter,
  datePaymentScopeFilter,
};
