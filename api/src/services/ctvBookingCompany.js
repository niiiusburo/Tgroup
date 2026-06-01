'use strict';

async function resolveCtvBookingCompanyId({ queryRows, requestedCompanyId, tokenCompanyId }) {
  if (typeof queryRows !== 'function') {
    throw new TypeError('queryRows is required');
  }

  const candidateId = requestedCompanyId || tokenCompanyId || null;
  if (candidateId) {
    const matchingRows = await queryRows(
      'SELECT id FROM dbo.companies WHERE id = $1 LIMIT 1',
      [candidateId]
    );
    if (matchingRows?.[0]?.id) return matchingRows[0].id;
  }

  const activeRows = await queryRows(
    `SELECT id
       FROM dbo.companies
      WHERE COALESCE(active, true) = true
      ORDER BY name ASC NULLS LAST, id ASC
      LIMIT 1`,
    []
  );
  if (activeRows?.[0]?.id) return activeRows[0].id;

  const anyRows = await queryRows(
    `SELECT id
       FROM dbo.companies
      ORDER BY id ASC
      LIMIT 1`,
    []
  );
  return anyRows?.[0]?.id || null;
}

module.exports = { resolveCtvBookingCompanyId };
