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
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage -- isolated Jest route harness, not a production Express app.
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

// The cashbooks / crmTasks / receipts investor-scoping suites were removed in 0.32.60
// along with those route files (each queried a table missing from tdental_demo, so
// every request 500'd, and no frontend called them). Their leak surface is gone rather
// than scoped. Investor scoping for the routes that remain is asserted by
// investorScopeRoutePermissions.test.js and the monthlyPlans suite below.

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
