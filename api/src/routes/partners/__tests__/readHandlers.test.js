jest.mock('../../../db', () => {
  const mockQuery = jest.fn();
  return {
    query: mockQuery,
    getQuery: jest.fn((reqOrLob) => mockQuery), // test shim: always delegate to the spied query fn (dental path in tests)
    getDb: jest.fn(() => ({ queryRows: mockQuery })),
  };
});

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

const { query } = require('../../../db');
const { resolveEffectivePermissions } = require('../../../services/permissionService');
const { checkPartnerUnique, listPartners } = require('../readHandlers');

const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';

function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('partner read handlers', () => {
  beforeEach(() => {
    query.mockReset();
    resolveEffectivePermissions.mockReset();
    // getQuery is also mocked at module level to return the same query spy
  });

  it('scopes customer list to the caller location when companyId is omitted', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['customers.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0, active: 0, inactive: 0 }]);

    const req = {
      user: { employeeId: 'staff-1', authLob: 'dental' },
      query: {},
    };
    const res = mockResponse();

    await listPartners(req, res);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('p.companyid = ANY($1::uuid[])');
    expect(params).toEqual([[LOC_A], 20, 0]);
    expect(query.mock.calls[1][1]).toEqual([[LOC_A]]);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totalItems: 0 }));
  });

  it('rejects an explicit out-of-scope customer location', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['customers.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });

    const req = {
      user: { employeeId: 'staff-1', authLob: 'dental' },
      query: { companyId: LOC_B },
    };
    const res = mockResponse();

    await listPartners(req, res);

    expect(query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'LOCATION_NOT_ALLOWED' }));
  });

  it('treats phone uniqueness checks as non-blocking', async () => {
    const req = {
      query: {
        field: 'phone',
        value: 'T8250',
        excludeId: 'customer-1',
      },
    };
    const res = mockResponse();

    await checkPartnerUnique(req, res);

    expect(query).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ unique: true });
  });

  it('keeps email uniqueness checks active', async () => {
    query.mockResolvedValueOnce([{ id: 'customer-2' }]);

    const req = {
      query: {
        field: 'email',
        value: 'duplicate@example.com',
        excludeId: 'customer-1',
      },
    };
    const res = mockResponse();

    await checkPartnerUnique(req, res);

    expect(query).toHaveBeenCalledWith(
      'SELECT id FROM partners WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1',
      ['duplicate@example.com', 'customer-1'],
    );
    expect(res.json).toHaveBeenCalledWith({ unique: false, conflictField: 'email' });
  });
});
