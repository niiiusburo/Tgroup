'use strict';

jest.mock('../src/services/sourceChangeAlert', () => ({
  notifyUnexpectedSourceChange: jest.fn(async () => ({ ok: true, skipped: false })),
  buildUnexpectedSourceChangeText: jest.requireActual('../src/services/sourceChangeAlert')
    .buildUnexpectedSourceChangeText,
}));

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

const { query, withTransaction } = require('../src/db');
const {
  recordSourceChange,
  buildSourceChangeReconciliation,
  resolveRequestId,
} = require('../src/services/sourceChangeAudit');
const {
  evaluateSourceLock,
  classifyUnexpectedChange,
  sourceIdsEqual,
  getOpenPeriodStart,
} = require('../src/lib/sourceChangeLock');
const { notifyUnexpectedSourceChange } = require('../src/services/sourceChangeAlert');
const { updateSaleOrder } = require('../src/routes/saleOrders/updateSaleOrder');
const { createSaleOrder } = require('../src/routes/saleOrders/createSaleOrder');
const { correctSaleOrderSource } = require('../src/routes/saleOrders/correctSaleOrderSource');
const { correctPartnerSource } = require('../src/routes/partners/correctPartnerSource');

const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const PARTNER_ID = '22222222-2222-4222-8222-222222222222';
const SOURCE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SOURCE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ACTOR = '33333333-3333-4333-8333-333333333333';

function responseDouble() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('source change lock classification', () => {
  it('flags paid/closed ordinary channels as unexpected', () => {
    const lock = evaluateSourceLock({
      totalPaid: 1000,
      attributionDate: '2026-06-01',
      now: new Date('2026-07-15T12:00:00Z'),
    });
    expect(lock.locked).toBe(true);
    const unexpected = classifyUnexpectedChange({
      entityType: 'saleorder',
      changeChannel: 'api_patch',
      lockState: lock,
    });
    expect(unexpected.isUnexpected).toBe(true);
    expect(unexpected.reasons).toEqual(expect.arrayContaining(['paid', 'closed_period']));
  });

  it('does not flag authorized correction channels', () => {
    const lock = evaluateSourceLock({
      totalPaid: 1000,
      attributionDate: '2026-06-01',
      now: new Date('2026-07-15T12:00:00Z'),
    });
    const unexpected = classifyUnexpectedChange({
      entityType: 'saleorder',
      changeChannel: 'source_correction',
      lockState: lock,
    });
    expect(unexpected.isUnexpected).toBe(false);
  });

  it('allows open unpaid ordinary patches', () => {
    const openStart = getOpenPeriodStart(new Date('2026-07-15T12:00:00Z'));
    const lock = evaluateSourceLock({
      totalPaid: 0,
      attributionDate: openStart,
      now: new Date('2026-07-15T12:00:00Z'),
    });
    expect(lock.locked).toBe(false);
    expect(sourceIdsEqual(SOURCE_A, SOURCE_A.toUpperCase())).toBe(true);
  });
});

