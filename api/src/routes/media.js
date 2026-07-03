'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[/api/media mounted in api/src/server.js]
 * @crossref:uses[dbo.partners, dbo.saleorderlines, dbo.patient_media, MEDIA_SERVICE_URL, MEDIA_SERVICE_API_KEY]
 * Staff-facing media bridge: doctors upload/view patient photos tied to a service line.
 */
const express = require('express');
const { getQuery } = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const {
  getMediaConfig,
  loadPartner,
  getOrCreateMediaClient,
  normalizeMediaItem,
  listExternalMedia,
  uploadExternalMedia,
} = require('../services/mediaService');
const {
  uploadMultipleFields,
  normalizeFileField,
  createMediaUploadRateLimiter,
  handleMulterError,
} = require('../services/mediaUpload');

const router = express.Router();
const mediaRateLimiter = createMediaUploadRateLimiter();

async function loadSaleOrderLine(db, lineId) {
  const rows = await db(
    `SELECT sl.id, sl.orderid, sl.orderpartnerid as partner_id
     FROM dbo.saleorderlines sl
     WHERE sl.id = $1 AND COALESCE(sl.isdeleted, false) = false`,
    [lineId]
  );
  return rows && rows[0] ? rows[0] : null;
}

async function listMediaForPartner(db, partner, saleOrderLineId) {
  const conditions = ['partner_id = $1'];
  const params = [partner.id];
  let paramIdx = 2;

  if (saleOrderLineId) {
    conditions.push(`sale_order_line_id = $${paramIdx}`);
    params.push(saleOrderLineId);
    paramIdx++;
  }

  const localRows = await db(
    `SELECT id, sale_order_line_id, media_service_id, media_url, category, label, created_at
     FROM dbo.patient_media
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC`,
    params
  );

  const { url, apiKey } = getMediaConfig();
  if (!url || !apiKey) {
    return { media: localRows.map(normalizeMediaItem) };
  }

  const client = await getOrCreateMediaClient(partner);
  const externalRows = client ? await listExternalMedia(client.id) : [];

  // Filter external rows by service line when requested.
  let filteredExternal = externalRows;
  if (saleOrderLineId) {
    filteredExternal = externalRows.filter((row) => {
      const normalized = normalizeMediaItem(row);
      return normalized.saleOrderLineId === saleOrderLineId;
    });
  }

  return { client, media: [...localRows.map(normalizeMediaItem), ...filteredExternal.map(normalizeMediaItem)] };
}

/**
 * GET /api/media
 * Query: partnerId (required), saleOrderLineId (optional)
 * Returns media for the patient. When saleOrderLineId is provided, only media
 * linked to that service line is returned.
 */
router.get('/', requireAuth, requirePermission('patient_media.view'), async (req, res) => {
  try {
    const db = getQuery('dental');
    const { partnerId, saleOrderLineId } = req.query;
    if (!partnerId) {
      return res.status(400).json({ error: 'partnerId is required', code: 'MISSING_PARTNER_ID' });
    }

    const partner = await loadPartner(db, partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Patient not found', code: 'PATIENT_NOT_FOUND' });
    }

    if (saleOrderLineId) {
      const line = await loadSaleOrderLine(db, saleOrderLineId);
      if (!line || line.partner_id !== partner.id) {
        return res.status(404).json({ error: 'Service line not found for this patient', code: 'LINE_NOT_FOUND' });
      }
    }

    const { client, media } = await listMediaForPartner(db, partner, saleOrderLineId);
    return res.json({ success: true, client: client || undefined, media });
  } catch (err) {
    console.error('[staffMedia] list error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/media
 * Staff upload of a patient media file linked to a service line.
 * Body: multipart with file/image/photo field, partnerId, saleOrderLineId, type/category, label
 * Rate limited: 5 uploads per minute per authenticated staff member.
 * File size limit: 10 MB.
 * Allowed types: JPEG, PNG, WebP, HEIC, HEIF.
 */
router.post(
  '/',
  requireAuth,
  requirePermission('patient_media.upload'),
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

    const partnerId = req.body?.partnerId;
    const saleOrderLineId = req.body?.saleOrderLineId;
    if (!partnerId) {
      return res.status(400).json({ error: 'partnerId is required', code: 'MISSING_PARTNER_ID' });
    }

    const db = getQuery('dental');
    const partner = await loadPartner(db, partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Patient not found', code: 'PATIENT_NOT_FOUND' });
    }

    if (saleOrderLineId) {
      const line = await loadSaleOrderLine(db, saleOrderLineId);
      if (!line || line.partner_id !== partner.id) {
        return res.status(404).json({ error: 'Service line not found for this patient', code: 'LINE_NOT_FOUND' });
      }
    }

    const client = await getOrCreateMediaClient(partner);
    const media = await uploadExternalMedia(client.id, file, req.body || {});
    const category = req.body?.type || req.body?.category || media.category || 'general';
    const label = req.body?.label || media.label || '';

    await db(
      `INSERT INTO dbo.patient_media (partner_id, sale_order_line_id, media_service_id, media_url, category, label)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [partnerId, saleOrderLineId || null, media.media_service_id, media.media_url || media.signedUrl || null, category, label]
    );

    return res.status(201).json({
      success: true,
      client,
      media: {
        ...media,
        client_id: media.client_id || client.id,
        saleOrderLineId: saleOrderLineId || null,
        category,
        type: media.type || category,
        label,
      },
    });
  } catch (err) {
    console.error('[staffMedia] upload error:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Server error',
      code: err.status && err.status < 500 ? 'UPLOAD_FAILED' : 'SERVER_ERROR',
    });
  }
});

/**
 * DELETE /api/media/:id
 * Remove a cached patient media row. Does not delete from the external NK Photo service.
 */
router.delete('/:id', requireAuth, requirePermission('patient_media.upload'), async (req, res) => {
  try {
    const db = getQuery('dental');
    const { id } = req.params;
    await db(
      `DELETE FROM dbo.patient_media WHERE id = $1`,
      [id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('[staffMedia] delete error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
