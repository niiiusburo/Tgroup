'use strict';

/**
 * Regression guard for INV-003 (payment.amount.not-exceeding-residual).
 *
 * Two holes existed in validateAllocationResidual and both are covered here:
 *
 *  1. allocations were never summed against the payment they belong to, so a
 *     payment of 10M could carry an allocation of 20M. On nk this left 8 rows
 *     whose allocated_amount equalled the whole order total instead of that
 *     payment's share (87.4% of the over-allocated rows matched amounttotal).
 *
 *  2. multiple allocations pointing at the SAME target were each checked against
 *     that target's residual individually, so [5M, 5M] both passed against a 10M
 *     residual even though together they needed 10M of a residual being consumed
 *     twice.
 *
 * The helper takes an injectable `queryable`, so these run without a database.
 */

const {
  sumAllocations,
  validateAllocationResidual,
} = require('../src/routes/payments/helpers');

// Minimal stand-in for db.query: resolves residuals from a fixture map.
function fakeQueryable({ invoices = {}, dotkhams = {} } = {}) {
  return async (sql, params) => {
    const id = params[0];
    if (sql.includes('FROM saleorders')) {
      return id in invoices ? [{ residual: invoices[id] }] : [];
    }
    if (sql.includes('FROM dotkhams')) {
      return id in dotkhams ? [{ amountresidual: dotkhams[id] }] : [];
    }
    throw new Error(`unexpected SQL in test: ${sql}`);
  };
}

describe('sumAllocations', () => {
  it('totals allocated_amount across allocations', () => {
    expect(sumAllocations([
      { invoice_id: 'inv-1', allocated_amount: 100 },
      { invoice_id: 'inv-2', allocated_amount: '250.5' },
    ])).toBe(350.5);
  });

  it('treats a non-array as zero', () => {
    expect(sumAllocations(undefined)).toBe(0);
    expect(sumAllocations(null)).toBe(0);
  });

  it('ignores unparseable amounts rather than producing NaN', () => {
    expect(sumAllocations([
      { invoice_id: 'inv-1', allocated_amount: 100 },
      { invoice_id: 'inv-2', allocated_amount: null },
    ])).toBe(100);
  });

  // Must mirror the insert loop in POST /Payments, which skips allocations with no
  // target — counting them would reject a payment over a row never written.
  it('excludes allocations that would not be persisted', () => {
    expect(sumAllocations([
      { invoice_id: 'inv-1', allocated_amount: 100 },
      { invoice_id: null, dotkham_id: null, allocated_amount: 999 },
    ])).toBe(100);
  });
});

describe('validateAllocationResidual — guard 1: allocations vs the payment amount', () => {
  const queryable = fakeQueryable({ invoices: { 'inv-1': 1_000_000_000 } });

  it('rejects allocations totalling more than the payment', async () => {
    const err = await validateAllocationResidual(
      [{ invoice_id: 'inv-1', allocated_amount: 20_000_000 }],
      queryable,
      10_000_000
    );
    expect(err).toMatch(/exceeds the payment amount/);
  });

  it('rejects the real nk shape: one allocation equal to the whole order total', async () => {
    // payment is one installment of 3,000,000 but the allocation carries the
    // order total of 9,000,000 — the exact corruption fingerprint found on nk.
    const err = await validateAllocationResidual(
      [{ invoice_id: 'inv-1', allocated_amount: 9_000_000 }],
      queryable,
      3_000_000
    );
    expect(err).toMatch(/exceeds the payment amount/);
  });

  it('accepts allocations equal to the payment amount', async () => {
    const err = await validateAllocationResidual(
      [{ invoice_id: 'inv-1', allocated_amount: 10_000_000 }],
      queryable,
      10_000_000
    );
    expect(err).toBeNull();
  });

  it('accepts allocations below the payment amount (partial allocation)', async () => {
    const err = await validateAllocationResidual(
      [{ invoice_id: 'inv-1', allocated_amount: 4_000_000 }],
      queryable,
      10_000_000
    );
    expect(err).toBeNull();
  });

  it('tolerates sub-cent floating point drift', async () => {
    const err = await validateAllocationResidual(
      [{ invoice_id: 'inv-1', allocated_amount: 10_000_000.005 }],
      queryable,
      10_000_000
    );
    expect(err).toBeNull();
  });

  it('skips the payment-total guard when no amount is supplied (back-compat)', async () => {
    const err = await validateAllocationResidual(
      [{ invoice_id: 'inv-1', allocated_amount: 20_000_000 }],
      queryable
    );
    expect(err).toBeNull();
  });
});

describe('validateAllocationResidual — guard 2: same-target allocations are summed', () => {
  it('rejects two allocations that together exceed one invoice residual', async () => {
    const queryable = fakeQueryable({ invoices: { 'inv-1': 10_000_000 } });
    const err = await validateAllocationResidual(
      [
        { invoice_id: 'inv-1', allocated_amount: 6_000_000 },
        { invoice_id: 'inv-1', allocated_amount: 6_000_000 },
      ],
      queryable,
      12_000_000
    );
    expect(err).toMatch(/exceeds outstanding balance/);
  });

  it('accepts two allocations that together fit the residual', async () => {
    const queryable = fakeQueryable({ invoices: { 'inv-1': 10_000_000 } });
    const err = await validateAllocationResidual(
      [
        { invoice_id: 'inv-1', allocated_amount: 4_000_000 },
        { invoice_id: 'inv-1', allocated_amount: 6_000_000 },
      ],
      queryable,
      10_000_000
    );
    expect(err).toBeNull();
  });

  it('checks each distinct target against its own residual', async () => {
    const queryable = fakeQueryable({ invoices: { 'inv-1': 10_000_000, 'inv-2': 1_000_000 } });
    const err = await validateAllocationResidual(
      [
        { invoice_id: 'inv-1', allocated_amount: 5_000_000 },
        { invoice_id: 'inv-2', allocated_amount: 5_000_000 },
      ],
      queryable,
      10_000_000
    );
    expect(err).toMatch(/exceeds outstanding balance/);
  });

  it('sums dotkham allocations the same way', async () => {
    const queryable = fakeQueryable({ dotkhams: { 'dk-1': 5_000_000 } });
    const err = await validateAllocationResidual(
      [
        { dotkham_id: 'dk-1', allocated_amount: 3_000_000 },
        { dotkham_id: 'dk-1', allocated_amount: 3_000_000 },
      ],
      queryable,
      6_000_000
    );
    expect(err).toMatch(/exceeds outstanding balance/);
  });

  it('reports a missing invoice instead of silently passing', async () => {
    const queryable = fakeQueryable({ invoices: {} });
    const err = await validateAllocationResidual(
      [{ invoice_id: 'nope', allocated_amount: 1 }],
      queryable,
      1
    );
    expect(err).toMatch(/not found/);
  });

  it('ignores rows with no target or no amount', async () => {
    const queryable = fakeQueryable({ invoices: { 'inv-1': 10_000_000 } });
    const err = await validateAllocationResidual(
      [
        { invoice_id: 'inv-1', allocated_amount: 1_000_000 },
        { invoice_id: null, dotkham_id: null, allocated_amount: 500 },
        { invoice_id: 'inv-1', allocated_amount: null },
      ],
      queryable,
      1_000_000
    );
    expect(err).toBeNull();
  });
});
