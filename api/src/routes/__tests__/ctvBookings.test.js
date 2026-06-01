'use strict';

const ctvRouter = require('../ctv');

jest.mock('../../services/referralClaim', () => ({
  getReferralClaimStatus: jest.fn(),
}));

jest.mock('../../db', () => {
  const mockQueryRows = jest.fn();
  const mockQuery = jest.fn((sql, params) => mockQueryRows(sql, params).then((rows) => ({ rows })));
  return {
    query: mockQuery,
    getQuery: jest.fn(() => mockQueryRows),
    getDb: jest.fn(() => ({ queryRows: mockQueryRows, query: mockQuery })),
  };
});

jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, res, next) => next(),
}));

jest.mock('../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(() => Promise.resolve({ effectivePermissions: [] })),
  isAdminPermissionState: jest.fn(() => false),
}));

const { getReferralClaimStatus } = require('../../services/referralClaim');
const { getDb } = require('../../db');

function getRouteHandler(path, method) {
  let handler;
  ctvRouter.stack.forEach((layer) => {
    if (layer.route && layer.route.path === path && layer.route.methods[method]) {
      layer.route.stack.forEach((l) => { if (l.handle && typeof l.handle === 'function') handler = l.handle; });
    }
  });
  return handler;
}

function makeRes() {
  return {
    statusCode: 200,
    jsonBody: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.jsonBody = body; return this; },
  };
}

