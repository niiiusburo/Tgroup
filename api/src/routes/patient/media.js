'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[/api/patient/media]
 * @crossref:uses[dbo.partners, dbo.patient_media, MEDIA_SERVICE_URL, MEDIA_SERVICE_API_KEY]
 * Plugin interface: bridges authenticated NK patients to the external NK Photo service.
 */
const express = require('express');
const { getQuery } = require('../../db');
const { requirePatientAuth } = require('../../middleware/patientAuth');
const {
  getMediaConfig,
  loadPartner,
  searchMediaClient,
  getOrCreateMediaClient,
  normalizeMediaItem,
  mergeMediaRows,
  listExternalMedia,
  uploadExternalMedia,
} = require('../../services/mediaService');
const {
  uploadMultipleFields,
  normalizeFileField,
  createMediaUploadRateLimiter,
  handleMulterError,
} = require('../../services/mediaUpload');

const router = express.Router();
const mediaRateLimiter = createMediaUploadRateLimiter();

/**
 * GET /api/patient/media
 * List cached rows plus NK Photo media for the authenticated patient.
 * Optional query param: ?saleOrderLineId=<id> filters items to that service line.
 */
router.get('/', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;
    const saleOrderLineId = req.query.saleOrderLineId;
    const partner = await loadPartner(db, partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Patient not found', code: 'PATIENT_NOT_FOUND' });
    }

    let query = `SELECT id, sale_order_line_id, media_service_id, media_url, category, label, created_at
                 FROM dbo.patient_media
                 WHERE partner_id = $1`;
    const params = [partnerId];

    if (saleOrderLineId) {
      query += ` AND sale_order_line_id = $${params.length + 1}`;
      params.push(saleOrderLineId);
    }

    query += ` ORDER BY created_at DESC`;

    const localRows = await db(query, params);

    const { url, apiKey } = getMediaConfig();
    if (!url || !apiKey) {
      return res.json({ success: true, media: mergeMediaRows([], localRows) });
    }

    const client = await searchMediaClient(partner);
    const externalRows = client ? await listExternalMedia(client.id) : [];

    // Enrich external rows with the locally cached service-line tag so the tag
    // survives the merge (external copies win over local rows in mergeMediaRows).
    const localByServiceId = new Map(
      localRows
        .filter((r) => r.media_service_id)
        .map((r) => [String(r.media_service_id), r])
    );
    let externalForMerge = externalRows.map((e) => {
      const local = localByServiceId.get(String(e.id || e.media_service_id));
      return local && local.sale_order_line_id
        ? { ...e, sale_order_line_id: local.sale_order_line_id }
        : e;
    });

    // When filtering by service line, external items without a matching filtered
    // local row must not leak into the response (contract v1.0.46).
    if (saleOrderLineId) {
      externalForMerge = externalForMerge.filter((e) =>
        localByServiceId.has(String(e.id || e.media_service_id))
      );
    }

    return res.json({
      success: true,
      client: client || undefined,
      media: mergeMediaRows(externalForMerge, localRows),
    });
  } catch (err) {
    console.error('[patientMedia] list error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/patient/media
 * Uploads to NK Photo and caches non-secret metadata locally.
 * Rate limited: 5 uploads per minute per authenticated patient.
 * File size limit: 10 MB.
 * Allowed types: JPEG, PNG, WebP, HEIC, HEIF.
 */
router.post(
  '/',
  requirePatientAuth,
  mediaRateLimiter,
  uploadMultipleFields,
  normalizeFileField,
  handleMulterError,
  async (req, res) => {
  try {
    const { url, apiKey } = getMediaConfig();
    if (!url || !apiKey) {
      return res.status(503).json({ error: 'Media service not configured', code: 'NOT_CONFIGURED' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'One of file, image, or photo field is required', code: 'MISSING_FILE' });
    }

    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;
    const saleOrderLineId = req.body?.saleOrderLineId || null;
    const partner = await loadPartner(db, partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Patient not found', code: 'PATIENT_NOT_FOUND' });
    }

    // Validate sale_order_line_id ownership if provided
    if (saleOrderLineId) {
      const lineOwnership = await db(
        `SELECT sol.id
         FROM dbo.saleorderlines sol
         INNER JOIN dbo.saleorders s ON s.id = sol.orderid
         WHERE sol.id = $1 AND s.partnerid = $2`,
        [saleOrderLineId, partnerId]
      );

      if (!lineOwnership || lineOwnership.length === 0) {
        return res.status(400).json({
          error: 'Sale order line does not belong to this patient',
          code: 'SOL_NOT_OWNED',
        });
      }
    }

    const client = await getOrCreateMediaClient(partner);
    const media = await uploadExternalMedia(client.id, file, req.body || {});
    const category = req.body?.type || req.body?.category || media.category || 'general';
    const label = req.body?.label || media.label || '';

    await db(
      `INSERT INTO dbo.patient_media (partner_id, sale_order_line_id, media_service_id, media_url, category, label)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [partnerId, saleOrderLineId, media.media_service_id, media.media_url || media.signedUrl || null, category, label]
    );

    return res.status(201).json({
      success: true,
      client,
      media: {
        ...media,
        client_id: media.client_id || client.id,
        category,
        type: media.type || category,
        label,
        saleOrderLineId: saleOrderLineId || null,
      },
    });
  } catch (err) {
    console.error('[patientMedia] upload error:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Server error',
      code: err.status && err.status < 500 ? 'UPLOAD_FAILED' : 'SERVER_ERROR',
    });
  }
  }
);

router._test = {
  mergeMediaRows,
  normalizeMediaItem,
  searchKeysForPartner: require('../../services/mediaService').searchKeysForPartner,
};

module.exports = router;
