jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: (permission) => (req, _res, next) => {
    req.requiredPermission = permission;
    next();
  },
}));

jest.mock('../src/db', () => {
  const query = jest.fn();
  return {
    query,
    withTransaction: jest.fn(async (work) => work(query)),
  };
});

// The correction path resolves investor row scope before it mutates anything. Without this
// mock the real resolveInvestorScope issues its own query() and consumes an entry from the
// ordered mock queue below, which silently shifts every later assertion in this file.
// Default is "not an investor" so the existing cases exercise the unrestricted path.
jest.mock('../src/services/permissionService', () => ({
  resolveInvestorScope: jest.fn(async () => ({ isInvestor: false, allowedCustomerIds: [] })),
}));

const { query, withTransaction } = require('../src/db');
const { resolveInvestorScope } = require('../src/services/permissionService');
const saleOrdersRouter = require('../src/routes/saleOrders');
const { updateSaleOrder } = require('../src/routes/saleOrders/updateSaleOrder');
const { correctSaleOrderSource } = require('../src/routes/saleOrders/correctSaleOrderSource');
const {
  SOURCE_IMMUTABLE,
  SOURCE_CORRECTION_CONFLICT,
  SOURCE_CORRECTION_INVALID,
  evaluateSourceLock,
  getOpenPeriodStart,
  sourceIdsEqual,
} = require('../src/lib/saleOrderSourceLock');
const { CUSTOMER_SOURCE_NOT_SELECTABLE } = require('../src/routes/saleOrders/customerSourceSelection');

const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SOURCE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ACTOR = '33333333-3333-4333-8333-333333333333';
const CUSTOMER_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_CUSTOMER = '55555555-5555-4555-8555-555555555555';

function responseDouble() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('sale order source lock evaluation', () => {
  it('allows open unpaid current-month orders', () => {
    const openStart = getOpenPeriodStart(new Date('2026-07-15T12:00:00Z'));
    const lock = evaluateSourceLock({
      totalPaid: 0,
      attributionDate: openStart,
      now: new Date('2026-07-15T12:00:00Z'),
    });
    expect(lock.locked).toBe(false);
    expect(lock.reasons).toEqual([]);
  });

  it('locks paid orders even in the open period', () => {
    const lock = evaluateSourceLock({
      totalPaid: 1000,
      attributionDate: '2026-07-10',
      now: new Date('2026-07-15T12:00:00Z'),
    });
    expect(lock.locked).toBe(true);
    expect(lock.reasons).toContain('paid');
  });

  it('locks unpaid orders from a prior calendar month (closed period)', () => {
    const lock = evaluateSourceLock({
      totalPaid: 0,
      attributionDate: '2026-06-30',
      now: new Date('2026-07-15T12:00:00Z'),
    });
    expect(lock.locked).toBe(true);
    expect(lock.reasons).toContain('closed_period');
  });

  it('normalizes source id equality', () => {
    expect(sourceIdsEqual(SOURCE_A, SOURCE_A.toUpperCase())).toBe(true);
    expect(sourceIdsEqual(null, '')).toBe(true);
    expect(sourceIdsEqual(SOURCE_A, SOURCE_B)).toBe(false);
  });
});

