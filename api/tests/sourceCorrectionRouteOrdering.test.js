/**
 * Mounted-route ordering for the two source-correction endpoints.
 *
 * The unit suites call the handlers directly, so they cannot see what the ROUTER does first.
 * This suite walks the real mounted middleware chain with the REAL middleware/auth (only db
 * and permissionService are mocked) and proves the guard order that D21 / INV-021 requires:
 *
 *   requireNonInvestorPermission  ->  investor? 404, before the permission comparison and
 *                                     before the handler validates the body or acts on it
 *   non-investor                  ->  unchanged 403 / pass-through behaviour
 *
 * A 403 for an investor would be an enumeration oracle and would also leak whether they hold
 * the correction permission, so the investor response must be identical for a malformed body,
 * a valid body, and an investor who somehow holds the permission.
 *
 * Dispatch is in-process (tests/helpers/dispatchRoute) rather than supertest — see that
 * helper for the flaky-transport evidence.
 */

jest.mock('../src/db', () => {
  const query = jest.fn();
  return {
    query,
    withTransaction: jest.fn(async (work) => work(query)),
  };
});

jest.mock('../src/services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
  resolveInvestorScope: jest.fn(async () => ({ isInvestor: false, allowedCustomerIds: [] })),
}));

const { query, withTransaction } = require('../src/db');
const {
  resolveEffectivePermissions,
  resolveInvestorScope,
} = require('../src/services/permissionService');
const partnersRouter = require('../src/routes/partners');
const saleOrdersRouter = require('../src/routes/saleOrders');
const { correctPartnerSource } = require('../src/routes/partners/correctPartnerSource');
const { correctSaleOrderSource } = require('../src/routes/saleOrders/correctSaleOrderSource');
const { dispatchRoute } = require('./helpers/dispatchRoute');

const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const PARTNER_ID = '22222222-2222-4222-8222-222222222222';
const SOURCE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SOURCE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ACTOR = '33333333-3333-4333-8333-333333333333';
const ROUTE_PATH = '/:id/source-correction';

const ORDER_BODY = {
  new_sourceid: SOURCE_B,
  expected_old_sourceid: SOURCE_A,
  reason: 'Investor attempting an authorized-looking correction',
  evidence: 'ticket-1',
  rollback_reference: 'rb-1',
};

const PARTNER_BODY = {
  new_sourceid: SOURCE_B,
  expected_old_sourceid: SOURCE_A,
  reason: 'Investor attempting an authorized-looking correction',
  correction_manifest_ref: 'manifest-1',
};

function makeRequest(id, body) {
  return { params: { id }, body, user: { employeeId: ACTOR }, headers: {} };
}

function asInvestor(effectivePermissions = []) {
  resolveEffectivePermissions.mockResolvedValue({
    groupId: 'investor-group',
    groupName: 'Investor',
    effectivePermissions,
    locations: [],
  });
}

function asStaff(effectivePermissions) {
  resolveEffectivePermissions.mockResolvedValue({
    groupId: 'staff-group',
    groupName: 'Editor',
    effectivePermissions,
    locations: [],
  });
}

const ROUTES = [
  {
    label: 'sale order',
    router: saleOrdersRouter,
    id: ORDER_ID,
    permission: 'services.source_correct',
    notFound: 'Sale order not found',
    body: ORDER_BODY,
    handler: correctSaleOrderSource,
  },
  {
    label: 'partner',
    router: partnersRouter,
    id: PARTNER_ID,
    permission: 'customers.source_correct',
    notFound: 'Partner not found',
    body: PARTNER_BODY,
    handler: correctPartnerSource,
  },
];

describe.each(ROUTES)('POST $label /:id/source-correction (mounted chain)', (route) => {
  const post = (body) => dispatchRoute(route.router, 'post', ROUTE_PATH, makeRequest(route.id, body));

  beforeEach(() => {
    jest.clearAllMocks();
    resolveEffectivePermissions.mockReset();
    resolveInvestorScope.mockReset();
    resolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
    query.mockReset();
    withTransaction.mockClear();
  });

  it('mounts the non-investor guard ahead of the handler', () => {
    const layer = route.router.stack.find(
      (entry) => entry.route?.path === ROUTE_PATH && entry.route.methods.post,
    );
    expect(layer.route.stack).toHaveLength(2);
    expect(layer.route.stack[1].handle).toBe(route.handler);
  });

  it('refuses an investor with a valid body: 404, handler never reached', async () => {
    asInvestor();

    const res = await post(route.body);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: route.notFound });
    // Guard answered, so the handler layer never ran: no lock read, no transaction, no audit.
    expect(res.reachedHandlers).toBe(1);
    expect(query).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it('refuses an investor with a malformed body identically (no 400 leak)', async () => {
    asInvestor();

    const res = await post({ reason: 'x' });

    // A 400 here would prove the investor reached the handler's body validation.
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: route.notFound });
    expect(res.reachedHandlers).toBe(1);
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it('refuses an investor who holds the correction permission (D21 beats permission)', async () => {
    asInvestor([route.permission]);

    const res = await post(route.body);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: route.notFound });
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it('refuses an investor holding wildcard "*" too', async () => {
    asInvestor(['*']);

    const res = await post(route.body);

    expect(res.statusCode).toBe(404);
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it('still returns 403 for a non-investor without the permission', async () => {
    asStaff(['customers.view']);

    const res = await post(route.body);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: `Permission denied: ${route.permission}` });
    expect(res.reachedHandlers).toBe(1);
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it('still returns 403 for a non-investor with no permission assignment', async () => {
    asStaff([]);

    const res = await post(route.body);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'No permission assignment found' });
  });

  it('still returns 401 when there is no authenticated user', async () => {
    asStaff([route.permission]);

    const res = await dispatchRoute(route.router, 'post', ROUTE_PATH, {
      params: { id: route.id },
      body: route.body,
      headers: {},
    });

    expect(res.statusCode).toBe(401);
    expect(resolveEffectivePermissions).not.toHaveBeenCalled();
  });

  it('lets an authorized non-investor reach the handler', async () => {
    asStaff([route.permission]);
    query.mockResolvedValue([]);

    const res = await post(route.body);

    expect(resolveEffectivePermissions).toHaveBeenCalledWith(ACTOR);
    expect(res.reachedHandlers).toBe(2);
    expect(res.statusCode).not.toBe(403);
  });

  it('does not repeat the investor scope query on the mounted path', async () => {
    asStaff([route.permission]);
    query.mockResolvedValue([]);

    await post(route.body);

    // The middleware already proved non-investor and set req.nonInvestorVerified, so the
    // handler's defence-in-depth branch must not issue a second scope lookup.
    expect(resolveInvestorScope).not.toHaveBeenCalled();
  });

  // D21 forbids investor writes until a decision names the exact write permission and scope.
  // None authorizes source correction, so an allowlisted investor must be refused too. This
  // exercises the handler DIRECTLY (no middleware): the defence for internal callers.
  it.each([
    ['outside their customer scope', ['99999999-9999-4999-8999-999999999999']],
    ['allowlisted for that very record', ['SELF']],
  ])('handler alone refuses an investor %s with zero writes', async (_label, allowlist) => {
    const allowedCustomerIds = allowlist[0] === 'SELF' ? [route.id] : allowlist;
    resolveInvestorScope.mockResolvedValueOnce({ isInvestor: true, allowedCustomerIds });

    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    await route.handler(makeRequest(route.id, route.body), res);

    // 404 not 403 — a 403 would confirm the record exists.
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: route.notFound });
    // Fail-closed: rejected before any read, write, transaction or audit row.
    expect(withTransaction).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});
