'use strict';

/**
 * StockPickings investor IDOR scoping — behavioral proof (AUD-005 / INV-021).
 *
 * GET list/detail are customer-derived via partnerid and must:
 *   - requirePermission (settings.view) so ungated JWT reads are impossible,
 *   - apply resolveInvestorScope fail-closed partner filters,
 *   - 404 single-record reads outside the allowlist (or with null partner).
 */

const mockRequirePermission = jest.fn((permission) => {
  const middleware = (_req, _res, next) => next();
  middleware.permission = permission;
  return middleware;
});

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: mockRequirePermission,
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

function makeApp() {
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage -- isolated Jest route harness, not a production Express app.
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: 'investor-1' };
    next();
  });
  app.use('/api/StockPickings', require('../src/routes/stockPickings'));
  return app;
}

function asInvestor(allowed = [ALLOWED]) {
  mockResolveInvestorScope.mockResolvedValue({ isInvestor: true, allowedCustomerIds: allowed });
}

function asStaff() {
  mockResolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
}

function routePermissions(method, path) {
  const router = require('../src/routes/stockPickings');
  const layer = router.stack.find(
    (l) => l.route?.path === path && l.route.methods[method.toLowerCase()]
  );
  if (!layer) return null;
  return layer.route.stack.map((entry) => entry.handle.permission).filter(Boolean);
}

beforeEach(() => {
  query.mockReset();
  mockResolveInvestorScope.mockReset();
});

describe('StockPickings GET permission gates', () => {
  it('GET / and GET /:id require settings.view', () => {
    expect(routePermissions('get', '/')).toContain('settings.view');
    expect(routePermissions('get', '/:id')).toContain('settings.view');
  });
});

describe('StockPickings GET investor partner scope', () => {
  it('list: investor SQL is filtered by partner allowlist', async () => {
    asInvestor();
    query.mockResolvedValue([]); // items, count, aggregates

    const res = await request(makeApp()).get('/api/StockPickings/');
    expect(res.status).toBe(200);
    expect(mockResolveInvestorScope).toHaveBeenCalledWith('investor-1');
    expect(query.mock.calls[0][0]).toContain('sp.partnerid = ANY(');
    expect(query.mock.calls[0][1]).toContainEqual([ALLOWED]);
  });

  it('list: staff is NOT filtered by partner allowlist', async () => {
    asStaff();
    query.mockResolvedValue([]);

    const res = await request(makeApp()).get('/api/StockPickings/');
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][0]).not.toContain('sp.partnerid = ANY(');
  });

  it('list: empty investor allowlist still applies fail-closed ANY filter', async () => {
    asInvestor([]);
    query.mockResolvedValue([]);

    const res = await request(makeApp()).get('/api/StockPickings/');
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][0]).toContain('sp.partnerid = ANY(');
    expect(query.mock.calls[0][1]).toContainEqual([]);
  });

  it('/:id: investor 404s when partner is outside allowlist', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ id: 'pick-1', partnerid: FORBIDDEN, name: 'WH/OUT/001' }]);

    const res = await request(makeApp()).get('/api/StockPickings/pick-1');
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toMatch(/WH\/OUT\/001/);
  });

  it('/:id: investor 404s when partnerid is null (fail-closed)', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ id: 'pick-1', partnerid: null, name: 'WH/INT/001' }]);

    const res = await request(makeApp()).get('/api/StockPickings/pick-1');
    expect(res.status).toBe(404);
  });

  it('/:id: investor sees a picking for an allowlisted partner', async () => {
    asInvestor();
    query.mockResolvedValueOnce([{ id: 'pick-1', partnerid: ALLOWED, name: 'WH/OUT/002' }]);

    const res = await request(makeApp()).get('/api/StockPickings/pick-1');
    expect(res.status).toBe(200);
    expect(res.body.partnerid).toBe(ALLOWED);
  });

  it('/:id: staff sees any picking (no scoping)', async () => {
    asStaff();
    query.mockResolvedValueOnce([{ id: 'pick-1', partnerid: FORBIDDEN, name: 'WH/OUT/003' }]);

    const res = await request(makeApp()).get('/api/StockPickings/pick-1');
    expect(res.status).toBe(200);
    expect(res.body.partnerid).toBe(FORBIDDEN);
  });
});
