'use strict';

const discountCodesRouter = require('../discountCodes');

jest.mock('../../db', () => {
  const mockQueryRows = jest.fn();
  const mockQuery = jest.fn((sql, params) => mockQueryRows(sql, params).then((rows) => ({ rows })));
  return {
    getDb: jest.fn(() => ({ queryRows: mockQueryRows, query: mockQuery })),
  };
});

jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, res, next) => next(),
}));

jest.mock('../../services/referralClaim', () => ({
  getReferralClaimStatus: jest.fn().mockResolvedValue({ active: false, ownerCtvId: null }),
}));

jest.mock('../../services/ctvDiscountCodes', () => ({
  DEFAULT_EXPIRY_DAYS: 30,
  DEFAULT_NON_LIVE_PERCENT: 10,
  buildCtvShortCode: (id) => `CTV-${String(id).replace(/-/g, '').slice(0, 6).toUpperCase()}`,
  checkExistingCodeForVisitor: jest.fn(),
  createCustomerForCtv: jest.fn(),
  fetchCodeRow: jest.fn(),
  fetchCtvPartner: jest.fn(),
  formatDiscount: (v) => `${v}%`,
  generateCodeForCtv: jest.fn(),
  getCtvCodeStats: jest.fn(),
  getClientIp: () => '127.0.0.1',
  getQrDiscountSettings: jest.fn().mockResolvedValue({
    livePercent: 20,
    nonLivePercent: 10,
    liveExpiryDays: 30,
    nonLiveExpiryDays: 30,
    liveSlogan: 'Cho tất cả dịch vụ làm đẹp ✨',
    nonLiveSlogan: 'Cho tất cả dịch vụ làm đẹp ✨',
  }),
  listCtvCodes: jest.fn(),
  lookupClientForDiscountVerify: jest.fn(),
  mapLookupResponse: jest.fn(),
  reclaimClientForCtv: jest.fn(),
  resolveCtvByShortCode: jest.fn(),
}));

const { getDb } = require('../../db');
const {
  checkExistingCodeForVisitor,
  createCustomerForCtv,
  fetchCodeRow,
  fetchCtvPartner,
  generateCodeForCtv,
  getCtvCodeStats,
  getQrDiscountSettings,
  listCtvCodes,
  lookupClientForDiscountVerify,
  mapLookupResponse,
  reclaimClientForCtv,
  resolveCtvByShortCode,
} = require('../../services/ctvDiscountCodes');

function findRouteHandler(router, path, method) {
  let handler;
  router.stack.forEach((layer) => {
    if (layer.route && layer.route.path === path && layer.route.methods[method]) {
      const stack = layer.route.stack;
      handler = stack[stack.length - 1].handle;
    }
  });
  return handler;
}

function makeRes() {
  const res = {
    statusCode: 200,
    jsonBody: null,
    cookies: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.jsonBody = body;
      return this;
    },
    cookie(name, value) {
      this.cookies[name] = value;
    },
  };
  return res;
}

