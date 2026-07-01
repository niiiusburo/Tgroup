'use strict';

const ctvPublicRouter = require('../ctvPublic');

jest.mock('../../services/referralClaim', () => ({
  getReferralClaimStatus: jest.fn(),
}));

jest.mock('../../db', () =>
  require('../../__tests__/helpers/routeTestHelpers').createMockDb()
);

const { getDb } = require('../../db');
const { findRouteHandler, makeRes } = require('../../__tests__/helpers/routeTestHelpers');

describe('POST /ctv-public/join', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a CTV under the submitted upline phone', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    dbMock.queryRows.mockResolvedValueOnce([
      { id: 'upline-ctv', name: 'Parent CTV', phone: '0909000000', lob_scope: ['dental', 'cosmetic'] },
    ]);
    dbMock.queryRows.mockResolvedValueOnce([]);
    dbMock.queryRows.mockResolvedValueOnce([]);
    dbMock.queryRows.mockResolvedValueOnce([]);
    dbMock.queryRows.mockResolvedValueOnce([]);
    dbMock.queryRows.mockResolvedValueOnce([
      { id: 'new-ctv', name: 'New CTV', phone: '0123456789', email: 'new@example.com', referred_by_ctv_id: 'upline-ctv' },
    ]);
    dbMock.queryRows.mockResolvedValueOnce([
      { id: 'new-ctv', name: 'New CTV', phone: '0123456789', email: 'new@example.com', referred_by_ctv_id: 'upline-ctv' },
    ]);

    const handler = findRouteHandler(ctvPublicRouter, '/join', 'post');
    const req = {
      method: 'POST',
      url: '/ctv-public/join',
      body: {
        name: ' New CTV ',
        phone: '0123456789',
        email: ' new@example.com ',
        password: 'secret1',
        uplinePhone: '0909000000',
      },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.jsonBody).toMatchObject({ ok: true, id: 'new-ctv', name: 'New CTV', uplineName: 'Parent CTV' });
    const inserts = dbMock.queryRows.mock.calls.filter(([sql]) => /INSERT INTO dbo\.partners/.test(sql));
    expect(inserts).toHaveLength(2);
    expect(inserts[0][1][1]).toBe('New CTV');
    expect(inserts[0][1][3]).toBe('new@example.com');
    expect(inserts[0][1][5]).toEqual(['dental', 'cosmetic']);
    expect(inserts[0][1][6]).toBe('upline-ctv');
  });

  test('rolls back the dental row and fails when the cosmetic insert does not persist (no cross-LOB split-brain)', async () => {
    const dentalDb = { queryRows: jest.fn(), query: jest.fn() };
    const cosmeticDb = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockImplementation((lob) => (lob === 'cosmetic' ? cosmeticDb : dentalDb));

    // dental: upline lookup, dup phone, dup email, INSERT (succeeds), compensating DELETE
    dentalDb.queryRows.mockResolvedValueOnce([
      { id: 'upline-ctv', name: 'Parent CTV', phone: '0909000000', lob_scope: ['dental', 'cosmetic'] },
    ]);
    dentalDb.queryRows.mockResolvedValueOnce([]); // dPhone
    dentalDb.queryRows.mockResolvedValueOnce([]); // dEmail
    dentalDb.queryRows.mockResolvedValueOnce([
      { id: 'new-ctv', name: 'New CTV', phone: '0123456789', email: 'new@example.com', referred_by_ctv_id: 'upline-ctv' },
    ]); // dental INSERT succeeds
    dentalDb.queryRows.mockResolvedValueOnce([]); // compensating DELETE

    // cosmetic: dup phone, dup email, INSERT (fails -> safeRows swallows -> [])
    cosmeticDb.queryRows.mockResolvedValueOnce([]); // cPhone
    cosmeticDb.queryRows.mockResolvedValueOnce([]); // cEmail
    cosmeticDb.queryRows.mockResolvedValueOnce([]); // cosmetic INSERT FAILS

    const handler = findRouteHandler(ctvPublicRouter, '/join', 'post');
    const req = {
      method: 'POST',
      url: '/ctv-public/join',
      body: {
        name: 'New CTV',
        phone: '0123456789',
        email: 'new@example.com',
        password: 'secret1',
        uplinePhone: '0909000000',
      },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    // The dental row MUST be rolled back so no half-created CTV remains.
    const deletes = dentalDb.queryRows.mock.calls.filter(([sql]) => /DELETE FROM dbo\.partners/.test(sql));
    expect(deletes).toHaveLength(1);
    expect(deletes[0][1]).toEqual([expect.any(String)]);
  });

  test('requires either referral code or upline phone when root signup is NOT enabled (NK/NK2 default)', async () => {
    delete process.env.CTV_PUBLIC_ROOT_SIGNUP;
    const handler = findRouteHandler(ctvPublicRouter, '/join', 'post');
    const req = {
      method: 'POST',
      url: '/ctv-public/join',
      body: {
        name: 'New CTV',
        phone: '0123456789',
        email: 'new@example.com',
        password: 'secret1',
      },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toMatchObject({ error: { code: 'U_UPLINE_REQUIRED' } });
  });

  test('email is OPTIONAL — succeeds with an upline and no email', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);
    dbMock.queryRows.mockResolvedValueOnce([
      { id: 'upline-ctv', name: 'Parent CTV', phone: '0909000000', lob_scope: ['dental'] },
    ]); // upline resolve
    dbMock.queryRows.mockResolvedValueOnce([]); // dPhone
    dbMock.queryRows.mockResolvedValueOnce([]); // cPhone
    dbMock.queryRows.mockResolvedValueOnce([
      { id: 'new-ctv', name: 'No Email CTV', phone: '0123456789', email: null, referred_by_ctv_id: 'upline-ctv' },
    ]); // dental INSERT

    const handler = findRouteHandler(ctvPublicRouter, '/join', 'post');
    const req = {
      method: 'POST',
      url: '/ctv-public/join',
      body: { name: 'No Email CTV', phone: '0123456789', password: 'secret1', uplinePhone: '0909000000' },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    // No email dup-check query should run when email is blank.
    const emailChecks = dbMock.queryRows.mock.calls.filter(([sql]) => /LOWER\(email\)/.test(sql));
    expect(emailChecks).toHaveLength(0);
    // Email stored as NULL, not ''.
    const insert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.partners/.test(sql));
    expect(insert[1][3]).toBeNull();
  });

  test('creates a ROOT CTV (referred_by_ctv_id = NULL) with no upline when CTV_PUBLIC_ROOT_SIGNUP is enabled', async () => {
    process.env.CTV_PUBLIC_ROOT_SIGNUP = 'true';
    const dentalDb = { queryRows: jest.fn(), query: jest.fn() };
    const cosmeticDb = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockImplementation((lob) => (lob === 'cosmetic' ? cosmeticDb : dentalDb));
    // No upline lookup happens. Dup phone checks only (email blank).
    dentalDb.queryRows.mockResolvedValueOnce([]); // dPhone
    cosmeticDb.queryRows.mockResolvedValueOnce([]); // cPhone
    dentalDb.queryRows.mockResolvedValueOnce([
      { id: 'root-ctv', name: 'Root CTV', phone: '0123456789', email: null, referred_by_ctv_id: null },
    ]); // dental INSERT
    cosmeticDb.queryRows.mockResolvedValueOnce([
      { id: 'root-ctv', name: 'Root CTV', phone: '0123456789', email: null, referred_by_ctv_id: null },
    ]); // cosmetic INSERT

    const handler = findRouteHandler(ctvPublicRouter, '/join', 'post');
    const req = {
      method: 'POST',
      url: '/ctv-public/join',
      body: { name: 'Root CTV', phone: '0123456789', password: 'secret1' },
    };
    const res = makeRes();

    await handler(req, res);

    delete process.env.CTV_PUBLIC_ROOT_SIGNUP;

    expect(res.statusCode).toBe(201);
    expect(res.jsonBody).toMatchObject({ ok: true, id: 'root-ctv', uplineName: null });
    const insert = dentalDb.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.partners/.test(sql));
    expect(insert[1][6]).toBeNull(); // referred_by_ctv_id is NULL for a root CTV
  });

  test('rejects an unknown upline phone', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);
    dbMock.queryRows.mockResolvedValueOnce([]);

    const handler = findRouteHandler(ctvPublicRouter, '/join', 'post');
    const req = {
      method: 'POST',
      url: '/ctv-public/join',
      body: {
        name: 'New CTV',
        phone: '0123456789',
        email: 'new@example.com',
        password: 'secret1',
        uplinePhone: '0909000000',
      },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.jsonBody).toMatchObject({ error: { code: 'U_INVALID_UPLINE' } });
  });
});

describe('GET /ctv-public/ctv-lookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns the active CTV name for a known phone', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'ctv-1', name: 'Parent CTV', phone: '0909000000' }]);

    const handler = findRouteHandler(ctvPublicRouter, '/ctv-lookup', 'get');
    const req = {
      method: 'GET',
      url: '/ctv-public/ctv-lookup?phone=0909000000',
      query: { phone: '0909000000' },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ exists: true, name: 'Parent CTV' });
  });

  test('returns exists false for an unknown CTV phone', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);
    dbMock.queryRows.mockResolvedValueOnce([]);

    const handler = findRouteHandler(ctvPublicRouter, '/ctv-lookup', 'get');
    const req = {
      method: 'GET',
      url: '/ctv-public/ctv-lookup?phone=0909000000',
      query: { phone: '0909000000' },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ exists: false, name: null });
  });
});
