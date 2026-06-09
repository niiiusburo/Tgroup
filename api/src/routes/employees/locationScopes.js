'use strict';

/**
 * @crossref:domain[employees-hr]
 * @crossref:used-in[NK3 Express API route: api/src/routes/employees/locationScopes]
 * @crossref:uses[product-map/domains/employees-hr.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
const { query } = require('../../db');

async function attachLocationScopes(items) {
  if (items.length === 0) return;

  const employeeIds = items.map((i) => i.id);
  const scopeRows = await query(
    'SELECT employee_id, company_id FROM employee_location_scope WHERE employee_id = ANY($1)',
    [employeeIds]
  );

  for (const item of items) {
    item.locationScopeIds = scopeRows
      .filter((r) => r.employee_id === item.id)
      .map((r) => r.company_id);
  }
}

async function fetchLocationScopeIds(employeeId) {
  const scopes = await query(
    'SELECT company_id FROM employee_location_scope WHERE employee_id = $1',
    [employeeId]
  );
  return scopes.map((s) => s.company_id);
}

module.exports = {
  attachLocationScopes,
  fetchLocationScopeIds,
};
