'use strict';

/**
 * @crossref:domain[services-catalog]
 * @crossref:used-in[api/src/routes/auth.js — login partner lookup (email or CTV phone/ref)]
 * @crossref:uses[product-map/domains/services-catalog.yaml, product-map/domains/auth.yaml, docs/TEST-MATRIX.md]
 */
function normalizeLoginIdentifier(value) {
  return String(value || '').trim();
}

function normalizeIdentifierDigits(value) {
  return normalizeLoginIdentifier(value).replace(/\D/g, '');
}

async function findLoginPartner(queryFn, identifier) {
  const loginIdentifier = normalizeLoginIdentifier(identifier);
  const identifierDigits = normalizeIdentifierDigits(loginIdentifier);

  if (!loginIdentifier) {
    return [];
  }

  return queryFn(
    `SELECT p.id, p.name, p.email, p.password_hash, p.companyid AS "companyId",
            p.is_ctv, p.lob_scope, p.created_via, c.name AS "companyName"
       FROM partners p
       LEFT JOIN companies c ON c.id = p.companyid
       WHERE p.employee = true
         AND p.isdeleted = false
         AND p.active = true
         AND (
           LOWER(p.email) = LOWER($1)
           OR (
             $2 <> ''
             AND p.is_ctv = true
             AND (
               regexp_replace(COALESCE(p.phone, ''), '\\D', '', 'g') = $2
               OR right(regexp_replace(COALESCE(p.phone, ''), '\\D', '', 'g'), 9) = right($2, 9)
               OR LOWER(COALESCE(p.ref, '')) = LOWER($1)
               OR regexp_replace(COALESCE(p.ref, ''), '\\D', '', 'g') = $2
             )
           )
         )
       ORDER BY CASE WHEN LOWER(p.email) = LOWER($1) THEN 0 ELSE 1 END
       LIMIT 2`,
    [loginIdentifier, identifierDigits]
  );
}

module.exports = {
  findLoginPartner,
  normalizeIdentifierDigits,
  normalizeLoginIdentifier,
};
