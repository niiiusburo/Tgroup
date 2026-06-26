'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[/api/patient/profile]
 * @crossref:uses[dbo.partners, dbo.patient_consents]
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { getQuery } = require('../../db');
const { requirePatientAuth } = require('../../middleware/patientAuth');

const router = express.Router();

/**
 * GET /api/patient/profile
 */
router.get('/', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;

    const partner = await db(
      `SELECT id, name, phone, email, gender, birthyear, birthmonth, birthday,
              street, cityname, districtname, wardname
       FROM dbo.partners WHERE id = $1`,
      [partnerId]
    );

    const consents = await db(
      `SELECT marketing_push, marketing_sms, marketing_email, photo_visible, data_sharing
       FROM dbo.patient_consents WHERE partner_id = $1`,
      [partnerId]
    );

    return res.json({
      success: true,
      profile: partner[0] || null,
      consents: consents[0] || null,
    });
  } catch (err) {
    console.error('[patientProfile] get error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * PUT /api/patient/profile
 */
router.put('/', requirePatientAuth, async (req, res) => {
  try {
    const { name, email, gender, birthyear, birthmonth, birthday, street } = req.body;
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;

    await db(
      `UPDATE dbo.partners
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           gender = COALESCE($3, gender),
           birthyear = COALESCE($4, birthyear),
           birthmonth = COALESCE($5, birthmonth),
           birthday = COALESCE($6, birthday),
           street = COALESCE($7, street)
       WHERE id = $8`,
      [name, email, gender, birthyear, birthmonth, birthday, street, partnerId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[patientProfile] update error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * PUT /api/patient/profile/consents
 */
router.put('/consents', requirePatientAuth, async (req, res) => {
  try {
    const { marketingPush, marketingSms, marketingEmail, photoVisible, dataSharing } = req.body;
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;

    await db(
      `INSERT INTO dbo.patient_consents (partner_id, marketing_push, marketing_sms, marketing_email, photo_visible, data_sharing)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (partner_id)
       DO UPDATE SET
         marketing_push = EXCLUDED.marketing_push,
         marketing_sms = EXCLUDED.marketing_sms,
         marketing_email = EXCLUDED.marketing_email,
         photo_visible = EXCLUDED.photo_visible,
         data_sharing = EXCLUDED.data_sharing,
         updated_at = NOW()`,
      [partnerId, marketingPush, marketingSms, marketingEmail, photoVisible, dataSharing]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[patientProfile] consents error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/patient/profile/change-password
 */
router.post('/change-password', requirePatientAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Current password and new password (min 6 chars) required', code: 'MISSING_FIELDS' });
    }

    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;

    const rows = await db('SELECT password_hash FROM dbo.partners WHERE id = $1', [partnerId]);
    if (!rows || rows.length === 0 || !rows[0].password_hash) {
      return res.status(400).json({ error: 'No password set', code: 'NO_PASSWORD' });
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password incorrect', code: 'INVALID_PASSWORD' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db('UPDATE dbo.partners SET password_hash = $1 WHERE id = $2', [hash, partnerId]);

    return res.json({ success: true });
  } catch (err) {
    console.error('[patientProfile] change-password error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
