'use strict';

const originalEnv = process.env;
const originalFetch = global.fetch;

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
  global.fetch = originalFetch;
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

  it('prefers X-API-Key for upload requests when login credentials also exist', async () => {
    const { helpers } = loadTestHelpers({
      HOSOONLINE_API_KEY: 'configured-api-key',
      HOSOONLINE_USERNAME: 'admin123',
      HOSOONLINE_PASSWORD: 'adminpass',
    });

    await expect(helpers.getHosoUploadHeaders()).resolves.toEqual({
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

  it('builds Hosoonline patient codes from TDental code plus the last four phone digits', () => {
    const { helpers } = loadTestHelpers();

    expect(helpers.buildHosoPatientCode('T8250', '090 123 6397')).toBe('6397T8250');
    expect(helpers.buildHosoPatientCode('4583T1447', '0900004583')).toBe('4583T1447');
    expect(helpers.buildHosoPatientCode('T237465', '')).toBe('T237465');
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

  it('normalizes http:// hosoonline image URLs to https://', () => {
    const { helpers } = loadTestHelpers();

    const checkups = helpers.normalizeHosoCheckups([
      {
        id: 'ck-1',
        date: '2026-04-20',
        title: 'X-ray',
        images: [
          { url: 'http://hosoonline.com/api/appointments/image/1.jpg?token=abc', thumbnailUrl: 'http://hosoonline.com/api/appointments/image/1_thumb.jpg?token=abc' },
          { url: 'https://hosoonline.com/api/appointments/image/2.jpg?token=xyz' },
        ],
      },
    ]);

    expect(checkups[0].images[0].url).toBe('https://hosoonline.com/api/appointments/image/1.jpg?token=abc');
    expect(checkups[0].images[0].thumbnailUrl).toBe('https://hosoonline.com/api/appointments/image/1_thumb.jpg?token=abc');
    expect(checkups[0].images[1].url).toBe('https://hosoonline.com/api/appointments/image/2.jpg?token=xyz');
  });

  it('leaves non-string image URLs untouched during normalization', () => {
    const { helpers } = loadTestHelpers();

    const checkups = helpers.normalizeHosoCheckups([
      { id: 'ck-1', date: '2026-04-20', images: [{ url: null, thumbnailUrl: undefined }] },
    ]);

    expect(checkups[0].images[0].url).toBeNull();
    expect(checkups[0].images[0].thumbnailUrl).toBeUndefined();
  });

  it('does not fail API-key upload resolution when optional patient search requires token auth', async () => {
    const { helpers, query } = loadTestHelpers({
      HOSOONLINE_API_KEY: 'hoso-api-key',
      HOSOONLINE_USERNAME: '',
      HOSOONLINE_PASSWORD: '',
    });

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(new Response('{"message":"No token provided."}', { status: 401 }));
    query.mockResolvedValueOnce([]);
    query.mockResolvedValueOnce([]);

    await expect(helpers.resolveHosoPatientCode('T237465')).resolves.toBe('T237465');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][0]).toContain('/api/patients/_search?code=T237465');
  });

  it('resolves upload code from Hosoonline appointment customerCode when patient search is unavailable', async () => {
    const { helpers, query } = loadTestHelpers({
      HOSOONLINE_USERNAME: 'admin123',
      HOSOONLINE_PASSWORD: 'adminpass',
    });

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response('{"token":"hoso-token"}', { status: 200 }))
      .mockResolvedValueOnce(new Response('<html>Cannot GET /api/patients</html>', { status: 404 }))
      .mockResolvedValueOnce(new Response('{"data":[{"customerCode":"4583T1447"}],"total":1}', { status: 200 }));
    query.mockResolvedValueOnce([]);
    query.mockResolvedValueOnce([]);

    await expect(helpers.resolveHosoPatientCode('T1447')).resolves.toBe('4583T1447');
    expect(global.fetch.mock.calls[2][0]).toContain('/api/appointments/search?q=T1447');
  });
});
