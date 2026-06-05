'use strict';

const ctvRouter = require('../ctv');
const ctvPublicRouter = require('../ctvPublic');

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

function findRouteHandler(router, path, method) {
  let handler;
  router.stack.forEach((layer) => {
    if (layer.route && layer.route.path === path && layer.route.methods[method]) {
      layer.route.stack.forEach((l) => {
        if (l.handle && typeof l.handle === 'function') handler = l.handle;
      });
    }
  });
  return handler;
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

    // Use supertest-like manual invocation
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };

    // Find the handler manually
    let handler;
    ctvRouter.stack.forEach((layer) => {
      if (layer.route && layer.route.path === '/bookings' && layer.route.methods.post) {
        layer.route.stack.forEach((l) => { if (l.handle && typeof l.handle === 'function') handler = l.handle; });
      }
    });

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
    // Step 3a: INSERT partner
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'new-client-id' }]);
    // Step 3b: Referral Start default appointment purpose
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'referral-start-product' }]);
    // Step 3c: appointment name seq
    dbMock.queryRows.mockResolvedValueOnce([{ next_seq: 42 }]);
    // Step 3c: INSERT appointment
    dbMock.queryRows.mockResolvedValueOnce([{}]);

    getReferralClaimStatus.mockResolvedValueOnce({ active: false });

    let handler;
    ctvRouter.stack.forEach((layer) => {
      if (layer.route && layer.route.path === '/bookings' && layer.route.methods.post) {
        layer.route.stack.forEach((l) => { if (l.handle && typeof l.handle === 'function') handler = l.handle; });
      }
    });

    const req = {
      method: 'POST',
      url: '/ctv/bookings',
      body: { phone: '0909999999', name: 'New Client', date: '2026-06-01', lob: 'dental' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.jsonBody).toHaveProperty('clientId');
    expect(res.jsonBody).toHaveProperty('appointmentId');
    const sqlCalls = dbMock.queryRows.mock.calls.map(([sql]) => sql);
    expect(sqlCalls.some((sql) => /INSERT INTO dbo\.saleorders/i.test(sql))).toBe(false);
    expect(sqlCalls.some((sql) => /INSERT INTO dbo\.saleorderlines/i.test(sql))).toBe(false);
    const apptInsert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.appointments/.test(sql));
    expect(apptInsert[1][12]).toBe('referral-start-product');
  });

  test('marks an existing accepted partner as a customer so admin search can find it', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    dbMock.queryRows.mockResolvedValueOnce([{ id: 'existing-partner-id' }]);
    dbMock.queryRows.mockResolvedValueOnce([{}]);
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'referral-start-product' }]);
    dbMock.queryRows.mockResolvedValueOnce([{ next_seq: 43 }]);
    dbMock.queryRows.mockResolvedValueOnce([{}]);

    getReferralClaimStatus.mockResolvedValueOnce({ active: false });

    let handler;
    ctvRouter.stack.forEach((layer) => {
      if (layer.route && layer.route.path === '/bookings' && layer.route.methods.post) {
        layer.route.stack.forEach((l) => { if (l.handle && typeof l.handle === 'function') handler = l.handle; });
      }
    });

    const req = {
      method: 'POST',
      url: '/ctv/bookings',
      body: { phone: '0123123123', name: 'thuan test', date: '2026-06-01', lob: 'cosmetic' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };

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
    expect(apptInsert[1][12]).toBe('referral-start-product');
  });

  test('persists the chosen service (productId) and trimmed note onto the appointment', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    dbMock.queryRows.mockResolvedValueOnce([]); // no client found by phone
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'new-client-id' }]); // INSERT partner
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'prod-9' }]); // productId validation (exists + active)
    dbMock.queryRows.mockResolvedValueOnce([{ next_seq: 7 }]); // appointment name seq
    dbMock.queryRows.mockResolvedValueOnce([{}]); // INSERT appointment

    getReferralClaimStatus.mockResolvedValueOnce({ active: false });

    let handler;
    ctvRouter.stack.forEach((layer) => {
      if (layer.route && layer.route.path === '/bookings' && layer.route.methods.post) {
        layer.route.stack.forEach((l) => { if (l.handle && typeof l.handle === 'function') handler = l.handle; });
      }
    });

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
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    const apptInsert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.appointments/.test(sql));
    expect(apptInsert).toBeDefined();
    const params = apptInsert[1];
    expect(params[7]).toBe('whitening follow-up'); // note (trimmed)
    expect(params[12]).toBe('prod-9'); // productid
  });

  test('drops an unknown/cross-LOB productId to null instead of failing the booking', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    dbMock.queryRows.mockResolvedValueOnce([]); // no client found by phone
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'new-client-id' }]); // INSERT partner
    dbMock.queryRows.mockResolvedValueOnce([]); // productId validation → not found in this LOB
    dbMock.queryRows.mockResolvedValueOnce([{ next_seq: 8 }]); // appointment name seq
    dbMock.queryRows.mockResolvedValueOnce([{}]); // INSERT appointment

    getReferralClaimStatus.mockResolvedValueOnce({ active: false });

    let handler;
    ctvRouter.stack.forEach((layer) => {
      if (layer.route && layer.route.path === '/bookings' && layer.route.methods.post) {
        layer.route.stack.forEach((l) => { if (l.handle && typeof l.handle === 'function') handler = l.handle; });
      }
    });

    const req = {
      method: 'POST',
      url: '/ctv/bookings',
      body: { phone: '0900111222', name: 'X', date: '2026-06-01', lob: 'dental', productId: 'bogus-id' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    const apptInsert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.appointments/.test(sql));
    expect(apptInsert[1][12]).toBeNull(); // productid dropped to null
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

    let handler;
    ctvRouter.stack.forEach((layer) => {
      if (layer.route && layer.route.path === '/services' && layer.route.methods.get) {
        layer.route.stack.forEach((l) => { if (l.handle && typeof l.handle === 'function') handler = l.handle; });
      }
    });

    const req = {
      method: 'GET',
      url: '/ctv/services?lob=cosmetic',
      query: { lob: 'cosmetic' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };

    await handler(req, res);

    expect(getDb).toHaveBeenCalledWith('cosmetic');
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody.services).toEqual([
      { id: 's1', name: 'Tẩy trắng răng', price: 500000, category: { id: 'cat1', name: 'Whitening' } },
      { id: 's2', name: 'Niềng răng', price: null, category: null },
    ]);
  });
});

