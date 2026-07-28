'use strict';

/**
 * Face recognition investor IDOR scoping — behavioral proof (AUD-004).
 *
 * Face recognize/status return customer PII (name/phone) and must apply
 * resolveInvestorScope fail-closed:
 *   - recognize: filter match + candidates to allowlist (no leakage of outsiders)
 *   - status: 404 when partnerId is outside allowlist
 *   - register/re-register: investors are read-only even when allowlisted
 *   - staff: no extra filtering
 */

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

const mockResolveInvestorScope = jest.fn();
jest.mock('../src/services/permissionService', () => ({
  resolveInvestorScope: (...args) => mockResolveInvestorScope(...args),
  resolveEffectivePermissions: jest.fn().mockResolvedValue({ effectivePermissions: ['*'] }),
  hasPermission: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/services/faceEngineClient', () => ({
  getEmbedding: jest.fn(),
  healthCheck: jest.fn(),
  FaceEngineError: class extends Error {
    constructor(code, message, status) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

jest.mock('../src/services/faceMatchEngine', () => ({
  findMatches: jest.fn(),
  registerSample: jest.fn(),
  replaceAllSamples: jest.fn(),
  getFaceStatus: jest.fn(),
  FaceQualityError: class extends Error {
    constructor(message, detectionScore) {
      super(message);
      this.code = 'LOW_QUALITY_FACE';
      this.status = 422;
      this.detectionScore = detectionScore;
    }
  },
}));

jest.mock('../src/services/comprefaceFaceProvider', () => ({
  recognizeFace: jest.fn(),
  registerFace: jest.fn(),
  replaceFaceSamples: jest.fn(),
  getFaceStatus: jest.fn(),
  ComprefaceFaceError: class extends Error {
    constructor(code, message, status) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn(), query: jest.fn(), end: jest.fn() },
}));

const request = require('supertest');
const express = require('express');
const { query } = require('../src/db');
const { getEmbedding } = require('../src/services/faceEngineClient');
const {
  findMatches,
  registerSample,
  replaceAllSamples,
  getFaceStatus,
} = require('../src/services/faceMatchEngine');
const comprefaceFaceProvider = require('../src/services/comprefaceFaceProvider');

const ALLOWED = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FORBIDDEN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function makeApp() {
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage -- isolated Jest route harness, not a production Express app.
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 'user-1', employeeId: 'investor-1' };
    next();
  });
  app.use('/api/face', require('../src/routes/faceRecognition'));
  return app;
}

function asInvestor(allowed = [ALLOWED]) {
  mockResolveInvestorScope.mockResolvedValue({ isInvestor: true, allowedCustomerIds: allowed });
}

function asStaff() {
  mockResolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.FACE_RECOGNITION_PROVIDER;
  query.mockReset();
  mockResolveInvestorScope.mockReset();
  getEmbedding.mockResolvedValue({
    embedding: [0.1, 0.2, 0.3],
    model: { recognizer: 'sface', version: 'v1' },
    quality: { detectionScore: 0.95, faceCount: 1 },
  });
});

