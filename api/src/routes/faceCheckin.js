'use strict';

/**
 * @crossref:domain[integrations]
 * @crossref:public-route
 * @crossref:used-in[mounted at /api/public/face/checkin by api/src/server.js; frontend kiosk page website/src/pages/CheckIn/CheckIn.tsx]
 * @crossref:uses[api/src/services/faceRecognitionRuntime.js, api/src/services/faceMatchEngine.js, api/src/services/faceEngineClient.js, api/src/services/comprefaceFaceProvider.js]
 *
 * PUBLIC Face ID check-in endpoint. See docs/FACE-ID-SCOPE.md for the hard constraint.
 *
 * CRITICAL INVARIANTS (defense-in-depth):
 *  - NO authentication. Never require JWT or requirePermission.
 *  - Recognize-only. Never register / re-register / return embeddings.
 *  - Minimal PHI. Return greeting only (first name + last initial). Never phone, code, partnerId, score.
 *  - LOB-bound. Kiosk at a dental site only matches dental embeddings (and vice versa).
 *  - Rate-limited. Per-IP cap to prevent face-embedding harvesting.
 *  - No session. The response is a single greeting; nothing is issued that persists.
 */

const express = require('express');
const multer = require('multer');
const { getEmbedding, FaceEngineError } = require('../services/faceEngineClient');
const { findMatches, FaceQualityError } = require('../services/faceMatchEngine');
const { getFaceRecognitionProvider } = require('../services/faceRecognitionRuntime');
const comprefaceFaceProvider = require('../services/comprefaceFaceProvider');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// === Rate limiter (per-IP, in-memory) ===========================================
// Caps abuse: a public face endpoint could otherwise be hammered to harvest
// embedding matches or DoS the face-service. In-memory is sufficient for a
// single-node NK/NK3 container deploy; move to Redis if we ever scale horizontally.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;      // 1 minute
const RATE_LIMIT_MAX_HITS = 10;              // 10 check-ins/min/IP
const RATE_LIMIT_MAX_HITS_BURST = 5;         // ...allow short burst of 5 in 5s
const RATE_LIMIT_BURST_WINDOW_MS = 5 * 1000;

const rateBuckets = new Map();   // ip -> [{ ts }]
const burstBuckets = new Map();  // ip -> [{ ts }]

function pruneBucket(map, ip, windowMs, now) {
  const arr = map.get(ip);
  if (!arr) return [];
  const fresh = arr.filter((t) => now - t < windowMs);
  if (fresh.length === 0) map.delete(ip);
  else map.set(ip, fresh);
  return fresh;
}

function rateLimiter(req, res, next) {
  const ip = (req.ip || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
  const now = Date.now();

  // Burst check (5 / 5s)
  const burst = pruneBucket(burstBuckets, ip, RATE_LIMIT_BURST_WINDOW_MS, now);
  if (burst.length >= RATE_LIMIT_MAX_HITS_BURST) {
    return res.status(429).json({ ok: false, reason: 'rate_limited', message: 'Too fast. Please wait a moment.' });
  }

  // Sustained check (10 / 60s)
  const sustained = pruneBucket(rateBuckets, ip, RATE_LIMIT_WINDOW_MS, now);
  if (sustained.length >= RATE_LIMIT_MAX_HITS) {
    return res.status(429).json({ ok: false, reason: 'rate_limited', message: 'Too many attempts. Please wait a minute.' });
  }

  burst.push(now); burstBuckets.set(ip, burst);
  sustained.push(now); rateBuckets.set(ip, sustained);
  return next();
}

// === Helpers ====================================================================

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

/**
 * Reduce a full name to a minimal greeting: "Lan Nguyen" -> "Lan N."
 * If the name is empty/unparseable, return null (kiosk shows generic greeting).
 *
 * PHI minimization per docs/FACE-ID-SCOPE.md §Architecture invariants #6.
 */
function nameToGreeting(rawName) {
  if (!rawName || typeof rawName !== 'string') return null;
  const trimmed = rawName.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0];
  if (parts.length === 1) return first;
  const lastInitial = parts[parts.length - 1][0] || '';
  return lastInitial ? `${first} ${lastInitial.toUpperCase()}.` : first;
}

/**
 * POST /api/public/face/checkin
 *
 * Body: multipart/form-data with field `image`.
 *
 * Public, no-auth, recognize-only. Returns a minimal greeting on match.
 *
 * 200 { ok: true,  result: 'match',     greeting: 'Lan N.' }    // recognized
 * 200 { ok: true,  result: 'no_match' }                          // not recognized
 * 200 { ok: true,  result: 'multiple',  candidates: 2 }          // ambiguous (count only)
 * 400 { ok: false, reason: 'MISSING_IMAGE', message }
 * 422 { ok: false, reason: 'LOW_QUALITY_FACE'|<engine code>, message }
 * 429 { ok: false, reason: 'rate_limited', message }
 * 500 { ok: false, reason: 'ENGINE_ERROR', message }
 */
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
    console.log(`[FaceCheckIn/public] result=${match ? 'match' : candidates.length ? 'multiple' : 'no_match'} duration=${duration}ms ip=${(req.ip || '').replace(/^::ffff:/, '')}`);

    if (match) {
      const greeting = nameToGreeting(match.name);
      return res.json(greeting
        ? { ok: true, result: 'match', greeting }
        : { ok: true, result: 'match', greeting: null });
    }
    if (candidates && candidates.length > 0) {
      // Ambiguous: return only the COUNT, never the candidate identities.
      return res.json({ ok: true, result: 'multiple', candidates: candidates.length });
    }
    return res.json({ ok: true, result: 'no_match' });
  } catch (err) {
    const mapped = mapEngineError(err);
    console.error('[FaceCheckIn/public] error:', mapped.code, mapped.message);
    return res.status(mapped.status).json({ ok: false, reason: mapped.code, message: mapped.message });
  }
});

// Test-only hook: clears in-memory rate-limit buckets. Never called in prod.
// Used by faceCheckin.test.js beforeEach to isolate tests from each other.
function __testReset() {
  rateBuckets.clear();
  burstBuckets.clear();
}

module.exports = router;
module.exports.__testReset = __testReset;
