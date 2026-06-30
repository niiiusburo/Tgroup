"use strict";

const {
  recognize,
  createSubject,
  addExample,
  listFaces,
  deleteSubject,
} = require("./comprefaceClient");
const { query } = require("../db");
const { buildFaceReadiness } = require("./faceReadinessScore");

const AUTO_MATCH_THRESHOLD = parseFloat(process.env.FACE_AUTO_MATCH_THRESHOLD || "0.92");
const CANDIDATE_THRESHOLD = parseFloat(process.env.FACE_CANDIDATE_THRESHOLD || "0.84");
const AUTO_MATCH_MARGIN = parseFloat(process.env.FACE_AUTO_MATCH_MARGIN || "0.05");
const MAX_CANDIDATES = parseInt(process.env.FACE_MAX_CANDIDATES || "3", 10);

function policyDiagnostics() {
  return {
    autoMatchThreshold: AUTO_MATCH_THRESHOLD,
    candidateThreshold: CANDIDATE_THRESHOLD,
    autoMatchMargin: AUTO_MATCH_MARGIN,
    maxCandidates: MAX_CANDIDATES,
  };
}

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

function faceCountFromList(response) {
  const total = Number(response?.total);
  if (Number.isFinite(total)) return total;
  return Array.isArray(response?.faces) ? response.faces.length : 0;
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
  const scoreMargin = top && second ? top.score - second.score : null;
  const baseDiagnostics = {
    provider: "compreface",
    policy: policyDiagnostics(),
    model: { recognizer: "compreface" },
    rawProviderResults: rawResults.length,
    rawSubjectCount: subjects.length,
    candidatesConsidered: sorted.length,
    scoreMargin,
    topCandidates: sorted.slice(0, MAX_CANDIDATES).map((c, index) => ({
      rank: index + 1,
      partnerId: c.partnerId,
      score: c.score,
    })),
  };

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
      privateDiagnostics: {
        ...baseDiagnostics,
        reasonCode: second ? "AUTO_MATCH_MARGIN_CONFIRMED" : "AUTO_MATCH_SINGLE_CANDIDATE",
      },
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
      privateDiagnostics: {
        ...baseDiagnostics,
        reasonCode: second ? "AMBIGUOUS_MARGIN_TOO_SMALL" : "CANDIDATE_BELOW_AUTO_THRESHOLD",
      },
    };
  }

  return {
    match: null,
    candidates: [],
    privateDiagnostics: {
      ...baseDiagnostics,
      reasonCode: sorted.length > 0 ? "NO_SCORE_ABOVE_CANDIDATE_THRESHOLD" : "NO_MAPPED_PROVIDER_SUBJECTS",
    },
  };
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

  const registeredAt = rows[0]?.face_registered_at || null;
  if (!registeredAt) {
    throw new ComprefaceFaceError(
      "PARTNER_REGISTER_MARK_FAILED",
      "Face example saved, but customer registration timestamp was not recorded",
      500
    );
  }

  return registeredAt;
}

async function verifySubjectHasFaces(subjectId, expectedMinimum = 1) {
  let response;
  try {
    response = await listFaces(subjectId);
  } catch (err) {
    throw new ComprefaceFaceError(
      "COMPREFACE_STATUS_ERROR",
      err.message || "Failed to verify Compreface subject examples",
      err.status || 502
    );
  }

  const sampleCount = faceCountFromList(response);
  if (sampleCount < expectedMinimum) {
    throw new ComprefaceFaceError(
      "COMPREFACE_REGISTER_VERIFY_FAILED",
      "Face example was not saved in Compreface",
      502
    );
  }

  return sampleCount;
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

  const sampleCount = await verifySubjectHasFaces(subjectId, 1);
  const faceRegisteredAt = await markPartnerRegistered(partnerId, subjectId);
  return {
    sampleId: sampleIdFromResponse(response, subjectId),
    sampleCount,
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

  const sampleCount = await verifySubjectHasFaces(subjectId, sampleIds.length);
  const faceRegisteredAt = await markPartnerRegistered(partnerId, subjectId);
  return {
    sampleIds,
    sampleCount,
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
  if (!subjectId) {
    return {
      partnerId,
      registered: false,
      sampleCount: 0,
      lastRegisteredAt: null,
      provider: "compreface",
      readiness: buildFaceReadiness({ registered: false, sampleCount: 0 }),
    };
  }

  const sampleCount = await verifySubjectHasFaces(subjectId, 0);
  const registered = sampleCount > 0;
  return {
    partnerId,
    registered,
    sampleCount,
    lastRegisteredAt: registered ? rows[0]?.face_registered_at || null : null,
    provider: "compreface",
    readiness: buildFaceReadiness({ registered, sampleCount }),
  };
}

module.exports = {
  recognizeFace,
  registerFace,
  replaceFaceSamples,
  getFaceStatus,
  ComprefaceFaceError,
};
