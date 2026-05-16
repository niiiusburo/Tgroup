'use strict';

function addCommonDateFilters(filters, conditions, params, idx, dateExpr, timeExpr) {
  if (filters.dateFrom) {
    conditions.push(`${dateExpr} >= $${idx}`);
    params.push(filters.dateFrom);
    idx += 1;
  }

  if (filters.dateTo) {
    conditions.push(`${dateExpr} <= $${idx}`);
    params.push(filters.dateTo);
    idx += 1;
  }

  if (filters.timeFrom) {
    conditions.push(`${timeExpr} >= $${idx}::time`);
    params.push(filters.timeFrom);
    idx += 1;
  }

  if (filters.timeTo) {
    conditions.push(`${timeExpr} <= $${idx}::time`);
    params.push(filters.timeTo);
    idx += 1;
  }

  return idx;
}

module.exports = {
  addCommonDateFilters,
};
