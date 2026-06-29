"use strict";

const { query, pool } = require("../db");
const { buildFaceReadiness } = require("./faceReadinessScore");

// Thresholds (environment-configurable). Defaults tightened 2026-06-29,
// ambiguity gate re-landed 2026-07-02:
//   - AUTO_MATCH_THRESHOLD 0.92: close scans below this become candidate/no-match
//     instead of automatically opening a customer.
//   - AUTO_MATCH_MARGIN 0.05: the best customer must clearly beat the runner-up.
//   - CANDIDATE_THRESHOLD 0.84: weaker plausible hits are treated as rescan-only.
//   - AMBIGUOUS_MATCH_MARGIN 0.06: when the top two plausible customers are
//     within this margin, do not auto-match and do not offer a candidate list —
//     two different people this close in embedding space cannot be told apart
//     reliably, so force a rescan instead.
//   - MIN_QUALITY: low-quality samples poison the embedding pool and
//     prevent future matches against that customer.
const FACE_RECOGNITION_VERSION = process.env.FACE_RECOGNITION_VERSION || "face-recognition-0.32.59";
const AUTO_MATCH_THRESHOLD = parseFloat(process.env.FACE_AUTO_MATCH_THRESHOLD || "0.92");
const CANDIDATE_THRESHOLD = parseFloat(process.env.FACE_CANDIDATE_THRESHOLD || "0.84");
const AUTO_MATCH_MARGIN = parseFloat(process.env.FACE_AUTO_MATCH_MARGIN || "0.05");
const AMBIGUOUS_MATCH_MARGIN = parseFloat(process.env.FACE_AMBIGUOUS_MATCH_MARGIN || "0.06");
const MAX_CANDIDATES = parseInt(process.env.FACE_MAX_CANDIDATES || "3", 10);
const MIN_QUALITY = parseFloat(process.env.FACE_MIN_QUALITY || "0.55");

function policyDiagnostics() {
  return {
    autoMatchThreshold: AUTO_MATCH_THRESHOLD,
    candidateThreshold: CANDIDATE_THRESHOLD,
    autoMatchMargin: AUTO_MATCH_MARGIN,
    ambiguousMatchMargin: AMBIGUOUS_MATCH_MARGIN,
    maxCandidates: MAX_CANDIDATES,
    minQuality: MIN_QUALITY,
  };
}

class FaceQualityError extends Error {
  constructor(message, detectionScore) {
    super(message);
    this.name = "FaceQualityError";
    this.code = "LOW_QUALITY_FACE";
    this.status = 422;
    this.detectionScore = detectionScore;
  }
}

/**
 * Cosine similarity between two embeddings (both 1-D arrays).
 * SFace embeddings are L2-normalized, so cosine similarity = dot product.
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/**
 * L2-normalize an embedding vector in place and return it.
 */
function l2Normalize(vec) {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < vec.length; i++) vec[i] = vec[i] / norm;
  return vec;
}

/**
 * Compute centroid (mean) embedding from a list of same-customer embeddings,
 * then L2-normalize so cosine similarity vs the centroid is a fair score.
 */
function computeCentroid(embeddings) {
  if (!embeddings || embeddings.length === 0) return null;
  const dim = embeddings[0].length;
  const sum = new Array(dim).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) sum[i] += emb[i];
  }
  for (let i = 0; i < dim; i++) sum[i] /= embeddings.length;
  return l2Normalize(sum);
}

function roundScore(score) {
  return parseFloat(score.toFixed(4));
}

function toCandidate(c) {
  return {
    partnerId: c.partnerId,
    name: c.name,
    code: c.code,
    phone: c.phone,
    confidence: roundScore(c.score),
  };
}

function withRecognitionVersion(result) {
  return {
    ...result,
    recognitionVersion: FACE_RECOGNITION_VERSION,
  };
}

