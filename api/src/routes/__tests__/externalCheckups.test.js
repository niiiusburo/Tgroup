'use strict';

const originalEnv = process.env;

function loadTestHelpers(env = {}) {
  jest.resetModules();
  process.env = { ...originalEnv, ...env };

  jest.doMock('../../db', () => ({ query: jest.fn() }));
  jest.doMock('../../middleware/auth', () => ({
    requireAuth: (req, _res, next) => next(),
    requirePermission: () => (_req, _res, next) => next(),
  }));

  const router = require('../externalCheckups');
  const { query } = require('../../db');
  return { helpers: router._test, query };
}

afterEach(() => {
  process.env = originalEnv;
  jest.dontMock('../../db');
  jest.dontMock('../../middleware/auth');
});

describe('externalCheckups helpers', () => {
  it('uses X-API-Key for legacy opaque Hosoonline tokens', () => {
    const { helpers } = loadTestHelpers({
      HOSOONLINE_API_KEY: 'legacy-token',
      HOSOONLINE_AUTH_SCHEME: '',
    });

    expect(helpers.getHosoHeaders({ Accept: 'application/json' })).toEqual({
      Accept: 'application/json',
      'X-API-Key': 'legacy-token',
    });
  });

  it('uses Authorization Bearer for JWT-style Hosoonline tokens', () => {
    const { helpers } = loadTestHelpers({
      HOSOONLINE_API_KEY: 'header.payload.signature',
      HOSOONLINE_AUTH_SCHEME: '',
    });

    expect(helpers.getHosoHeaders()).toEqual({
      Authorization: 'Bearer header.payload.signature',
    });
  });

  it('honors explicit bearer auth for opaque Hosoonline tokens', () => {
    const { helpers } = loadTestHelpers({
      HOSOONLINE_API_KEY: 'opaque-token',
      HOSOONLINE_AUTH_SCHEME: 'bearer',
    });

    expect(helpers.getHosoHeaders()).toEqual({
      Authorization: 'Bearer opaque-token',
    });
  });

  it('looks up local customers by migrated ref before phone fallback', async () => {
    const { helpers, query } = loadTestHelpers();
    query.mockResolvedValueOnce([{ id: 'p1', ref: 'T112012', name: 'Patient', phone: '0900000000' }]);

    const partner = await helpers.getLocalPartner('T112012');

    expect(partner.ref).toBe('T112012');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('TRIM(ref)');
    expect(query.mock.calls[0][1]).toEqual(['T112012']);
  });

  it('falls back to exact phone lookup when no ref matches', async () => {
    const { helpers, query } = loadTestHelpers();
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'p1', ref: 'T0365', name: 'Patient', phone: '0900000000' }]);

    const partner = await helpers.getLocalPartner('0900000000');

    expect(partner.phone).toBe('0900000000');
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain('phone = $1');
    expect(query.mock.calls[1][1]).toEqual(['0900000000']);
  });
});
