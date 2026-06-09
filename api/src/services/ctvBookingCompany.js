'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 backend service function: api/src/services/ctvBookingCompany]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 * @crossref:function[resolveCtvBookingCompanyId -> non-null appointment company for CTV booking]
 * @crossref:uses[api/src/routes/ctv.js, api/src/routes/ctvPublic.js, product-map/domains/business-unit.yaml]
 */
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
      ORDER BY
        CASE
          WHEN LOWER(COALESCE(name, '')) LIKE 'qa%' THEN 1
          WHEN LOWER(COALESCE(name, '')) LIKE '%test%' THEN 1
          WHEN LOWER(COALESCE(name, '')) LIKE '%verify%' THEN 1
          ELSE 0
        END,
        name ASC NULLS LAST,
        id ASC
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
