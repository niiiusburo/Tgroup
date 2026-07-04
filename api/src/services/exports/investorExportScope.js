'use strict';

const { resolveInvestorScope } = require('../permissionService');

async function resolveExportInvestorScope(user) {
  return resolveInvestorScope(user?.employeeId);
}

function appendInvestorCustomerCondition({ conditions, params, idx, column, investorScope }) {
  if (!investorScope?.isInvestor) {
    return idx;
  }

  conditions.push(`${column} = ANY($${idx}::uuid[])`);
  params.push(investorScope.allowedCustomerIds || []);
  return idx + 1;
}

module.exports = {
  resolveExportInvestorScope,
  appendInvestorCustomerCondition,
};
