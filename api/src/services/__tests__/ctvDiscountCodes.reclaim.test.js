'use strict';

jest.mock('../../db', () => ({
  getDb: jest.fn(),
}));

jest.mock('../ctvBookingCompany', () => ({
  resolveCtvBookingCompanyId: jest.fn(),
}));

const { getDb } = require('../../db');
const { resolveCtvBookingCompanyId } = require('../ctvBookingCompany');
const { getReferralClaimStatus } = require('../referralClaim');
const { reclaimClientForCtv } = require('../ctvDiscountCodes');

describe('ctvDiscountCodes.reclaimClientForCtv', () => {
  const clientId = 'client-1';
  const ctvId = 'ctv-issuing';
  const lob = 'dental';
  const companyId = 'company-1';

  beforeEach(() => {
    jest.clearAllMocks();
    resolveCtvBookingCompanyId.mockResolvedValue(companyId);
  });

  it('after reclaim, getReferralClaimStatus shows active card link from appointment ctv_id', async () => {
    const apptDate = new Date('2026-06-15');
    const queryRows = jest.fn();

    queryRows
      // reclaimClientForCtv: UPDATE partners
      .mockResolvedValueOnce([])
      // ensureCtvTrackingAppointmentStub: existing check
      .mockResolvedValueOnce([])
      // resolveCtvBookingCompanyId via safeQueryRows — handled by mock
      // ensure stub: name seq
      .mockResolvedValueOnce([{ next_seq: 42 }])
      // ensure stub: INSERT appointment
      .mockResolvedValueOnce([])
      // getReferralClaimStatus: latest appointment
      .mockResolvedValueOnce([{ ctvId, ctvName: 'Issuing CTV', dt: apptDate }])
      // getReferralClaimStatus: latest service
      .mockResolvedValueOnce([])
      // getReferralClaimStatus: profile fallback
      .mockResolvedValueOnce([{ ownerId: ctvId, ownerName: 'Issuing CTV' }]);

    const db = { queryRows };
    getDb.mockReturnValue(db);

    await reclaimClientForCtv(clientId, lob, ctvId);

    const insertCall = queryRows.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO dbo.appointments'));
    expect(insertCall).toBeDefined();
    expect(insertCall[1]).toEqual(expect.arrayContaining([clientId, companyId, ctvId]));

    const status = await getReferralClaimStatus(clientId, lob, { getDb: () => db });
    expect(status.ownerCtvId).toBe(ctvId);
    expect(status.active).toBe(true);
  });

  it('skips appointment insert when client already has a non-cancelled card for the CTV', async () => {
    const queryRows = jest.fn();
    queryRows
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'existing-appt' }]);

    getDb.mockReturnValue({ queryRows });

    await reclaimClientForCtv(clientId, lob, ctvId);

    const insertCall = queryRows.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO dbo.appointments'));
    expect(insertCall).toBeUndefined();
    expect(resolveCtvBookingCompanyId).not.toHaveBeenCalled();
  });
});