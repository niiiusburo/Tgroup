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

  it('returns 400 when image is missing', async () => {
    const res = await request(app)
      .post('/api/face/register')
      .field('partnerId', 'p-123')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('MISSING_IMAGE');
  });
});
