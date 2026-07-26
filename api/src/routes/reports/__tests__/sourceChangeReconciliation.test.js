jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../../middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../../../services/permissionService', () => ({
  // sourceChangeReconciliation.js denies investors via resolveInvestorScope; default to
  // non-investor so the staff control case holds. clearAllMocks keeps this implementation.
  resolveInvestorScope: jest.fn().mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] }),
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../../../db');
const { resolveInvestorScope } = require('../../../services/permissionService');
const sourceChangeReconciliationRouter = require('../sourceChangeReconciliation');

const INVESTOR = '44444444-4444-4444-8444-444444444444';
const STAFF = '33333333-3333-4333-8333-333333333333';

function makeApp(employeeId) {
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage -- isolated Jest route harness, not a production Express app.
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId };
    next();
  });
  app.use('/api/Reports', sourceChangeReconciliationRouter);
  return app;
}

describe('POST /api/Reports/source-change-reconciliation investor denial', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks does not drain mockResolvedValueOnce queues, so an unconsumed value
    // leaks into the next test. Reset and re-establish an explicit default instead.
    resolveInvestorScope.mockReset();
    resolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
    query.mockReset();
  });

  // DEC-20260704-01 / INV-021: every investor-reachable customer-derived read must be
  // allowlist-scoped or fail closed. The ledger carries entity ids, actor ids, reasons,
  // request ids and manifest refs across both partner and saleorder entities with no
  // per-entity customer join, so investors are denied outright.
  it('denies an investor and never queries the ledger', async () => {
    resolveInvestorScope.mockResolvedValue({
      isInvestor: true,
      allowedCustomerIds: ['55555555-5555-4555-8555-555555555555'],
    });

    const res = await request(makeApp(INVESTOR))
      .post('/api/Reports/source-change-reconciliation')
      .send({ entityType: 'saleorder' });

    expect(res.status).toBe(403);
    // The whole point: zero ledger access, not a filtered read.
    expect(query).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toMatch(/source_change_audit/i);
  });

  it('denies an investor even with an empty allowlist (fail closed, not open)', async () => {
    resolveInvestorScope.mockResolvedValue({ isInvestor: true, allowedCustomerIds: [] });

    const res = await request(makeApp(INVESTOR))
      .post('/api/Reports/source-change-reconciliation')
      .send({});

    expect(res.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('denies the investor before body validation, so nothing is inferable from input', async () => {
    resolveInvestorScope.mockResolvedValue({ isInvestor: true, allowedCustomerIds: [] });

    const res = await request(makeApp(INVESTOR))
      .post('/api/Reports/source-change-reconciliation')
      .send({ entityType: 'not-a-valid-entity', dateFrom: 'garbage' });

    // A 400 here would tell an investor their input was parsed, i.e. that they reached the
    // handler body. 403 must win.
    expect(res.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('still serves a non-investor operator (the deny is not blanket)', async () => {
    resolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
    query.mockResolvedValue([]);

    const res = await request(makeApp(STAFF))
      .post('/api/Reports/source-change-reconciliation')
      .send({ entityType: 'saleorder' });

    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalled();
  });
});
