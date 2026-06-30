'use strict';

const { isInvestorGroup, resolveEffectivePermissions, resolveInvestorScope } = require('../../permissionService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function normalizeCompanyId(value) {
  if (!value || value === 'all') return '';
  return String(value);
}

function assertCompanyId(value) {
  if (value && !UUID_RE.test(value)) {
    throw makeError('Chi nhánh không hợp lệ.', 400, 'EXPORT_FILTER_INVALID');
  }
}

function hasAllLocationAccess(permissionState) {
  const perms = permissionState?.effectivePermissions || [];
  const groupName = String(permissionState?.groupName || '');
  return perms.includes('*') || /admin/i.test(groupName);
}

async function resolveReportExportScope(user, companyId) {
  const requestedCompanyId = normalizeCompanyId(companyId);
  assertCompanyId(requestedCompanyId);

  const permissionState = await resolveEffectivePermissions(user?.employeeId);
  const isInvestor = isInvestorGroup(permissionState?.groupName);
  const investorScope = isInvestor
    ? await resolveInvestorScope(user?.employeeId)
    : { isInvestor: false, allowedCustomerIds: [] };

  if (hasAllLocationAccess(permissionState) || isInvestor) {
    return {
      companyIds: requestedCompanyId ? [requestedCompanyId] : null,
      allowedCustomerIds: investorScope.isInvestor ? investorScope.allowedCustomerIds : null,
      label: requestedCompanyId || 'Tất cả',
      isInvestor: investorScope.isInvestor,
    };
  }

  const allowedIds = (permissionState.locations || []).map((loc) => loc.id).filter(Boolean);
  if (requestedCompanyId) {
    if (!allowedIds.includes(requestedCompanyId)) {
      throw makeError('Bạn không có quyền xuất dữ liệu cho chi nhánh này.', 403, 'EXPORT_LOCATION_DENIED');
    }
    return { companyIds: [requestedCompanyId], allowedCustomerIds: null, label: requestedCompanyId, isInvestor: false };
  }

  if (allowedIds.length === 0) {
    throw makeError('Tài khoản chưa có phạm vi chi nhánh để xuất báo cáo.', 403, 'EXPORT_LOCATION_SCOPE_REQUIRED');
  }

  return {
    companyIds: allowedIds,
    allowedCustomerIds: null,
    label: (permissionState.locations || []).map((loc) => loc.name || loc.id).join(', '),
    isInvestor: false,
  };
}

async function resolveScopedExportFilters(filters, user) {
  const scope = await resolveReportExportScope(user, filters.companyId);
  const scopedFilters = { ...filters };
  if (!normalizeCompanyId(filters.companyId)) {
    scopedFilters.companyIds = scope.companyIds;
  }
  if (Array.isArray(scope.allowedCustomerIds)) {
    scopedFilters.allowedCustomerIds = scope.allowedCustomerIds;
  }
  return { filters: scopedFilters, scope };
}

module.exports = {
  makeError,
  normalizeCompanyId,
  assertCompanyId,
  hasAllLocationAccess,
  resolveReportExportScope,
  resolveScopedExportFilters,
};
