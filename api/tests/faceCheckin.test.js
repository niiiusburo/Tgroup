'use strict';

/**
 * Tests for PUBLIC Face ID check-in endpoint.
 *
 * Per docs/FACE-ID-SCOPE.md invariants:
 *  - NO auth required (200 without JWT).
 *  - Recognize-only (never registers/returns embeddings).
 *  - Minimal PHI (greeting only, no phone/code/partnerId/score).
 *  - Rate-limited (429 on abuse).
 *  - Ambiguous = count only.
 *  - Admin /api/face/recognize still 401s without JWT (regression guard).
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../src/services/faceEngineClient', () => ({
  getEmbedding: jest.fn(),
  healthCheck: jest.fn(),
  FaceEngineError: class extends Error {
    constructor(code, message, status) { super(message); this.code = code; this.status = status; }
  },
}));

jest.mock('../src/services/faceMatchEngine', () => ({
  findMatches: jest.fn(),
  FaceQualityError: class extends Error {
    constructor(message, detectionScore) {
      super(message); this.code = 'LOW_QUALITY_FACE'; this.status = 422; this.detectionScore = detectionScore;
    }
  },
}));

jest.mock('../src/services/faceRecognitionRuntime', () => ({
  getFaceRecognitionProvider: jest.fn(() => 'local'),
  healthCheck: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/server');
const { findMatches } = require('../src/services/faceMatchEngine');
const { getEmbedding } = require('../src/services/faceEngineClient');

function jpeg(buf = Buffer.from('fakejpg')) {
  return buf;
}

beforeEach(() => {
  jest.clearAllMocks();
  getEmbedding.mockResolvedValue({ embedding: [0.1, 0.2] });
  // Reset the in-memory rate-limit buckets so tests don't pollute each other.
  try { require('../src/routes/faceCheckin').__testReset(); } catch (e) { /* ignore */ }
});

describe('POST /api/public/face/checkin — PUBLIC Face ID kiosk', () => {
  it('returns 200 with greeting on single match (no auth header, no JWT)', async () => {
    findMatches.mockResolvedValue({
      match: { partnerId: 42, name: 'Lan Nguyen', phone: '0901', code: 'C42', score: 0.92 },
      candidates: [],
    });
    const res = await request(app)
      .post('/api/public/face/checkin')
      .attach('image', jpeg(), { filename: 'face.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.result).toBe('match');
    expect(res.body.greeting).toBe('Lan N.');
    // PHI minimization: never leak phone, code, partnerId, score
    expect(res.body).not.toHaveProperty('phone');
    expect(res.body).not.toHaveProperty('code');
    expect(res.body).not.toHaveProperty('partnerId');
    expect(res.body).not.toHaveProperty('score');
    expect(JSON.stringify(res.body)).not.toContain('0901');
    expect(JSON.stringify(res.body)).not.toContain('C42');
  });

  it('returns 200 no_match when nothing matches', async () => {
    findMatches.mockResolvedValue({ match: null, candidates: [] });
    const res = await request(app)
      .post('/api/public/face/checkin')
      .attach('image', jpeg(), { filename: 'face.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.result).toBe('no_match');
  });

  it('returns 200 multiple with COUNT ONLY (never identities)', async () => {
    findMatches.mockResolvedValue({
      match: null,
      candidates: [
        { partnerId: 1, name: 'Alice', phone: '0901', score: 0.81 },
        { partnerId: 2, name: 'Bob', phone: '0902', score: 0.80 },
      ],
    });
    const res = await request(app)
      .post('/api/public/face/checkin')
      .attach('image', jpeg(), { filename: 'face.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.result).toBe('multiple');
    expect(res.body.candidates).toBe(2);
    // never leak names
    expect(JSON.stringify(res.body)).not.toContain('Alice');
    expect(JSON.stringify(res.body)).not.toContain('Bob');
    expect(JSON.stringify(res.body)).not.toContain('0901');
  });

  it('returns 400 when image is missing', async () => {
    const res = await request(app).post('/api/public/face/checkin');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.reason).toBe('MISSING_IMAGE');
  });

  it('returns 422 on low-quality face (engine error)', async () => {
    const { FaceQualityError } = require('../src/services/faceMatchEngine');
    getEmbedding.mockRejectedValue(new FaceQualityError('too blurry', 0.2));
    const res = await request(app)
      .post('/api/public/face/checkin')
      .attach('image', jpeg(), { filename: 'face.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(422);
    expect(res.body.ok).toBe(false);
    expect(res.body.reason).toBe('LOW_QUALITY_FACE');
  });

  it('rate-limits after burst threshold (5 / 5s)', async () => {
    findMatches.mockResolvedValue({ match: null, candidates: [] });
    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/api/public/face/checkin')
        .attach('image', jpeg(), { filename: 'face.jpg', contentType: 'image/jpeg' });
      lastStatus = res.status;
      if (res.status === 429) break;
    }
    expect(lastStatus).toBe(429);
  });

  it('handles single-name greeting (first only)', async () => {
    findMatches.mockResolvedValue({ match: { partnerId: 1, name: 'Cherry', phone: '0901', score: 0.9 }, candidates: [] });
    const res = await request(app)
      .post('/api/public/face/checkin')
      .attach('image', jpeg(), { filename: 'face.jpg', contentType: 'image/jpeg' });
    expect(res.body.greeting).toBe('Cherry');
  });
});

describe('SECURITY REGRESSION — admin /api/face/* must still 401 without JWT', () => {
  // Force public path detection to fail for /api/face/recognize so requireAuth runs.
  it('POST /api/face/recognize rejects without auth (401 or 403)', async () => {
    const res = await request(app)
      .post('/api/face/recognize')
      .attach('image', jpeg(), { filename: 'face.jpg', contentType: 'image/jpeg' });
    expect([401, 403]).toContain(res.status);
  });
});