describe('ordinary PATCH source immutability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows source change on open unpaid orders', async () => {
    query
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        order_sourceid: SOURCE_A,
        totalpaid: 0,
        datestart: '2026-07-10',
        datecreated: '2026-07-10',
        isdeleted: false,
      }])
      .mockResolvedValueOnce([{ totalpaid: 0 }]) // allocations
      .mockResolvedValueOnce([{ is_active: true, already_selected: false }])
      .mockResolvedValueOnce([{ id: ORDER_ID, sourceid: SOURCE_B }]) // update fields
      .mockResolvedValueOnce([{
        id: 'audit-open-patch',
        entity_type: 'saleorder',
        is_unexpected: false,
      }])
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        sourceid: SOURCE_B,
        totalpaid: 0,
        residual: 0,
        amounttotal: 0,
      }]); // fetch

    const res = responseDouble();
    await updateSaleOrder(
      { params: { id: ORDER_ID }, body: { sourceid: SOURCE_B } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(withTransaction).toHaveBeenCalled();
  });

  it('rejects source change on paid orders via ordinary PATCH', async () => {
    query
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        order_sourceid: SOURCE_A,
        totalpaid: 500000,
        datestart: '2026-07-10',
        datecreated: '2026-07-10',
        isdeleted: false,
      }])
      .mockResolvedValueOnce([{ totalpaid: 500000 }]);

    const res = responseDouble();
    await updateSaleOrder(
      { params: { id: ORDER_ID }, body: { sourceid: SOURCE_B } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: SOURCE_IMMUTABLE,
      reasons: expect.arrayContaining(['paid']),
    }));
    // Must not UPDATE saleorders after lock rejection
    expect(query.mock.calls.some(([sql]) => /UPDATE\s+saleorders/i.test(sql))).toBe(false);
  });

  it('rejects source change on closed-period unpaid orders', async () => {
    query
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        order_sourceid: SOURCE_A,
        totalpaid: 0,
        datestart: '2026-06-15',
        datecreated: '2026-06-15',
        isdeleted: false,
      }])
      .mockResolvedValueOnce([{ totalpaid: 0 }]);

    const res = responseDouble();
    await updateSaleOrder(
      { params: { id: ORDER_ID }, body: { sourceid: SOURCE_B } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: SOURCE_IMMUTABLE,
      reasons: expect.arrayContaining(['closed_period']),
    }));
  });

  it('allows unrelated field edits on locked orders when source is omitted', async () => {
    query
      .mockResolvedValueOnce([{ id: ORDER_ID, notes: 'updated' }]) // update fields
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        notes: 'updated',
        sourceid: SOURCE_A,
        totalpaid: 100,
      }]);

    const res = responseDouble();
    await updateSaleOrder(
      { params: { id: ORDER_ID }, body: { notes: 'updated' } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const updateSql = query.mock.calls.find(([sql]) => /UPDATE\s+saleorders/i.test(sql))?.[0] || '';
    expect(updateSql).toContain('notes');
    expect(updateSql).not.toContain('sourceid');
  });

  it('treats repeated current source on locked order as no-op and still updates other fields', async () => {
    query
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        order_sourceid: SOURCE_A,
        totalpaid: 100,
        datestart: '2026-06-01',
        datecreated: '2026-06-01',
        isdeleted: false,
      }])
      .mockResolvedValueOnce([{ totalpaid: 100 }])
      .mockResolvedValueOnce([{ id: ORDER_ID, notes: 'ok', sourceid: SOURCE_A }])
      .mockResolvedValueOnce([{ id: ORDER_ID, notes: 'ok', sourceid: SOURCE_A, totalpaid: 100 }]);

    const res = responseDouble();
    await updateSaleOrder(
      {
        params: { id: ORDER_ID },
        body: { notes: 'ok', sourceid: SOURCE_A },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const updateSql = query.mock.calls.find(([sql]) => /UPDATE\s+saleorders/i.test(sql))?.[0] || '';
    expect(updateSql).not.toMatch(/sourceid\s*=/);
  });
});

