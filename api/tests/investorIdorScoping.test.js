'use strict';

/**
 * Investor IDOR scoping — behavioral proof.
 *
 * For every customer-touching endpoint an investor can reach, this asserts:
 *   - list reads are filtered to the investor's allowlist (SQL gains
 *     `<col>.partnerid = ANY(...)` with the allowed ids),
 *   - single-record reads 404 when the record belongs to a non-assigned
 *     customer (fail-closed; indistinguishable from missing),
 *   - writes 404 before mutating when the target customer is not assigned,
 *   - a normal (non-investor) staff request is NOT filtered.
 *
 * Auth/permission middleware is stubbed to pass-through (gating is proven
 * separately in investorScopeRoutePermissions.test.js); resolveInvestorScope is
 * mocked so each test controls the investor verdict directly, and the DB layer
 * is mocked so we inspect the exact SQL/params the handler builds.
 */

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

const mockResolveInvestorScope = jest.fn();
jest.mock('../src/services/permissionService', () => ({
  resolveInvestorScope: (...args) => mockResolveInvestorScope(...args),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn() },
}));

const request = require('supertest');
const express = require('express');
const { query } = require('../src/db');

const ALLOWED = 'allowed-customer-id';
const FORBIDDEN = 'forbidden-customer-id';

function makeApp(mountPath, router) {
  const app = express();
  app.use(express.json());
  // Stand in for requireAuth: every request arrives as the investor.
  app.use((req, _res, next) => {
    req.user = { employeeId: 'investor-1' };
    next();
  });
  app.use(mountPath, router);
  return app;
}

function asInvestor() {
  mockResolveInvestorScope.mockResolvedValue({ isInvestor: true, allowedCustomerIds: [ALLOWED] });
}
function asStaff() {
  mockResolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
}

beforeEach(() => {
  query.mockReset();
  mockResolveInvestorScope.mockReset();
});

describe('cashbooks (accountpayments) investor scoping', () => {
  const router = require('../src/routes/cashbooks');

  it('GetDetails: investor list is filtered by the allowlist', async () => {
    asInvestor();
    query.mockResolvedValue([]); // items, count, aggregates all empty
    const res = await request(makeApp('/api/CashBooks', router)).get('/api/CashBooks/GetDetails');
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][0]).toContain('ap.partnerid = ANY(');
    expect(query.mock.calls[0][1]).toContainEqual([ALLOWED]);
  });

  it('GetDetails: staff list is NOT filtered', async () => {
    asStaff();
    query.mockResolvedValue([]);
    const res = await request(makeApp('/api/CashBooks', router)).get('/api/CashBooks/GetDetails');
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][0]).not.toContain('ap.partnerid = ANY(');
  });

  it('GetSumary: investor aggregates are filtered by the allowlist', async () => {
    asInvestor();
    query.mockResolvedValue([{}]);
    const res = await request(makeApp('/api/CashBooks', router)).get('/api/CashBooks/GetSumary');
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][0]).toContain('ap.partnerid = ANY(');
    expect(query.mock.calls[0][1]).toContainEqual([ALLOWED]);
  });

  it('/:id: investor 404s on a payment for a non-assigned customer', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ id: 'pay-1', partnerid: FORBIDDEN }]);
    const res = await request(makeApp('/api/CashBooks', router)).get('/api/CashBooks/pay-1');
    expect(res.status).toBe(404);
  });

  it('/:id: investor sees a payment for an assigned customer', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ id: 'pay-1', partnerid: ALLOWED }]);
    const res = await request(makeApp('/api/CashBooks', router)).get('/api/CashBooks/pay-1');
    expect(res.status).toBe(200);
    expect(res.body.partnerid).toBe(ALLOWED);
  });

  it('/:id: staff sees any payment (no scoping)', async () => {
    asStaff();
    query.mockResolvedValueOnce([{ id: 'pay-1', partnerid: FORBIDDEN }]);
    const res = await request(makeApp('/api/CashBooks', router)).get('/api/CashBooks/pay-1');
    expect(res.status).toBe(200);
  });
});

