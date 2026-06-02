'use strict';

const { computeClaim, getReferralClaimStatus, computeCtvLink } = require('../referralClaim');

describe('referralClaim', () => {
  describe('computeClaim', () => {
    it('returns inactive claim when ownerCtvId is null', () => {
      const result = computeClaim({
        ownerCtvId: null,
        ownerName: 'John',
        referralCardDate: new Date('2026-01-01'),
        lastPaidServiceDate: new Date('2026-02-01'),
      });

      expect(result).toEqual({
        ownerCtvId: null,
        ownerName: null,
        anchorDate: null,
        expiresAt: null,
        active: false,
      });
    });

    it('uses the later of referral card date and last paid service date as anchor', () => {
      const cardDate = new Date('2026-01-01');
      const serviceDate = new Date('2026-03-15');

      const result = computeClaim({
        ownerCtvId: 'ctv-1',
        ownerName: 'John Doe',
        referralCardDate: cardDate,
        lastPaidServiceDate: serviceDate,
        asOf: new Date('2026-04-01'),
      });

      expect(result.anchorDate).toEqual(serviceDate);
      expect(result.ownerCtvId).toBe('ctv-1');
      expect(result.ownerName).toBe('John Doe');
    });

    it('uses the later of referral card, booking appointment, and paid service dates as anchor', () => {
      const cardDate = new Date('2026-01-01');
      const appointmentDate = new Date('2026-06-01');
      const serviceDate = new Date('2026-03-15');

      const result = computeClaim({
        ownerCtvId: 'ctv-1',
        ownerName: 'John Doe',
        referralCardDate: cardDate,
        bookingAppointmentDate: appointmentDate,
        lastPaidServiceDate: serviceDate,
        asOf: new Date('2026-06-02'),
      });

      expect(result.anchorDate).toEqual(appointmentDate);
      expect(result.active).toBe(true);
    });

    it('sets expiration to 6 months after anchor date', () => {
      const cardDate = new Date('2026-01-15');

      const result = computeClaim({
        ownerCtvId: 'ctv-1',
        ownerName: 'Jane',
        referralCardDate: cardDate,
        lastPaidServiceDate: null,
        asOf: new Date('2026-02-01'),
      });

      // 6 months after Jan 15 = Jul 15
      const expectedExpiry = new Date('2026-07-15');
      expect(result.expiresAt).toEqual(expectedExpiry);
    });

    it('is active when asOf is before expiration date', () => {
      const cardDate = new Date('2026-01-15');

      const result = computeClaim({
        ownerCtvId: 'ctv-1',
        ownerName: 'Jane',
        referralCardDate: cardDate,
        lastPaidServiceDate: null,
        asOf: new Date('2026-07-14'),
      });

      expect(result.active).toBe(true);
    });

    it('is inactive when asOf equals expiration date', () => {
      const cardDate = new Date('2026-01-15');

      const result = computeClaim({
        ownerCtvId: 'ctv-1',
        ownerName: 'Jane',
        referralCardDate: cardDate,
        lastPaidServiceDate: null,
        asOf: new Date('2026-07-15'),
      });

      expect(result.active).toBe(false);
    });

    it('is inactive when asOf exceeds expiration date (lapsed claim)', () => {
      const cardDate = new Date('2026-01-15');

      const result = computeClaim({
        ownerCtvId: 'ctv-1',
        ownerName: 'Jane',
        referralCardDate: cardDate,
        lastPaidServiceDate: null,
        asOf: new Date('2026-08-01'),
      });

      expect(result.active).toBe(false);
    });

    it('handles null both dates (no anchor)', () => {
      const result = computeClaim({
        ownerCtvId: 'ctv-1',
        ownerName: 'Jane',
        referralCardDate: null,
        lastPaidServiceDate: null,
      });

      expect(result.anchorDate).toBeNull();
      expect(result.expiresAt).toBeNull();
      expect(result.active).toBe(false);
    });

    it('defaults asOf to current date if not provided', () => {
      const now = new Date();
      const cardDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 180); // 180 days ago

      const result = computeClaim({
        ownerCtvId: 'ctv-1',
        ownerName: 'Jane',
        referralCardDate: cardDate,
        lastPaidServiceDate: null,
      });

      // Should be active (within 6 months from now)
      expect(result.active).toBe(true);
    });
  });

  describe('getReferralClaimStatus (delegates to getCtvLinkStatus)', () => {
    // The legacy implementation queried commission_settings/saleorderlines/payments. It now
    // delegates to getCtvLinkStatus, which finds the latest non-cancelled CTV-bearing appointment
    // OR saleorder (3 queries: appointments, saleorders, owner) and returns the legacy shape.

    it('returns inactive claim when no CTV-bearing event and no owner on file', async () => {
      const mockDb = {
        queryRows: jest.fn()
          .mockResolvedValueOnce([])                                   // appointments (no CTV-bearing)
          .mockResolvedValueOnce([])                                   // saleorders (no CTV-bearing)
          .mockResolvedValueOnce([{ ownerId: null, ownerName: null }]) // owner lookup
      };
      const getDb = jest.fn().mockReturnValue(mockDb);

      const result = await getReferralClaimStatus('client-1', 'nk', { getDb });

      expect(result).toEqual({
        ownerCtvId: null,
        ownerName: null,
        anchorDate: null,
        expiresAt: null,
        active: false,
      });
    });

    it('queries appointments and saleorders for the latest CTV-bearing event', async () => {
      const mockDb = {
        queryRows: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ ownerId: null, ownerName: null }])
      };
      const getDb = jest.fn().mockReturnValue(mockDb);

      await getReferralClaimStatus('client-1', 'nk', { getDb });

      expect(mockDb.queryRows).toHaveBeenCalledTimes(3);
      expect(mockDb.queryRows.mock.calls[0][0]).toContain('dbo.appointments');
      expect(mockDb.queryRows.mock.calls[0][0]).toContain('ctv_id');
      expect(mockDb.queryRows.mock.calls[1][0]).toContain('dbo.saleorders');
    });

    it('uses the latest CTV-bearing appointment as the anchor', async () => {
      const apptDate = new Date('2026-04-01');
      const mockDb = {
        queryRows: jest.fn()
          .mockResolvedValueOnce([{ ctvId: 'ctv-1', ctvName: 'Owner', dt: apptDate }])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ ownerId: 'ctv-1', ownerName: 'Owner' }])
      };
      const getDb = jest.fn().mockReturnValue(mockDb);

      const result = await getReferralClaimStatus('client-1', 'nk', {
        asOf: new Date('2026-06-02'),
        getDb,
      });

      expect(result.ownerCtvId).toBe('ctv-1');
      expect(result.anchorDate).toEqual(apptDate);
      expect(result.active).toBe(true);
    });

    it('lets a newer CTV-bearing service win over an older appointment', async () => {
      const apptDate = new Date('2026-03-01');
      const svcDate = new Date('2026-05-01');
      const mockDb = {
        queryRows: jest.fn()
          .mockResolvedValueOnce([{ ctvId: 'ctv-A', ctvName: 'Lan', dt: apptDate }])
          .mockResolvedValueOnce([{ ctvId: 'ctv-B', ctvName: 'Huy', dt: svcDate }])
          .mockResolvedValueOnce([{ ownerId: 'ctv-A', ownerName: 'Lan' }])
      };
      const getDb = jest.fn().mockReturnValue(mockDb);

      const result = await getReferralClaimStatus('client-1', 'nk', {
        asOf: new Date('2026-06-02'),
        getDb,
      });

      expect(result.ownerCtvId).toBe('ctv-B');
      expect(result.ownerName).toBe('Huy');
      expect(result.anchorDate).toEqual(svcDate);
    });

    it('is inactive when the latest CTV-bearing event is older than 6 months', async () => {
      const apptDate = new Date('2025-11-01');
      const mockDb = {
        queryRows: jest.fn()
          .mockResolvedValueOnce([{ ctvId: 'ctv-1', ctvName: 'Owner', dt: apptDate }])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ ownerId: 'ctv-1', ownerName: 'Owner' }])
      };
      const getDb = jest.fn().mockReturnValue(mockDb);

      const result = await getReferralClaimStatus('client-1', 'nk', {
        asOf: new Date('2026-06-02'),
        getDb,
      });

      expect(result.active).toBe(false);
    });

    it('falls back to referred_by owner (linked, no anchor) when no CTV-bearing event exists', async () => {
      const mockDb = {
        queryRows: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ ownerId: 'ctv-1', ownerName: 'Owner' }])
      };
      const getDb = jest.fn().mockReturnValue(mockDb);

      const result = await getReferralClaimStatus('client-1', 'nk', { getDb });

      expect(result.ownerCtvId).toBe('ctv-1');
      expect(result.ownerName).toBe('Owner');
      expect(result.anchorDate).toBeNull();
      expect(result.expiresAt).toBeNull();
      expect(result.active).toBe(true);
    });

    it('supports txClient for transaction context (3 queries)', async () => {
      const apptDate = new Date('2026-04-01');
      const txClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ ctvId: 'ctv-1', ctvName: 'Owner', dt: apptDate }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ ownerId: 'ctv-1', ownerName: 'Owner' }] })
      };

      const result = await getReferralClaimStatus('client-1', 'nk', {
        asOf: new Date('2026-06-02'),
        txClient,
      });

      expect(result.ownerCtvId).toBe('ctv-1');
      expect(txClient.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('computeCtvLink', () => {
    const asOf = new Date('2026-06-02T00:00:00Z');

    it('no CTV-bearing event and no fallback owner => eligible, not linked', () => {
      const { computeCtvLink } = require('../referralClaim');
      const r = computeCtvLink({ appt: null, service: null, fallbackOwnerCtvId: null, fallbackOwnerName: null, asOf });
      expect(r.linkedCtvId).toBeNull();
      expect(r.active).toBe(false);
      expect(r.eligible).toBe(true);
      expect(r.anchorAt).toBeNull();
    });

    it('latest CTV-bearing event within 6 months => active, not eligible', () => {
      const { computeCtvLink } = require('../referralClaim');
      const r = computeCtvLink({
        appt: { ctvId: 'ctv-A', ctvName: 'Lan', dt: new Date('2026-04-01') },
        service: null, fallbackOwnerCtvId: 'ctv-A', fallbackOwnerName: 'Lan', asOf,
      });
      expect(r.linkedCtvId).toBe('ctv-A');
      expect(r.linkedCtvName).toBe('Lan');
      expect(r.anchorSource).toBe('appointment');
      expect(r.active).toBe(true);
      expect(r.eligible).toBe(false);
      expect(r.expiresAt.getTime()).toBe(new Date('2026-10-01').getTime());
    });

    it('latest CTV-bearing event older than 6 months => expired, eligible', () => {
      const { computeCtvLink } = require('../referralClaim');
      const r = computeCtvLink({
        appt: { ctvId: 'ctv-A', ctvName: 'Lan', dt: new Date('2025-11-01') },
        service: null, fallbackOwnerCtvId: 'ctv-A', fallbackOwnerName: 'Lan', asOf,
      });
      expect(r.active).toBe(false);
      expect(r.eligible).toBe(true);
    });

    it('service is newer than appointment => service wins and names its CTV', () => {
      const { computeCtvLink } = require('../referralClaim');
      const r = computeCtvLink({
        appt: { ctvId: 'ctv-A', ctvName: 'Lan', dt: new Date('2026-03-01') },
        service: { ctvId: 'ctv-B', ctvName: 'Huy', dt: new Date('2026-05-01') },
        fallbackOwnerCtvId: 'ctv-A', fallbackOwnerName: 'Lan', asOf,
      });
      expect(r.linkedCtvId).toBe('ctv-B');
      expect(r.linkedCtvName).toBe('Huy');
      expect(r.anchorSource).toBe('service');
    });

    it('tie on date => service wins', () => {
      const { computeCtvLink } = require('../referralClaim');
      const sameDay = new Date('2026-05-01');
      const r = computeCtvLink({
        appt: { ctvId: 'ctv-A', ctvName: 'Lan', dt: sameDay },
        service: { ctvId: 'ctv-B', ctvName: 'Huy', dt: sameDay },
        fallbackOwnerCtvId: null, fallbackOwnerName: null, asOf,
      });
      expect(r.anchorSource).toBe('service');
      expect(r.linkedCtvId).toBe('ctv-B');
    });

    it('fallback owner set but no event => linked, no anchor, not eligible', () => {
      const { computeCtvLink } = require('../referralClaim');
      const r = computeCtvLink({ appt: null, service: null, fallbackOwnerCtvId: 'ctv-A', fallbackOwnerName: 'Lan', asOf });
      expect(r.linkedCtvId).toBe('ctv-A');
      expect(r.anchorAt).toBeNull();
      expect(r.expiresAt).toBeNull();
      expect(r.active).toBe(true);
      expect(r.eligible).toBe(false);
    });
  });
});
