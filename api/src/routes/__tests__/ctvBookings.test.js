'use strict';

const ctvRouter = require('../ctv');

jest.mock('../../services/referralClaim', () => ({
  getReferralClaimStatus: jest.fn(),
}));

jest.mock('../../services/referralCard', () => ({
  createReferralStartCard: jest.fn(),
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
const { createReferralStartCard } = require('../../services/referralCard');
const { getDb } = require('../../db');

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
    expect(createReferralStartCard).not.toHaveBeenCalled();
  });

  test('creates booking for new client when no claim exists', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    // Step 1: no client found by phone
    dbMock.queryRows.mockResolvedValueOnce([]);
    // Step 3a: INSERT partner
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'new-client-id' }]);
    // Step 3b: default Referral Start product for appointment purpose
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'referral-start-prod' }]);
    // Step 3b: appointment name seq
    dbMock.queryRows.mockResolvedValueOnce([{ next_seq: 42 }]);
    // Step 3b: INSERT appointment
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

    expect(createReferralStartCard).not.toHaveBeenCalled();
    expect(dbMock.queryRows.mock.calls.some(([sql]) => /saleorders|saleorderlines/i.test(sql))).toBe(false);
    expect(res.statusCode).toBe(201);
    expect(res.jsonBody).toHaveProperty('clientId');
    expect(res.jsonBody).toHaveProperty('appointmentId');
    const apptInsert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.appointments/.test(sql));
    expect(apptInsert[1][12]).toBe('referral-start-prod');
  });

  test('marks an existing accepted partner as a customer so admin search can find it', async () => {
    const dbMock = { queryRows: jest.fn(), query: jest.fn() };
    getDb.mockReturnValue(dbMock);

    dbMock.queryRows.mockResolvedValueOnce([{ id: 'existing-partner-id' }]);
    dbMock.queryRows.mockResolvedValueOnce([{}]);
    dbMock.queryRows.mockResolvedValueOnce([{ id: 'referral-start-prod' }]);
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
    const updatePartner = dbMock.queryRows.mock.calls.find(([sql]) => /UPDATE dbo\.partners/.test(sql));
    expect(updatePartner).toBeDefined();
    expect(updatePartner[0]).toContain('customer = true');
    expect(updatePartner[1]).toEqual(['ctv-me', 'existing-partner-id']);
    expect(createReferralStartCard).not.toHaveBeenCalled();
    const apptInsert = dbMock.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.appointments/.test(sql));
    expect(apptInsert[1][12]).toBe('referral-start-prod');
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
    expect(createReferralStartCard).not.toHaveBeenCalled();
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
    expect(createReferralStartCard).not.toHaveBeenCalled();
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
      { id: 's1', name: 'Tẩy trắng răng', price: '500000' },
      { id: 's2', name: 'Niềng răng', price: null },
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
      { id: 's1', name: 'Tẩy trắng răng', price: 500000 },
      { id: 's2', name: 'Niềng răng', price: null },
    ]);
  });
});