describe('permissioned source correction path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wires POST /:id/source-correction to services.source_correct', () => {
    const layer = saleOrdersRouter.stack.find(
      (entry) => entry.route?.path === '/:id/source-correction' && entry.route.methods.post,
    );
    expect(layer).toBeTruthy();
    const req = {};
    const res = responseDouble();
    const next = jest.fn();
    layer.route.stack[0].handle(req, res, next);
    expect(req.requiredPermission).toBe('services.source_correct');
  });

  it('rejects correction without required audit fields', async () => {
    const res = responseDouble();
    await correctSaleOrderSource(
      {
        params: { id: ORDER_ID },
        user: { employeeId: ACTOR },
        headers: {},
        body: { new_sourceid: SOURCE_B, expected_old_sourceid: SOURCE_A },
      },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: SOURCE_CORRECTION_INVALID,
    }));
  });

  it('rejects correction when expected_old_sourceid mismatches', async () => {
    query
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        order_sourceid: SOURCE_A,
        totalpaid: 100,
        datestart: '2026-06-01',
        datecreated: '2026-06-01',
        isdeleted: false,
      }])
      .mockResolvedValueOnce([{ totalpaid: 100 }]);

    const res = responseDouble();
    await correctSaleOrderSource(
      {
        params: { id: ORDER_ID },
        user: { employeeId: ACTOR },
        headers: { 'x-request-id': 'req-1' },
        body: {
          new_sourceid: SOURCE_B,
          expected_old_sourceid: SOURCE_B,
          reason: 'Workbook mismatch confirmed by clinic manager',
          evidence: 'T6 Q10.xlsx row SO-1',
          rollback_reference: 'backup:pre-q10-20260723',
        },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: SOURCE_CORRECTION_CONFLICT,
    }));
  });

  it('applies authorized correction and writes full audit row', async () => {
    const createdAt = '2026-07-24T05:00:00.000Z';
    query
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        order_sourceid: SOURCE_A,
        totalpaid: 100,
        datestart: '2026-06-01',
        datecreated: '2026-06-01',
        isdeleted: false,
      }])
      .mockResolvedValueOnce([{ totalpaid: 100 }])
      .mockResolvedValueOnce([{ is_active: true, already_selected: false }])
      .mockResolvedValueOnce([{ id: ORDER_ID, sourceid: SOURCE_B }])
      .mockResolvedValueOnce([{
        id: 'corr-1',
        saleorder_id: ORDER_ID,
        old_sourceid: SOURCE_A,
        new_sourceid: SOURCE_B,
        reason: 'Workbook mismatch confirmed by clinic manager',
        evidence: 'T6 Q10.xlsx row SO-1',
        rollback_reference: 'backup:pre-q10-20260723',
        actor_employee_id: ACTOR,
        request_id: 'req-audit-1',
        created_at: createdAt,
      }])
      .mockResolvedValueOnce([{
        id: 'audit-corr-1',
        entity_type: 'saleorder',
        entity_id: ORDER_ID,
        old_sourceid: SOURCE_A,
        new_sourceid: SOURCE_B,
        change_channel: 'source_correction',
        is_unexpected: false,
      }])
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        sourceid: SOURCE_B,
        totalpaid: 100,
      }]);

    const res = responseDouble();
    await correctSaleOrderSource(
      {
        params: { id: ORDER_ID },
        user: { employeeId: ACTOR },
        headers: { 'x-request-id': 'req-audit-1' },
        body: {
          new_sourceid: SOURCE_B,
          expected_old_sourceid: SOURCE_A,
          reason: 'Workbook mismatch confirmed by clinic manager',
          evidence: 'T6 Q10.xlsx row SO-1',
          rollback_reference: 'backup:pre-q10-20260723',
        },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.correction).toEqual(expect.objectContaining({
      old_sourceid: SOURCE_A,
      new_sourceid: SOURCE_B,
      actor_employee_id: ACTOR,
      request_id: 'req-audit-1',
      reason: expect.any(String),
      evidence: expect.any(String),
      rollback_reference: expect.any(String),
      created_at: createdAt,
    }));
    expect(body.order.sourceid).toBe(SOURCE_B);
    expect(body.audit).toEqual(expect.objectContaining({
      old_sourceid: SOURCE_A,
      new_sourceid: SOURCE_B,
      change_channel: 'source_correction',
      is_unexpected: false,
    }));

    const insertSql = query.mock.calls.find(([sql]) => /INSERT INTO dbo\.saleorder_source_corrections/i.test(sql))?.[0];
    expect(insertSql).toBeTruthy();
    const appendOnlySql = query.mock.calls.find(([sql]) => /INSERT INTO dbo\.source_change_audit/i.test(sql))?.[0];
    expect(appendOnlySql).toBeTruthy();
  });

  it('rejects inactive target source on correction path', async () => {
    query
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        order_sourceid: SOURCE_A,
        totalpaid: 100,
        datestart: '2026-06-01',
        datecreated: '2026-06-01',
        isdeleted: false,
      }])
      .mockResolvedValueOnce([{ totalpaid: 100 }])
      .mockResolvedValueOnce([{ is_active: false, already_selected: false }]);

    const res = responseDouble();
    await correctSaleOrderSource(
      {
        params: { id: ORDER_ID },
        user: { employeeId: ACTOR },
        headers: {},
        body: {
          new_sourceid: SOURCE_B,
          expected_old_sourceid: SOURCE_A,
          reason: 'Workbook mismatch confirmed by clinic manager',
          evidence: 'T6 Q10.xlsx row SO-1',
          rollback_reference: 'backup:pre-q10-20260723',
        },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: CUSTOMER_SOURCE_NOT_SELECTABLE,
    }));
  });

  // D21 (DECISIONS.md) forbids investor writes until a decision names the exact write
  // permission and scope. None authorizes source correction, so BOTH an unscoped and an
  // allowlisted investor must be refused, with zero writes and zero audit rows.
  it.each([
    ['not scoped to the order customer', [OTHER_CUSTOMER]],
    ['allowlisted for the order customer', [CUSTOMER_ID]],
  ])('refuses an investor %s and writes nothing', async (_label, allowedCustomerIds) => {
    resolveInvestorScope.mockResolvedValueOnce({ isInvestor: true, allowedCustomerIds });

    const res = responseDouble();
    await correctSaleOrderSource(
      {
        params: { id: ORDER_ID },
        user: { employeeId: ACTOR },
        headers: {},
        body: {
          new_sourceid: SOURCE_B,
          expected_old_sourceid: SOURCE_A,
          reason: 'Attempted source correction by an investor account',
          evidence: 'scope test',
          rollback_reference: 'none',
        },
      },
      res,
    );

    // 404 rather than 403: a 403 would confirm the order exists.
    expect(res.status).toHaveBeenCalledWith(404);
    // Rejected before the transaction: no lock is taken and no statement runs at all.
    expect(withTransaction).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
    expect(query.mock.calls.some(([sql]) => /UPDATE\s+dbo\.saleorders/i.test(sql))).toBe(false);
    expect(query.mock.calls.some(([sql]) => /INSERT INTO dbo\.saleorder_source_corrections/i.test(sql))).toBe(false);
    expect(query.mock.calls.some(([sql]) => /INSERT INTO dbo\.source_change_audit/i.test(sql))).toBe(false);
  });
});