describe('public CTV booking routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getReferralClaimStatus.mockReset();
  });

  test('POST /ctv-public/bookings resolves CTV phone and creates appointment only', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    dbMock.queryRows.mockResolvedValueOnce([{ id: 'ctv-me', name: 'CTV Me', phone: '0909000000' }]); // resolve CTV phone
    dbMock.queryRows.mockResolvedValueOnce([]); // no client found by phone
    dbMock.queryRows.mockResolvedValueOnce([{}]); // INSERT partner
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'referral-start-product' }]); // default product
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'company-1' }]); // default company/branch
    dbMock.queryRows.mockResolvedValueOnce([{ next_seq: 11 }]); // appointment name seq
    dbMock.queryRows.mockResolvedValueOnce([{}]); // INSERT appointment

    const handler = findRouteHandler(ctvPublicRouter, '/bookings', 'post');
    const req = {
      method: 'POST',
      url: '/ctv-public/bookings',
      body: {
        phone: '0123123123',
        name: 'Public Client',
        ctvPhone: '0909000000',
        date: '2026-06-02',
        lob: 'cosmetic',
      },
    };
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.jsonBody).toHaveProperty('clientId');
    expect(res.jsonBody).toHaveProperty('appointmentId');
    const sqlCalls = dbMock.queryRows.mock.calls.map(([sql]) => sql);
    expect(sqlCalls.some((sql) => /INSERT INTO dbo\.saleorders/i.test(sql))).toBe(false);
    expect(sqlCalls.some((sql) => /INSERT INTO dbo\.saleorderlines/i.test(sql))).toBe(false);
    const partnerInsert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.partners/.test(sql));
    expect(partnerInsert[1][4]).toBe('ctv-me');
    const apptInsert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.appointments/.test(sql));
    expect(apptInsert[1][12]).toBe('referral-start-product');
    expect(apptInsert[1][15]).toBe('ctv-me');
  });

  test('POST /ctv-public/bookings rejects an unknown CTV phone', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);
    dbMock.queryRows.mockResolvedValueOnce([]);

    const handler = findRouteHandler(ctvPublicRouter, '/bookings', 'post');
    const req = {
      method: 'POST',
      url: '/ctv-public/bookings',
      body: {
        phone: '0123123123',
        ctvPhone: '0909000000',
        date: '2026-06-02',
        lob: 'dental',
      },
    };
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };

    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.jsonBody).toMatchObject({
      error: { code: 'P_CTV_NOT_FOUND' },
    });
  });

  test('POST /ctv-public/bookings returns a clear error and inserts no appointment when no branch is configured', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    dbMock.queryRows.mockResolvedValueOnce([{ id: 'ctv-me', name: 'CTV Me', phone: '0909000000' }]); // resolve CTV phone
    dbMock.queryRows.mockResolvedValueOnce([]); // no client found by phone
    dbMock.queryRows.mockResolvedValueOnce([{}]); // INSERT partner
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'referral-start-product' }]); // default product
    dbMock.queryRows.mockResolvedValueOnce([]); // companies lookup -> NONE configured

    const handler = findRouteHandler(ctvPublicRouter, '/bookings', 'post');
    const req = {
      method: 'POST',
      url: '/ctv-public/bookings',
      body: {
        phone: '0123123123',
        name: 'Public Client',
        ctvPhone: '0909000000',
        date: '2026-06-02',
        lob: 'cosmetic',
      },
    };
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toMatchObject({ error: { code: 'E_NO_COMPANIES' } });
    const apptInsert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.appointments/.test(sql));
    expect(apptInsert).toBeUndefined();
  });

  test('GET /ctv-public/client-lookup marks current CTV ownership when CTV phone is supplied', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    dbMock.queryRows.mockResolvedValueOnce([{ id: 'ctv-me', name: 'CTV Me', phone: '0909000000' }]);
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'client-1', name: 'Existing Client' }]);
    getReferralClaimStatus.mockResolvedValueOnce({
      ownerCtvId: 'ctv-me',
      ownerName: 'CTV Me',
      active: true,
      expiresAt: new Date('2026-12-01'),
    });

    const handler = findRouteHandler(ctvPublicRouter, '/client-lookup', 'get');
    const req = {
      method: 'GET',
      url: '/ctv-public/client-lookup?phone=0123123123&lob=cosmetic&ctvPhone=0909000000',
      query: { phone: '0123123123', lob: 'cosmetic', ctvPhone: '0909000000' },
    };
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toMatchObject({
      exists: true,
      lob: 'cosmetic',
      clientId: 'client-1',
      name: 'Existing Client',
      claimed: false,
      claimedByMe: true,
    });
  });

});

