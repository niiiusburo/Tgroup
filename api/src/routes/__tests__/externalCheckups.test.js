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
  it('uses X-API-Key for Hosoonline API keys', () => {
    const { helpers } = loadTestHelpers({
      HOSOONLINE_API_KEY: 'hoso-api-key',
      HOSOONLINE_AUTH_SCHEME: '',
    });

    expect(helpers.getHosoHeaders({ Accept: 'application/json' })).toEqual({
      Accept: 'application/json',
      'X-API-Key': 'hoso-api-key',
    });
  });

  it('does not convert JWT-shaped API keys into bearer tokens', () => {
    const { helpers } = loadTestHelpers({
      HOSOONLINE_API_KEY: 'header.payload.signature',
      HOSOONLINE_AUTH_SCHEME: '',
    });

    expect(helpers.getHosoHeaders()).toEqual({
      'X-API-Key': 'header.payload.signature',
    });
  });

  it('ignores legacy bearer auth scheme and still sends the API key header', () => {
    const { helpers } = loadTestHelpers({
      HOSOONLINE_API_KEY: 'configured-api-key',
      HOSOONLINE_AUTH_SCHEME: 'bearer',
    });

    expect(helpers.getHosoHeaders()).toEqual({
      'X-API-Key': 'configured-api-key',
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

  it('extracts the Hosoonline access token cookie from login response headers', () => {
    const { helpers } = loadTestHelpers();

    expect(helpers.extractAccessTokenCookie('access_token=abc123; Path=/; HttpOnly; SameSite=Lax')).toBe('access_token=abc123');
  });

  it('maps Hosoonline appointment media into proxied health-checkup images', () => {
    const { helpers } = loadTestHelpers();

    const checkups = helpers.mapHosoAppointmentsToCheckups([
      {
        _id: 'appt-1',
        date: '2026-04-20T10:00:00.000Z',
        service: 'X-ray',
        doctor: 'Dr A',
        description: 'Exam note',
        nextAppointmentDate: null,
        nextDescription: '',
        createdAt: '2026-04-20T10:05:00.000Z',
        media: [{ _id: 'media-1', imageLink: '2026-04-20_T8250_IMG.jpeg' }],
      },
    ]);

    expect(checkups).toEqual([
      {
        id: 'appt-1',
        date: '2026-04-20',
        title: 'X-ray',
        notes: 'Exam note',
        doctor: 'Dr A',
        nextAppointmentDate: null,
        nextDescription: '',
        images: [
          {
            url: '/api/ExternalCheckups/images/2026-04-20_T8250_IMG.jpeg',
            thumbnailUrl: '/api/ExternalCheckups/images/2026-04-20_T8250_IMG.jpeg',
            label: '2026-04-20_T8250_IMG.jpeg',
            uploadedAt: '2026-04-20T10:05:00.000Z',
          },
        ],
      },
    ]);
  });
});
