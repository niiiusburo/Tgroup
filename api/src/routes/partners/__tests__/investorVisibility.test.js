jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

const { query } = require('../../../db');
const { resolveEffectivePermissions } = require('../../../services/permissionService');
const {
  listInvestorVisibility,
  setInvestorVisibility,
} = require('../investorVisibility');

const ADMIN_REQ = { user: { employeeId: 'admin-1' } };
const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const INVESTOR_ID = '22222222-2222-4222-8222-222222222222';

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function mockAdmin() {
  resolveEffectivePermissions.mockResolvedValue({
    groupName: 'Admin',
    effectivePermissions: ['*'],
  });
}

describe('partner investor visibility handlers', () => {
  beforeEach(() => {
    query.mockReset();
    resolveEffectivePermissions.mockReset();
  });

  it('lists visible customer ids for the configured active investor', async () => {
    mockAdmin();
    query
      .mockResolvedValueOnce([{ investorId: INVESTOR_ID }])
      .mockResolvedValueOnce([{ partner_id: CUSTOMER_ID }]);

    const res = mockResponse();
    await listInvestorVisibility(ADMIN_REQ, res);

    expect(res.json).toHaveBeenCalledWith({
      investorId: INVESTOR_ID,
      customerIds: [CUSTOMER_ID],
    });
  });

  it('rejects non-admin callers even when the route permission middleware is bypassed', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Manager',
      effectivePermissions: ['permissions.edit'],
    });

    const res = mockResponse();
    await listInvestorVisibility(ADMIN_REQ, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'ADMIN_REQUIRED', message: 'Admin access required' },
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('upserts a visible customer allowlist row', async () => {
    mockAdmin();
    query
      .mockResolvedValueOnce([{ investorId: INVESTOR_ID }])
      .mockResolvedValueOnce([{ id: CUSTOMER_ID }])
      .mockResolvedValueOnce([]);

    const res = mockResponse();
    await setInvestorVisibility(
      { ...ADMIN_REQ, params: { id: CUSTOMER_ID }, body: { visible: true } },
      res
    );

    expect(query.mock.calls[2][0]).toContain('ON CONFLICT (investor_id, partner_id)');
    expect(query.mock.calls[2][1]).toEqual([INVESTOR_ID, CUSTOMER_ID]);
    expect(res.json).toHaveBeenCalledWith({
      investorId: INVESTOR_ID,
      customerId: CUSTOMER_ID,
      visible: true,
    });
  });

  it('marks an allowlist row hidden without deleting it', async () => {
    mockAdmin();
    query
      .mockResolvedValueOnce([{ investorId: INVESTOR_ID }])
      .mockResolvedValueOnce([{ id: CUSTOMER_ID }])
      .mockResolvedValueOnce([]);

    const res = mockResponse();
    await setInvestorVisibility(
      { ...ADMIN_REQ, params: { id: CUSTOMER_ID }, body: { visible: false } },
      res
    );

    expect(query.mock.calls[2][0]).toContain('SET is_visible = false');
    expect(query.mock.calls[2][1]).toEqual([INVESTOR_ID, CUSTOMER_ID]);
    expect(res.json).toHaveBeenCalledWith({
      investorId: INVESTOR_ID,
      customerId: CUSTOMER_ID,
      visible: false,
    });
  });

  it('validates customer id and visible payload before writing', async () => {
    const res = mockResponse();

    await setInvestorVisibility(
      { ...ADMIN_REQ, params: { id: 'not-a-uuid' }, body: { visible: true } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(query).not.toHaveBeenCalled();
  });
});
