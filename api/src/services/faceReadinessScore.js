"use strict";

const TARGET_SAMPLE_COUNT = 3;
const SCORING_VERSION = "face-readiness-0.32.55";

function clampUnit(value) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(1, numeric));
}

function normalizeCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
}

function readinessLabel(score, registered, sampleCount, targetSampleCount) {
  if (!registered) return "not_registered";
  if (score >= 90 && sampleCount >= targetSampleCount) return "excellent";
  if (score >= 70) return "good";
  return "needs_retake";
}

function recommendedAction(label, sampleCount, targetSampleCount) {
  if (label === "not_registered") return "register";
  if (sampleCount < targetSampleCount) return "capture_more_angles";
  if (label === "needs_retake") return "retake";
  return "ready";
}

function buildFaceReadiness({
  registered,
  sampleCount,
  avgDetectionScore = null,
  targetSampleCount = TARGET_SAMPLE_COUNT,
} = {}) {
  const target = normalizeCount(targetSampleCount) || TARGET_SAMPLE_COUNT;
  const samples = normalizeCount(sampleCount);
  const sampleCoverage = Math.min(samples, target) / target;
  const storedQuality = clampUnit(avgDetectionScore);
  const score = registered
    ? Math.round(((storedQuality === null ? sampleCoverage : sampleCoverage * 0.65 + storedQuality * 0.35)) * 100)
    : 0;
  const label = readinessLabel(score, Boolean(registered), samples, target);

  return {
    score,
    label,
    targetSampleCount: target,
    sampleCoverage: Number(sampleCoverage.toFixed(4)),
    storedQuality: storedQuality === null ? null : Number(storedQuality.toFixed(4)),
    recommendedAction: recommendedAction(label, samples, target),
    scoringVersion: SCORING_VERSION,
  };
}

module.exports = {
  buildFaceReadiness,
  TARGET_SAMPLE_COUNT,
  SCORING_VERSION,
};
