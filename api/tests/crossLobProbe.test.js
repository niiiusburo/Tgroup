process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// uuid is ESM-only; mock it so requiring server.js (transitively) doesn't fail to parse.
jest.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000000',
  NIL: '00000000-0000-0000-0000-000000000000',
}));

// Auth is bypassed; the route's own requirePermission('lob.crossview') is mocked to pass.
jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
  requireLobScope: () => (_req, _res, next) => next(),
}));

const mockQueryRows = jest.fn();
jest.mock('../src/db', () => ({
  query: jest.fn(),
  getDb: jest.fn(() => ({ queryRows: mockQueryRows })),
}));

const request = require('supertest');
const app = require('../src/server');
const { getDb } = require('../src/db');

describe('GET /api/cross-lob-probe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when phone is missing', async () => {
    const res = await request(app)
      .get('/api/cross-lob-probe?lob=dental')
      .set('Authorization', 'Bearer fake-token');
    expect(res.status).toBe(400);
  });

  it('returns 400 when lob is invalid', async () => {
    const res = await request(app)
      .get('/api/cross-lob-probe?phone=0901234567&lob=teeth')
      .set('Authorization', 'Bearer fake-token');
    expect(res.status).toBe(400);
  });

  it('probes the OTHER pool and returns matched=true on a phone-key hit', async () => {
    mockQueryRows.mockResolvedValueOnce([{ id: 'cos-1', name: 'Alice', phone: '0901234567' }]);

    const res = await request(app)
      .get('/api/cross-lob-probe?phone=84901234567&lob=dental')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      matched: true,
      otherLob: 'cosmetic',
      otherId: 'cos-1',
      otherName: 'Alice',
    });
    // dental caller -> probe the cosmetic pool, normalized to the last 9 digits
    expect(getDb).toHaveBeenCalledWith('cosmetic');
    expect(mockQueryRows).toHaveBeenCalledWith(expect.stringContaining('RIGHT'), ['901234567']);
  });

  it('returns matched=false (with otherLob) when the other pool has no hit', async () => {
    mockQueryRows.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/cross-lob-probe?phone=0901234567&lob=cosmetic')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ matched: false, otherLob: 'dental' });
    expect(getDb).toHaveBeenCalledWith('dental');
  });

  it('returns 500 PROBE_FAILED when the pool query throws', async () => {
    mockQueryRows.mockRejectedValueOnce(new Error('db down'));

    const res = await request(app)
      .get('/api/cross-lob-probe?phone=0901234567&lob=dental')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('PROBE_FAILED');
  });
});
