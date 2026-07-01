'use strict';

jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, res, next) => next(),
}));

jest.mock('../../db', () => ({
  getDb: jest.fn(),
}));

jest.mock('../../services/ctvCardTrackingReferrals', () => ({
  buildCardTrackingReferrals: jest.fn(),
}));

const ctvRouter = require('../ctv');
const { getDb } = require('../../db');
const { buildCardTrackingReferrals } = require('../../services/ctvCardTrackingReferrals');

// ctv routes are now split into sub-routers mounted on the main router (see
// routes/ctv/index.js). Recurse into mounted sub-routers so route handlers can
// still be located by path/method.
function findRouteHandler(router, path, method) {
  let handler;
  router.stack.forEach((layer) => {
    if (layer.route && layer.route.path === path && layer.route.methods[method]) {
      layer.route.stack.forEach((l) => {
        if (l.handle && typeof l.handle === 'function') handler = l.handle;
      });
    } else if (!layer.route && layer.handle && Array.isArray(layer.handle.stack)) {
      const nested = findRouteHandler(layer.handle, path, method);
      if (nested) handler = nested;
    }
  });
  return handler;
}

function getClientJourneysHandler() {
  return findRouteHandler(ctvRouter, '/client-journeys', 'get');
}

function makeRes() {
  return {
    statusCode: 200,
    jsonBody: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.jsonBody = body; return this; },
  };
}

describe('GET /ctv/client-journeys', () => {
  const dentalDb = { queryRows: jest.fn(), query: jest.fn() };
  const cosmeticDb = { queryRows: jest.fn(), query: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    getDb.mockImplementation((lob) => (lob === 'dental' ? dentalDb : cosmeticDb));
    dentalDb.queryRows.mockResolvedValue([]);
    cosmeticDb.queryRows.mockResolvedValue([]);
  });

  test('delegates to card-based builder and does NOT query referred_by_ctv_id', async () => {
    buildCardTrackingReferrals.mockResolvedValueOnce([
      {
        id: 'client-1',
        name: 'Khách A',
        phone: '0901',
        lobs: ['dental'],
        referred_at: '2026-01-01',
        stage: 'visited',
        stage_progress: 2,
        total_earned: 0,
        last_visit_at: '2026-02-01',
        tracking_source: 'card',
        services: [],
      },
    ]);

    const handler = getClientJourneysHandler();
    const req = { user: { employeeId: 'ctv-me' } };
    const res = makeRes();

    await handler(req, res);

    expect(buildCardTrackingReferrals).toHaveBeenCalledTimes(1);
    expect(buildCardTrackingReferrals).toHaveBeenCalledWith('ctv-me', {
      dentalDb,
      cosmeticDb,
      safeQueryRows: expect.any(Function),
    });

    const allSql = [
      ...dentalDb.queryRows.mock.calls,
      ...cosmeticDb.queryRows.mock.calls,
    ].map(([sql]) => String(sql));
    expect(allSql.some((sql) => /referred_by_ctv_id/i.test(sql))).toBe(false);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody.clients).toHaveLength(1);
    expect(res.jsonBody.clients[0]).toMatchObject({
      id: 'client-1',
      stage: 'visited',
      stage_progress: 2,
      total_earned: 0,
    });
  });

  test('returns 401 when employeeId is missing', async () => {
    const handler = getClientJourneysHandler();
    const req = { user: {} };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(buildCardTrackingReferrals).not.toHaveBeenCalled();
  });
});