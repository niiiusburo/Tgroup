'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[/api/patient/auth mounted by patient router]
 * @crossref:uses[dbo.partners, bcryptjs, jsonwebtoken, patientAuth middleware]
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getQuery } = require('../../db');
const { requirePatientAuth } = require('../../middleware/patientAuth');

const router = express.Router();
const PATIENT_JWT_SECRET = process.env.PATIENT_JWT_SECRET || process.env.JWT_SECRET;
const TOKEN_EXPIRY = process.env.PATIENT_TOKEN_EXPIRY || '30d';

async function generatePatientToken(partner) {
  return jwt.sign(
    {
      type: 'patient',
      partnerId: partner.id,
      phone: partner.phone,
      name: partner.name,
    },
    PATIENT_JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * POST /api/patient/auth/login
 * Body: { phone, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required', code: 'MISSING_FIELDS' });
    }

    const db = getQuery('dental');
    const rows = await db(
      `SELECT id, name, phone, email, password_hash, companyid
       FROM dbo.partners
       WHERE LOWER(phone) = LOWER($1)
         AND customer = true
         AND COALESCE(isdeleted, false) = false
         AND COALESCE(active, true) = true
       LIMIT 1`,
      [phone.trim()]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid phone or password', code: 'INVALID_CREDENTIALS' });
    }

    const partner = rows[0];
    if (!partner.password_hash) {
      return res.status(401).json({ error: 'Account not activated. Please set a password first.', code: 'NO_PASSWORD' });
    }

    const valid = await bcrypt.compare(password, partner.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid phone or password', code: 'INVALID_CREDENTIALS' });
    }

    await db('UPDATE dbo.partners SET last_login = NOW() WHERE id = $1', [partner.id]);

    const token = await generatePatientToken(partner);
    return res.json({
      success: true,
      token,
      patient: {
        id: partner.id,
        name: partner.name,
        phone: partner.phone,
        email: partner.email,
      },
    });
  } catch (err) {
    console.error('[patientAuth] login error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/patient/auth/register
 * Claim account: patient has a partners record but no password_hash
 * Body: { phone, password, confirmPassword, name? }
 */
router.post('/register', async (req, res) => {
  try {
    const { phone, password, confirmPassword } = req.body;
    if (!phone || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Phone, password, and confirmPassword are required', code: 'MISSING_FIELDS' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters', code: 'WEAK_PASSWORD' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match', code: 'PASSWORD_MISMATCH' });
    }

    const db = getQuery('dental');
    const rows = await db(
      `SELECT id, name, password_hash
       FROM dbo.partners
       WHERE LOWER(phone) = LOWER($1)
         AND customer = true
         AND COALESCE(isdeleted, false) = false
         AND COALESCE(active, true) = true
       LIMIT 1`,
      [phone.trim()]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Phone number not found. Please visit the clinic to register.', code: 'PHONE_NOT_FOUND' });
    }

    const partner = rows[0];
    if (partner.password_hash) {
      return res.status(409).json({ error: 'Account already activated. Please login.', code: 'ALREADY_REGISTERED' });
    }

    const hash = await bcrypt.hash(password, 10);
    await db('UPDATE dbo.partners SET password_hash = $1 WHERE id = $2', [hash, partner.id]);

    const token = await generatePatientToken({ id: partner.id, name: partner.name, phone: phone.trim() });
    return res.json({
      success: true,
      token,
      patient: {
        id: partner.id,
        name: partner.name,
        phone: phone.trim(),
      },
    });
  } catch (err) {
    console.error('[patientAuth] register error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/patient/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', requirePatientAuth, async (req, res) => {
  try {
    const token = await generatePatientToken({
      id: req.patient.partnerId,
      name: req.patient.name,
      phone: req.patient.phone,
    });
    return res.json({ success: true, token });
  } catch (err) {
    console.error('[patientAuth] refresh error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/patient/auth/device
 * Register device token for push notifications
 */
router.post('/device', requirePatientAuth, async (req, res) => {
  try {
    const { apnsToken, fcmToken, platform, appVersion } = req.body;
    if (!apnsToken && !fcmToken) {
      return res.status(400).json({ error: 'apnsToken or fcmToken required', code: 'MISSING_TOKEN' });
    }

    const db = getQuery('dental');
    await db(
      `INSERT INTO dbo.patient_devices (partner_id, apns_token, fcm_token, platform, app_version, last_active)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (partner_id, ${apnsToken ? 'apns_token' : 'fcm_token'})
       DO UPDATE SET last_active = NOW(), app_version = EXCLUDED.app_version`,
      [req.patient.partnerId, apnsToken || null, fcmToken || null, platform || 'ios', appVersion || null]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[patientAuth] device error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * GET /api/patient/auth/me
 * Get current patient profile
 */
router.get('/me', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const rows = await db(
      `SELECT id, name, phone, email, gender, birthyear, birthmonth, birthday, street, cityname, districtname, wardname
       FROM dbo.partners WHERE id = $1`,
      [req.patient.partnerId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found', code: 'NOT_FOUND' });
    }

    return res.json({ success: true, patient: rows[0] });
  } catch (err) {
    console.error('[patientAuth] me error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