describe('crmTasks investor scoping', () => {
  const router = require('../src/routes/crmTasks');

  it('GetPagedV2: investor list is filtered by the allowlist', async () => {
    asInvestor();
    query.mockResolvedValue([]);
    const res = await request(makeApp('/api/CrmTasks', router)).get('/api/CrmTasks/GetPagedV2');
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][0]).toContain('ct.partnerid = ANY(');
    expect(query.mock.calls[0][1]).toContainEqual([ALLOWED]);
  });

  it('/:id: investor 404s on a task for a non-assigned customer', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ id: 'task-1', partnerid: FORBIDDEN }]);
    const res = await request(makeApp('/api/CrmTasks', router)).get('/api/CrmTasks/task-1');
    expect(res.status).toBe(404);
  });

  it('/:id: investor sees a task for an assigned customer', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ id: 'task-1', partnerid: ALLOWED }]);
    const res = await request(makeApp('/api/CrmTasks', router)).get('/api/CrmTasks/task-1');
    expect(res.status).toBe(200);
  });
});

describe('receipts (customerreceipts) investor scoping', () => {
  const router = require('../src/routes/receipts');

  it('list: investor receipts are filtered by the allowlist', async () => {
    asInvestor();
    query.mockResolvedValue([]);
    const res = await request(makeApp('/api/CustomerReceipts', router)).get('/api/CustomerReceipts/');
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][0]).toContain('cr.partnerid = ANY(');
    expect(query.mock.calls[0][1]).toContainEqual([ALLOWED]);
  });

  it('/:id: investor 404s on a receipt for a non-assigned customer', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ id: 'rec-1', partnerid: FORBIDDEN }]);
    const res = await request(makeApp('/api/CustomerReceipts', router)).get('/api/CustomerReceipts/rec-1');
    expect(res.status).toBe(404);
  });

  it('/:id/GetPayments: investor 404s when the receipt is not theirs', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ partnerid: FORBIDDEN }]); // ownership lookup
    const res = await request(makeApp('/api/CustomerReceipts', router)).get(
      '/api/CustomerReceipts/rec-1/GetPayments'
    );
    expect(res.status).toBe(404);
  });

  it('/:id/GetPayments: investor sees payments for an assigned receipt', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ partnerid: ALLOWED }]); // ownership lookup
    query.mockResolvedValueOnce([]); // payments
    const res = await request(makeApp('/api/CustomerReceipts', router)).get(
      '/api/CustomerReceipts/rec-1/GetPayments'
    );
    expect(res.status).toBe(200);
  });
});

describe('monthlyPlans investor WRITE scoping (IDOR on mutations)', () => {
  const router = require('../src/routes/monthlyPlans');

  it('PUT /:id: investor cannot edit a plan for a non-assigned customer', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ customer_id: FORBIDDEN }]); // ownership lookup
    const res = await request(makeApp('/api/MonthlyPlans', router))
      .put('/api/MonthlyPlans/plan-1')
      .send({ status: 'active' });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id: investor cannot delete a plan for a non-assigned customer', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ customer_id: FORBIDDEN }]); // ownership lookup
    const res = await request(makeApp('/api/MonthlyPlans', router)).delete('/api/MonthlyPlans/plan-1');
    expect(res.status).toBe(404);
  });

  it('PUT /:id/installments/:installmentId/pay: investor cannot pay a non-assigned plan', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ customer_id: FORBIDDEN }]); // ownership lookup
    const res = await request(makeApp('/api/MonthlyPlans', router))
      .put('/api/MonthlyPlans/plan-1/installments/inst-1/pay')
      .send({ paid_amount: 100 });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id: a non-assigned plan never reaches the delete transaction', async () => {
    asInvestor();
    const { pool } = require('../src/db');
    query.mockResolvedValueOnce([{ customer_id: FORBIDDEN }]);
    await request(makeApp('/api/MonthlyPlans', router)).delete('/api/MonthlyPlans/plan-1');
    expect(pool.connect).not.toHaveBeenCalled();
  });
});
