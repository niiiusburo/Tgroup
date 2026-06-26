'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[/api/patient/support]
 * @crossref:uses[dbo.support_tickets]
 */
const express = require('express');
const { getQuery } = require('../../db');
const { requirePatientAuth } = require('../../middleware/patientAuth');

const router = express.Router();

/**
 * GET /api/patient/support
 */
router.get('/', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;

    const rows = await db(
      `SELECT id, type, subject, description, status, created_at, updated_at
       FROM dbo.support_tickets
       WHERE partner_id = $1
       ORDER BY created_at DESC`,
      [partnerId]
    );

    return res.json({ success: true, tickets: rows });
  } catch (err) {
    console.error('[patientSupport] list error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/patient/support
 */
router.post('/', requirePatientAuth, async (req, res) => {
  try {
    const { type, subject, description } = req.body;
    if (!type || !subject) {
      return res.status(400).json({ error: 'type and subject are required', code: 'MISSING_FIELDS' });
    }

    const db = getQuery('dental');
    const result = await db(
      `INSERT INTO dbo.support_tickets (partner_id, type, subject, description)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.patient.partnerId, type, subject, description || null]
    );

    return res.status(201).json({ success: true, ticketId: result[0].id });
  } catch (err) {
    console.error('[patientSupport] create error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
