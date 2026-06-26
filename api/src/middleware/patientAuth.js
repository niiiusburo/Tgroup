'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[patient portal API routes]
 * @crossref:uses[dbo.partners, JWT_SECRET]
 */
const jwt = require('jsonwebtoken');
const { getQuery } = require('../db');

const PATIENT_JWT_SECRET = process.env.PATIENT_JWT_SECRET || process.env.JWT_SECRET;

function patientAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', code: 'NO_TOKEN' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, PATIENT_JWT_SECRET);
    if (decoded.type !== 'patient') {
      return res.status(403).json({ error: 'Forbidden', code: 'INVALID_TOKEN_TYPE' });
    }
    req.patient = {
      partnerId: decoded.partnerId,
      phone: decoded.phone,
      name: decoded.name,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN', message: err.message });
  }
}

async function requirePatientAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', code: 'NO_TOKEN' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, PATIENT_JWT_SECRET);
    if (decoded.type !== 'patient') {
      return res.status(403).json({ error: 'Forbidden', code: 'INVALID_TOKEN_TYPE' });
    }

    const db = getQuery('dental');
    const rows = await db(
      `SELECT id, name, phone, email, companyid
       FROM dbo.partners
       WHERE id = $1 AND customer = true AND COALESCE(isdeleted, false) = false AND COALESCE(active, true) = true`,
      [decoded.partnerId]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized', code: 'PATIENT_NOT_FOUND' });
    }

    req.patient = {
      partnerId: rows[0].id,
      name: rows[0].name,
      phone: rows[0].phone,
      email: rows[0].email,
      companyId: rows[0].companyid,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN', message: err.message });
  }
}

module.exports = { patientAuth, requirePatientAuth };
