const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');
const { getEmbedding, FaceEngineError } = require('../services/faceEngineClient');
const { findMatches, registerSample, replaceAllSamples, getFaceStatus, FaceQualityError } = require('../services/faceMatchEngine');
const { getFaceRecognitionProvider } = require('../services/faceRecognitionRuntime');
const comprefaceFaceProvider = require('../services/comprefaceFaceProvider');
const { recordFaceDiagnostic } = require('../services/faceDiagnostics');
const { resolveInvestorScope } = require('../services/permissionService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const FACE_RECOGNITION_VERSION = 'face-recognition-0.32.51';

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function isInstance(err, Ctor) {
  return typeof Ctor === 'function' && err instanceof Ctor;
}

function mapEngineError(err) {
  if (
    isInstance(err, FaceEngineError) ||
    isInstance(err, FaceQualityError) ||
    isInstance(err, comprefaceFaceProvider.ComprefaceFaceError)
  ) {
    return { status: err.status || 422, code: err.code, message: err.message };
  }
  return { status: 500, code: 'ENGINE_ERROR', message: err.message || 'Face engine error' };
}

function isComprefaceProvider() {
  return getFaceRecognitionProvider() === 'compreface';
}

function isAllowedForInvestor(investorScope, partnerId) {
  return !investorScope.isInvestor || investorScope.allowedCustomerIds.includes(partnerId);
}

function filterRecognitionForInvestor(recognition, investorScope) {
  if (!investorScope.isInvestor) return recognition;

  const allowedIds = new Set(investorScope.allowedCustomerIds);
  const candidates = (recognition.candidates || []).filter((c) => allowedIds.has(c.partnerId));
  const match = recognition.match && allowedIds.has(recognition.match.partnerId)
    ? recognition.match
    : null;

  return {
    ...recognition,
    match,
    candidates: match ? [] : candidates,
    privateDiagnostics: {
      ...(recognition.privateDiagnostics || {}),
      investorScopeFiltered: true,
      investorAllowedCount: investorScope.allowedCustomerIds.length,
      returnedCandidateCount: match ? 0 : candidates.length,
      returnedMatch: Boolean(match),
    },
  };
}

async function assertInvestorPartnerAccess(req, res, partnerId) {
  const investorScope = await resolveInvestorScope(req.user?.employeeId);
  if (!isAllowedForInvestor(investorScope, partnerId)) {
    res.status(403).json({
      error: 'E_INVESTOR_CUSTOMER_NOT_ALLOWED',
      message: 'Bạn không có quyền với khách hàng này',
    });
    return null;
  }
  return investorScope;
}

/**
 * POST /api/face/recognize
 * Body: multipart/form-data with field `image`
 * Returns: { match, candidates, recognitionVersion }
 */
router.post('/recognize', requirePermission('customers.view'), upload.single('image'), async (req, res) => {
  const start = Date.now();
  const provider = isComprefaceProvider() ? 'compreface' : 'local';
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'MISSING_IMAGE', message: 'Missing image file' });
    }

    let engine = null;
    const rawRecognition = provider === 'compreface'
      ? await comprefaceFaceProvider.recognizeFace(req.file.buffer, req.file.mimetype)
      : await (async () => {
          const { embedding, model, quality } = await getEmbedding(req.file.buffer, req.file.mimetype);
          engine = { model, quality };
          return findMatches(embedding);
        })();
    const investorScope = await resolveInvestorScope(req.user?.employeeId);
    const recognition = filterRecognitionForInvestor(rawRecognition, investorScope);
    const { match, candidates, privateDiagnostics } = recognition;

    const duration = Date.now() - start;
    await recordFaceDiagnostic({
      flow: 'staff_recognize',
      req,
      provider,
      image: req.file,
      recognition: { match, candidates },
      privateDiagnostics,
      engine,
      durationMs: duration,
    });

    console.log(`[FaceRecognize] version=${FACE_RECOGNITION_VERSION} result=${match ? 'match' : candidates.length ? 'candidates' : 'no_match'} duration=${duration}ms`);

    return res.json({ match, candidates, recognitionVersion: FACE_RECOGNITION_VERSION });
  } catch (err) {
    const mapped = mapEngineError(err);
    await recordFaceDiagnostic({
      flow: 'staff_recognize',
      req,
      provider,
      image: req.file,
      durationMs: Date.now() - start,
      error: mapped,
    });
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
    const investorAccess = await assertInvestorPartnerAccess(req, res, partnerId);
    if (!investorAccess) return null;

    let sampleId;
    let sampleCount;
    let status;
    if (isComprefaceProvider()) {
      const result = await comprefaceFaceProvider.registerFace(partnerId, req.file.buffer, req.file.mimetype);
      sampleId = result.sampleId;
      sampleCount = result.sampleCount;
      status = { lastRegisteredAt: result.faceRegisteredAt };
    } else {
      const { embedding, model, quality } = await getEmbedding(req.file.buffer, req.file.mimetype);
      const imageSha256 = sha256Hex(req.file.buffer);
      const createdBy = req.user?.id || null;

      const result = await registerSample(
        partnerId, embedding, quality, model, imageSha256, source, createdBy
      );
      sampleId = result.sampleId;
      sampleCount = result.sampleCount;
      status = await getFaceStatus(partnerId);
    }
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
 * POST /api/face/re-register
 * Body: multipart/form-data with `partnerId` and 1-7 `images` files
 * Optional: `source` (defaults to 'profile_reregister')
 * Local provider soft-deletes active embeddings and inserts the new batch atomically.
 * Compreface provider deletes/recreates the subject and uploads the new examples.
 * Returns: { success, partnerId, sampleIds, sampleCount, faceRegisteredAt }
 */
router.post(
  '/re-register',
  requirePermission('customers.edit'),
  upload.array('images', 7),
  async (req, res) => {
    const start = Date.now();
    try {
      const { partnerId, source } = req.body || {};
      if (!partnerId) {
        return res.status(400).json({ error: 'MISSING_PARTNER_ID', message: 'Missing partnerId' });
      }
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'MISSING_IMAGES', message: 'At least one image required' });
      }

      const partnerRows = await query(
        'SELECT id, name FROM dbo.partners WHERE id = $1 AND isdeleted = false',
        [partnerId]
      );
      if (!partnerRows || partnerRows.length === 0) {
        return res.status(404).json({ error: 'PARTNER_NOT_FOUND', message: 'Customer not found or deleted' });
      }
      const investorAccess = await assertInvestorPartnerAccess(req, res, partnerId);
      if (!investorAccess) return null;

      let sampleIds;
      let sampleCount;
      let status;
      if (isComprefaceProvider()) {
        const result = await comprefaceFaceProvider.replaceFaceSamples(partnerId, req.files);
        sampleIds = result.sampleIds;
        sampleCount = result.sampleCount;
        status = { lastRegisteredAt: result.faceRegisteredAt };
      } else {
        const samples = [];
        for (const file of req.files) {
          const { embedding, model, quality } = await getEmbedding(file.buffer, file.mimetype);
          samples.push({
            embedding,
            quality,
            modelMeta: model,
            imageSha256: sha256Hex(file.buffer),
            source: source || 'profile_reregister',
          });
        }

        const createdBy = req.user?.id || null;
        const result = await replaceAllSamples(partnerId, samples, createdBy);
        sampleIds = result.sampleIds;
        sampleCount = result.sampleCount;
        status = await getFaceStatus(partnerId);
      }

      const duration = Date.now() - start;
      console.log(
        `[FaceReRegister] partner=${partnerId} replaced count=${sampleCount} duration=${duration}ms`
      );

      return res.status(201).json({
        success: true,
        partnerId,
        sampleIds,
        sampleCount,
        faceRegisteredAt: status.lastRegisteredAt,
      });
    } catch (err) {
      const mapped = mapEngineError(err);
      console.error('[FaceReRegister] error:', mapped.code, mapped.message);
      return res.status(mapped.status).json({ error: mapped.code, message: mapped.message });
    }
  }
);

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
    const investorAccess = await assertInvestorPartnerAccess(req, res, partnerId);
    if (!investorAccess) return null;

    const status = isComprefaceProvider()
      ? await comprefaceFaceProvider.getFaceStatus(partnerId)
      : await getFaceStatus(partnerId);
    return res.json(status);
  } catch (err) {
    const mapped = mapEngineError(err);
    console.error('[FaceStatus] error:', mapped.code, mapped.message);
    if (mapped.code === 'ENGINE_ERROR') {
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to load face status' });
    }
    return res.status(mapped.status).json({ error: mapped.code, message: mapped.message });
  }
});

module.exports = router;