describe('recordSourceChange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts one durable row for a real source mutation', async () => {
    query.mockResolvedValueOnce([{
      id: 'audit-1',
      entity_type: 'saleorder',
      entity_id: ORDER_ID,
      old_sourceid: SOURCE_A,
      new_sourceid: SOURCE_B,
      is_unexpected: false,
    }]);

    const row = await recordSourceChange(query, {
      entityType: 'saleorder',
      entityId: ORDER_ID,
      oldSourceId: SOURCE_A,
      newSourceId: SOURCE_B,
      actorEmployeeId: ACTOR,
      requestId: 'req-1',
      transactionId: 'tx-1',
      changeChannel: 'api_patch',
      lockState: { locked: false, reasons: [] },
      alert: false,
    });

    expect(row.id).toBe('audit-1');
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO dbo\.source_change_audit/i);
    expect(params).toEqual(expect.arrayContaining([
      'saleorder',
      ORDER_ID,
      SOURCE_A,
      SOURCE_B,
      ACTOR,
      'req-1',
      'tx-1',
      'api_patch',
      false,
    ]));
  });

  it('skips no-op old===new without writing', async () => {
    const row = await recordSourceChange(query, {
      entityType: 'saleorder',
      entityId: ORDER_ID,
      oldSourceId: SOURCE_A,
      newSourceId: SOURCE_A,
      changeChannel: 'api_patch',
    });
    expect(row).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it('marks paid closed api_patch as unexpected and queues alert', async () => {
    query.mockResolvedValueOnce([{
      id: 'audit-unexpected',
      entity_type: 'saleorder',
      entity_id: ORDER_ID,
      old_sourceid: SOURCE_A,
      new_sourceid: SOURCE_B,
      is_unexpected: true,
      unexpected_reasons: ['paid'],
      change_channel: 'api_patch',
      actor_employee_id: ACTOR,
      request_id: 'req-u',
      transaction_id: 'tx-u',
      created_at: '2026-07-15T00:00:00Z',
    }]);

    await recordSourceChange(query, {
      entityType: 'saleorder',
      entityId: ORDER_ID,
      oldSourceId: SOURCE_A,
      newSourceId: SOURCE_B,
      actorEmployeeId: ACTOR,
      requestId: 'req-u',
      transactionId: 'tx-u',
      changeChannel: 'api_patch',
      lockState: { locked: true, reasons: ['paid'] },
      alertOptions: { fetchImpl: jest.fn() },
    });

    await new Promise((r) => setImmediate(r));
    expect(notifyUnexpectedSourceChange).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual(expect.arrayContaining([true, ['paid']]));
  });
});

describe('updateSaleOrder source audit wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes audit on successful source change', async () => {
    query
      // lock context
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        order_sourceid: SOURCE_A,
        totalpaid: 0,
        datestart: '2026-07-10',
        datecreated: '2026-07-10',
        isdeleted: false,
      }])
      // allocated paid
      .mockResolvedValueOnce([{ totalpaid: 0 }])
      // source selectable
      .mockResolvedValueOnce([{ is_active: true, already_selected: false }])
      // update fields
      .mockResolvedValueOnce([{ id: ORDER_ID, sourceid: SOURCE_B }])
      // audit insert
      .mockResolvedValueOnce([{
        id: 'audit-2',
        entity_type: 'saleorder',
        is_unexpected: false,
      }])
      // fetch by id
      .mockResolvedValueOnce([{ id: ORDER_ID, sourceid: SOURCE_B }]);

    const req = {
      params: { id: ORDER_ID },
      body: { sourceid: SOURCE_B },
      user: { employeeId: ACTOR },
      headers: { 'x-request-id': 'req-patch-1' },
    };
    const res = responseDouble();
    await updateSaleOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const auditCall = query.mock.calls.find(([sql]) => /source_change_audit/i.test(sql));
    expect(auditCall).toBeTruthy();
    expect(withTransaction).toHaveBeenCalled();
  });

  it('does not write audit when source is omitted (unrelated edit)', async () => {
    query
      .mockResolvedValueOnce([{ id: ORDER_ID, notes: 'n' }]) // update
      .mockResolvedValueOnce([{ id: ORDER_ID, notes: 'n' }]); // fetch

    const req = {
      params: { id: ORDER_ID },
      body: { notes: 'n' },
      user: { employeeId: ACTOR },
      headers: {},
    };
    const res = responseDouble();
    await updateSaleOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const auditCall = query.mock.calls.find(([sql]) => /source_change_audit/i.test(sql));
    expect(auditCall).toBeFalsy();
  });

  it('does not write audit when source validation fails', async () => {
    query
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        order_sourceid: SOURCE_A,
        totalpaid: 0,
        datestart: '2026-07-10',
        datecreated: '2026-07-10',
        isdeleted: false,
      }])
      .mockResolvedValueOnce([{ totalpaid: 0 }])
      .mockResolvedValueOnce([]); // source missing

    const req = {
      params: { id: ORDER_ID },
      body: { sourceid: SOURCE_B },
      user: { employeeId: ACTOR },
      headers: {},
    };
    const res = responseDouble();
    await updateSaleOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const auditCall = query.mock.calls.find(([sql]) => /INSERT INTO dbo\.source_change_audit/i.test(sql));
    expect(auditCall).toBeFalsy();
  });

  it('rejects paid ordinary source changes before mutation or audit', async () => {
    query
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        order_sourceid: SOURCE_A,
        totalpaid: 5000,
        datestart: '2026-07-10',
        datecreated: '2026-07-10',
        isdeleted: false,
      }])
      .mockResolvedValueOnce([{ totalpaid: 5000 }]);

    const req = {
      params: { id: ORDER_ID },
      body: { sourceid: SOURCE_B },
      user: { employeeId: ACTOR },
      headers: {},
    };
    const res = responseDouble();
    await updateSaleOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'SOURCE_IMMUTABLE',
    }));
    expect(query.mock.calls.some(([sql]) => /UPDATE\s+(dbo\.)?saleorders/i.test(sql))).toBe(false);
    expect(query.mock.calls.some(([sql]) => /INSERT INTO dbo\.source_change_audit/i.test(sql))).toBe(false);
    expect(notifyUnexpectedSourceChange).not.toHaveBeenCalled();
  });
});