/**
 * Shared decision ladder for both providers (local + Compreface).
 * Order matters: the ambiguity gate must run BEFORE auto-match so two
 * different customers scoring within AMBIGUOUS_MATCH_MARGIN can never
 * auto-populate a name or appear as pickable candidates.
 *
 * baseDiagnostics: provider-specific context merged into privateDiagnostics.
 * opts.emptyReasonCode: reasonCode when nothing scored (provider-specific).
 */
function buildRecognitionResult(scored, baseDiagnostics = {}, opts = {}) {
  const sorted = scored
    .filter((c) => Number.isFinite(c.score))
    .sort((a, b) => b.score - a.score);

  const top = sorted[0];
  const second = sorted[1];

  if (!top) {
    return withRecognitionVersion({
      status: "no_match",
      match: null,
      candidates: [],
      privateDiagnostics: {
        ...baseDiagnostics,
        reasonCode: opts.emptyReasonCode || "NO_SCORE_ABOVE_CANDIDATE_THRESHOLD",
      },
    });
  }

  const secondIsPlausible = second && second.score >= CANDIDATE_THRESHOLD;
  if (
    top.score >= CANDIDATE_THRESHOLD &&
    secondIsPlausible &&
    top.score - second.score < AMBIGUOUS_MATCH_MARGIN
  ) {
    return withRecognitionVersion({
      status: "ambiguous",
      match: null,
      candidates: [],
      ambiguity: {
        code: "AMBIGUOUS_FACE_MATCH",
        message: "Face match is ambiguous; rescan with one centered face",
        margin: roundScore(top.score - second.score),
        requiredMargin: roundScore(AMBIGUOUS_MATCH_MARGIN),
        candidates: [toCandidate(top), toCandidate(second)],
      },
      privateDiagnostics: {
        ...baseDiagnostics,
        reasonCode: "AMBIGUOUS_CLOSE_IDENTITIES",
      },
    });
  }

  // Auto-match: top score >= threshold AND beats second by margin
  if (
    top.score >= AUTO_MATCH_THRESHOLD &&
    (!second || top.score - second.score >= AUTO_MATCH_MARGIN)
  ) {
    return withRecognitionVersion({
      status: "auto_matched",
      match: toCandidate(top),
      candidates: [],
      privateDiagnostics: {
        ...baseDiagnostics,
        reasonCode: second ? "AUTO_MATCH_MARGIN_CONFIRMED" : "AUTO_MATCH_SINGLE_CANDIDATE",
      },
    });
  }

  // Candidate review: top score >= candidate threshold, but not ambiguous.
  if (top.score >= CANDIDATE_THRESHOLD) {
    const candidates = sorted
      .filter((c) => c.score >= CANDIDATE_THRESHOLD)
      .slice(0, MAX_CANDIDATES)
      .map(toCandidate);
    return withRecognitionVersion({
      status: "candidates",
      match: null,
      candidates,
      privateDiagnostics: {
        ...baseDiagnostics,
        reasonCode: second ? "AMBIGUOUS_MARGIN_TOO_SMALL" : "CANDIDATE_BELOW_AUTO_THRESHOLD",
      },
    });
  }

  return withRecognitionVersion({
    status: "no_match",
    match: null,
    candidates: [],
    privateDiagnostics: {
      ...baseDiagnostics,
      reasonCode: "NO_SCORE_ABOVE_CANDIDATE_THRESHOLD",
    },
  });
}

/**
 * Compare one embedding against all active customer embeddings.
 * Scoring per customer uses MAX(best-sample, centroid) so that:
 *   - A close-match to any one captured pose wins (sample-best),
 *   - AND the averaged identity also gets a vote (centroid),
 *   - Whichever is higher decides — protects against both pose variance
 *     and a single noisy sample dragging the customer down.
 *
 * Returns: { match, candidates, privateDiagnostics }
 *   match: best customer when auto-match rules pass
 *   candidates: up to MAX_CANDIDATES when plausible but not safe
 */
