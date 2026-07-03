'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[/api/patient/referrals]
 * @crossref:uses[dbo.patient_referrals]
 */
const express = require('express');
const { getQuery } = require('../../db');
const { requirePatientAuth } = require('../../middleware/patientAuth');

const router = express.Router();

/**
 * GET /api/patient/referrals
 */
router.get('/', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;

    const rows = await db(
      `SELECT id, referred_name, referred_phone, referred_email, status, notes, created_at, updated_at
       FROM dbo.patient_referrals
       WHERE partner_id = $1
       ORDER BY created_at DESC`,
      [partnerId]
    );

    return res.json({ success: true, referrals: rows });
  } catch (err) {
    console.error('[patientReferrals] list error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/patient/referrals
 */
router.post('/', requirePatientAuth, async (req, res) => {
  try {
    const { referredName, referredPhone, referredEmail, notes } = req.body;
    if (!referredName || !referredPhone) {
      return res.status(400).json({ error: 'referredName and referredPhone are required', code: 'MISSING_FIELDS' });
    }

    const db = getQuery('dental');
    const result = await db(
      `INSERT INTO dbo.patient_referrals (partner_id, referred_name, referred_phone, referred_email, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.patient.partnerId, referredName, referredPhone, referredEmail || null, notes || null]
    );

    return res.status(201).json({ success: true, referralId: result[0].id });
  } catch (err) {
    console.error('[patientReferrals] create error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
