'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[/api/patient/media]
 * @crossref:uses[dbo.patient_media]
 * Plugin interface: calls external media service (provided by separate VPS)
 */
const express = require('express');
const { getQuery } = require('../../db');
const { requirePatientAuth } = require('../../middleware/patientAuth');

const router = express.Router();
const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL || null;
const MEDIA_SERVICE_API_KEY = process.env.MEDIA_SERVICE_API_KEY || null;

/**
 * GET /api/patient/media
 * List patient's media metadata
 */
router.get('/', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;

    const rows = await db(
      `SELECT id, media_service_id, media_url, category, label, created_at
       FROM dbo.patient_media
       WHERE partner_id = $1
       ORDER BY created_at DESC`,
      [partnerId]
    );

    // If external media service is configured, enrich with signed URLs
    if (MEDIA_SERVICE_URL && MEDIA_SERVICE_API_KEY) {
      for (const row of rows) {
        try {
          const signedRes = await fetch(
            `${MEDIA_SERVICE_URL}/api/media/${row.media_service_id}/signed`,
            { headers: { 'X-API-Key': MEDIA_SERVICE_API_KEY } }
          );
          if (signedRes.ok) {
            const signed = await signedRes.json();
            row.signedUrl = signed.signedUrl;
          }
        } catch (e) {
          console.warn('[patientMedia] signed URL fetch failed:', e.message);
        }
      }
    }

    return res.json({ success: true, media: rows });
  } catch (err) {
    console.error('[patientMedia] list error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/patient/media
 * Upload proxy to external media service
 */
router.post('/', requirePatientAuth, async (req, res) => {
  try {
    if (!MEDIA_SERVICE_URL || !MEDIA_SERVICE_API_KEY) {
      return res.status(503).json({ error: 'Media service not configured', code: 'NOT_CONFIGURED' });
    }

    // Forward multipart to media service
    const partnerId = req.patient.partnerId;
    const uploadRes = await fetch(`${MEDIA_SERVICE_URL}/api/media/upload`, {
      method: 'POST',
      headers: { 'X-API-Key': MEDIA_SERVICE_API_KEY, 'X-Partner-Id': partnerId },
      body: req.body, // multipart forwarded
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => 'Upload failed');
      return res.status(uploadRes.status).json({ error: text, code: 'UPLOAD_FAILED' });
    }

    const uploadData = await uploadRes.json();

    // Store metadata in local DB
    const db = getQuery('dental');
    await db(
      `INSERT INTO dbo.patient_media (partner_id, media_service_id, media_url, category, label)
       VALUES ($1, $2, $3, $4, $5)`,
      [partnerId, uploadData.id, uploadData.url, req.body.category || 'general', req.body.label || '']
    );

    return res.json({ success: true, media: uploadData });
  } catch (err) {
    console.error('[patientMedia] upload error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