describe('discount-codes routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /client-search returns LOB-specific client lookup', async () => {
    const handler = findRouteHandler(discountCodesRouter, '/client-search', 'get');
    fetchCodeRow.mockResolvedValue({ ctv_partner_id: 'ctv-1', code: 'LINH-A3X9K2' });
    lookupClientForDiscountVerify.mockResolvedValue({
      exists: true,
      lob: 'dental',
      clientId: 'd1',
      name: 'Dental Client',
      claimed: false,
      hasService: true,
    });

    const res = makeRes();
    await handler(
      {
        user: { employeeId: 'staff-1', is_ctv: false },
        query: { phone: '0901234567', lob: 'dental', code: 'LINH-A3X9K2' },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody.exists).toBe(true);
    expect(res.jsonBody.lob).toBe('dental');
    expect(res.jsonBody.hasService).toBe(true);
  });

  test('POST /generate returns new code for CTV portal', async () => {
    const handler = findRouteHandler(discountCodesRouter, '/generate', 'post');
    generateCodeForCtv.mockResolvedValue({
      row: {
        code: 'LINH-A3X9K2',
        discount_value: 10,
        discount_type: 'percent',
        expires_at: '2026-07-08T00:00:00.000Z',
      },
      isExisting: false,
      ctv: { id: 'ctv-1', name: 'Linh' },
    });

    const res = makeRes();
    await handler(
      {
        user: { employeeId: 'ctv-1', is_ctv: true },
        body: {},
        headers: {},
        cookies: {},
      },
      res
    );

    expect(generateCodeForCtv).toHaveBeenCalledWith(
      expect.objectContaining({ ctvId: 'ctv-1', generationSource: 'ctv_portal', forceNew: true })
    );
    expect(res.jsonBody.success).toBe(true);
    expect(res.jsonBody.code).toBe('LINH-A3X9K2');
  });

  test('GET /mine returns CTV code list', async () => {
    const handler = findRouteHandler(discountCodesRouter, '/mine', 'get');
    listCtvCodes.mockResolvedValue({
      codes: [{ id: '1', code: 'LINH-A3X9K2', status: 'claimed' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const res = makeRes();
    await handler({ user: { employeeId: 'ctv-1', is_ctv: true }, query: {} }, res);

    expect(res.jsonBody.success).toBe(true);
    expect(res.jsonBody.codes).toHaveLength(1);
  });

  test('GET /stats returns aggregate stats', async () => {
    const handler = findRouteHandler(discountCodesRouter, '/stats', 'get');
    getCtvCodeStats.mockResolvedValue({ totalCodes: 3, usedCodes: 1, conversionRate: '33.3' });

    const res = makeRes();
    await handler({ user: { employeeId: 'ctv-1', is_ctv: true } }, res);

    expect(res.jsonBody.stats.totalCodes).toBe(3);
  });

  test('POST /verify can create client when createIfMissing', async () => {
    const handler = findRouteHandler(discountCodesRouter, '/verify', 'post');
    fetchCodeRow.mockResolvedValue({
      id: 'code-row-1',
      code: 'LINH-A3X9K2',
      status: 'claimed',
      discount_value: 10,
      discount_type: 'percent',
      ctv_partner_id: 'ctv-1',
      ctv_name: 'Linh',
      expires_at: '2026-07-08T00:00:00.000Z',
    });
    createCustomerForCtv.mockResolvedValue({
      customer: { id: 'cust-1', name: 'New Client', phone: '0901234567' },
      created: true,
      lob: 'dental',
    });
    const dentalDb = {
      queryRows: jest
        .fn()
        .mockResolvedValue([{ id: 'cust-1', name: 'New Client', phone: '0901234567' }]),
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };
    getDb.mockReturnValue(dentalDb);

    const res = makeRes();
    await handler(
      {
        user: { employeeId: 'staff-1', is_ctv: false, name: 'Staff' },
        body: {
          code: 'LINH-A3X9K2',
          customerPhone: '0901234567',
          customerName: 'New Client',
          customerLob: 'dental',
          createIfMissing: true,
        },
      },
      res
    );

    expect(createCustomerForCtv).toHaveBeenCalled();
    expect(res.jsonBody.valid).toBe(true);
  });

  test('GET /lookup uses mapLookupResponse', async () => {
    const handler = findRouteHandler(discountCodesRouter, '/lookup', 'get');
    fetchCodeRow.mockResolvedValue({ code: 'LINH-A3X9K2', status: 'claimed' });
    mapLookupResponse.mockReturnValue({
      found: true,
      valid: true,
      code: 'LINH-A3X9K2',
      discountLabel: '10%',
      status: 'claimed',
    });

    const res = makeRes();
    await handler(
      { user: { employeeId: 'staff-1', is_ctv: false }, query: { code: 'LINH-A3X9K2' } },
      res
    );

    expect(res.jsonBody.valid).toBe(true);
  });

  test('GET /landing/:shortCode returns CTV preview for fans', async () => {
    const handler = findRouteHandler(discountCodesRouter, '/landing/:shortCode', 'get');
    resolveCtvByShortCode.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'CTV Test Leaf',
      active: true,
      is_live: false,
    });

    const res = makeRes();
    await handler({ params: { shortCode: 'CTV-333333' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody.success).toBe(true);
    expect(res.jsonBody.ctv.name).toBe('CTV Test Leaf');
    expect(res.jsonBody.ctv.discountValue).toBe(10);
  });

  test('GET /check-existing returns hasCode false when none', async () => {
    const handler = findRouteHandler(discountCodesRouter, '/check-existing', 'get');
    checkExistingCodeForVisitor.mockResolvedValue(null);

    const res = makeRes();
    await handler({ query: { ctvId: 'ctv-1' }, headers: {}, cookies: {} }, res);

    expect(res.jsonBody.hasCode).toBe(false);
  });

  test('POST /verify completes a checked-in code using the customer bound at check-in', async () => {
    const handler = findRouteHandler(discountCodesRouter, '/verify', 'post');
    fetchCodeRow.mockResolvedValue({
      id: 'code-row-2',
      code: 'LINH-B7Y2W4',
      status: 'checked_in',
      discount_value: 10,
      discount_type: 'percent',
      ctv_partner_id: 'ctv-1',
      ctv_name: 'Linh',
      customer_partner_id: 'cust-9',
      customer_lob: 'dental',
      expires_at: '2026-07-08T00:00:00.000Z',
    });
    const dentalDb = {
      queryRows: jest.fn().mockResolvedValue([{ id: 'cust-9', name: 'Bound Client', phone: '0901234567' }]),
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };
    getDb.mockReturnValue(dentalDb);

    const res = makeRes();
    await handler(
      {
        user: { employeeId: 'staff-1', is_ctv: false, name: 'Staff' },
        body: {
          code: 'LINH-B7Y2W4',
          customerPhone: '0901234567',
          customerLob: 'dental',
          markAsUsed: true,
          // NOTE: no customerPartnerId — must fall back to row.customer_partner_id
        },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody.valid).toBe(true);
    expect(res.jsonBody.status).toBe('used');
    const updateCall = dentalDb.query.mock.calls.find(([sql]) => sql.includes('UPDATE dbo.ctv_discount_codes'));
    expect(updateCall).toBeDefined();
    const [updateSql, updateParams] = updateCall;
    // Regression lock — $9 must be cast consistently or Postgres rejects the
    // statement with "inconsistent types deduced for parameter $9".
    expect(updateSql).toContain('$9::varchar');
    expect(updateParams).toContain('cust-9');
  });
});