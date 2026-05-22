/**
 * TDD tests for commissionEngine (Cosmetic LOB v2, Phase 2)
 * D13 recipient priority, append-only earnings, refund reversals.
 * Run: cd api && npm test -- src/services/__tests__/commissionEngine.test.js
 * Must be RED before impl, then GREEN.
 */

const commissionEngine = require('../commissionEngine');

describe('commissionEngine - D13 recipient resolution & earnings writes', () => {
  let mockDb;
  let mockGetDb;

  beforeEach(() => {
    mockDb = {
      queryRows: jest.fn().mockResolvedValue([]),
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };
    mockGetDb = jest.fn((lob) => mockDb);
  });

  test('resolveRecipient: referred_by_ctv_id wins first (CTV priority over consultation/salestaff)', async () => {
    const clientRow = {
      id: 'client-uuid',
      referred_by_ctv_id: 'ctv-partner-uuid',
      salestaffid: 'staff-uuid',
    };
    // Even with active consultation, CTV wins (claim active)
    const result = await commissionEngine.resolveRecipient({
      clientRow,
      lob: 'dental',
      referralClaim: { getReferralClaimStatus: async () => ({ active: true, ownerCtvId: 'ctv-partner-uuid' }) },
    });
    expect(result).toEqual({ recipient_partner_id: 'ctv-partner-uuid', source: 'ctv' });
  });

  test('resolveRecipient: lapsed CTV claim falls through (no credit), then null when no other source', async () => {
    const clientRow = { id: 'cli-lapsed', referred_by_ctv_id: 'ctv-old', salestaffid: null };
    const result = await commissionEngine.resolveRecipient({
      clientRow,
      lob: 'dental',
      referralClaim: { getReferralClaimStatus: async () => ({ active: false, ownerCtvId: 'ctv-old' }) },
    });
    expect(result).toBeNull();
  });

  test('resolveRecipient: lapsed CTV claim falls through to salestaff (dental)', async () => {
    const clientRow = { id: 'cli-lapsed2', referred_by_ctv_id: 'ctv-old', salestaffid: 'sales-x' };
    const result = await commissionEngine.resolveRecipient({
      clientRow,
      lob: 'dental',
      referralClaim: { getReferralClaimStatus: async () => ({ active: false, ownerCtvId: 'ctv-old' }) },
    });
    expect(result).toEqual({ recipient_partner_id: 'sales-x', source: 'salestaff' });
  });

  test('resolveRecipient: cosmetic consultation card used when no CTV referrer', async () => {
    const clientRow = { id: '00000000-0000-0000-0000-0000000000cc', referred_by_ctv_id: null, salestaffid: null };
    mockDb.queryRows.mockResolvedValueOnce([{ consulting_staff_id: '00000000-0000-0000-0000-0000000000ss' }]);
    const result = await commissionEngine.resolveRecipient({
      clientRow,
      lob: 'cosmetic',
      getDb: mockGetDb,
    });
    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining('consultations'),
      ['00000000-0000-0000-0000-0000000000cc']
    );
    expect(result).toEqual({ recipient_partner_id: '00000000-0000-0000-0000-0000000000ss', source: 'consultation' });
  });

  test('resolveRecipient: dental salestaffid fallback when no CTV no cons', async () => {
    const clientRow = { id: 'client-den', referred_by_ctv_id: null, salestaffid: 'sales-uuid' };
    const result = await commissionEngine.resolveRecipient({ clientRow, lob: 'dental' });
    expect(result).toEqual({ recipient_partner_id: 'sales-uuid', source: 'salestaff' });
  });

  test('resolveRecipient: returns null if no attribution path', async () => {
    const clientRow = { id: 'orphan', referred_by_ctv_id: null, salestaffid: null };
    const result = await commissionEngine.resolveRecipient({ clientRow, lob: 'dental' });
    expect(result).toBeNull();
  });

  test('createEarningsForPayment: single-level CTV (L0=100%) writes full pool to direct referrer', async () => {
    const payment = { id: '00000000-0000-0000-0000-0000000000p1', amount: 1000000, customer_id: '00000000-0000-0000-0000-0000000000c1' };
    const clientRow = { id: '00000000-0000-0000-0000-0000000000c1', referred_by_ctv_id: '00000000-0000-0000-0000-000000000ctv' };
    const line = { id: '00000000-0000-0000-0000-0000000000ln', product_id: '00000000-0000-0000-0000-0000000000pr' };
    mockDb.queryRows
      .mockResolvedValueOnce([{ commission_rate_percent: 10 }])                  // product rate → pool 100000
      .mockResolvedValueOnce([{ level: 0, share_percent: 100, enabled: true }])  // level config
      .mockResolvedValueOnce([{ referred_by_ctv_id: null }])                     // chain: L0 has no upline
      .mockResolvedValueOnce([{ id: 'e0', amount: 100000, level: 0 }]);          // insert L0
    const activeClaim = { getReferralClaimStatus: async () => ({ active: true, ownerCtvId: '00000000-0000-0000-0000-000000000ctv' }) };
    await commissionEngine.createEarningsForPayment({ payment, lines: [line], lob: 'dental', clientRow, getDb: mockGetDb, referralClaim: activeClaim });
    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO dbo.earnings'),
      expect.arrayContaining([expect.anything(), '00000000-0000-0000-0000-000000000ctv', '00000000-0000-0000-0000-0000000000p1', expect.anything(), 0, 100000])
    );
  });

  test('createEarningsForPayment: MLM split across upline chain by configured shares', async () => {
    const payment = { id: 'pay-mlm', amount: 1000000 };
    const clientRow = { id: 'cli-mlm', referred_by_ctv_id: 'ctv-L0' };
    const line = { id: 'line-mlm', product_id: 'prod-mlm' };
    mockDb.queryRows
      .mockResolvedValueOnce([{ commission_rate_percent: 10 }])                                              // pool = 100000
      .mockResolvedValueOnce([{ level: 0, share_percent: 70, enabled: true }, { level: 1, share_percent: 30, enabled: true }])
      .mockResolvedValueOnce([{ referred_by_ctv_id: 'ctv-L1' }])                                             // L0 → upline ctv-L1
      .mockResolvedValueOnce([{ referred_by_ctv_id: null }])                                                 // L1 → no upline
      .mockResolvedValueOnce([{ id: 'e0' }])
      .mockResolvedValueOnce([{ id: 'e1' }]);
    const activeClaimMlm = { getReferralClaimStatus: async () => ({ active: true, ownerCtvId: 'ctv-L0' }) };
    await commissionEngine.createEarningsForPayment({ payment, lines: [line], lob: 'dental', clientRow, getDb: mockGetDb, referralClaim: activeClaimMlm });
    // L0 gets 70% of 100000, L1 gets 30%
    expect(mockDb.queryRows).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO dbo.earnings'), expect.arrayContaining(['ctv-L0', 'pay-mlm', 70000]));
    expect(mockDb.queryRows).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO dbo.earnings'), expect.arrayContaining(['ctv-L1', 'pay-mlm', 30000]));
  });

  test('createEarningsForPayment: salestaff source writes a single full-pool row at level 0 (no split)', async () => {
    const payment = { id: 'pay-ss', amount: 1000000 };
    const clientRow = { id: 'cli-ss', referred_by_ctv_id: null, salestaffid: 'staff-1' };
    const line = { id: 'line-ss', product_id: 'prod-ss' };
    mockDb.queryRows
      .mockResolvedValueOnce([{ commission_rate_percent: 10 }])                  // pool 100000
      .mockResolvedValueOnce([{ level: 0, share_percent: 70, enabled: true }])   // level config (ignored for salestaff)
      .mockResolvedValueOnce([{ id: 'e' }]);
    await commissionEngine.createEarningsForPayment({ payment, lines: [line], lob: 'dental', clientRow, getDb: mockGetDb });
    // full pool to salestaff, not 70%
    expect(mockDb.queryRows).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO dbo.earnings'), expect.arrayContaining(['staff-1', 'pay-ss', 100000]));
  });

  test('reverseOnRefund: creates negative reversal row; original earnings status untouched', async () => {
    const originalPaymentId = '00000000-0000-0000-0000-0000000000po';
    const refundPayment = { id: '00000000-0000-0000-0000-0000000000pr', amount: -1000000 };
    mockDb.queryRows
      .mockResolvedValueOnce([{ id: 'earn-orig', amount: 100000, status: 'pending', client_id: 'c1', recipient_partner_id: 'r1', service_line_id: 'l1', source: 'ctv' }])
      .mockResolvedValueOnce([]);
    await commissionEngine.reverseOnRefund({
      originalPaymentId,
      refundPayment,
      lob: 'dental',
      getDb: mockGetDb,
    });
    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO dbo.earnings'),
      expect.arrayContaining([-100000, '00000000-0000-0000-0000-0000000000pr'])
    );
    expect(mockDb.query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE dbo.earnings SET status'));
  });

  test('earnings writes target correct DB via getDb(lob) — isolation', async () => {
    const dentalDb = { queryRows: jest.fn().mockResolvedValue([]) };
    const cosmeticDb = { queryRows: jest.fn().mockResolvedValue([]) };
    const injected = jest.fn((l) => l === 'cosmetic' ? cosmeticDb : dentalDb);

    // No CTV referrer → will hit cosmetic consultation query path + product rate
    cosmeticDb.queryRows.mockResolvedValueOnce([]); // no active cons (falls to null recipient, but still calls getDb)
    // To ensure call, use a path that queries: but since no recipient, still getProductRate is called
    await commissionEngine.createEarningsForPayment({
      payment: { id: '00000000-0000-0000-0000-0000000000pc', amount: 500000 },
      lines: [{ id: '00000000-0000-0000-0000-0000000000l1', product_id: '00000000-0000-0000-0000-0000000000pr' }],
      lob: 'cosmetic',
      clientRow: { id: '00000000-0000-0000-0000-0000000000cc', referred_by_ctv_id: null, salestaffid: null },
      getDb: injected,
    });

    expect(injected).toHaveBeenCalledWith('cosmetic');
    // At minimum getProductRate and/or resolve paths called the injected
    expect(injected.mock.calls.some(c => c[0] === 'cosmetic')).toBe(true);
  });
});

// Integration note: full payment hook tests in payments/__tests__ or e2e later
