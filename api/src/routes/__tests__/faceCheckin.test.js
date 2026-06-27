'use strict';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../../middleware/auth', () => ({
  requireAuth: jest.fn((_req, res) => res.status(401).json({ error: 'AUTH_REQUIRED' })),
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../../middleware/ipAccess', () => ({
  enforceIpAccess: (_req, _res, next) => next(),
}));

jest.mock('../../services/faceEngineClient', () => ({
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

jest.mock('../../services/faceMatchEngine', () => ({
  findMatches: jest.fn(),
  FaceQualityError: class extends Error {
    constructor(message) {
      super(message);
      this.code = 'LOW_QUALITY_FACE';
      this.status = 422;
    }
  },
}));

jest.mock('../../services/comprefaceFaceProvider', () => ({
  recognizeFace: jest.fn(),
  ComprefaceFaceError: class extends Error {
    constructor(code, message, status) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

jest.mock('../../services/faceDiagnostics', () => ({
  recordFaceDiagnostic: jest.fn(),
}));

jest.mock('../../db', () => ({
  query: jest.fn(),
}));

const request = require('supertest');
const app = require('../../server');
const { requireAuth } = require('../../middleware/auth');
const comprefaceFaceProvider = require('../../services/comprefaceFaceProvider');
const { recordFaceDiagnostic } = require('../../services/faceDiagnostics');
const faceCheckinRoutes = require('../faceCheckin');

describe('POST /api/public/face/checkin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    faceCheckinRoutes.__testReset();
    process.env.FACE_RECOGNITION_PROVIDER = 'compreface';
  });

  afterEach(() => {
    delete process.env.FACE_RECOGNITION_PROVIDER;
  });

  it('is public and returns 400 when image is missing', async () => {
    const res = await request(app).post('/api/public/face/checkin');

    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('MISSING_IMAGE');
    expect(requireAuth).not.toHaveBeenCalled();
  });

  it('returns a minimal greeting and never leaks partner identity fields', async () => {
    comprefaceFaceProvider.recognizeFace.mockResolvedValue({
      match: {
        partnerId: 'p-1',
        name: 'Kevin Phung',
        code: 'G+26',
        phone: '0901',
        confidence: 0.99,
      },
      candidates: [],
    });

    const res = await request(app)
      .post('/api/public/face/checkin')
      .attach('image', Buffer.from('fake-image'), 'face.jpg');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, result: 'match', greeting: 'Kevin P.' });
    expect(JSON.stringify(res.body)).not.toMatch(/p-1|0901|G\\+26|0\\.99/);
    expect(recordFaceDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
      flow: 'public_checkin',
      provider: 'compreface',
      recognition: {
        match: expect.objectContaining({ partnerId: 'p-1' }),
        candidates: [],
      },
    }));
  });

  it('returns only the candidate count for ambiguous matches', async () => {
    comprefaceFaceProvider.recognizeFace.mockResolvedValue({
      match: null,
      candidates: [
        { partnerId: 'p-1', name: 'A', code: 'A1', phone: '1', confidence: 0.82 },
        { partnerId: 'p-2', name: 'B', code: 'B1', phone: '2', confidence: 0.81 },
      ],
    });

    const res = await request(app)
      .post('/api/public/face/checkin')
      .attach('image', Buffer.from('fake-image'), 'face.jpg');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, result: 'multiple', candidates: 2 });
    expect(JSON.stringify(res.body)).not.toMatch(/p-1|p-2|0901|0902|A1|B1|0\\.82|0\\.81/);
    expect(recordFaceDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
      flow: 'public_checkin',
      recognition: {
        match: null,
        candidates: expect.arrayContaining([
          expect.objectContaining({ partnerId: 'p-1', confidence: 0.82 }),
        ]),
      },
    }));
  });

  it('rate-limits repeated public attempts', async () => {
    comprefaceFaceProvider.recognizeFace.mockResolvedValue({ match: null, candidates: [] });

    for (let i = 0; i < 5; i += 1) {
      const ok = await request(app)
        .post('/api/public/face/checkin')
        .attach('image', Buffer.from(`fake-image-${i}`), 'face.jpg');
      expect(ok.status).toBe(200);
    }

    const limited = await request(app)
      .post('/api/public/face/checkin')
      .attach('image', Buffer.from('fake-image-6'), 'face.jpg');

    expect(limited.status).toBe(429);
    expect(limited.body.reason).toBe('rate_limited');
  });
});