describe('POST /ctv/bookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('blocks booking when client actively claimed by another CTV', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    // Step 1: find client by phone
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'client-1' }]);

    // Step 2: claim check — active, owned by different CTV
    getReferralClaimStatus.mockResolvedValueOnce({
      ownerCtvId: 'ctv-other',
      ownerName: 'Other CTV',
      active: true,
      expiresAt: new Date('2026-12-01'),
    });

    const req = {
      method: 'POST',
      url: '/ctv/bookings',
      headers: { 'content-type': 'application/json' },
      body: { phone: '0909123456', date: '2026-06-01', lob: 'dental' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };

    const res = makeRes();
    const handler = getRouteHandler('/bookings', 'post');

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toMatchObject({
      error: {
        code: 'B_CLIENT_CLAIMED',
        ownerName: 'Other CTV',
      },
    });
  });

  test('creates booking for new client when no claim exists', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    // Step 1: no client found by phone
    dbMock.queryRows.mockResolvedValueOnce([]);
    // Step 3a: default Referral Start product for appointment purpose
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'referral-start-prod' }]);
    // Step 3b: selected LOB fallback company
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'fallback-company' }]);
    // Step 3c: INSERT partner
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'new-client-id' }]);
    // Step 3b: appointment name seq
    dbMock.queryRows.mockResolvedValueOnce([{ next_seq: 42 }]);
    // Step 3c: INSERT appointment
    dbMock.queryRows.mockResolvedValueOnce([{}]);

    getReferralClaimStatus.mockResolvedValueOnce({ active: false });

    const handler = getRouteHandler('/bookings', 'post');

    const req = {
      method: 'POST',
      url: '/ctv/bookings',
      body: { phone: '0909999999', name: 'New Client', date: '2026-06-01', lob: 'dental' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.jsonBody).toHaveProperty('clientId');
    expect(res.jsonBody).toHaveProperty('appointmentId');
    const sqlCalls = dbMock.queryRows.mock.calls.map(([sql]) => sql);
    expect(sqlCalls.some((sql) => /INSERT INTO dbo\.saleorders/i.test(sql))).toBe(false);
    expect(sqlCalls.some((sql) => /INSERT INTO dbo\.saleorderlines/i.test(sql))).toBe(false);
    const apptInsert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.appointments/.test(sql));
    expect(apptInsert[1][6]).toBe('fallback-company');
    expect(apptInsert[1][12]).toBe('referral-start-prod');
  });

  test('marks an existing accepted partner as a customer so admin search can find it', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    dbMock.queryRows.mockResolvedValueOnce([{ id: 'existing-partner-id' }]);
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'referral-start-prod' }]);
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'fallback-company' }]);
    dbMock.queryRows.mockResolvedValueOnce([{}]);
    dbMock.queryRows.mockResolvedValueOnce([{ next_seq: 43 }]);
    dbMock.queryRows.mockResolvedValueOnce([{}]);

    getReferralClaimStatus.mockResolvedValueOnce({ active: false });

    const handler = getRouteHandler('/bookings', 'post');

    const req = {
      method: 'POST',
      url: '/ctv/bookings',
      body: { phone: '0123123123', name: 'thuan test', date: '2026-06-01', lob: 'cosmetic' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    const sqlCalls = dbMock.queryRows.mock.calls.map(([sql]) => sql);
    expect(sqlCalls.some((sql) => /INSERT INTO dbo\.saleorders/i.test(sql))).toBe(false);
    expect(sqlCalls.some((sql) => /INSERT INTO dbo\.saleorderlines/i.test(sql))).toBe(false);
    const updatePartner = dbMock.queryRows.mock.calls.find(([sql]) => /UPDATE dbo\.partners/.test(sql));
    expect(updatePartner).toBeDefined();
    expect(updatePartner[0]).toContain('customer = true');
    expect(updatePartner[1]).toEqual(['ctv-me', 'existing-partner-id']);
    const apptInsert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.appointments/.test(sql));
    expect(apptInsert[1][6]).toBe('fallback-company');
    expect(apptInsert[1][12]).toBe('referral-start-prod');
  });

  test('persists the chosen service (productId) and trimmed note onto the appointment', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    dbMock.queryRows.mockResolvedValueOnce([]); // no client found by phone
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'prod-9' }]); // productId validation (exists + active)
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'fallback-company' }]); // selected LOB fallback company
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'new-client-id' }]); // INSERT partner
    dbMock.queryRows.mockResolvedValueOnce([{ next_seq: 7 }]); // appointment name seq
    dbMock.queryRows.mockResolvedValueOnce([{}]); // INSERT appointment

    getReferralClaimStatus.mockResolvedValueOnce({ active: false });

    const handler = getRouteHandler('/bookings', 'post');

    const req = {
      method: 'POST',
      url: '/ctv/bookings',
      body: {
        phone: '0909888777',
        name: 'Svc Client',
        date: '2026-06-01',
        lob: 'cosmetic',
        productId: 'prod-9',
        note: '  whitening follow-up  ',
      },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    const apptInsert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.appointments/.test(sql));
    expect(apptInsert).toBeDefined();
    const params = apptInsert[1];
    expect(params[6]).toBe('fallback-company'); // companyid
    expect(params[7]).toBe('whitening follow-up'); // note (trimmed)
    expect(params[12]).toBe('prod-9'); // productid
  });

  test('drops an unknown/cross-LOB productId to null instead of failing the booking', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    dbMock.queryRows.mockResolvedValueOnce([]); // no client found by phone
    dbMock.queryRows.mockResolvedValueOnce([]); // productId validation → not found in this LOB
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'fallback-company' }]); // selected LOB fallback company
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'new-client-id' }]); // INSERT partner
    dbMock.queryRows.mockResolvedValueOnce([{ next_seq: 8 }]); // appointment name seq
    dbMock.queryRows.mockResolvedValueOnce([{}]); // INSERT appointment

    getReferralClaimStatus.mockResolvedValueOnce({ active: false });

    const handler = getRouteHandler('/bookings', 'post');

    const req = {
      method: 'POST',
      url: '/ctv/bookings',
      body: { phone: '0900111222', name: 'X', date: '2026-06-01', lob: 'dental', productId: 'bogus-id' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    const apptInsert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.appointments/.test(sql));
    expect(apptInsert[1][6]).toBe('fallback-company');
    expect(apptInsert[1][12]).toBeNull(); // productid dropped to null
  });

  test('uses the CTV token companyId when it belongs to the selected LOB', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    dbMock.queryRows.mockResolvedValueOnce([]); // no client found by phone
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'referral-start-prod' }]); // default product
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'jwt-company' }]); // token company exists in selected LOB
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'new-client-id' }]); // INSERT partner
    dbMock.queryRows.mockResolvedValueOnce([{ next_seq: 9 }]); // appointment name seq
    dbMock.queryRows.mockResolvedValueOnce([{}]); // INSERT appointment

    const handler = getRouteHandler('/bookings', 'post');
    const req = {
      method: 'POST',
      url: '/ctv/bookings',
      body: { phone: '0900222333', name: 'Token Co', date: '2026-06-01', lob: 'cosmetic' },
      user: { employeeId: 'ctv-me', is_ctv: true, companyId: 'jwt-company' },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    const companyLookup = dbMock.queryRows.mock.calls.find(([sql]) => /FROM dbo\.companies WHERE id = \$1/.test(sql));
    expect(companyLookup[1]).toEqual(['jwt-company']);
    const apptInsert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.appointments/.test(sql));
    expect(apptInsert[1][6]).toBe('jwt-company');
  });

  test('returns B_COMPANY_REQUIRED before mutating the client when no company can be resolved', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    dbMock.queryRows.mockResolvedValueOnce([]); // no client found by phone
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'referral-start-prod' }]); // default product
    dbMock.queryRows.mockResolvedValueOnce([]); // active company fallback empty
    dbMock.queryRows.mockResolvedValueOnce([]); // any company fallback empty

    const handler = getRouteHandler('/bookings', 'post');
    const req = {
      method: 'POST',
      url: '/ctv/bookings',
      body: { phone: '0900444555', name: 'No Co', date: '2026-06-01', lob: 'cosmetic' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toMatchObject({ error: { code: 'B_COMPANY_REQUIRED' } });
    expect(dbMock.queryRows.mock.calls.some(([sql]) => /INSERT INTO dbo\.partners/.test(sql))).toBe(false);
    expect(dbMock.queryRows.mock.calls.some(([sql]) => /UPDATE dbo\.partners/.test(sql))).toBe(false);
    expect(dbMock.queryRows.mock.calls.some(([sql]) => /INSERT INTO dbo\.appointments/.test(sql))).toBe(false);
  });
});

describe('GET /ctv/services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns the active service catalog for the chosen LOB', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);
    dbMock.queryRows.mockResolvedValueOnce([
      { id: 's1', name: 'Tẩy trắng răng', price: '500000', category_id: 'cat1', category_name: 'Whitening' },
      { id: 's2', name: 'Niềng răng', price: null, category_id: null, category_name: null },
    ]);

    const handler = getRouteHandler('/services', 'get');

    const req = {
      method: 'GET',
      url: '/ctv/services?lob=cosmetic',
      query: { lob: 'cosmetic' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = makeRes();

    await handler(req, res);

    expect(getDb).toHaveBeenCalledWith('cosmetic');
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody.services).toEqual([
      { id: 's1', name: 'Tẩy trắng răng', price: 500000, category: { id: 'cat1', name: 'Whitening' } },
      { id: 's2', name: 'Niềng răng', price: null, category: null },
    ]);
  });
});
