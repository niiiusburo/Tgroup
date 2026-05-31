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

  test('createEarningsForPayment: CTV earns rate% of the service directly (no pool, no level split)', async () => {
    const payment = { id: '00000000-0000-0000-0000-0000000000p1', amount: 1000000, customer_id: '00000000-0000-0000-0000-0000000000c1' };
    const clientRow = { id: '00000000-0000-0000-0000-0000000000c1', referred_by_ctv_id: '00000000-0000-0000-0000-000000000ctv' };
    const line = { id: '00000000-0000-0000-0000-0000000000ln', product_id: '00000000-0000-0000-0000-0000000000pr' };
    mockDb.queryRows
      .mockResolvedValueOnce([{ commission_rate_percent: 24 }])  // referral rate 24% → 1,000,000 × 24% = 240,000 to L0
      .mockResolvedValueOnce([{ id: 'e0', amount: 240000, level: 0 }]); // single insert
    const activeClaim = { getReferralClaimStatus: async () => ({ active: true, ownerCtvId: '00000000-0000-0000-0000-000000000ctv' }) };
    await commissionEngine.createEarningsForPayment({ payment, lines: [line], lob: 'dental', clientRow, getDb: mockGetDb, referralClaim: activeClaim });
    expect(mockDb.queryRows).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO dbo.earnings'),
      expect.arrayContaining(['00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000ctv', '00000000-0000-0000-0000-0000000000p1', 240000])
    );
    // exactly ONE earnings row — no upline/level rows
    const inserts = mockDb.queryRows.mock.calls.filter((c) => /INSERT INTO dbo\.earnings/.test(c[0]));
    expect(inserts).toHaveLength(1);
  });

  test('createEarningsForPayment: braces rate (7%) applies directly to the service amount', async () => {
    const payment = { id: 'pay-braces', amount: 29450000 };
    const clientRow = { id: 'cli-braces', referred_by_ctv_id: 'ctv-direct' };
    const line = { id: 'line-braces', product_id: 'prod-braces' };
    mockDb.queryRows
      .mockResolvedValueOnce([{ commission_rate_percent: 7 }])   // braces → 7%
      .mockResolvedValueOnce([{ id: 'e0' }]);
    const activeClaim = { getReferralClaimStatus: async () => ({ active: true, ownerCtvId: 'ctv-direct' }) };
    await commissionEngine.createEarningsForPayment({ payment, lines: [line], lob: 'dental', clientRow, getDb: mockGetDb, referralClaim: activeClaim });
    // 29,450,000 × 7% = 2,061,500 to the direct referrer, single row
    expect(mockDb.queryRows).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO dbo.earnings'), expect.arrayContaining(['ctv-direct', 'pay-braces', 2061500]));
    const inserts = mockDb.queryRows.mock.calls.filter((c) => /INSERT INTO dbo\.earnings/.test(c[0]));
    expect(inserts).toHaveLength(1);
  });

  test('createEarningsForPayment: salestaff source writes a single row = service × rate at level 0', async () => {
    const payment = { id: 'pay-ss', amount: 1000000 };
    const clientRow = { id: 'cli-ss', referred_by_ctv_id: null, salestaffid: 'staff-1' };
    const line = { id: 'line-ss', product_id: 'prod-ss' };
    mockDb.queryRows
      .mockResolvedValueOnce([{ commission_rate_percent: 10 }])  // 1,000,000 × 10% = 100,000
      .mockResolvedValueOnce([{ id: 'e' }]);
    await commissionEngine.createEarningsForPayment({ payment, lines: [line], lob: 'dental', clientRow, getDb: mockGetDb });
    expect(mockDb.queryRows).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO dbo.earnings'), expect.arrayContaining(['staff-1', 'pay-ss', 100000]));
  });

  test('createEarningsForPayment: CTV source cascades override rows to enabled upline levels (additive)', async () => {
    const payment = { id: 'pay-ov', amount: 1000000 };
    const clientRow = { id: 'cli-ov', referred_by_ctv_id: 'ctv-L0' };
    const line = { id: 'line-ov', product_id: 'prod-ov' };
    mockDb.queryRows
      .mockResolvedValueOnce([{ commission_rate_percent: 24 }]) // getProductRate → 1,000,000 × 24% = 240,000 direct
      .mockResolvedValueOnce([{ id: 'e0', amount: 240000, level: 0 }]) // direct L0 insert
      .mockResolvedValueOnce([
        { level: 0, share_percent: 24, enabled: true },
        { level: 1, share_percent: 4, enabled: true },
        { level: 2, share_percent: 2, enabled: true },
      ]) // _getCommissionLevelConfig
      .mockResolvedValueOnce([{ referred_by_ctv_id: 'ctv-L1' }]) // _walkCtvChain: ctv-L0 → ctv-L1
      .mockResolvedValueOnce([{ referred_by_ctv_id: 'ctv-L2' }]) // ctv-L1 → ctv-L2
      .mockResolvedValueOnce([{ referred_by_ctv_id: null }]) // ctv-L2 → top
      .mockResolvedValueOnce([{ id: 'ov1', amount: 9600, level: 1, recipient_partner_id: 'ctv-L1' }]) // L1 = 240000 × 4%
      .mockResolvedValueOnce([{ id: 'ov2', amount: 4800, level: 2, recipient_partner_id: 'ctv-L2' }]); // L2 = 240000 × 2%
    const activeClaim = { getReferralClaimStatus: async () => ({ active: true, ownerCtvId: 'ctv-L0' }) };
    await commissionEngine.createEarningsForPayment({ payment, lines: [line], lob: 'dental', clientRow, getDb: mockGetDb, referralClaim: activeClaim });
    const inserts = mockDb.queryRows.mock.calls.filter((c) => /INSERT INTO dbo\.earnings/.test(c[0]));
    expect(inserts).toHaveLength(3); // direct L0 + L1 + L2 override
    expect(mockDb.queryRows).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO dbo.earnings'), expect.arrayContaining(['ctv-L1', 1, 9600]));
    expect(mockDb.queryRows).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO dbo.earnings'), expect.arrayContaining(['ctv-L2', 2, 4800]));
  });

  test('createEarningsForPayment: non-CTV source (salestaff) does NOT cascade overrides', async () => {
    const payment = { id: 'pay-noov', amount: 1000000 };
    const clientRow = { id: 'cli-noov', referred_by_ctv_id: null, salestaffid: 'staff-1' };
    const line = { id: 'line-noov', product_id: 'prod-noov' };
    mockDb.queryRows
      .mockResolvedValueOnce([{ commission_rate_percent: 10 }]) // direct = 100,000
      .mockResolvedValueOnce([{ id: 'e0' }]) // direct insert
      .mockResolvedValueOnce([{ level: 1, share_percent: 4, enabled: true }]); // config present, but must be ignored
    await commissionEngine.createEarningsForPayment({ payment, lines: [line], lob: 'dental', clientRow, getDb: mockGetDb });
    const inserts = mockDb.queryRows.mock.calls.filter((c) => /INSERT INTO dbo\.earnings/.test(c[0]));
    expect(inserts).toHaveLength(1); // direct only — salestaff has no referral chain
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

describe('backfillEarningsForClient — retroactive CTV attribution over past payments', () => {
  const CLIENT = '00000000-0000-0000-0000-0000000000c1';
  const CTV = '00000000-0000-0000-0000-000000000ctv';
  const PAYMENT = '00000000-0000-0000-0000-0000000000p1';
  const INVOICE = '00000000-0000-0000-0000-0000000000iv';
  const LINE = '00000000-0000-0000-0000-0000000000ln';
  const PRODUCT = '00000000-0000-0000-0000-0000000000pr';

  const activeClaim = {
    getReferralClaimStatus: async () => ({ active: true, ownerCtvId: CTV }),
  };

  // SQL-routing mock so test order does not depend on a brittle mockResolvedValueOnce chain.
  function makeSmartDb(overrides = {}) {
    const inserts = [];
    const db = {
      queryRows: jest.fn(async (sql, params) => {
        // client load (has salestaffid in projection) vs chain-walk (referred_by_ctv_id only)
        if (/FROM dbo\.partners WHERE id/.test(sql) && /salestaffid/.test(sql)) {
          return overrides.clientRow === null ? [] : [overrides.clientRow || { id: CLIENT, referred_by_ctv_id: CTV, salestaffid: null }];
        }
        if (/FROM payments WHERE customer_id/.test(sql)) return overrides.payments || [];
        if (/FROM dbo\.earnings WHERE payment_id/.test(sql) && /source = 'ctv'/.test(sql)) return overrides.existingCtv || [];
        if (/FROM payment_allocations/.test(sql)) return overrides.allocs || [{ invoice_id: INVOICE }];
        if (/FROM dbo\.saleorderlines/.test(sql)) return overrides.lines || [{ id: LINE, productid: PRODUCT, pricetotal: 1000000 }];
        if (/commission_rate_percent FROM products/.test(sql)) return [{ commission_rate_percent: overrides.rate ?? 10 }];
        if (/FROM dbo\.commission_level_config/.test(sql)) return overrides.levels || [{ level: 0, share_percent: 100, enabled: true }];
        if (/referred_by_ctv_id FROM dbo\.partners WHERE id/.test(sql)) return [{ referred_by_ctv_id: null }]; // chain top
        if (/INSERT INTO dbo\.earnings/.test(sql)) { inserts.push(params); return [{ id: 'e' + inserts.length }]; }
        return [];
      }),
      query: jest.fn(async () => ({ rows: [] })),
    };
    return { db, inserts };
  }

  test('attributes a past paid order to the newly-linked CTV (the reported bug)', async () => {
    const { db, inserts } = makeSmartDb({
      payments: [{ id: PAYMENT, amount: 1000000, payment_date: '2026-05-17' }],
    });
    const result = await commissionEngine.backfillEarningsForClient({
      clientId: CLIENT, lob: 'dental', getDb: () => db, referralClaim: activeClaim,
    });
    expect(result).toEqual({ paymentsScanned: 1, paymentsAttributed: 1, earningsCreated: 1 });
    // 1,000,000 × 10% = 100,000 paid directly to the CTV (no pool/level split)
    expect(inserts[0]).toEqual(expect.arrayContaining([CLIENT, CTV, PAYMENT, 100000]));
  });

  test('idempotent: skips a payment that already has a ctv earning (no double-pay)', async () => {
    const { db, inserts } = makeSmartDb({
      payments: [{ id: PAYMENT, amount: 1000000, payment_date: '2026-05-17' }],
      existingCtv: [{ '?column?': 1 }],
    });
    const result = await commissionEngine.backfillEarningsForClient({
      clientId: CLIENT, lob: 'dental', getDb: () => db, referralClaim: activeClaim,
    });
    expect(result).toEqual({ paymentsScanned: 1, paymentsAttributed: 0, earningsCreated: 0 });
    expect(inserts).toHaveLength(0);
  });

  test('no-op when the client has no CTV referrer (nothing to attribute)', async () => {
    const { db } = makeSmartDb({ clientRow: { id: CLIENT, referred_by_ctv_id: null, salestaffid: null } });
    const result = await commissionEngine.backfillEarningsForClient({
      clientId: CLIENT, lob: 'dental', getDb: () => db, referralClaim: activeClaim,
    });
    expect(result).toEqual({ paymentsScanned: 0, paymentsAttributed: 0, earningsCreated: 0 });
    // must not even query payments when there is no referrer
    expect(db.queryRows).not.toHaveBeenCalledWith(expect.stringContaining('FROM payments'), expect.anything());
  });

  test('no-op when clientId or lob missing', async () => {
    const empty = { paymentsScanned: 0, paymentsAttributed: 0, earningsCreated: 0 };
    expect(await commissionEngine.backfillEarningsForClient({ clientId: null, lob: 'dental' })).toEqual(empty);
    expect(await commissionEngine.backfillEarningsForClient({ clientId: CLIENT, lob: null })).toEqual(empty);
  });
});

// Integration note: full payment hook tests in payments/__tests__ or e2e later
