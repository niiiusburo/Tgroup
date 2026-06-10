'use strict';

/**
 * @crossref:domain[auth]
 * @crossref:used-in[NK3 backend service: api/src/services/authSession]
 * @crossref:uses[product-map/domains/auth.yaml, api/src/routes/auth.js, docs/TEST-MATRIX.md]
 */

function getEmployeeLobScope(employee) {
  if (Array.isArray(employee?.lob_scope)) return employee.lob_scope;
  if (Array.isArray(employee?.lobScope)) return employee.lobScope;
  return [];
}

function isEmployeeCtv(employee) {
  return employee?.is_ctv === true || employee?.isCtv === true;
}

/**
 * Single source of truth for JWT + API user lob_scope.
 * Login and /me must both call this so page refresh does not drop cosmetic scope.
 */
function resolveEffectiveLobScope({ employee, isAdmin, authLob }) {
  const adminLobScope = ['dental', 'cosmetic'];
  const employeeLobScope = getEmployeeLobScope(employee);
  const employeeIsCtv = isEmployeeCtv(employee);

  if (Array.isArray(employeeLobScope) && employeeLobScope.length > 0) {
    return employeeLobScope;
  }
  if (isAdmin) {
    return adminLobScope;
  }
  if (employeeIsCtv) {
    return employeeLobScope;
  }
  return [authLob || 'dental'];
}

module.exports = {
  getEmployeeLobScope,
  isEmployeeCtv,
  resolveEffectiveLobScope,
};