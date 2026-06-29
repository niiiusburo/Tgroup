"use strict";

const {
  buildFaceDiagnosticRecord,
  parseUserAgent,
} = require("../faceDiagnostics");

describe("faceDiagnostics", () => {
  it("classifies iPhone Safari without storing the raw user agent", () => {
    const parsed = parseUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1"
    );

    expect(parsed).toMatchObject({
      os: "ios",
      browser: "safari",
      deviceClass: "phone",
      isLikelyWebView: false,
    });
    expect(parsed.userAgentHash).toMatch(/^[a-f0-9]{24}$/);
    expect(JSON.stringify(parsed)).not.toContain("iPhone OS 17_5");
  });

  it("builds a hidden record with hashed candidates and no PII fields", () => {
    const record = buildFaceDiagnosticRecord({
      attemptId: "face_test",
      flow: "public_checkin",
      provider: "compreface",
      req: {
        method: "POST",
        originalUrl: "/api/public/face/checkin",
        ip: "192.0.2.10",
        headers: {
          "user-agent": "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) Version/17.5 Safari/604.1",
          "content-length": "12345",
        },
      },
      image: { mimetype: "image/jpeg", size: 12345 },
      recognition: {
        match: null,
        candidates: [
          { partnerId: "partner-1", name: "Alice", code: "T001", phone: "0901", confidence: 0.83 },
          { partnerId: "partner-2", name: "Bob", code: "T002", phone: "0902", confidence: 0.82 },
        ],
      },
      privateDiagnostics: {
        policy: {
          autoMatchThreshold: 0.92,
          candidateThreshold: 0.84,
          autoMatchMargin: 0.05,
          maxCandidates: 3,
        },
        reasonCode: "AMBIGUOUS_MARGIN_TOO_SMALL",
        candidatesConsidered: 2,
        scoreMargin: 0.01,
      },
      durationMs: 145,
    });

    const json = JSON.stringify(record);

    expect(record.decision).toMatchObject({
      decision: "manual_review",
      reasonCode: "AMBIGUOUS_MARGIN_TOO_SMALL",
      manualReviewRequired: true,
    });
    expect(record.matching.topCandidates).toHaveLength(2);
    expect(record.matching.topCandidates[0].subjectHash).toMatch(/^[a-f0-9]{24}$/);
    expect(record.matching.top1Score).toBe(0.83);
    expect(record.matching.top2Score).toBe(0.82);
    expect(record.matching.scoreMargin).toBe(0.01);
    expect(json).not.toContain("partner-1");
    expect(json).not.toContain("Alice");
    expect(json).not.toContain("0901");
    expect(json).not.toContain("T001");
  });

  it("keeps missing numeric fields null instead of coercing them to zero", () => {
    const record = buildFaceDiagnosticRecord({
      attemptId: "face_test_nulls",
      flow: "public_checkin",
      provider: "compreface",
      req: {
        method: "POST",
        originalUrl: "/api/public/face/checkin",
        ip: "192.0.2.11",
        headers: { "user-agent": "Mozilla/5.0" },
      },
      image: { mimetype: "image/jpeg" },
      recognition: {
        match: null,
        candidates: [
          { partnerId: "partner-1", confidence: 0.79 },
        ],
      },
      privateDiagnostics: {
        reasonCode: "CANDIDATE_BELOW_AUTO_THRESHOLD",
        candidatesConsidered: 1,
      },
    });

    expect(record.request.contentLength).toBeNull();
    expect(record.image.sizeBytes).toBeNull();
    expect(record.matching.scoreMargin).toBeNull();
    expect(record.latencyMs).toBeNull();
  });
});