describe('POST /ctv/clients (cross-LOB claim gate)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getReferralClaimStatus.mockReset();
  });

  function makeRes() {
    return {
      statusCode: 200,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };
  }

  test('blocks register when the same phone is actively claimed in the OTHER LOB by a different CTV', async () => {
    // The CTV calls /clients on the dental DB, but the same phone already
    // exists in the cosmetic DB under a different CTV with an active claim.
    // Previously this slipped through and created a duplicate partner row.
    const dentalDb = { queryRows: jest.fn(), query: jest.fn() };
    const cosmeticDb = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockImplementation((lob) => (lob === 'dental' ? dentalDb : cosmeticDb));

    // phone check: empty in dental, hit in cosmetic
    dentalDb.queryRows.mockResolvedValueOnce([]);
    cosmeticDb.queryRows.mockResolvedValueOnce([{ id: 'client-claimed' }]);

    getReferralClaimStatus.mockResolvedValueOnce({
      ownerCtvId: 'ctv-other',
      ownerName: 'Other CTV',
      active: true,
      expiresAt: new Date('2026-12-01'),
    });

    const handler = findRouteHandler(ctvRouter, '/clients', 'post');
    const req = {
      method: 'POST',
      url: '/ctv/clients',
      body: { name: 'Stolen Client', phone: '0909123456', lob: 'dental' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toMatchObject({
      error: { code: 'B_CLIENT_CLAIMED', ownerName: 'Other CTV' },
    });
    // No INSERT should have been issued on either DB.
    expect(dentalDb.queryRows).toHaveBeenCalledTimes(1);
    expect(cosmeticDb.queryRows).toHaveBeenCalledTimes(1);
  });

  test('blocks register when the same phone already exists in the same LOB (U_DUPLICATE_PHONE)', async () => {
    const dentalDb = { queryRows: jest.fn(), query: jest.fn() };
    const cosmeticDb = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockImplementation((lob) => (lob === 'dental' ? dentalDb : cosmeticDb));

    dentalDb.queryRows.mockResolvedValueOnce([{ id: 'client-same-lob' }]);
    cosmeticDb.queryRows.mockResolvedValueOnce([]);

    getReferralClaimStatus.mockResolvedValueOnce({
      ownerCtvId: 'ctv-me',
      ownerName: 'CTV Me',
      active: true,
      expiresAt: new Date('2026-12-01'),
    });

    const handler = findRouteHandler(ctvRouter, '/clients', 'post');
    const req = {
      method: 'POST',
      url: '/ctv/clients',
      body: { name: 'Self Client', phone: '0909123456', lob: 'dental' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toMatchObject({ error: { code: 'U_DUPLICATE_PHONE' } });
  });

  test('allows cross-LOB register when the OTHER LOB match is lapsed (claim inactive)', async () => {
    const dentalDb = { queryRows: jest.fn(), query: jest.fn() };
    const cosmeticDb = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockImplementation((lob) => (lob === 'dental' ? dentalDb : cosmeticDb));

    dentalDb.queryRows.mockResolvedValueOnce([]);
    cosmeticDb.queryRows.mockResolvedValueOnce([{ id: 'client-lapsed' }]);

    getReferralClaimStatus.mockResolvedValueOnce({
      ownerCtvId: 'ctv-old',
      ownerName: 'Old CTV',
      active: false,
      expiresAt: new Date('2024-01-01'),
    });

    // INSERT partner row + RETURNING
    dentalDb.queryRows.mockResolvedValueOnce([{
      id: 'new-id', name: 'New Client', phone: '0909123456',
      lob_scope: ['dental'], referred_by_ctv_id: 'ctv-me',
      customer: true, active: true, datecreated: '2026-06-03T00:00:00.000Z',
    }]);

    const handler = findRouteHandler(ctvRouter, '/clients', 'post');
    const req = {
      method: 'POST',
      url: '/ctv/clients',
      body: { name: 'New Client', phone: '0909123456', lob: 'dental' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.jsonBody).toMatchObject({ id: 'new-id', referred_by_ctv_id: 'ctv-me' });
  });

  test('allows register when the phone is brand new in both DBs', async () => {
    const dentalDb = { queryRows: jest.fn(), query: jest.fn() };
    const cosmeticDb = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockImplementation((lob) => (lob === 'dental' ? dentalDb : cosmeticDb));

    dentalDb.queryRows.mockResolvedValueOnce([]);
    cosmeticDb.queryRows.mockResolvedValueOnce([]);
    dentalDb.queryRows.mockResolvedValueOnce([{
      id: 'new-id-2', name: 'Brand New', phone: '0900000000',
      lob_scope: ['dental'], referred_by_ctv_id: 'ctv-me',
      customer: true, active: true, datecreated: '2026-06-03T00:00:00.000Z',
    }]);

    const handler = findRouteHandler(ctvRouter, '/clients', 'post');
    const req = {
      method: 'POST',
      url: '/ctv/clients',
      body: { name: 'Brand New', phone: '0900000000', lob: 'dental' },
      user: { employeeId: 'ctv-me', is_ctv: true },
    };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.jsonBody).toMatchObject({ id: 'new-id-2' });
  });
});

describe('GET /ctv/commission-summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not list pending reversals (negative pending earnings) in the Paid tab', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    // dental earnings: one paid item and one pending reversal (negative amount)
    dbMock.queryRows.mockResolvedValueOnce([
      { id: 'e-paid', client_id: 'c2', amount: '100000', status: 'paid', payout_id: null, earned_at: '2026-06-02', client_name: 'Paid Client' },
      { id: 'e-rev', client_id: 'c1', amount: '-50000', status: 'pending', payout_id: null, earned_at: '2026-06-01', client_name: 'Reversed Client' },
    ]);
    // cosmetic earnings: none
    dbMock.queryRows.mockResolvedValueOnce([]);

    const handler = findRouteHandler(ctvRouter, '/commission-summary', 'get');
    const req = { method: 'GET', url: '/ctv/commission-summary', user: { employeeId: 'ctv-1', is_ctv: true }, query: {} };
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.jsonBody = body; return this; },
    };

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const paidIds = res.jsonBody.paidList.map((r) => r.id);
    const pendingIds = res.jsonBody.pendingList.map((r) => r.id);
    // A pending reversal (negative, status='pending') belongs in Pending, never in Paid.
    expect(paidIds).not.toContain('e-rev');
    expect(paidIds).toContain('e-paid');
    expect(pendingIds).toContain('e-rev');
  });
});
