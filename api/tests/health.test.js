jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn() },
}));

jest.mock('../src/services/faceEngineClient', () => ({
  healthCheck: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/server');

const { healthCheck: faceServiceHealth } = require('../src/services/faceEngineClient');
const { query } = require('../src/db');

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns healthy when both DB and face-service are up', async () => {
    query.mockResolvedValueOnce([{ '?column?': 1 }]);
    faceServiceHealth.mockResolvedValueOnce({ ok: true, data: { status: 'ok' } });

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.checks.db).toBe(true);
    expect(res.body.checks.faceService).toBe(true);
    expect(res.body.latency.db).toBeGreaterThanOrEqual(0);
    expect(res.body.latency.faceService).toBeGreaterThanOrEqual(0);
    expect(res.body.timestamp).toBeDefined();
  });

  it('returns degraded when DB is down', async () => {
    query.mockRejectedValueOnce(new Error('Connection refused'));
    faceServiceHealth.mockResolvedValueOnce({ ok: true, data: { status: 'ok' } });

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.db).toBe(false);
    expect(res.body.checks.faceService).toBe(true);
  });

  it('returns degraded when face-service is down', async () => {
    query.mockResolvedValueOnce([{ '?column?': 1 }]);
    faceServiceHealth.mockResolvedValueOnce({ ok: false, status: 503 });

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.db).toBe(true);
    expect(res.body.checks.faceService).toBe(false);
  });

  it('returns degraded when both are down', async () => {
    query.mockRejectedValueOnce(new Error('Connection refused'));
    faceServiceHealth.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.db).toBe(false);
    expect(res.body.checks.faceService).toBe(false);
  });

  it('returns a valid ISO timestamp', async () => {
    query.mockResolvedValueOnce([{ '?column?': 1 }]);
    faceServiceHealth.mockResolvedValueOnce({ ok: true, data: { status: 'ok' } });

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});
