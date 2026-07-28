'use strict';

/**
 * GET /api/Partners/resolve — investor allowlist, soft-delete, principal-scoped cache.
 * AUD-003 / D-F001.
 */

jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

const mockResolveInvestorScope = jest.fn();
jest.mock('../../../services/permissionService', () => ({
  resolveInvestorScope: (...args) => mockResolveInvestorScope(...args),
}));

const { query } = require('../../../db');
const {
  resolvePartner,
  clearResolveCache,
  buildResolveCacheKey,
} = require('../resolveHandler');

const ALLOWED = '11111111-1111-1111-1111-111111111111';
const FORBIDDEN = '22222222-2222-2222-2222-222222222222';
const INVESTOR_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const STAFF_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function asInvestor(allowed = [ALLOWED]) {
  mockResolveInvestorScope.mockResolvedValue({
    isInvestor: true,
    allowedCustomerIds: allowed,
  });
}

function asStaff() {
  mockResolveInvestorScope.mockResolvedValue({
    isInvestor: false,
    allowedCustomerIds: [],
  });
}

function customerRow(id, overrides = {}) {
  return {
    id,
    code: `T${String(id).slice(0, 6)}`,
    name: `Customer ${id}`,
    displayname: `Customer ${id}`,
    phone: '0901234567',
    lastupdated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  query.mockReset();
  mockResolveInvestorScope.mockReset();
  clearResolveCache();
});

describe('resolvePartner investor IDOR + soft-delete + cache scope', () => {
  it('includes isdeleted = false in lookup SQL', async () => {
    asStaff();
    query.mockResolvedValueOnce([]);
    const req = { query: { key: ALLOWED }, user: { employeeId: STAFF_ID } };
    const res = mockResponse();

    await resolvePartner(req, res);

    expect(query).toHaveBeenCalled();
    const sql = query.mock.calls[0][0];
    expect(sql).toMatch(/isdeleted\s*=\s*false/i);
    expect(sql).toMatch(/customer\s*=\s*true/i);
  });

  it('returns 404 CUSTOMER_NOT_FOUND when investor resolves a non-allowlisted customer', async () => {
    asInvestor([ALLOWED]);
    query.mockResolvedValueOnce([customerRow(FORBIDDEN)]);
    const req = {
      query: { key: FORBIDDEN },
      user: { employeeId: INVESTOR_ID },
    };
    const res = mockResponse();

    await resolvePartner(req, res);

    expect(mockResolveInvestorScope).toHaveBeenCalledWith(INVESTOR_ID);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CUSTOMER_NOT_FOUND',
      })
    );
    // Fail-closed: must not leak name/phone of the forbidden customer.
    // (The request key may be echoed; that is not an existence disclosure of PII.)
    const body = res.json.mock.calls[0][0];
    expect(body.partner).toBeUndefined();
    expect(body.candidates).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/Customer /);
    expect(JSON.stringify(body)).not.toMatch(/090/);
  });

  it('returns the match when investor resolves an allowlisted customer', async () => {
    asInvestor([ALLOWED]);
    query.mockResolvedValueOnce([customerRow(ALLOWED, { phone: '0911111111' })]);
    const req = {
      query: { key: ALLOWED },
      user: { employeeId: INVESTOR_ID },
    };
    const res = mockResponse();

    await resolvePartner(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        matchedBy: 'uuid',
        partner: expect.objectContaining({
          id: ALLOWED,
          phone: '0911111111',
        }),
      })
    );
  });

  it('filters ambiguous candidates to the investor allowlist (single survivor → 200)', async () => {
    asInvestor([ALLOWED]);
    // Phone path: no UUID, no ref hit, then phone hit with two rows.
    query
      .mockResolvedValueOnce([]) // ref
      .mockResolvedValueOnce([
        customerRow(FORBIDDEN, { phone: '0909999999' }),
        customerRow(ALLOWED, { phone: '0909999999' }),
      ]);
    const req = {
      query: { key: '0909999999' },
      user: { employeeId: INVESTOR_ID },
    };
    const res = mockResponse();

    await resolvePartner(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: expect.objectContaining({ id: ALLOWED }),
      })
    );
  });

  it('staff can still resolve any non-deleted customer (no investor filter)', async () => {
    asStaff();
    query.mockResolvedValueOnce([customerRow(FORBIDDEN)]);
    const req = {
      query: { key: FORBIDDEN },
      user: { employeeId: STAFF_ID },
    };
    const res = mockResponse();

    await resolvePartner(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: expect.objectContaining({ id: FORBIDDEN }),
      })
    );
  });

  it('investor with empty allowlist always 404s (fail-closed)', async () => {
    asInvestor([]);
    query.mockResolvedValueOnce([customerRow(ALLOWED)]);
    const req = {
      query: { key: ALLOWED },
      user: { employeeId: INVESTOR_ID },
    };
    const res = mockResponse();

    await resolvePartner(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CUSTOMER_NOT_FOUND' })
    );
  });

  it('cache keys include principal and investor scope (no cross-principal leak)', async () => {
    // Staff warms cache for a forbidden-to-investor customer.
    asStaff();
    query.mockResolvedValueOnce([customerRow(FORBIDDEN, { name: 'Secret Patient' })]);
    const staffReq = {
      query: { key: FORBIDDEN },
      user: { employeeId: STAFF_ID },
    };
    const staffRes = mockResponse();
    await resolvePartner(staffReq, staffRes);
    expect(staffRes.status).toHaveBeenCalledWith(200);

    // Investor must NOT receive the staff-cached 200 body.
    asInvestor([ALLOWED]);
    query.mockResolvedValueOnce([customerRow(FORBIDDEN, { name: 'Secret Patient' })]);
    const invReq = {
      query: { key: FORBIDDEN },
      user: { employeeId: INVESTOR_ID },
    };
    const invRes = mockResponse();
    await resolvePartner(invReq, invRes);

    expect(invRes.status).toHaveBeenCalledWith(404);
    expect(JSON.stringify(invRes.json.mock.calls[0][0])).not.toContain('Secret Patient');

    // Distinct cache keys for staff vs investor on the same lookup key.
    const staffKey = buildResolveCacheKey({
      employeeId: STAFF_ID,
      isInvestor: false,
      allowedCustomerIds: [],
      lookupKey: FORBIDDEN,
    });
    const invKey = buildResolveCacheKey({
      employeeId: INVESTOR_ID,
      isInvestor: true,
      allowedCustomerIds: [ALLOWED],
      lookupKey: FORBIDDEN,
    });
    expect(staffKey).not.toBe(invKey);
    expect(invKey).toContain(INVESTOR_ID);
    expect(invKey).toContain('investor');
  });

  it('returns 400 when key is missing', async () => {
    asStaff();
    const req = { query: {}, user: { employeeId: STAFF_ID } };
    const res = mockResponse();
    await resolvePartner(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CUSTOMER_LOOKUP_KEY_REQUIRED' })
    );
    expect(query).not.toHaveBeenCalled();
  });
});
