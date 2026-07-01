'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[patient portal API routes]
 * @crossref:uses[dbo.partners, PATIENT_JWT_SECRET, JWT_SECRET]
 */
const { getQuery } = require('../db');
const { createJwtAuth } = require('./createJwtAuth');

/**
 * validatePatientType — shared type guard for both patient auth middlewares.
 */
function validatePatientType(decoded) {
  if (decoded.type !== 'patient') {
    return { status: 403, error: 'Forbidden', code: 'INVALID_TOKEN_TYPE' };
  }
  return true;
}

/**
 * patientAuth — lightweight patient JWT auth (no DB lookup).
 * Sets req.patient to the decoded token's patient fields.
 */
const patientAuth = createJwtAuth({
  secretEnvVar: 'PATIENT_JWT_SECRET',
  fallbackEnvVar: 'JWT_SECRET',
  userKey: 'patient',
  validateFn: (decoded, req) => {
    const typeResult = validatePatientType(decoded);
    if (typeResult !== true) return typeResult;
    req.patient = {
      partnerId: decoded.partnerId,
      phone: decoded.phone,
      name: decoded.name,
    };
    return true;
  },
});

/**
 * validatePatient — post-decode validation that the partner still exists
 * and is an active customer. Overwrites req.patient with the DB record.
 */
async function validatePatient(decoded, req) {
  const typeResult = validatePatientType(decoded);
  if (typeResult !== true) return typeResult;

  const db = getQuery('dental');
  const rows = await db(
    `SELECT id, name, phone, email, companyid
     FROM dbo.partners
     WHERE id = $1 AND customer = true AND COALESCE(isdeleted, false) = false AND COALESCE(active, true) = true`,
    [decoded.partnerId]
  );

  if (!rows || rows.length === 0) {
    return { status: 401, error: 'Unauthorized', code: 'PATIENT_NOT_FOUND' };
  }

  req.patient = {
    partnerId: rows[0].id,
    name: rows[0].name,
    phone: rows[0].phone,
    email: rows[0].email,
    companyId: rows[0].companyid,
  };
  return true;
}

/**
 * requirePatientAuth — full patient JWT auth with DB lookup.
 * Verifies the partner exists and is an active customer before setting req.patient.
 */
const requirePatientAuth = createJwtAuth({
  secretEnvVar: 'PATIENT_JWT_SECRET',
  fallbackEnvVar: 'JWT_SECRET',
  userKey: 'patient',
  validateFn: validatePatient,
});

module.exports = { patientAuth, requirePatientAuth };
