jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/db');

describe('PUT /api/Appointments/:id status timestamps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resets datetimearrived when state transitions into arrived', async () => {
    const updateSql = [];
    query.mockImplementation(async (sql) => {
      if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
      if (sql.includes('ip_access_entries')) return [];
      if (sql === 'SELECT id FROM appointments WHERE id = $1') return [{ id: '11111111-1111-4111-8111-111111111111' }];
      if (sql.startsWith('UPDATE appointments SET')) {
        updateSql.push(sql);
        return [];
      }
      if (sql.includes('FROM appointments a') && sql.includes('WHERE a.id = $1')) {
        return [{ id: '11111111-1111-4111-8111-111111111111', state: 'arrived' }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app)
      .put('/api/Appointments/11111111-1111-4111-8111-111111111111')
      .send({ state: 'arrived' });

    expect(res.status).toBe(200);
    // When transitioning INTO 'arrived', datetimearrived must reset (reactivation
    // case: previous done/cancelled visit must not leak its arrival timestamp).
    // When the row was already 'arrived', preserve the existing value.
    expect(updateSql[0]).toContain(
      "datetimearrived = CASE WHEN state = 'arrived' THEN COALESCE(datetimearrived, (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')) ELSE (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') END",
    );
    // datedone and datetimeseated must clear on re-arrival so a new visit starts clean.
    expect(updateSql[0]).toContain("datedone = CASE WHEN state = 'arrived' THEN datedone ELSE NULL END");
    expect(updateSql[0]).toContain("datetimeseated = CASE WHEN state = 'arrived' THEN datetimeseated ELSE NULL END");
    expect(updateSql[0]).toContain("lastupdated = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')");
    expect(updateSql[0]).not.toContain("AT TIME ZONE 'UTC' AT TIME ZONE");
  });
});