async function findMatches(embedding) {
  const rows = await query(
    `SELECT cfe.partner_id, cfe.embedding, p.name, p.phone, p.ref AS code
     FROM dbo.customer_face_embeddings cfe
     JOIN dbo.partners p ON p.id = cfe.partner_id
     WHERE cfe.is_active = true
       AND p.isdeleted = false
     ORDER BY cfe.partner_id`
  );

  if (!rows || rows.length === 0) {
    return withRecognitionVersion({
      status: "no_match",
      match: null,
      candidates: [],
      privateDiagnostics: {
        provider: "local",
        policy: policyDiagnostics(),
        reasonCode: "NO_REGISTERED_SAMPLES",
        candidatesConsidered: 0,
        topCandidates: [],
      },
    });
  }

  // Group all active embeddings per customer.
  const customerGroups = new Map();
  for (const row of rows) {
    if (!customerGroups.has(row.partner_id)) {
      customerGroups.set(row.partner_id, {
        partnerId: row.partner_id,
        name: row.name,
        phone: row.phone,
        code: row.code || "",
        embeddings: [],
      });
    }
    customerGroups.get(row.partner_id).embeddings.push(row.embedding);
  }

  // Score: max(best-sample, centroid). Centroid only useful with ≥2 samples.
  const scored = Array.from(customerGroups.values()).map((c) => {
    let bestSample = -1;
    for (const emb of c.embeddings) {
      const s = cosineSimilarity(embedding, emb);
      if (s > bestSample) bestSample = s;
    }
    let centroidScore = -1;
    if (c.embeddings.length >= 2) {
      const centroid = computeCentroid(c.embeddings);
      centroidScore = cosineSimilarity(embedding, centroid);
    }
    return {
      partnerId: c.partnerId,
      name: c.name,
      phone: c.phone,
      code: c.code,
      score: Math.max(bestSample, centroidScore),
      sampleCount: c.embeddings.length,
    };
  });

  // Sort descending by score (diagnostics only; buildRecognitionResult re-sorts)
  const sorted = [...scored].sort((a, b) => b.score - a.score);

  const top = sorted[0];
  const second = sorted[1];
  const scoreMargin = top && second ? top.score - second.score : null;
  const baseDiagnostics = {
    provider: "local",
    policy: policyDiagnostics(),
    model: { recognizer: "sface" },
    candidatesConsidered: sorted.length,
    scoreMargin,
    topCandidates: sorted.slice(0, MAX_CANDIDATES).map((c, index) => ({
      rank: index + 1,
      partnerId: c.partnerId,
      score: c.score,
      sampleCount: c.sampleCount,
    })),
  };

  return buildRecognitionResult(scored, baseDiagnostics);
}

/**
 * Reject samples whose detection score is below MIN_QUALITY.
 * Without this gate, blurry / low-light captures pollute the embedding
 * pool and cause that customer to stop matching future good captures.
 */
function assertQuality(quality) {
  const score = quality?.detectionScore;
  if (typeof score === "number" && score < MIN_QUALITY) {
    throw new FaceQualityError(
      `Face quality ${score.toFixed(2)} below minimum ${MIN_QUALITY.toFixed(2)}`,
      score
    );
  }
}

/**
 * Insert a new face embedding sample for a customer.
 * Enforces minimum quality.
 */
