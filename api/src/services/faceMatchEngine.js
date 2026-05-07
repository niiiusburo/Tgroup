"use strict";

const { query } = require("../db");

// Thresholds (environment-configurable with conservative defaults)
const AUTO_MATCH_THRESHOLD = parseFloat(process.env.FACE_AUTO_MATCH_THRESHOLD || "0.50");
const CANDIDATE_THRESHOLD = parseFloat(process.env.FACE_CANDIDATE_THRESHOLD || "0.363");
const AUTO_MATCH_MARGIN = parseFloat(process.env.FACE_AUTO_MATCH_MARGIN || "0.05");
const MAX_CANDIDATES = parseInt(process.env.FACE_MAX_CANDIDATES || "3", 10);

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
 * Compare one embedding against all active customer embeddings.
 * Returns: { match, candidates }
 *   match: best customer when auto-match rules pass
 *   candidates: up to MAX_CANDIDATES when plausible but not safe
 */
async function findMatches(embedding) {
  const rows = await query(
    `SELECT cfe.id, cfe.partner_id, cfe.embedding, p.name, p.phone, p.ref AS code
     FROM dbo.customer_face_embeddings cfe
     JOIN dbo.partners p ON p.id = cfe.partner_id
     WHERE cfe.is_active = true
       AND p.isdeleted = false
     ORDER BY cfe.partner_id`
  );

  if (!rows || rows.length === 0) {
    return { match: null, candidates: [] };
  }

  // Score each sample, then group by customer and take best sample score
  const sampleScores = rows.map((row) => ({
    partnerId: row.partner_id,
    name: row.name,
    phone: row.phone,
    code: row.code || "",
    score: cosineSimilarity(embedding, row.embedding),
  }));

  // Group by partnerId, keep best score per customer
  const customerBest = new Map();
  for (const s of sampleScores) {
    const existing = customerBest.get(s.partnerId);
    if (!existing || s.score > existing.score) {
      customerBest.set(s.partnerId, s);
    }
  }

  // Sort descending by score
  const sorted = Array.from(customerBest.values()).sort((a, b) => b.score - a.score);

  const top = sorted[0];
  const second = sorted[1];

  // Auto-match: top score >= threshold AND beats second by margin
  if (
    top &&
    top.score >= AUTO_MATCH_THRESHOLD &&
    (!second || top.score - second.score >= AUTO_MATCH_MARGIN)
  ) {
    return {
      match: {
        partnerId: top.partnerId,
        name: top.name,
        code: top.code,
        phone: top.phone,
        confidence: parseFloat(top.score.toFixed(4)),
      },
      candidates: [],
    };
  }

  // Candidate review: top score >= candidate threshold
  if (top && top.score >= CANDIDATE_THRESHOLD) {
    const candidates = sorted
      .filter((c) => c.score >= CANDIDATE_THRESHOLD)
      .slice(0, MAX_CANDIDATES)
      .map((c) => ({
        partnerId: c.partnerId,
        name: c.name,
        code: c.code,
        phone: c.phone,
        confidence: parseFloat(c.score.toFixed(4)),
      }));
    return { match: null, candidates };
  }

  return { match: null, candidates: [] };
}

/**
 * Insert a new face embedding sample for a customer.
 */
async function registerSample(partnerId, embedding, quality, modelMeta, imageSha256, source, createdBy) {
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

  // Update partner face status
  await query(
    `UPDATE dbo.partners
     SET face_subject_id = COALESCE(face_subject_id, $1::text),
         face_registered_at = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
     WHERE id = $1::uuid`,
    [partnerId]
  );

  // Count active samples
  const countRes = await query(
    `SELECT COUNT(*)::int AS cnt FROM dbo.customer_face_embeddings
     WHERE partner_id = $1 AND is_active = true`,
    [partnerId]
  );

  return { sampleId, sampleCount: countRes[0]?.cnt || 1 };
}

/**
 * Get face registration status for a customer.
 */
async function getFaceStatus(partnerId) {
  const rows = await query(
    `SELECT COUNT(*)::int AS cnt,
            MAX(created_at) AS last_at
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
  };
}

module.exports = {
  findMatches,
  registerSample,
  getFaceStatus,
  cosineSimilarity,
  AUTO_MATCH_THRESHOLD,
  CANDIDATE_THRESHOLD,
  AUTO_MATCH_MARGIN,
  MAX_CANDIDATES,
};
