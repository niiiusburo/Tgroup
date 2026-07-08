'use strict';

// Regression guard for the investor client-selection bug: a malformed UUID_RE
// (missing the 4th group) rejected EVERY real customer UUID, so admins could not
// add clients. Also locks the union untick (clears rows under partner_id OR any
// account id) so a "removed" client cannot stay visible to the investor.

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

jest.mock('../src/services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

const { query } = require('../src/db');
const { resolveEffectivePermissions } = require('../src/services/permissionService');
const { setInvestorVisibility } = require('../src/routes/partners/investorVisibility');

const VALID_UUID = 'bcb967c6-bdd9-4b38-8406-b3cf00249413';
const ADMIN_EMPLOYEE = '11111111-1111-1111-1111-111111111111';

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
}

// Prime query() for the getConfiguredInvestor (3 calls) + customer-exists (1 call)
// prefix that both the ON and OFF branches share. Returns the mock so the caller
// can inspect the final INSERT/UPDATE call.
function primeInvestorAndCustomer() {
  query
    .mockResolvedValueOnce([{ present: 1 }]) // investorClientsUseAccountId -> FK present
    .mockResolvedValueOnce([{ investorAccountId: 'acc', investorId: 'part', visibleClientCount: 0 }]) // ranking
    .mockResolvedValueOnce([{ id: 'acc' }]) // active account ids
    .mockResolvedValueOnce([{ id: VALID_UUID }]); // customer exists
}

beforeEach(() => {
  query.mockReset();
  resolveEffectivePermissions.mockReset();
  resolveEffectivePermissions.mockResolvedValue({ groupName: 'admin', effectivePermissions: [] });
});

describe('setInvestorVisibility UUID validation (regression)', () => {
  it('rejects a malformed customer id with 400 VALIDATION before any DB work', async () => {
    const req = { params: { id: 'not-a-uuid' }, body: { visible: true }, user: { employeeId: ADMIN_EMPLOYEE } };
    const res = mockRes();

    await setInvestorVisibility(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.error.code).toBe('VALIDATION');
    expect(query).not.toHaveBeenCalled();
  });

  it('ACCEPTS a standard 8-4-4-4-12 UUID and marks the client visible (the bug fix)', async () => {
    primeInvestorAndCustomer();
    query.mockResolvedValueOnce([]); // INSERT ... ON CONFLICT

    const req = { params: { id: VALID_UUID }, body: { visible: true }, user: { employeeId: ADMIN_EMPLOYEE } };
    const res = mockRes();

    await setInvestorVisibility(req, res);

    // The old regex would have returned 400 here. It must now succeed.
    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ investorId: 'part', customerId: VALID_UUID, visible: true });

    // The INSERT writes under the canonical write key (account id when the FK is
    // present) with params [writeKey, customerId, markedBy].
    const insertCall = query.mock.calls[query.mock.calls.length - 1];
    const [sql, params] = insertCall;
    expect(sql).toMatch(/INSERT\s+INTO\s+dbo\.investor_clients/i);
    expect(sql).toMatch(/ON\s+CONFLICT\s*\(investor_id,\s*partner_id,\s*lob\)/i);
    expect(params).toEqual(['acc', VALID_UUID, ADMIN_EMPLOYEE]);
  });
});

describe('setInvestorVisibility authorization + not-found (regression)', () => {
  it('returns 403 ADMIN_REQUIRED for a non-admin caller before any DB work', async () => {
    resolveEffectivePermissions.mockResolvedValue({ groupName: 'staff', effectivePermissions: [] });
    const req = { params: { id: VALID_UUID }, body: { visible: true }, user: { employeeId: ADMIN_EMPLOYEE } };
    const res = mockRes();

    await setInvestorVisibility(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
    // assertAdmin runs after UUID/boolean checks but before getConfiguredInvestor,
    // so no query (DB) call should happen for a rejected non-admin.
    expect(query).not.toHaveBeenCalled();
  });

  it('returns 404 CUSTOMER_NOT_FOUND when the customer does not exist', async () => {
    query
      .mockResolvedValueOnce([{ present: 1 }]) // investorClientsUseAccountId
      .mockResolvedValueOnce([{ investorAccountId: 'acc', investorId: 'part', visibleClientCount: 0 }]) // ranking
      .mockResolvedValueOnce([{ id: 'acc' }]) // active account ids
      .mockResolvedValueOnce([]); // customer exists -> none

    const req = { params: { id: VALID_UUID }, body: { visible: true }, user: { employeeId: ADMIN_EMPLOYEE } };
    const res = mockRes();

    await setInvestorVisibility(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.error.code).toBe('CUSTOMER_NOT_FOUND');
    // No INSERT/UPDATE after a not-found customer.
    expect(query).toHaveBeenCalledTimes(4);
  });
});

describe('setInvestorVisibility untick uses the scope union (regression)', () => {
  it('clears the client under partner_id OR any account id via ANY($1::uuid[])', async () => {
    primeInvestorAndCustomer();
    query.mockResolvedValueOnce([]); // UPDATE

    const req = { params: { id: VALID_UUID }, body: { visible: false }, user: { employeeId: ADMIN_EMPLOYEE } };
    const res = mockRes();

    await setInvestorVisibility(req, res);

    const updateCall = query.mock.calls[query.mock.calls.length - 1];
    const [sql, params] = updateCall;
    expect(sql).toMatch(/UPDATE\s+dbo\.investor_clients/i);
    expect(sql).toMatch(/investor_id\s*=\s*ANY\(\$1::uuid\[\]\)/i);
    // params: [scopeMatchIds[], markedBy, customerId]
    expect(params[0]).toEqual(['part', 'acc']);
    expect(params[2]).toBe(VALID_UUID);
    expect(res.body).toEqual({ investorId: 'part', customerId: VALID_UUID, visible: false });
  });
});
