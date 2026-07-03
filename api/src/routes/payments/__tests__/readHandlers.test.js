jest.mock('../../../db', () => {
  const mockQuery = jest.fn();
  return {
    query: mockQuery,
    getQuery: jest.fn(() => mockQuery),
  };
});

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

const { query } = require('../../../db');
const { resolveEffectivePermissions } = require('../../../services/permissionService');
const { listPayments } = require('../readHandlers');

const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('payment read handlers', () => {
  beforeEach(() => {
    query.mockReset();
    resolveEffectivePermissions.mockReset();
  });

  it('scopes payment lists through customer company when companyId is omitted', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['payment.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ count: 0 }]);

    const req = {
      user: { employeeId: 'staff-1', authLob: 'dental' },
      query: {},
    };
    const res = mockResponse();

    await listPayments(req, res);

    expect(query).toHaveBeenCalledTimes(2);
    const [listSql, listParams] = query.mock.calls[0];
    const [countSql, countParams] = query.mock.calls[1];
    expect(listSql).toContain('partner.companyid = ANY($1::uuid[])');
    expect(countSql).toContain('partner.companyid = ANY($1::uuid[])');
    expect(listParams).toEqual([[LOC_A], 100, 0]);
    expect(countParams).toEqual([[LOC_A]]);
    expect(res.json).toHaveBeenCalledWith({ items: [], totalItems: 0 });
  });

  it('rejects explicit out-of-scope payment locations', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['payment.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });

    const req = {
      user: { employeeId: 'staff-1', authLob: 'dental' },
      query: { companyId: LOC_B },
    };
    const res = mockResponse();

    await listPayments(req, res);

    expect(query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'LOCATION_NOT_ALLOWED' }));
  });
});