describe('createSaleOrder source audit wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes audit when create sets a source', async () => {
    query
      .mockResolvedValueOnce([{ is_active: true, already_selected: false }])
      .mockResolvedValueOnce([{ seq: 42 }])
      .mockResolvedValueOnce([{ id: ORDER_ID }]) // insert order
      .mockResolvedValueOnce([{ id: 'audit-create' }]) // audit
      .mockResolvedValueOnce([{ id: ORDER_ID, sourceid: SOURCE_A }]); // fetch

    const req = {
      body: {
        partnerid: PARTNER_ID,
        amounttotal: 1000,
        sourceid: SOURCE_A,
      },
      user: { employeeId: ACTOR },
      headers: { 'x-request-id': 'req-create' },
    };
    const res = responseDouble();
    await createSaleOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const auditCall = query.mock.calls.find(([sql]) => /source_change_audit/i.test(sql));
    expect(auditCall).toBeTruthy();
    expect(auditCall[1]).toEqual(expect.arrayContaining(['api_create', SOURCE_A]));
  });

  it('does not write audit when create leaves source null', async () => {
    query
      .mockResolvedValueOnce([{ sourceid: null }])
      .mockResolvedValueOnce([{ seq: 43 }])
      .mockResolvedValueOnce([{ id: ORDER_ID }])
      .mockResolvedValueOnce([{ id: ORDER_ID, sourceid: null }]);

    const req = {
      body: { partnerid: PARTNER_ID, amounttotal: 0 },
      user: { employeeId: ACTOR },
      headers: {},
    };
    const res = responseDouble();
    await createSaleOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const auditCall = query.mock.calls.find(([sql]) => /source_change_audit/i.test(sql));
    expect(auditCall).toBeFalsy();
  });
});