describe('POST /api/face/recognize investor scoping', () => {
  it('strips a match outside the allowlist (no name/phone leak)', async () => {
    asInvestor();
    findMatches.mockResolvedValue({
      match: { partnerId: FORBIDDEN, name: 'Secret', code: 'T999', phone: '0999', confidence: 0.9 },
      candidates: [],
    });

    const res = await request(makeApp())
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg');

    expect(res.status).toBe(200);
    expect(res.body.match).toBeNull();
    expect(res.body.candidates).toEqual([]);
    expect(JSON.stringify(res.body)).not.toContain('Secret');
    expect(JSON.stringify(res.body)).not.toContain('0999');
    expect(mockResolveInvestorScope).toHaveBeenCalledWith('investor-1');
  });

  it('keeps an allowlisted match when UUID casing differs', async () => {
    asInvestor();
    findMatches.mockResolvedValue({
      match: {
        partnerId: ALLOWED.toUpperCase(),
        name: 'Alice',
        code: 'T001',
        phone: '0901',
        confidence: 0.9,
      },
      candidates: [],
    });

    const res = await request(makeApp())
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg');

    expect(res.status).toBe(200);
    expect(res.body.match).toEqual(
      expect.objectContaining({ partnerId: ALLOWED.toUpperCase(), name: 'Alice', phone: '0901' })
    );
  });

  it('passes the normalized allowlist into local ranking before matching', async () => {
    asInvestor([ALLOWED.toUpperCase()]);
    findMatches.mockResolvedValue({ match: null, candidates: [] });

    const res = await request(makeApp())
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg');

    expect(res.status).toBe(200);
    expect(findMatches).toHaveBeenCalledWith([0.1, 0.2, 0.3], [ALLOWED]);
    expect(mockResolveInvestorScope.mock.invocationCallOrder[0])
      .toBeLessThan(findMatches.mock.invocationCallOrder[0]);
  });

  it('passes the normalized allowlist into CompreFace ranking before matching', async () => {
    process.env.FACE_RECOGNITION_PROVIDER = 'compreface';
    asInvestor([ALLOWED.toUpperCase()]);
    comprefaceFaceProvider.recognizeFace.mockResolvedValue({
      match: { partnerId: ALLOWED, name: 'Alice', code: 'T001', phone: '0901', confidence: 0.9 },
      candidates: [],
    });

    const res = await request(makeApp())
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg');

    expect(res.status).toBe(200);
    expect(comprefaceFaceProvider.recognizeFace).toHaveBeenCalledWith(
      expect.any(Buffer),
      'image/jpeg',
      [ALLOWED]
    );
    expect(mockResolveInvestorScope.mock.invocationCallOrder[0])
      .toBeLessThan(comprefaceFaceProvider.recognizeFace.mock.invocationCallOrder[0]);
  });

  it('filters candidates to the allowlist only', async () => {
    asInvestor();
    findMatches.mockResolvedValue({
      match: null,
      candidates: [
        { partnerId: FORBIDDEN, name: 'Secret', code: 'T999', phone: '0999', confidence: 0.45 },
        { partnerId: ALLOWED, name: 'Alice', code: 'T001', phone: '0901', confidence: 0.4 },
      ],
    });

    const res = await request(makeApp())
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg');

    expect(res.status).toBe(200);
    expect(res.body.match).toBeNull();
    expect(res.body.candidates).toHaveLength(1);
    expect(res.body.candidates[0].partnerId).toBe(ALLOWED);
    expect(JSON.stringify(res.body)).not.toContain('Secret');
  });

  it('fail-closed when investor allowlist is empty', async () => {
    asInvestor([]);
    findMatches.mockResolvedValue({
      match: { partnerId: ALLOWED, name: 'Alice', code: 'T001', phone: '0901', confidence: 0.9 },
      candidates: [{ partnerId: ALLOWED, name: 'Alice', code: 'T001', phone: '0901', confidence: 0.4 }],
    });

    const res = await request(makeApp())
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg');

    expect(res.status).toBe(200);
    expect(res.body.match).toBeNull();
    expect(res.body.candidates).toEqual([]);
  });

  it('does not filter for non-investor staff', async () => {
    asStaff();
    findMatches.mockResolvedValue({
      match: { partnerId: FORBIDDEN, name: 'Anyone', code: 'T050', phone: '0500', confidence: 0.88 },
      candidates: [],
    });

    const res = await request(makeApp())
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg');

    expect(res.status).toBe(200);
    expect(res.body.match.partnerId).toBe(FORBIDDEN);
    expect(res.body.match.name).toBe('Anyone');
  });
});

describe('GET /api/face/status/:partnerId investor scoping', () => {
  it('404s when partner is outside the allowlist', async () => {
    asInvestor();
    const res = await request(makeApp()).get(`/api/face/status/${FORBIDDEN}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('PARTNER_NOT_FOUND');
    expect(query).not.toHaveBeenCalled();
    expect(getFaceStatus).not.toHaveBeenCalled();
  });

  it('returns status for an allowlisted partner when UUID casing differs', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ id: ALLOWED }]);
    getFaceStatus.mockResolvedValueOnce({
      partnerId: ALLOWED,
      registered: true,
      sampleCount: 2,
      lastRegisteredAt: '2026-01-01T00:00:00.000Z',
    });

    const res = await request(makeApp()).get(`/api/face/status/${ALLOWED.toUpperCase()}`);
    expect(res.status).toBe(200);
    expect(res.body.partnerId).toBe(ALLOWED);
  });

  it('allows staff to read any partner status', async () => {
    asStaff();
    query.mockResolvedValueOnce([{ id: FORBIDDEN }]);
    getFaceStatus.mockResolvedValueOnce({
      partnerId: FORBIDDEN,
      registered: false,
      sampleCount: 0,
      lastRegisteredAt: null,
    });

    const res = await request(makeApp()).get(`/api/face/status/${FORBIDDEN}`);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/face/register investor scoping', () => {
  it('rejects an investor before mutation even when the partner is allowlisted', async () => {
    asInvestor([ALLOWED]);
    const res = await request(makeApp())
      .post('/api/face/register')
      .field('partnerId', ALLOWED)
      .attach('image', Buffer.from('fake-image'), 'face.jpg');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(registerSample).not.toHaveBeenCalled();
    expect(comprefaceFaceProvider.registerFace).not.toHaveBeenCalled();
    expect(getEmbedding).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});

describe('POST /api/face/re-register investor scoping', () => {
  it('rejects an investor before mutation even when the partner is allowlisted', async () => {
    asInvestor([ALLOWED]);
    const res = await request(makeApp())
      .post('/api/face/re-register')
      .field('partnerId', ALLOWED)
      .attach('images', Buffer.from('fake-image'), 'face.jpg');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
    expect(replaceAllSamples).not.toHaveBeenCalled();
    expect(comprefaceFaceProvider.replaceFaceSamples).not.toHaveBeenCalled();
    expect(getEmbedding).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});
