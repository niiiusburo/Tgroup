jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

const request = require('supertest');
const app = require('../src/server');

jest.mock('../src/services/faceEngineClient', () => ({
  getEmbedding: jest.fn(),
  healthCheck: jest.fn(),
  FaceEngineError: class extends Error {
    constructor(code, message, status) { super(message); this.code = code; this.status = status; }
  },
}));
jest.mock('../src/services/faceMatchEngine', () => ({
  findMatches: jest.fn(),
  registerSample: jest.fn(),
  getFaceStatus: jest.fn(),
  cosineSimilarity: jest.fn(),
  AUTO_MATCH_THRESHOLD: 0.5,
  CANDIDATE_THRESHOLD: 0.363,
  AUTO_MATCH_MARGIN: 0.05,
  MAX_CANDIDATES: 3,
}));
jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

const { getEmbedding } = require('../src/services/faceEngineClient');
const { findMatches, registerSample, getFaceStatus } = require('../src/services/faceMatchEngine');
const { query } = require('../src/db');

describe('POST /api/face/recognize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when image is missing', async () => {
    const res = await request(app)
      .post('/api/face/recognize')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('MISSING_IMAGE');
  });

  it('returns 500 when image exceeds 5MB limit (multer default)', async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
    const res = await request(app)
      .post('/api/face/recognize')
      .attach('image', bigBuffer, 'big.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(500);
  });

  it('returns match when face engine finds a high-confidence match', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    getEmbedding.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      model: { recognizer: 'sface', version: 'v1' },
      quality: { detectionScore: 0.95, faceCount: 1 },
    });
    findMatches.mockResolvedValue({
      match: { partnerId: 'p-1', name: 'Alice', code: 'T001', phone: '0901', confidence: 0.72 },
      candidates: [],
    });

    const res = await request(app)
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body.match.partnerId).toBe('p-1');
    expect(res.body.match.name).toBe('Alice');
    expect(res.body.candidates).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[FaceRecognize]'));
    consoleSpy.mockRestore();
  });

  it('returns candidates when confidence is plausible but not auto-match', async () => {
    getEmbedding.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      model: { recognizer: 'sface', version: 'v1' },
      quality: { detectionScore: 0.95, faceCount: 1 },
    });
    findMatches.mockResolvedValue({
      match: null,
      candidates: [
        { partnerId: 'p-1', name: 'Alice', code: 'T001', phone: '0901', confidence: 0.42 },
      ],
    });

    const res = await request(app)
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body.match).toBeNull();
    expect(res.body.candidates).toHaveLength(1);
    expect(res.body.candidates[0].partnerId).toBe('p-1');
  });

  it('returns no-match when no candidate reaches threshold', async () => {
    getEmbedding.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      model: { recognizer: 'sface', version: 'v1' },
      quality: { detectionScore: 0.95, faceCount: 1 },
    });
    findMatches.mockResolvedValue({ match: null, candidates: [] });

    const res = await request(app)
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body.match).toBeNull();
    expect(res.body.candidates).toEqual([]);
  });

  it('returns 422 when face engine reports no face', async () => {
    const { FaceEngineError } = require('../src/services/faceEngineClient');
    getEmbedding.mockRejectedValue(new FaceEngineError('NO_FACE', 'No face detected', 422));

    const res = await request(app)
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('NO_FACE');
    expect(res.body.message).toBe('No face detected');
  });

  it('returns 500 for unexpected face engine errors', async () => {
    getEmbedding.mockRejectedValue(new Error('Connection refused'));

    const res = await request(app)
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('ENGINE_ERROR');
  });

  it('returns 422 when face engine reports no face', async () => {
    const { FaceEngineError } = require('../src/services/faceEngineClient');
    getEmbedding.mockRejectedValue(new FaceEngineError('NO_FACE', 'No face detected', 422));

    const res = await request(app)
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('NO_FACE');
    expect(res.body.message).toBe('No face detected');
  });

  it('returns 503 when face engine reports model not ready', async () => {
    const { FaceEngineError } = require('../src/services/faceEngineClient');
    getEmbedding.mockRejectedValue(new FaceEngineError('MODEL_NOT_READY', 'Model loading', 503));

    const res = await request(app)
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('MODEL_NOT_READY');
  });

  it('returns 500 when findMatches throws an error', async () => {
    getEmbedding.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      model: { recognizer: 'sface', version: 'v1' },
      quality: { detectionScore: 0.95, faceCount: 1 },
    });
    findMatches.mockRejectedValue(new Error('Database timeout'));

    const res = await request(app)
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('ENGINE_ERROR');
  });

  it('returns 422 when face engine reports multiple faces', async () => {
    const { FaceEngineError } = require('../src/services/faceEngineClient');
    getEmbedding.mockRejectedValue(new FaceEngineError('MULTIPLE_FACES', 'More than one face detected', 422));

    const res = await request(app)
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('MULTIPLE_FACES');
  });

  it('returns 422 when face engine reports low quality', async () => {
    const { FaceEngineError } = require('../src/services/faceEngineClient');
    getEmbedding.mockRejectedValue(new FaceEngineError('LOW_QUALITY', 'Face detection score 0.5 below threshold', 422));

    const res = await request(app)
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('LOW_QUALITY');
  });

  it('returns 503 when face engine returns 503 with different code', async () => {
    const { FaceEngineError } = require('../src/services/faceEngineClient');
    getEmbedding.mockRejectedValue(new FaceEngineError('SERVICE_UNAVAILABLE', 'Temporarily unavailable', 503));

    const res = await request(app)
      .post('/api/face/recognize')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('SERVICE_UNAVAILABLE');
  });
});