describe('authorized correction paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saleorder correction writes source_correction audit without unexpected flag', async () => {
    query
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        order_sourceid: SOURCE_A,
        totalpaid: 5000,
        datestart: '2026-06-01',
        datecreated: '2026-06-01',
        isdeleted: false,
      }])
      .mockResolvedValueOnce([{ totalpaid: 5000 }])
      .mockResolvedValueOnce([{ is_active: true, already_selected: false }])
      .mockResolvedValueOnce([{ id: ORDER_ID, sourceid: SOURCE_B }])
      .mockResolvedValueOnce([{
        id: 'corr-2',
        saleorder_id: ORDER_ID,
        old_sourceid: SOURCE_A,
        new_sourceid: SOURCE_B,
      }])
      .mockResolvedValueOnce([{
        id: 'audit-corr',
        change_channel: 'source_correction',
        is_unexpected: false,
      }])
      .mockResolvedValueOnce([{ id: ORDER_ID, sourceid: SOURCE_B }]);

    const req = {
      params: { id: ORDER_ID },
      body: {
        new_sourceid: SOURCE_B,
        expected_old_sourceid: SOURCE_A,
        reason: 'Owner approved Q10 correction for closed period',
        evidence: 'workbook row 12',
        rollback_reference: 'backup-20260723',
        correction_manifest_ref: 'manifest-q10-43',
      },
      user: { employeeId: ACTOR },
      headers: { 'x-request-id': 'req-corr' }, nonInvestorVerified: true, // guard ran upstream
    };
    const res = responseDouble();
    await correctSaleOrderSource(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].correction).toEqual(expect.objectContaining({
      saleorder_id: ORDER_ID,
    }));
    const auditCall = query.mock.calls.find(([sql]) => /source_change_audit/i.test(sql));
    expect(auditCall[1]).toEqual(expect.arrayContaining(['source_correction', false]));
  });

  it('partner correction is the only partner source write path and audits', async () => {
    query
      .mockResolvedValueOnce([{ id: PARTNER_ID, sourceid: SOURCE_A }])
      .mockResolvedValueOnce([{ id: SOURCE_B, is_active: true }])
      .mockResolvedValueOnce([{ id: PARTNER_ID, sourceid: SOURCE_B }])
      .mockResolvedValueOnce([{
        id: 'audit-partner',
        entity_type: 'partner',
        change_channel: 'partner_source_correction',
      }]);

    const req = {
      params: { id: PARTNER_ID },
      body: {
        new_sourceid: SOURCE_B,
        expected_old_sourceid: SOURCE_A,
        reason: 'Repair manifest clinic Q10 row-level fix',
        correction_manifest_ref: 'task08-manifest-q10',
      },
      user: { employeeId: ACTOR },
      headers: {}, nonInvestorVerified: true,
    };
    const res = responseDouble();
    await correctPartnerSource(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].audit.entity_type).toBe('partner');
  });

  it('partner correction conflict does not mutate or audit', async () => {
    query.mockResolvedValueOnce([{ id: PARTNER_ID, sourceid: SOURCE_A }]);

    const req = {
      params: { id: PARTNER_ID },
      body: {
        new_sourceid: SOURCE_B,
        expected_old_sourceid: SOURCE_B,
        reason: 'Repair manifest clinic Q10 row-level fix',
        correction_manifest_ref: 'task08-manifest-q10',
      },
      user: { employeeId: ACTOR },
      headers: {}, nonInvestorVerified: true,
    };
    const res = responseDouble();
    await correctPartnerSource(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe('reconciliation report', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns bounded summary + rows', async () => {
    query
      .mockResolvedValueOnce([{
        total_changes: 2,
        unexpected_changes: 1,
        saleorder_changes: 2,
        partner_changes: 0,
        api_patch_changes: 1,
        correction_changes: 1,
      }])
      .mockResolvedValueOnce([
        { id: 'a1', is_unexpected: true },
        { id: 'a2', is_unexpected: false },
      ]);

    const report = await buildSourceChangeReconciliation(query, {
      unexpectedOnly: false,
      limit: 10,
    });

    expect(report.bounded).toBe(true);
    expect(report.limit).toBe(10);
    expect(report.summary.unexpected_changes).toBe(1);
    expect(report.rows).toHaveLength(2);
  });

  it('caps limit at 500', async () => {
    query
      .mockResolvedValueOnce([{ total_changes: 0, unexpected_changes: 0 }])
      .mockResolvedValueOnce([]);

    const report = await buildSourceChangeReconciliation(query, { limit: 9999 });
    expect(report.limit).toBe(500);
  });
});

describe('request id helper', () => {
  it('prefers x-request-id header', () => {
    expect(resolveRequestId({ headers: { 'x-request-id': 'abc' } })).toBe('abc');
  });
});
