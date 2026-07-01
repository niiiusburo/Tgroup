"use strict";

/**
 * @crossref:domain[services-catalog]
 * @crossref:used-in[api/src/routes/faceRecognition.js (provider=compreface paths)]
 * @crossref:uses[api/src/services/comprefaceClient.js, api/src/db.js (dbo.partners face_subject_id), product-map/domains/services-catalog.yaml, docs/TEST-MATRIX.md]
 */
const {
  recognize,
  createSubject,
  addExample,
  deleteSubject,
} = require("./comprefaceClient");
const { query } = require("../db");

const AUTO_MATCH_THRESHOLD = parseFloat(process.env.FACE_AUTO_MATCH_THRESHOLD || "0.88");
const CANDIDATE_THRESHOLD = parseFloat(process.env.FACE_CANDIDATE_THRESHOLD || "0.80");
const AUTO_MATCH_MARGIN = parseFloat(process.env.FACE_AUTO_MATCH_MARGIN || "0.03");
const MAX_CANDIDATES = parseInt(process.env.FACE_MAX_CANDIDATES || "3", 10);

class ComprefaceFaceError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = "ComprefaceFaceError";
    this.code = code;
    this.status = status;
  }
}

function asScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score : 0;
}

function sampleIdFromResponse(response, fallback) {
  return String(
    response?.image_id ||
    response?.face_id ||
    response?.id ||
    response?.face?.id ||
    fallback
  );
}

function isNoFaceError(err) {
  const message = String(err?.message || "");
  const code = String(err?.code || "");
  return (
    /no\s+face/i.test(message) ||
    /face\s+(is\s+)?not\s+(found|detected)/i.test(message) ||
    /not\s+found.*face/i.test(message) ||
    code === "28"
  );
}

function mapComprefaceFailure(err, fallbackCode, fallbackMessage) {
  if (isNoFaceError(err)) {
    return new ComprefaceFaceError("NO_FACE", "No face detected", 422);
  }

  return new ComprefaceFaceError(
    fallbackCode,
    err.message || fallbackMessage,
    err.status || 502
  );
}

async function loadPartnersBySubjects(subjects) {
  if (!subjects.length) return new Map();

  const rows = await query(
    `SELECT id, name, phone, ref AS code, face_subject_id
     FROM dbo.partners
     WHERE isdeleted = false
       AND (id::text = ANY($1::text[]) OR face_subject_id = ANY($1::text[]))`,
    [subjects]
  );

  const bySubject = new Map();
  for (const row of rows) {
    bySubject.set(String(row.id), row);
    if (row.face_subject_id) bySubject.set(String(row.face_subject_id), row);
  }
  return bySubject;
}

async function recognizeFace(imageBuffer, mimetype) {
  let rawResults;
  try {
    rawResults = await recognize(imageBuffer, mimetype);
  } catch (err) {
    throw mapComprefaceFailure(
      err,
      "COMPREFACE_RECOGNIZE_ERROR",
      "Failed to recognize face in Compreface"
    );
  }
  const subjects = [...new Set(rawResults.map((r) => String(r.subject)).filter(Boolean))];
  const partnersBySubject = await loadPartnersBySubjects(subjects);

  const byPartner = new Map();
  for (const result of rawResults) {
    const subject = String(result.subject || "");
    const partner = partnersBySubject.get(subject);
    if (!partner) continue;

    const score = asScore(result.similarity);
    const existing = byPartner.get(partner.id);
    if (!existing || score > existing.score) {
      byPartner.set(partner.id, {
        partnerId: partner.id,
        name: partner.name,
        phone: partner.phone,
        code: partner.code || "",
        score,
      });
    }
  }

  const sorted = Array.from(byPartner.values()).sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const second = sorted[1];

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

  if (top && top.score >= CANDIDATE_THRESHOLD) {
    return {
      match: null,
      candidates: sorted
        .filter((c) => c.score >= CANDIDATE_THRESHOLD)
        .slice(0, MAX_CANDIDATES)
        .map((c) => ({
          partnerId: c.partnerId,
          name: c.name,
          code: c.code,
          phone: c.phone,
          confidence: parseFloat(c.score.toFixed(4)),
        })),
    };
  }

  return { match: null, candidates: [] };
}

async function ensureSubject(subjectId) {
  try {
    await createSubject(subjectId);
  } catch (err) {
    if (err.status === 409 || /already exists/i.test(err.message || "")) return;
    throw new ComprefaceFaceError(
      "COMPREFACE_SUBJECT_ERROR",
      err.message || "Failed to create Compreface subject",
      err.status || 502
    );
  }
}

async function markPartnerRegistered(partnerId, subjectId) {
  const rows = await query(
    `UPDATE dbo.partners
     SET face_subject_id = $1,
         face_registered_at = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
     WHERE id = $2::uuid AND isdeleted = false
     RETURNING face_registered_at`,
    [subjectId, partnerId]
  );

  if (!rows || rows.length === 0) {
    throw new ComprefaceFaceError("PARTNER_NOT_FOUND", "Customer not found or deleted", 404);
  }

  return rows[0]?.face_registered_at || null;
}

async function registerFace(partnerId, imageBuffer, mimetype) {
  const subjectId = String(partnerId);
  await ensureSubject(subjectId);

  let response;
  try {
    response = await addExample(subjectId, imageBuffer, mimetype);
  } catch (err) {
    throw mapComprefaceFailure(
      err,
      "COMPREFACE_REGISTER_ERROR",
      "Failed to register face in Compreface"
    );
  }

  const faceRegisteredAt = await markPartnerRegistered(partnerId, subjectId);
  return {
    sampleId: sampleIdFromResponse(response, subjectId),
    sampleCount: 1,
    faceRegisteredAt,
  };
}

async function replaceFaceSamples(partnerId, files) {
  const subjectId = String(partnerId);
  try {
    await deleteSubject(subjectId);
  } catch (err) {
    if (err.status !== 404 && !/not found/i.test(err.message || "")) {
      throw new ComprefaceFaceError(
        "COMPREFACE_DELETE_ERROR",
        err.message || "Failed to reset Compreface subject",
        err.status || 502
      );
    }
  }

  await ensureSubject(subjectId);
  const sampleIds = [];
  for (const [idx, file] of files.entries()) {
    let response;
    try {
      response = await addExample(subjectId, file.buffer, file.mimetype);
    } catch (err) {
      throw mapComprefaceFailure(
        err,
        "COMPREFACE_REGISTER_ERROR",
        "Failed to register face in Compreface"
      );
    }
    sampleIds.push(sampleIdFromResponse(response, `${subjectId}:${idx}`));
  }

  const faceRegisteredAt = await markPartnerRegistered(partnerId, subjectId);
  return {
    sampleIds,
    sampleCount: sampleIds.length,
    faceRegisteredAt,
  };
}

async function getFaceStatus(partnerId) {
  const rows = await query(
    `SELECT face_subject_id, face_registered_at
     FROM dbo.partners
     WHERE id = $1 AND isdeleted = false`,
    [partnerId]
  );

  if (!rows || rows.length === 0) {
    throw new ComprefaceFaceError("PARTNER_NOT_FOUND", "Customer not found", 404);
  }

  const subjectId = rows[0]?.face_subject_id || null;
  return {
    partnerId,
    registered: Boolean(subjectId),
    sampleCount: subjectId ? 1 : 0,
    lastRegisteredAt: rows[0]?.face_registered_at || null,
    provider: "compreface",
  };
}

module.exports = {
  recognizeFace,
  registerFace,
  replaceFaceSamples,
  getFaceStatus,
  ComprefaceFaceError,
};
