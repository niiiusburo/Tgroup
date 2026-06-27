'use strict';

/**
 * @crossref:domain[integrations customers-partners]
 * @crossref:route[POST /api/public/face/checkin]
 * @crossref:used-in[website/src/pages/CheckIn/CheckIn.tsx public kiosk, website/src/lib/api/partners.ts publicFaceCheckIn]
 * @crossref:uses[api/src/services/faceRecognitionRuntime.js, api/src/services/faceMatchEngine.js, api/src/services/faceEngineClient.js, api/src/services/comprefaceFaceProvider.js, docs/FACE-ID-SCOPE.md]
 *
 * Public Face ID kiosk endpoint.
 *
 * Invariants:
 * - no JWT or requirePermission gate;
 * - recognize-only, never register/re-register;
 * - never return partnerId, phone, customer code, candidate identities, or scores;
 * - rate limited per IP.
 */

const express = require('express');
const multer = require('multer');
const { getEmbedding, FaceEngineError } = require('../services/faceEngineClient');
const { findMatches, FaceQualityError } = require('../services/faceMatchEngine');
const { getFaceRecognitionProvider } = require('../services/faceRecognitionRuntime');
const comprefaceFaceProvider = require('../services/comprefaceFaceProvider');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_HITS = 10;
const RATE_LIMIT_BURST_WINDOW_MS = 5 * 1000;
const RATE_LIMIT_MAX_HITS_BURST = 5;

const rateBuckets = new Map();
const burstBuckets = new Map();

function pruneBucket(map, ip, windowMs, now) {
  const hits = map.get(ip);
  if (!hits) return [];
  const fresh = hits.filter((timestamp) => now - timestamp < windowMs);
  if (fresh.length === 0) map.delete(ip);
  else map.set(ip, fresh);
  return fresh;
}

function rateLimiter(req, res, next) {
  const ip = (req.ip || req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, '');
  const now = Date.now();

  const burst = pruneBucket(burstBuckets, ip, RATE_LIMIT_BURST_WINDOW_MS, now);
  if (burst.length >= RATE_LIMIT_MAX_HITS_BURST) {
    return res.status(429).json({
      ok: false,
      reason: 'rate_limited',
      message: 'Too fast. Please wait a moment.',
    });
  }

  const sustained = pruneBucket(rateBuckets, ip, RATE_LIMIT_WINDOW_MS, now);
  if (sustained.length >= RATE_LIMIT_MAX_HITS) {
    return res.status(429).json({
      ok: false,
      reason: 'rate_limited',
      message: 'Too many attempts. Please wait a minute.',
    });
  }

  burst.push(now);
  burstBuckets.set(ip, burst);
  sustained.push(now);
  rateBuckets.set(ip, sustained);
  return next();
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

function nameToGreeting(rawName) {
  if (!rawName || typeof rawName !== 'string') return null;
  const parts = rawName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0];
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return lastInitial ? `${first} ${lastInitial.toUpperCase()}.` : first;
}

router.post('/checkin', rateLimiter, upload.single('image'), async (req, res) => {
  const start = Date.now();
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, reason: 'MISSING_IMAGE', message: 'Missing image file' });
    }

    const { match, candidates } = isComprefaceProvider()
      ? await comprefaceFaceProvider.recognizeFace(req.file.buffer, req.file.mimetype)
      : await (async () => {
          const { embedding } = await getEmbedding(req.file.buffer, req.file.mimetype);
          return findMatches(embedding);
        })();

    const duration = Date.now() - start;
    console.log(
      `[FaceCheckIn/public] result=${match ? 'match' : candidates.length ? 'multiple' : 'no_match'} duration=${duration}ms ip=${(req.ip || '').replace(/^::ffff:/, '')}`
    );

    if (match) {
      return res.json({ ok: true, result: 'match', greeting: nameToGreeting(match.name) });
    }
    if (candidates.length > 0) {
      return res.json({ ok: true, result: 'multiple', candidates: candidates.length });
    }
    return res.json({ ok: true, result: 'no_match' });
  } catch (err) {
    const mapped = mapEngineError(err);
    console.error('[FaceCheckIn/public] error:', mapped.code, mapped.message);
    return res.status(mapped.status).json({ ok: false, reason: mapped.code, message: mapped.message });
  }
});

function __testReset() {
  rateBuckets.clear();
  burstBuckets.clear();
}

module.exports = router;
module.exports.__testReset = __testReset;