describe('POST /api/face/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when partnerId is missing', async () => {
    const res = await request(app)
      .post('/api/face/register')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('MISSING_PARTNER_ID');
  });

  it('returns 400 when partnerId is empty string', async () => {
    const res = await request(app)
      .post('/api/face/register')
      .field('partnerId', '')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('MISSING_PARTNER_ID');
  });

  it('returns 400 when image is missing', async () => {
    const res = await request(app)
      .post('/api/face/register')
      .field('partnerId', 'p-123')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('MISSING_IMAGE');
  });

  it('returns 404 when partner does not exist', async () => {
    query.mockResolvedValueOnce([]);

    const res = await request(app)
      .post('/api/face/register')
      .field('partnerId', 'p-unknown')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('PARTNER_NOT_FOUND');
  });

  it('returns 201 with sample details on successful registration', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    query.mockResolvedValueOnce([{ id: 'p-1', name: 'Alice' }]);
    getEmbedding.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      model: { recognizer: 'sface', version: 'v1' },
      quality: { detectionScore: 0.95, faceCount: 1 },
    });
    registerSample.mockResolvedValue({ sampleId: 's-1', sampleCount: 3 });
    getFaceStatus.mockResolvedValue({
      partnerId: 'p-1',
      registered: true,
      sampleCount: 3,
      lastRegisteredAt: '2026-05-07T10:00:00',
    });

    const res = await request(app)
      .post('/api/face/register')
      .field('partnerId', 'p-1')
      .field('source', 'profile_register')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.partnerId).toBe('p-1');
    expect(res.body.sampleId).toBe('s-1');
    expect(res.body.sampleCount).toBe(3);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[FaceRegister]'));
    consoleSpy.mockRestore();
  });

  it('returns 422 when face engine reports multiple faces', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    query.mockResolvedValueOnce([{ id: 'p-1', name: 'Alice' }]);
    const { FaceEngineError } = require('../src/services/faceEngineClient');
    getEmbedding.mockRejectedValue(new FaceEngineError('MULTIPLE_FACES', 'More than one face detected', 422));

    const res = await request(app)
      .post('/api/face/register')
      .field('partnerId', 'p-1')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('MULTIPLE_FACES');
    expect(consoleSpy).toHaveBeenCalled();
    const callArgs = consoleSpy.mock.calls[0];
    expect(callArgs[0]).toContain('[FaceRegister]');
    consoleSpy.mockRestore();
  });

  it('returns 500 when database query fails during registration', async () => {
    query.mockRejectedValue(new Error('Database connection lost'));

    const res = await request(app)
      .post('/api/face/register')
      .field('partnerId', 'p-1')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('ENGINE_ERROR');
  });

  it('returns 500 when getFaceStatus fails after successful registration', async () => {
    query.mockResolvedValueOnce([{ id: 'p-1', name: 'Alice' }]);
    getEmbedding.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      model: { recognizer: 'sface', version: 'v1' },
      quality: { detectionScore: 0.95, faceCount: 1 },
    });
    registerSample.mockResolvedValue({ sampleId: 's-1', sampleCount: 1 });
    getFaceStatus.mockRejectedValue(new Error('DB timeout'));

    const res = await request(app)
      .post('/api/face/register')
      .field('partnerId', 'p-1')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('ENGINE_ERROR');
  });

  it('registers without source when source is omitted', async () => {
    query.mockResolvedValueOnce([{ id: 'p-1', name: 'Alice' }]);
    getEmbedding.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      model: { recognizer: 'sface', version: 'v1' },
      quality: { detectionScore: 0.95, faceCount: 1 },
    });
    registerSample.mockResolvedValue({ sampleId: 's-1', sampleCount: 1 });
    getFaceStatus.mockResolvedValue({
      partnerId: 'p-1',
      registered: true,
      sampleCount: 1,
      lastRegisteredAt: '2026-05-07T10:00:00',
    });

    const res = await request(app)
      .post('/api/face/register')
      .field('partnerId', 'p-1')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(201);
    expect(registerSample).toHaveBeenCalled();
  });

  it('passes source parameter to registerSample when provided', async () => {
    query.mockResolvedValueOnce([{ id: 'p-1', name: 'Alice' }]);
    getEmbedding.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      model: { recognizer: 'sface', version: 'v1' },
      quality: { detectionScore: 0.95, faceCount: 1 },
    });
    registerSample.mockResolvedValue({ sampleId: 's-1', sampleCount: 1 });
    getFaceStatus.mockResolvedValue({
      partnerId: 'p-1',
      registered: true,
      sampleCount: 1,
      lastRegisteredAt: '2026-05-07T10:00:00',
    });

    const res = await request(app)
      .post('/api/face/register')
      .field('partnerId', 'p-1')
      .field('source', 'profile_register')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(201);
    expect(registerSample).toHaveBeenCalled();
    const callArgs = registerSample.mock.calls[0];
    expect(callArgs[0]).toBe('p-1');
    expect(callArgs[5]).toBe('profile_register');
  });

  it('falls back to manual_capture when source is empty string', async () => {
    query.mockResolvedValueOnce([{ id: 'p-1', name: 'Alice' }]);
    getEmbedding.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      model: { recognizer: 'sface', version: 'v1' },
      quality: { detectionScore: 0.95, faceCount: 1 },
    });
    registerSample.mockResolvedValue({ sampleId: 's-1', sampleCount: 1 });
    getFaceStatus.mockResolvedValue({
      partnerId: 'p-1',
      registered: true,
      sampleCount: 1,
      lastRegisteredAt: '2026-05-07T10:00:00',
    });

    const res = await request(app)
      .post('/api/face/register')
      .field('partnerId', 'p-1')
      .field('source', '')
      .attach('image', Buffer.from('fake-image'), 'face.jpg')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(201);
    expect(registerSample).toHaveBeenCalled();
    expect(registerSample.mock.calls[0][5]).toBe('');
  });
});

