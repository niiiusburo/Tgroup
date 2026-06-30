'use strict';

const { resolveEffectivePermissions } = require('./permissionService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeScopeError(message, status = 403, code = 'REPORT_LOCATION_DENIED') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function normalizeRequestedCompanyId(value) {
  if (value === undefined || value === null) return '';
  const text = String(value).trim();
  return text && text !== 'all' ? text : '';
}

function assertCompanyId(value, label = 'Chi nhánh') {
  if (value && !UUID_RE.test(value)) {
    throw makeScopeError(`${label} không hợp lệ.`, 400, 'REPORT_LOCATION_INVALID');
  }
}

function hasAllLocationReportAccess(permissionState = {}) {
  const groupName = String(permissionState.groupName || '').trim().toLowerCase();
  const permissions = new Set(permissionState.effectivePermissions || []);
  return permissions.has('*') || groupName === 'admin' || groupName === 'super admin';
}

function usesCustomerBasedInvestorScope(permissionState = {}) {
  return String(permissionState.groupName || '').trim().toLowerCase() === 'investor';
}

function locationLabel(locations, fallback) {
  const names = (locations || []).map((loc) => loc.name || loc.id).filter(Boolean);
  return names.length ? names.join(', ') : fallback;
}

async function resolveCompanyScopeForUser(user, companyId, options = {}) {
  const requestedCompanyId = normalizeRequestedCompanyId(companyId);
  assertCompanyId(requestedCompanyId, options.companyLabel || 'Chi nhánh');

  const employeeId = typeof user === 'string' ? user : user?.employeeId;
  const permissionState = await resolveEffectivePermissions(employeeId);
  const unrestricted = hasAllLocationReportAccess(permissionState);
  const investor = usesCustomerBasedInvestorScope(permissionState);

  if (unrestricted || investor) {
    return {
      companyIds: requestedCompanyId ? [requestedCompanyId] : null,
      requestedCompanyId,
      permissionState,
      isUnrestricted: unrestricted,
      isInvestor: investor,
      label: requestedCompanyId || options.allLabel || 'Tất cả',
    };
  }

  const allowedLocations = permissionState.locations || [];
  const allowedCompanyIds = allowedLocations.map((location) => location.id).filter(Boolean);

  if (requestedCompanyId && !allowedCompanyIds.includes(requestedCompanyId)) {
    throw makeScopeError(
      options.deniedMessage || 'Location not allowed',
      403,
      options.deniedCode || 'REPORT_LOCATION_DENIED'
    );
  }

  if (!requestedCompanyId && options.requireAssignedLocation && allowedCompanyIds.length === 0) {
    throw makeScopeError(
      options.scopeRequiredMessage || 'Tài khoản chưa có phạm vi chi nhánh để xuất báo cáo.',
      403,
      options.scopeRequiredCode || 'REPORT_LOCATION_SCOPE_REQUIRED'
    );
  }

  const companyIds = requestedCompanyId ? [requestedCompanyId] : allowedCompanyIds;
  return {
    companyIds,
    requestedCompanyId,
    permissionState,
    isUnrestricted: false,
    isInvestor: false,
    label: requestedCompanyId || locationLabel(allowedLocations, options.allLabel || 'Tất cả'),
  };
}

module.exports = {
  makeScopeError,
  normalizeRequestedCompanyId,
  assertCompanyId,
  hasAllLocationReportAccess,
  usesCustomerBasedInvestorScope,
  resolveCompanyScopeForUser,
};
