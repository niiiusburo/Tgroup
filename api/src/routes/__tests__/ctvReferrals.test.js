'use strict';

jest.mock('../../middleware/auth', () =>
  require('../../__tests__/helpers/routeTestHelpers').createMockAuth()
);

jest.mock('../../db', () =>
  require('../../__tests__/helpers/routeTestHelpers').createMockDb()
);

jest.mock('../../services/ctvCardTrackingReferrals', () => ({
  buildCardTrackingReferrals: jest.fn(),
}));

const ctvRouter = require('../ctv');
const { getDb } = require('../../db');
const { buildCardTrackingReferrals } = require('../../services/ctvCardTrackingReferrals');
const { findRouteHandler, makeRes } = require('../../__tests__/helpers/routeTestHelpers');

function getReferralsHandler() {
  return findRouteHandler(ctvRouter, '/referrals', 'get');
}

describe('GET /ctv/referrals', () => {
  const dentalDb = { queryRows: jest.fn(), query: jest.fn() };
  const cosmeticDb = { queryRows: jest.fn(), query: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    getDb.mockImplementation((lob) => (lob === 'dental' ? dentalDb : cosmeticDb));
    dentalDb.queryRows.mockResolvedValue([]);
    cosmeticDb.queryRows.mockResolvedValue([]);
  });

  test('delegates to card-based builder instead of referred_by_ctv_id SQL', async () => {
    buildCardTrackingReferrals.mockResolvedValueOnce([
      {
        id: 'client-1',
        name: 'Khách A',
        lobs: ['dental'],
        tracking_source: 'card',
        lob_links: {
          dental: {
            lob: 'dental',
            link_active: true,
            eligible: false,
            linked_ctv_id: 'ctv-me',
          },
        },
      },
    ]);

    const handler = getReferralsHandler();
    const req = { user: { employeeId: 'ctv-me', is_ctv: true } };
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
    expect(res.jsonBody.referrals).toHaveLength(1);
    expect(res.jsonBody.referrals[0].tracking_source).toBe('card');
  });

  test('returns lob_links shape when builder merges dental and cosmetic', async () => {
    buildCardTrackingReferrals.mockResolvedValueOnce([
      {
        id: 'client-dual',
        name: 'Dual LOB Client',
        lobs: ['dental', 'cosmetic'],
        lob_links: {
          dental: {
            lob: 'dental',
            link_active: true,
            eligible: false,
            linked_ctv_id: 'ctv-me',
            stage: 'visited',
            stage_progress: 2,
          },
          cosmetic: {
            lob: 'cosmetic',
            link_active: false,
            eligible: true,
            linked_ctv_id: null,
            stage: 'referred',
            stage_progress: 1,
          },
        },
        link_expires_at: null,
        link_active: undefined,
        eligible: undefined,
      },
    ]);

    const handler = getReferralsHandler();
    const req = { user: { employeeId: 'ctv-me', is_ctv: true } };
    const res = makeRes();

    await handler(req, res);

    expect(res.jsonBody.referrals[0].lob_links.dental.link_active).toBe(true);
    expect(res.jsonBody.referrals[0].lob_links.cosmetic.eligible).toBe(true);
    expect(res.jsonBody.referrals[0].lobs).toEqual(['dental', 'cosmetic']);
  });

  test('returns 401 when employeeId is missing', async () => {
    const handler = getReferralsHandler();
    const req = { user: {} };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(buildCardTrackingReferrals).not.toHaveBeenCalled();
  });
});