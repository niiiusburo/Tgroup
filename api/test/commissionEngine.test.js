/**
 * triggerCommissionEngine — manual/admin replay wrapper.
 *
 * Rewritten (was a stale Knex-style mock calling a function the service never exported, which
 * always failed). The wrapper now delegates to backfillEarningsForClient; this exercises the
 * full attribution chain through a SQL-routing mock DB (no real Postgres).
 *
 * Run: cd api && npx jest test/commissionEngine.test.js
 */

const { triggerCommissionEngine } = require('../src/services/commissionEngine');

const CLIENT = '00000000-0000-0000-0000-0000000000c1';
const CTV = '00000000-0000-0000-0000-000000000ctv';
const PAYMENT = '00000000-0000-0000-0000-0000000000p1';
const INVOICE = '00000000-0000-0000-0000-0000000000iv';
const LINE = '00000000-0000-0000-0000-0000000000ln';
const PRODUCT = '00000000-0000-0000-0000-0000000000pr';

// Route queries by SQL fragment so the test does not depend on a brittle call-order chain.
function makeSmartDb(overrides = {}) {
  const inserts = [];
  const db = {
    queryRows: jest.fn(async (sql, params) => {
      // backfill: load client row (projection includes salestaffid)
      if (/FROM dbo\.partners WHERE id/.test(sql) && /salestaffid/.test(sql)) {
        return overrides.clientRow === null ? [] : [overrides.clientRow || { id: CLIENT, referred_by_ctv_id: CTV, salestaffid: null }];
      }
      // backfill: positive payments
      if (/FROM payments WHERE customer_id/.test(sql) && /amount > 0/.test(sql)) return overrides.payments || [];
      // backfill: idempotency check
      if (/FROM dbo\.earnings WHERE payment_id/.test(sql) && /source = 'ctv'/.test(sql)) return overrides.existingCtv || [];
      // backfill: allocations -> lines
      if (/FROM payment_allocations/.test(sql)) return [{ invoice_id: INVOICE }];
      if (/FROM dbo\.saleorderlines WHERE orderid/.test(sql)) return [{ id: LINE, productid: PRODUCT, pricetotal: 1000000 }];
      // referralClaim.getReferralClaimStatus
      if (/partners p\s+LEFT JOIN/i.test(sql) || (/referred_by_ctv_id/.test(sql) && /owner_name/i.test(sql))) {
        return [{ referred_by_ctv_id: CTV, owner_name: 'CTV Owner' }];
      }
      if (/referral_start_product_id FROM dbo\.commission_settings/.test(sql)) return [{ referral_start_product_id: null }];
      if (/MAX\(payment_date\)/.test(sql)) return [{ d: '2026-05-18' }];
      // engine: product rate, level config, chain walk, insert
      if (/commission_rate_percent FROM products/.test(sql)) return [{ commission_rate_percent: overrides.rate ?? 10 }];
      if (/FROM dbo\.commission_level_config/.test(sql)) return [{ level: 0, share_percent: 100, enabled: true }];
      if (/referred_by_ctv_id FROM dbo\.partners WHERE id/.test(sql)) return [{ referred_by_ctv_id: null }];
      if (/INSERT INTO dbo\.earnings/.test(sql)) { inserts.push(params); return [{ id: 'e' + inserts.length }]; }
      return [];
    }),
    query: jest.fn(async () => ({ rows: [] })),
  };
  return { db, inserts };
}

describe('triggerCommissionEngine (manual replay wrapper)', () => {
  it('attributes a paid client to its CTV and reports counts', async () => {
    const { db, inserts } = makeSmartDb({
      payments: [{ id: PAYMENT, amount: 1000000, payment_date: '2026-05-18' }],
    });
    const result = await triggerCommissionEngine('sl_unused', CLIENT, 'partner_unused', 'cosmetic', () => db);
    expect(result.errors).toEqual([]);
    expect(result.paymentsScanned).toBe(1);
    expect(result.paymentsProcessed).toBe(1);
    expect(result.earningsCreated).toBe(1);
    expect(inserts[0]).toEqual(expect.arrayContaining([CLIENT, CTV, PAYMENT, 100000]));
  });

  it('returns zero counts (no error) when the client has no CTV referrer', async () => {
    const { db } = makeSmartDb({ clientRow: { id: CLIENT, referred_by_ctv_id: null, salestaffid: null } });
    const result = await triggerCommissionEngine('sl', CLIENT, 'p', 'dental', () => db);
    expect(result).toEqual({ paymentsScanned: 0, paymentsProcessed: 0, earningsCreated: 0, errors: [] });
  });

  it('errors on a missing/invalid lob', async () => {
    const result = await triggerCommissionEngine('sl', CLIENT, 'p', null);
    expect(result.earningsCreated).toBe(0);
    expect(result.errors[0]).toMatch(/lob/i);
  });

  it('never throws — a DB failure is captured into errors[]', async () => {
    const db = { queryRows: jest.fn(async () => { throw new Error('db down'); }) };
    const result = await triggerCommissionEngine('sl', CLIENT, 'p', 'dental', () => db);
    expect(result.errors[0]).toMatch(/db down/);
    expect(result.earningsCreated).toBe(0);
  });
});