async function registerSample(partnerId, embedding, quality, modelMeta, imageSha256, source, createdBy) {
  assertQuality(quality);

  const detectionScore = quality?.detectionScore ?? null;
  const faceBox = quality?.box ? JSON.stringify(quality.box) : null;

  const insertRes = await query(
    `INSERT INTO dbo.customer_face_embeddings
     (partner_id, embedding, detection_score, face_box, image_sha256, source, model_name, model_version, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      partnerId,
      embedding,
      detectionScore,
      faceBox,
      imageSha256 || null,
      source || "manual_capture",
      modelMeta?.recognizer || "sface",
      modelMeta?.version || "opencv-sface-2021",
      createdBy || null,
    ]
  );

  const sampleId = insertRes[0]?.id;

  await query(
    `UPDATE dbo.partners
     SET face_subject_id = COALESCE(face_subject_id, $1::text),
         face_registered_at = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
     WHERE id = $1::uuid`,
    [partnerId]
  );

  const countRes = await query(
    `SELECT COUNT(*)::int AS cnt FROM dbo.customer_face_embeddings
     WHERE partner_id = $1 AND is_active = true`,
    [partnerId]
  );

  return { sampleId, sampleCount: countRes[0]?.cnt || 1 };
}

/**
 * Replace all active embeddings for a customer with the supplied batch,
 * inside a single transaction. Old samples are soft-deleted (is_active=false)
 * so audit history is preserved. Used by the "Re-add Face" flow.
 *
 * samples: [{ embedding, quality, modelMeta, imageSha256, source }, ...]
 */
async function replaceAllSamples(partnerId, samples, createdBy) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("replaceAllSamples requires at least one sample");
  }
  for (const s of samples) assertQuality(s.quality);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE dbo.customer_face_embeddings
       SET is_active = false
       WHERE partner_id = $1 AND is_active = true`,
      [partnerId]
    );

    const insertedIds = [];
    for (const s of samples) {
      const detectionScore = s.quality?.detectionScore ?? null;
      const faceBox = s.quality?.box ? JSON.stringify(s.quality.box) : null;
      const ins = await client.query(
        `INSERT INTO dbo.customer_face_embeddings
         (partner_id, embedding, detection_score, face_box, image_sha256, source, model_name, model_version, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          partnerId,
          s.embedding,
          detectionScore,
          faceBox,
          s.imageSha256 || null,
          s.source || "profile_reregister",
          s.modelMeta?.recognizer || "sface",
          s.modelMeta?.version || "opencv-sface-2021",
          createdBy || null,
        ]
      );
      insertedIds.push(ins.rows[0]?.id);
    }

    await client.query(
      `UPDATE dbo.partners
       SET face_subject_id = COALESCE(face_subject_id, $1::text),
           face_registered_at = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
       WHERE id = $1::uuid`,
      [partnerId]
    );

    await client.query("COMMIT");
    return { sampleIds: insertedIds, sampleCount: insertedIds.length };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get face registration status for a customer.
 */
async function getFaceStatus(partnerId) {
  const rows = await query(
    `SELECT COUNT(*)::int AS cnt,
            MAX(created_at) AS last_at,
            AVG(detection_score)::float AS avg_detection_score
     FROM dbo.customer_face_embeddings
     WHERE partner_id = $1 AND is_active = true`,
    [partnerId]
  );

  const partnerRows = await query(
    `SELECT face_registered_at FROM dbo.partners WHERE id = $1 AND isdeleted = false`,
    [partnerId]
  );

  const sampleCount = rows[0]?.cnt || 0;
  return {
    partnerId,
    registered: sampleCount > 0,
    sampleCount,
    lastRegisteredAt: rows[0]?.last_at || partnerRows[0]?.face_registered_at || null,
    provider: "local",
    readiness: buildFaceReadiness({
      registered: sampleCount > 0,
      sampleCount,
      avgDetectionScore: rows[0]?.avg_detection_score ?? null,
    }),
  };
}

module.exports = {
  findMatches,
  registerSample,
  replaceAllSamples,
  getFaceStatus,
  cosineSimilarity,
  computeCentroid,
  buildRecognitionResult,
  FaceQualityError,
  FACE_RECOGNITION_VERSION,
  AUTO_MATCH_THRESHOLD,
  CANDIDATE_THRESHOLD,
  AUTO_MATCH_MARGIN,
  AMBIGUOUS_MATCH_MARGIN,
  MAX_CANDIDATES,
  MIN_QUALITY,
};
