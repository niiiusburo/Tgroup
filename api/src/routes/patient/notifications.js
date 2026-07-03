'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[/api/patient/notifications]
 * @crossref:uses[dbo.patient_notifications]
 */
const express = require('express');
const { getQuery } = require('../../db');
const { requirePatientAuth } = require('../../middleware/patientAuth');

const router = express.Router();

/**
 * GET /api/patient/notifications
 */
router.get('/', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;
    const limit = Math.min(parseInt(req.query.limit || 20, 10), 100);
    const offset = parseInt(req.query.offset || 0, 10);

    const rows = await db(
      `SELECT id, type, title, body, data, read_at, created_at
       FROM dbo.patient_notifications
       WHERE partner_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [partnerId, limit, offset]
    );

    const unreadCount = await db(
      `SELECT COUNT(*) as count FROM dbo.patient_notifications WHERE partner_id = $1 AND read_at IS NULL`,
      [partnerId]
    );

    return res.json({ success: true, notifications: rows, unreadCount: parseInt(unreadCount[0].count, 10) });
  } catch (err) {
    console.error('[patientNotifications] list error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * PATCH /api/patient/notifications/:id/read
 */
router.patch('/:id/read', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;
    const notificationId = req.params.id;

    await db(
      `UPDATE dbo.patient_notifications SET read_at = NOW() WHERE id = $1 AND partner_id = $2`,
      [notificationId, partnerId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[patientNotifications] read error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * PATCH /api/patient/notifications/read-all
 */
router.patch('/read-all', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;

    await db(
      `UPDATE dbo.patient_notifications SET read_at = NOW() WHERE partner_id = $1 AND read_at IS NULL`,
      [partnerId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[patientNotifications] read-all error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
