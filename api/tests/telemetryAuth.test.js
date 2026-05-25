jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, res, _next) => res.status(401).json({ error: 'No token' }),
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../src/db', () => {
  const queryMock = jest.fn();
  return {
    query: queryMock,
    pool: { connect: jest.fn() },
    getQuery: jest.fn(() => queryMock),
    getDb: jest.fn(),
    runWithLob: jest.fn((_lob, fn) => fn()),
    getCurrentLob: jest.fn(() => 'dental'),
  };
});

jest.mock('../src/services/larkNotifier', () => ({
  notifyFeedbackThreadCreated: jest.fn(async () => ({ ok: true, skipped: true })),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/db');
const { notifyFeedbackThreadCreated } = require('../src/services/larkNotifier');

describe('telemetry route auth boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notifyFeedbackThreadCreated.mockResolvedValue({ ok: true, skipped: true });
    query.mockImplementation(async (sql) => {
      if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
      if (sql.includes('ip_access_entries')) return [];
      if (sql.includes('SELECT id, status FROM dbo.error_events')) return [];
      if (sql.includes('INSERT INTO dbo.error_events')) return [{ id: 'error-event-id' }];
      if (sql.includes('INSERT INTO feedback_threads')) return [{ id: 'feedback-thread-id' }];
      if (sql.includes('INSERT INTO feedback_messages')) return [];
      return [];
    });
  });

  it('allows anonymous frontend error ingestion only', async () => {
    const res = await request(app)
      .post('/api/telemetry/errors')
      .send({ error_type: 'Global', message: 'render failed' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(notifyFeedbackThreadCreated).toHaveBeenCalledWith(expect.objectContaining({
      source: 'auto',
      threadId: 'feedback-thread-id',
      errorEventId: 'error-event-id',
      errorType: 'Global',
      errorMessage: 'render failed',
    }));
  });

  it('requires auth for telemetry management reads', async () => {
    const res = await request(app).get('/api/telemetry/errors');

    expect(res.status).toBe(401);
  });

  it('requires auth for telemetry management writes', async () => {
    const res = await request(app)
      .put('/api/telemetry/errors/error-event-id')
      .send({ status: 'deployed' });

    expect(res.status).toBe(401);
  });
});
