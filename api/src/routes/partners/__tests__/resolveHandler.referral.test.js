'use strict';

const { resolvePartner } = require('../resolveHandler');
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

const { query } = require('../../../db');

function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('resolvePartner referralClaim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('resolve includes referralClaim for a claimed partner', async () => {
    query.mockResolvedValueOnce([
      {
        id: 'partner-1',
        ref: 'C001',
        name: 'Alice',
        displayname: 'Alice D',
        phone: '0909123456',
        lastupdated: new Date().toISOString(),
        referred_by_ctv_id: 'ctv-1',
      },
    ]);

    getReferralClaimStatus.mockResolvedValueOnce({
      ownerCtvId: 'ctv-1',
      ownerName: 'Bob CTV',
      active: true,
      expiresAt: new Date('2026-12-01'),
    });

    const req = { query: { key: '0909123456' }, lob: 'dental' };
    const res = mockResponse();

    await resolvePartner(req, res);

    expect(getReferralClaimStatus).toHaveBeenCalledWith('partner-1', 'dental', {});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        matchedBy: expect.any(String),
        partner: expect.objectContaining({ id: 'partner-1' }),
        referralClaim: expect.objectContaining({
          ownerCtvId: 'ctv-1',
          active: true,
        }),
      })
    );
  });

  test('resolve returns 404 when partner not found', async () => {
    query.mockImplementation(() => Promise.resolve([]));

    const req = { query: { key: '9999999999' } };
    const res = mockResponse();

    await resolvePartner(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CUSTOMER_NOT_FOUND',
      })
    );
  });
});
