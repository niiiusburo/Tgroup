'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[/api/patient/reviews]
 * @crossref:uses[dbo.service_reviews]
 */
const express = require('express');
const { getQuery } = require('../../db');
const { requirePatientAuth } = require('../../middleware/patientAuth');

const router = express.Router();

/**
 * GET /api/patient/reviews
 */
router.get('/', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;

    const rows = await db(
      `SELECT id, saleorder_id, dotkham_id, rating, comment, is_anonymous, created_at
       FROM dbo.service_reviews
       WHERE partner_id = $1
       ORDER BY created_at DESC`,
      [partnerId]
    );

    return res.json({ success: true, reviews: rows });
  } catch (err) {
    console.error('[patientReviews] list error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/patient/reviews
 */
router.post('/', requirePatientAuth, async (req, res) => {
  try {
    const { saleorderId, dotkhamId, rating, comment, isAnonymous } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5', code: 'INVALID_RATING' });
    }

    const db = getQuery('dental');
    const result = await db(
      `INSERT INTO dbo.service_reviews (partner_id, saleorder_id, dotkham_id, rating, comment, is_anonymous)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [req.patient.partnerId, saleorderId || null, dotkhamId || null, rating, comment || null, isAnonymous || false]
    );

    return res.status(201).json({ success: true, reviewId: result[0].id });
  } catch (err) {
    console.error('[patientReviews] create error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
