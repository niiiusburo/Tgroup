'use strict';

/**
 * Investor-scope gate coverage (regression guard).
 *
 * Every customer-data route an authenticated investor could reach MUST declare
 * a requirePermission gate. This test asserts the gate is wired so a future
 * change cannot silently ship an ungated customer endpoint (the exact class of
 * hole that let cashbooks/crmTasks/receipts/commissions leak before scoping).
 *
 * It complements:
 *   - permissionService.test.js  → resolveInvestorScope unit behavior
 *   - investorIdorScoping.test.js → per-endpoint investor 404 / filtered reads
 *
 * Modeled on tests/readRoutePermissions.test.js.
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

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn() },
}));

function routePermissions(router, method, path) {
  const layer = router.stack.find(
    (l) => l.route?.path === path && l.route.methods[method.toLowerCase()]
  );
  if (!layer) return null; // route missing entirely
  return layer.route.stack.map((entry) => entry.handle.permission).filter(Boolean);
}

function expectGate(router, method, path, permission) {
  const perms = routePermissions(router, method, path);
  expect(perms).not.toBeNull(); // the route must exist
  expect(perms).toContain(permission);
}

describe('newly-secured customer-data routes are permission-gated', () => {
  // The cashbooks / crmTasks / receipts / commissions gate assertions that used to
  // live here were removed in 0.32.60 together with those route files: each queried
  // a table absent from tdental_demo (accountjournals, crmtasks, commissions, ...) so
  // they returned 500 on every call, and no frontend referenced them. Deleting the
  // routes removes the investor-leak surface outright, which is a stronger guarantee
  // than gating it. See server.js for the full list and the reason.
  it('monthlyPlans mutation routes require payment.edit', () => {
    const r = require('../src/routes/monthlyPlans');
    expectGate(r, 'put', '/:id', 'payment.edit');
    expectGate(r, 'delete', '/:id', 'payment.edit');
    expectGate(r, 'put', '/:id/installments/:installmentId/pay', 'payment.edit');
  });
});

describe('pre-existing customer-data routes keep their gates (no regression)', () => {
  // NOTE: partners/appointments/payments gate coverage lives in
  // tests/readRoutePermissions.test.js (those routers import the @tgroup/contracts
  // workspace package, so they are asserted there to keep this file loadable in a
  // bare worktree). monthlyPlans has no workspace dep and is not covered there, so
  // its read gates are asserted here.
  it('monthlyPlans reads require payment.view', () => {
    const r = require('../src/routes/monthlyPlans');
    expectGate(r, 'get', '/', 'payment.view');
    expectGate(r, 'get', '/:id', 'payment.view');
  });
});
