"use strict";

/**
 * @crossref:domain[integrations customers-partners]
 * @crossref:function[recordFaceDiagnostic]
 * @crossref:used-in[api/src/routes/faceCheckin.js, api/src/routes/faceRecognition.js]
 * @crossref:uses[docs/OBSERVABILITY.md, docs/SECURITY.md, docs/FACE-ID-SCOPE.md]
 *
 * Hidden server-side diagnostics for Face ID recognition attempts.
 *
 * These records are for VPS/debug review only. They intentionally avoid raw
 * images, raw embeddings, names, phone numbers, codes, and raw partner IDs.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const POLICY_VERSION = "face-diagnostics-v1";
const DEFAULT_DIR = path.join(process.cwd(), "uploads", "face-diagnostics");
const HASH_SALT = process.env.FACE_DIAGNOSTICS_HASH_SALT || process.env.JWT_SECRET || "face-diagnostics-local";

function isEnabled() {
  return process.env.FACE_DIAGNOSTICS_ENABLED !== "false";
}

function createFaceAttemptId() {
  return `face_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
}

function hashValue(value) {
  if (value === null || value === undefined || value === "") return null;
  return crypto.createHmac("sha256", HASH_SALT).update(String(value)).digest("hex").slice(0, 24);
}

function roundNumber(value, digits = 4) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(digits));
}

function toInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function extractIp(req) {
  return (req?.ip || req?.socket?.remoteAddress || "").replace(/^::ffff:/, "");
}

function parseUserAgent(rawUserAgent) {
  const ua = String(rawUserAgent || "");
  const lower = ua.toLowerCase();
  const os = /ipad|iphone|ipod/.test(lower)
    ? "ios"
    : /android/.test(lower)
      ? "android"
      : /mac os x|macintosh/.test(lower)
        ? "macos"
        : /windows/.test(lower)
          ? "windows"
          : /linux/.test(lower)
            ? "linux"
            : "unknown";

  const browser = /edg\//.test(lower)
    ? "edge"
    : /crios\//.test(lower)
      ? "chrome-ios"
      : /chrome\//.test(lower)
        ? "chrome"
        : /firefox\//.test(lower) || /fxios\//.test(lower)
          ? "firefox"
          : /safari\//.test(lower)
            ? "safari"
            : "unknown";

  const deviceClass = /ipad/.test(lower)
    ? "tablet"
    : /mobile|iphone|ipod|android/.test(lower)
      ? "phone"
      : "desktop";

  return {
    os,
    browser,
    deviceClass,
    isLikelyWebView: /wv\)|webview|fbav|instagram/.test(lower),
    userAgentHash: hashValue(ua),
  };
}

function pickThresholds(privateDiagnostics) {
  const policy = privateDiagnostics?.policy || {};
  return {
    autoMatchThreshold: roundNumber(policy.autoMatchThreshold),
    candidateThreshold: roundNumber(policy.candidateThreshold),
    autoMatchMargin: roundNumber(policy.autoMatchMargin),
    maxCandidates: toInt(policy.maxCandidates),
    minQuality: roundNumber(policy.minQuality),
  };
}

function candidateSource(recognition, privateDiagnostics) {
  const diagnosticCandidates = Array.isArray(privateDiagnostics?.topCandidates)
    ? privateDiagnostics.topCandidates
    : [];
  if (diagnosticCandidates.length > 0) return diagnosticCandidates;

  const candidates = [];
  if (recognition?.match) {
    candidates.push({ ...recognition.match, rank: 1, score: recognition.match.confidence });
  }
  if (Array.isArray(recognition?.candidates)) {
    for (const [index, candidate] of recognition.candidates.entries()) {
      candidates.push({
        ...candidate,
        rank: index + 1,
        score: candidate.confidence,
      });
    }
  }
  return candidates;
}

function sanitizeCandidates(recognition, privateDiagnostics) {
  return candidateSource(recognition, privateDiagnostics).map((candidate, index) => ({
    rank: toInt(candidate.rank) || index + 1,
    subjectHash: hashValue(candidate.partnerId || candidate.subject || candidate.subjectId),
    score: roundNumber(candidate.score ?? candidate.confidence),
    sampleCount: toInt(candidate.sampleCount),
  }));
}

function buildDecision({ recognition, privateDiagnostics, error }) {
  if (error) {
    return {
      decision: "error",
      reasonCode: error.code || "ENGINE_ERROR",
      retryable: error.status ? error.status < 500 : false,
      manualReviewRequired: false,
    };
  }

  if (recognition?.match) {
    return {
      decision: "match",
      reasonCode: privateDiagnostics?.reasonCode || "AUTO_MATCH",
      retryable: false,
      manualReviewRequired: false,
    };
  }

  const candidateCount = Array.isArray(recognition?.candidates) ? recognition.candidates.length : 0;
  if (candidateCount > 0) {
    return {
      decision: "manual_review",
      reasonCode: privateDiagnostics?.reasonCode || "AMBIGUOUS_CANDIDATES",
      retryable: true,
      manualReviewRequired: true,
    };
  }

  return {
    decision: "no_match",
    reasonCode: privateDiagnostics?.reasonCode || "NO_MATCH",
    retryable: true,
    manualReviewRequired: false,
  };
}

function buildProcessSteps({ flow, provider, recognition, privateDiagnostics, error }) {
  const steps = [
    { name: "upload_received", ok: true },
    { name: "provider_selected", ok: Boolean(provider), provider },
    { name: provider === "local" ? "embedding_requested" : "compreface_recognize_requested", ok: !error },
  ];

  if (error) {
    steps.push({ name: "recognition_failed", ok: false, code: error.code || "ENGINE_ERROR" });
    return steps;
  }

  steps.push({
    name: "candidates_ranked",
    ok: true,
    considered: toInt(privateDiagnostics?.candidatesConsidered),
    returned: Array.isArray(recognition?.candidates) ? recognition.candidates.length : 0,
  });
  steps.push({
    name: "decision_applied",
    ok: true,
    flow,
    reasonCode: privateDiagnostics?.reasonCode || null,
  });
  steps.push({
    name: "client_response_redacted",
    ok: true,
    publicResponse: flow === "public_checkin",
  });
  return steps;
}

function buildFaceDiagnosticRecord({
  attemptId = createFaceAttemptId(),
  flow,
  req,
  provider,
  image,
  recognition,
  privateDiagnostics,
  engine,
  durationMs,
  error,
}) {
  const decision = buildDecision({ recognition, privateDiagnostics, error });
  const candidates = sanitizeCandidates(recognition, privateDiagnostics);
  const top1 = candidates[0] || null;
  const top2 = candidates[1] || null;

  return {
    timestamp: new Date().toISOString(),
    attemptId,
    policyVersion: POLICY_VERSION,
    flow,
    provider,
    request: {
      method: req?.method || null,
      path: req?.originalUrl?.split("?")[0] || req?.path || null,
      ipHash: hashValue(extractIp(req)),
      device: parseUserAgent(req?.headers?.["user-agent"]),
      contentLength: toInt(req?.headers?.["content-length"]),
    },
    image: {
      mimetype: image?.mimetype || null,
      sizeBytes: toInt(image?.size || image?.buffer?.length),
      stored: false,
    },
    engine: {
      detector: engine?.model?.detector || privateDiagnostics?.model?.detector || null,
      recognizer: engine?.model?.recognizer || privateDiagnostics?.model?.recognizer || null,
      version: engine?.model?.version || privateDiagnostics?.model?.version || null,
      quality: {
        faceCount: toInt(engine?.quality?.faceCount ?? privateDiagnostics?.quality?.faceCount),
        detectionScore: roundNumber(engine?.quality?.detectionScore ?? privateDiagnostics?.quality?.detectionScore),
        box: engine?.quality?.box || privateDiagnostics?.quality?.box || null,
      },
    },
    policy: pickThresholds(privateDiagnostics),
    matching: {
      rawProviderResults: toInt(privateDiagnostics?.rawProviderResults),
      candidatesConsidered: toInt(privateDiagnostics?.candidatesConsidered),
      candidateCount: candidates.length,
      top1Score: top1?.score ?? null,
      top2Score: top2?.score ?? null,
      scoreMargin: roundNumber(privateDiagnostics?.scoreMargin ?? (
        top1?.score !== undefined && top2?.score !== undefined ? top1.score - top2.score : null
      )),
      topCandidates: candidates,
    },
    decision,
    process: buildProcessSteps({ flow, provider, recognition, privateDiagnostics, error }),
    latencyMs: toInt(durationMs),
    error: error ? {
      code: error.code || "ENGINE_ERROR",
      status: toInt(error.status),
      messageHash: hashValue(error.message || ""),
    } : null,
  };
}

function redactedSummary(record) {
  return {
    attemptId: record.attemptId,
    flow: record.flow,
    provider: record.provider,
    decision: record.decision.decision,
    reasonCode: record.decision.reasonCode,
    device: record.request.device,
    candidateCount: record.matching.candidateCount,
    top1Score: record.matching.top1Score,
    top2Score: record.matching.top2Score,
    scoreMargin: record.matching.scoreMargin,
    latencyMs: record.latencyMs,
  };
}

async function recordFaceDiagnostic(input) {
  if (!isEnabled()) return null;
  const record = buildFaceDiagnosticRecord(input);
  const dir = process.env.FACE_DIAGNOSTICS_DIR || DEFAULT_DIR;
  const filePath = path.join(dir, `face-diagnostics-${todayKey()}.jsonl`);

  try {
    await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
    await fs.promises.appendFile(filePath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
    console.log(`[FaceDiagnostic] ${JSON.stringify(redactedSummary(record))}`);
  } catch (err) {
    console.error("[FaceDiagnostic] write_failed", err.message);
  }

  return record;
}

module.exports = {
  POLICY_VERSION,
  buildFaceDiagnosticRecord,
  createFaceAttemptId,
  hashValue,
  parseUserAgent,
  recordFaceDiagnostic,
};
