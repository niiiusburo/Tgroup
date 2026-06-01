'use strict';

const { computeClaim, getReferralClaimStatus } = require('../referralClaim');

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

  describe('getReferralClaimStatus', () => {
    it('returns inactive claim when client has no referred_by_ctv_id', async () => {
      const mockDb = {
        queryRows: jest.fn()
          .mockResolvedValueOnce([{ referred_by_ctv_id: null, owner_name: null }]) // owner query
      };
      const getDb = jest.fn().mockReturnValue(mockDb);

      const result = await getReferralClaimStatus('client-1', 'nk', {
        getDb: getDb,
      });

      expect(result).toEqual({
        ownerCtvId: null,
        ownerName: null,
        anchorDate: null,
        expiresAt: null,
        active: false,
      });
    });

    it('queries settings for referral_start_product_id', async () => {
      const ownerDate = new Date('2026-02-01');
      const mockDb = {
        queryRows: jest.fn()
          .mockResolvedValueOnce([{ referred_by_ctv_id: 'ctv-1', owner_name: 'Owner' }]) // owner query
          .mockResolvedValueOnce([{ referral_start_product_id: 'product-1' }]) // settings query
          .mockResolvedValueOnce([{ d: null }]) // card query (no card)
          .mockResolvedValueOnce([{ d: null }]) // appointment query
          .mockResolvedValueOnce([{ d: ownerDate }]) // payment query
      };
      const getDb = jest.fn().mockReturnValue(mockDb);

      const result = await getReferralClaimStatus('client-1', 'nk', {
        asOf: new Date('2026-03-01'),
        getDb: getDb,
      });

      expect(mockDb.queryRows).toHaveBeenCalledTimes(5);
      expect(mockDb.queryRows.mock.calls[1][0]).toContain('commission_settings');
    });

    it('finds referral card date from saleorderlines when referral_start_product_id is set', async () => {
      const cardDate = new Date('2026-01-10');
      const ownerDate = new Date('2026-02-01');
      const mockDb = {
        queryRows: jest.fn()
          .mockResolvedValueOnce([{ referred_by_ctv_id: 'ctv-1', owner_name: 'Owner' }]) // owner query
          .mockResolvedValueOnce([{ referral_start_product_id: 'product-1' }]) // settings query
          .mockResolvedValueOnce([{ d: cardDate }]) // card query (found)
          .mockResolvedValueOnce([{ d: null }]) // appointment query
          .mockResolvedValueOnce([{ d: ownerDate }]) // payment query
      };
      const getDb = jest.fn().mockReturnValue(mockDb);

      const result = await getReferralClaimStatus('client-1', 'nk', {
        asOf: new Date('2026-03-01'),
        getDb: getDb,
      });

      expect(result.anchorDate).toEqual(ownerDate); // Later date wins
      expect(mockDb.queryRows.mock.calls[2][0]).toContain('saleorderlines');
    });

    it('finds last paid service date from payments table', async () => {
      const paymentDate = new Date('2026-02-01');
      const mockDb = {
        queryRows: jest.fn()
          .mockResolvedValueOnce([{ referred_by_ctv_id: 'ctv-1', owner_name: 'Owner' }])
          .mockResolvedValueOnce([{ referral_start_product_id: null }])
          .mockResolvedValueOnce([{ d: null }])
          .mockResolvedValueOnce([{ d: paymentDate }])
      };
      const getDb = jest.fn().mockReturnValue(mockDb);

      const result = await getReferralClaimStatus('client-1', 'nk', {
        asOf: new Date('2026-03-01'),
        getDb: getDb,
      });

      expect(result.anchorDate).toEqual(paymentDate);
      expect(mockDb.queryRows.mock.calls[3][0]).toContain('dbo.payments');
    });

    it('finds booking appointment date from appointments table', async () => {
      const appointmentDate = new Date('2026-06-01T08:00:00.000Z');
      const mockDb = {
        queryRows: jest.fn()
          .mockResolvedValueOnce([{ referred_by_ctv_id: 'ctv-1', owner_name: 'Owner' }])
          .mockResolvedValueOnce([{ referral_start_product_id: null }])
          .mockResolvedValueOnce([{ d: appointmentDate }])
          .mockResolvedValueOnce([{ d: null }])
      };
      const getDb = jest.fn().mockReturnValue(mockDb);

      const result = await getReferralClaimStatus('client-1', 'nk', {
        asOf: new Date('2026-06-02'),
        getDb: getDb,
      });

      expect(result.anchorDate).toEqual(appointmentDate);
      expect(result.active).toBe(true);
      expect(mockDb.queryRows.mock.calls[2][0]).toContain('dbo.appointments');
    });

    it('supports txClient for transaction context', async () => {
      const ownerDate = new Date('2026-02-01');
      const txClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ referred_by_ctv_id: 'ctv-1', owner_name: 'Owner' }] })
          .mockResolvedValueOnce({ rows: [{ referral_start_product_id: null }] })
          .mockResolvedValueOnce({ rows: [{ d: null }] })
          .mockResolvedValueOnce({ rows: [{ d: ownerDate }] })
      };

      const result = await getReferralClaimStatus('client-1', 'nk', {
        asOf: new Date('2026-03-01'),
        txClient: txClient,
      });

      expect(result.ownerCtvId).toBe('ctv-1');
      expect(txClient.query).toHaveBeenCalledTimes(4);
    });

    it('combines referral card and payment dates to find the later anchor', async () => {
      const cardDate = new Date('2026-01-10');
      const paymentDate = new Date('2026-02-15');
      const mockDb = {
        queryRows: jest.fn()
          .mockResolvedValueOnce([{ referred_by_ctv_id: 'ctv-1', owner_name: 'Owner' }])
          .mockResolvedValueOnce([{ referral_start_product_id: 'product-1' }])
          .mockResolvedValueOnce([{ d: cardDate }])
          .mockResolvedValueOnce([{ d: null }])
          .mockResolvedValueOnce([{ d: paymentDate }])
      };
      const getDb = jest.fn().mockReturnValue(mockDb);

      const result = await getReferralClaimStatus('client-1', 'nk', {
        asOf: new Date('2026-03-01'),
        getDb: getDb,
      });

      expect(result.anchorDate).toEqual(paymentDate); // Later wins
      expect(result.active).toBe(true);
    });
  });
});
