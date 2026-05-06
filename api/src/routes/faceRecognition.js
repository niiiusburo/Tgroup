const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');
const { getEmbedding, FaceEngineError } = require('../services/faceEngineClient');
const { findMatches, registerSample, getFaceStatus } = require('../services/faceMatchEngine');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function mapEngineError(err) {
  if (err instanceof FaceEngineError) {
    return { status: err.status || 422, code: err.code, message: err.message };
  }
  return { status: 500, code: 'ENGINE_ERROR', message: err.message || 'Face engine error' };
}

/**
 * POST /api/face/recognize
 * Body: multipart/form-data with field `image`
 * Returns: { match, candidates }
 */
router.post('/recognize', requirePermission('customers.view'), upload.single('image'), async (req, res) => {
  const start = Date.now();
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'MISSING_IMAGE', message: 'Missing image file' });
    }

    const { embedding, model, quality } = await getEmbedding(req.file.buffer, req.file.mimetype);
    const { match, candidates } = await findMatches(embedding);

    const duration = Date.now() - start;
    console.log(`[FaceRecognize] result=${match ? 'match' : candidates.length ? 'candidates' : 'no_match'} duration=${duration}ms`);

    return res.json({ match, candidates });
  } catch (err) {
    const mapped = mapEngineError(err);
    console.error('[FaceRecognize] error:', mapped.code, mapped.message);
    return res.status(mapped.status).json({ error: mapped.code, message: mapped.message });
  }
});

/**
 * POST /api/face/register
 * Body: multipart/form-data with fields `partnerId`, `image`
 * Optional: `source` (profile_register | no_match_rescue | candidate_confirmation)
 * Returns: { success, partnerId, sampleId, sampleCount, faceRegisteredAt }
 */
router.post('/register', requirePermission('customers.edit'), upload.single('image'), async (req, res) => {
  const start = Date.now();
  try {
    const { partnerId, source } = req.body || {};
    if (!partnerId) {
      return res.status(400).json({ error: 'MISSING_PARTNER_ID', message: 'Missing partnerId' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'MISSING_IMAGE', message: 'Missing image file' });
    }

    const partnerRows = await query(
      'SELECT id, name FROM dbo.partners WHERE id = $1 AND isdeleted = false',
      [partnerId]
    );
    if (!partnerRows || partnerRows.length === 0) {
      return res.status(404).json({ error: 'PARTNER_NOT_FOUND', message: 'Customer not found or deleted' });
    }

    const { embedding, model, quality } = await getEmbedding(req.file.buffer, req.file.mimetype);
    const imageSha256 = sha256Hex(req.file.buffer);
    const createdBy = req.user?.id || null;

    const { sampleId, sampleCount } = await registerSample(
      partnerId, embedding, quality, model, imageSha256, source, createdBy
    );

    const status = await getFaceStatus(partnerId);
    const duration = Date.now() - start;
    console.log(`[FaceRegister] partner=${partnerId} sample=${sampleId} count=${sampleCount} duration=${duration}ms`);

    return res.status(201).json({
      success: true,
      partnerId,
      sampleId,
      sampleCount,
      faceRegisteredAt: status.lastRegisteredAt,
    });
  } catch (err) {
    const mapped = mapEngineError(err);
    console.error('[FaceRegister] error:', mapped.code, mapped.message);
    return res.status(mapped.status).json({ error: mapped.code, message: mapped.message });
  }
});

/**
 * GET /api/face/status/:partnerId
 * Returns face registration status for a customer.
 */
router.get('/status/:partnerId', requirePermission('customers.view'), async (req, res) => {
  try {
    const { partnerId } = req.params;
    const partnerRows = await query(
      'SELECT id FROM dbo.partners WHERE id = $1 AND isdeleted = false',
      [partnerId]
    );
    if (!partnerRows || partnerRows.length === 0) {
      return res.status(404).json({ error: 'PARTNER_NOT_FOUND', message: 'Customer not found' });
    }

    const status = await getFaceStatus(partnerId);
    return res.json(status);
  } catch (err) {
    console.error('[FaceStatus] error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to load face status' });
  }
});

module.exports = router;
