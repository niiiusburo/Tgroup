function applyPartnerListFilters({ query, conditions, params, paramIdx }) {
  let nextParamIdx = paramIdx;
  const { companyId, company_id: companyIdSnake, status } = query;
  const locationId = companyId || companyIdSnake;

  if (typeof locationId === 'string' && locationId.trim()) {
    conditions.push(`p.companyid = $${nextParamIdx}`);
    params.push(locationId.trim());
    nextParamIdx++;
  }

  if (status === 'active') {
    conditions.push('p.active = true');
  } else if (status === 'inactive') {
    conditions.push('p.active = false');
  } else if (status === 'pending') {
    conditions.push('false');
  }

  return nextParamIdx;
}

module.exports = {
  applyPartnerListFilters,
};
