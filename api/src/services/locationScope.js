'use strict';

/**
 * @crossref:domain[auth]
 * @crossref:used-in[branch-scoped API list/read handlers and report helpers]
 * @crossref:uses[api/src/services/permissionService.js, docs/SECURITY.md]
 */
const { resolveEffectivePermissions } = require('./permissionService');

function hasAllLocationAccess(permissionState = {}) {
  const groupName = String(permissionState.groupName || '').trim().toLowerCase();
  const permissions = new Set(permissionState.effectivePermissions || []);
  return (
    permissions.has('*') ||
    groupName === 'super admin' ||
    groupName === 'system administrator'
  );
}

function normalizeCompanyId(companyId) {
  if (typeof companyId !== 'string') return '';
  const trimmed = companyId.trim();
  return trimmed && trimmed !== 'all' ? trimmed : '';
}

async function resolveLocationScope(req, requestedCompanyId) {
  const employeeId = req.user?.employeeId;
  const authLob = req.user?.authLob || 'dental';
  const companyId = normalizeCompanyId(requestedCompanyId);

  if (!employeeId) {
    return {
      companyIds: [],
      error: { status: 403, message: 'Location not allowed', code: 'LOCATION_NOT_ALLOWED' },
    };
  }

  const permissionState = await resolveEffectivePermissions(employeeId, authLob);

  if (hasAllLocationAccess(permissionState)) {
    return { companyIds: companyId ? [companyId] : null, permissionState };
  }

  const allowedCompanyIds = (permissionState.locations || [])
    .map((location) => location.id)
    .filter(Boolean);

  if (companyId && !allowedCompanyIds.includes(companyId)) {
    return {
      companyIds: [],
      permissionState,
      error: { status: 403, message: 'Location not allowed', code: 'LOCATION_NOT_ALLOWED' },
    };
  }

  return {
    companyIds: companyId ? [companyId] : allowedCompanyIds,
    permissionState,
  };
}

function appendCompanyScopeCondition({ conditions, params, paramIdx, companySql, companyIds }) {
  if (companyIds === null) return paramIdx;
  if (!Array.isArray(companyIds) || companyIds.length === 0) {
    conditions.push('false');
    return paramIdx;
  }
  conditions.push(`${companySql} = ANY($${paramIdx}::uuid[])`);
  params.push(companyIds);
  return paramIdx + 1;
}

function appendCompanyScopeToSql({ sql, params, companySql, companyIds }) {
  if (companyIds === null) return sql;
  if (!Array.isArray(companyIds) || companyIds.length === 0) {
    return `${sql} AND false`;
  }
  params.push(companyIds);
  return `${sql} AND ${companySql} = ANY($${params.length}::uuid[])`;
}

function sendLocationScopeError(res, scope) {
  if (!scope?.error) return false;
  res.status(scope.error.status).json({
    errorCode: scope.error.code,
    code: scope.error.code,
    message: scope.error.message,
    error: scope.error.message,
  });
  return true;
}

module.exports = {
  appendCompanyScopeCondition,
  appendCompanyScopeToSql,
  hasAllLocationAccess,
  resolveLocationScope,
  sendLocationScopeError,
};
