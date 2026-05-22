'use strict';

const {
  PARTNER_BY_ID_SQL,
  fetchPartnerProfileById,
} = require('../getPartnerById');
const { getReferralClaimStatus } = require('../../../services/referralClaim');

jest.mock('../../../services/referralClaim', () => ({
  getReferralClaimStatus: jest.fn(),
}));

jest.mock('../../../db', () => {
  const mockQuery = jest.fn();
  return {
    query: mockQuery,
    getQuery: jest.fn(() => mockQuery),
    getDb: jest.fn(() => ({ queryRows: mockQuery })),
  };
});

const { getQuery } = require('../../../db');
const { getPartnerById } = require('../getPartnerById');

function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('getPartnerById profile query', () => {
  it('selects assigned sales and CSKH employee names for the customer profile card', () => {
    expect(PARTNER_BY_ID_SQL).toContain('sales_staff.name AS salestaffname');
    expect(PARTNER_BY_ID_SQL).toContain('cskh_staff.name AS cskhname');
    expect(PARTNER_BY_ID_SQL).toContain('LEFT JOIN partners sales_staff ON sales_staff.id = p.salestaffid');
    expect(PARTNER_BY_ID_SQL).toContain('LEFT JOIN partners cskh_staff ON cskh_staff.id = p.cskhid');
  });

  it('loads one customer profile by id', async () => {
    const runQuery = jest.fn().mockResolvedValue([{ id: 'customer-id' }]);

    const rows = await fetchPartnerProfileById('customer-id', runQuery);

    expect(runQuery).toHaveBeenCalledWith(PARTNER_BY_ID_SQL, ['customer-id']);
    expect(rows).toEqual([{ id: 'customer-id' }]);
  });
});

describe('getPartnerById referralClaim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getPartnerById includes referralClaim in response', async () => {
    const mockQuery = getQuery();
    mockQuery.mockResolvedValueOnce([
      {
        id: 'partner-1',
        ref: 'C001',
        name: 'Alice',
        displayname: 'Alice D',
        phone: '0909123456',
      },
    ]);

    getReferralClaimStatus.mockResolvedValueOnce({
      ownerCtvId: 'ctv-1',
      ownerName: 'Bob CTV',
      active: true,
      expiresAt: new Date('2026-12-01'),
    });

    const req = { params: { id: 'partner-1' }, lob: 'dental' };
    const res = mockResponse();

    await getPartnerById(req, res);

    expect(getReferralClaimStatus).toHaveBeenCalledWith('partner-1', 'dental', {});
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'partner-1',
        referralClaim: expect.objectContaining({
          ownerCtvId: 'ctv-1',
          ownerName: 'Bob CTV',
          active: true,
        }),
      })
    );
  });

  test('getPartnerById returns 404 when partner not found', async () => {
    const mockQuery = getQuery();
    mockQuery.mockResolvedValueOnce([]);

    const req = { params: { id: 'nonexistent' }, lob: 'dental' };
    const res = mockResponse();

    await getPartnerById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Partner not found',
      })
    );
  });
});