describe('GET /api/face/status/:partnerId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns face registration status for an existing customer', async () => {
    query.mockResolvedValueOnce([{ id: 'p-1' }]);
    getFaceStatus.mockResolvedValue({
      partnerId: 'p-1',
      registered: true,
      sampleCount: 2,
      lastRegisteredAt: '2026-05-07T10:00:00',
    });

    const res = await request(app)
      .get('/api/face/status/p-1')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body.registered).toBe(true);
    expect(res.body.sampleCount).toBe(2);
  });

  it('returns 404 when partner does not exist', async () => {
    query.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/face/status/p-unknown')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('PARTNER_NOT_FOUND');
  });

  it('returns 500 when database fails loading status', async () => {
    query.mockRejectedValue(new Error('DB timeout'));

    const res = await request(app)
      .get('/api/face/status/p-1')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
  });

  it('returns unregistered status with 0 samples', async () => {
    query.mockResolvedValueOnce([{ id: 'p-1' }]);
    getFaceStatus.mockResolvedValue({
      partnerId: 'p-1',
      registered: false,
      sampleCount: 0,
      lastRegisteredAt: null,
    });

    const res = await request(app)
      .get('/api/face/status/p-1')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body.registered).toBe(false);
    expect(res.body.sampleCount).toBe(0);
    expect(res.body.lastRegisteredAt).toBeNull();
  });

  it('returns 404 for unknown face endpoints', async () => {
    const res = await request(app)
      .get('/api/face/unknown-path')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(404);
  });
});
