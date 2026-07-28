'use strict';

/**
 * Money integrity guards for INV-003 / INV-012 / AUD-006.
 *
 * Covers:
 *  1. allocations vs payment amount (PR #70 sum guard)
 *  2. same-target multi-alloc summation (PR #70)
 *  3. residual SELECT ... FOR UPDATE inside the payment transaction (AUD-006 TOCTOU)
 */

const {
  sumAllocations,
  validateAllocationResidual,
} = require('../src/routes/payments/helpers');

function fakeQueryable({ invoices = {}, dotkhams = {}, onSql } = {}) {
  return async (sql, params) => {
    if (typeof onSql === 'function') onSql(sql, params);
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

  it('excludes allocations that would not be persisted', () => {
    expect(sumAllocations([
      { invoice_id: 'inv-1', allocated_amount: 100 },
      { invoice_id: null, dotkham_id: null, allocated_amount: 999 },
    ])).toBe(100);
  });
});

describe('validateAllocationResidual — payment amount guard', () => {
  const queryable = fakeQueryable({ invoices: { 'inv-1': 1_000_000_000 } });

  it('rejects allocations totalling more than the payment', async () => {
    const err = await validateAllocationResidual(
      [{ invoice_id: 'inv-1', allocated_amount: 20_000_000 }],
      queryable,
      10_000_000
    );
    expect(err).toMatch(/exceeds the payment amount/);
  });

  it('rejects allocation equal to whole order total against a smaller installment', async () => {
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

  it('accepts partial allocation below the payment amount', async () => {
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

describe('validateAllocationResidual — same-target multi-alloc sum', () => {
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

describe('validateAllocationResidual — AUD-006 FOR UPDATE lock', () => {
  it('SELECT residual FOR UPDATE on saleorders inside the check', async () => {
    const sqls = [];
    const queryable = fakeQueryable({
      invoices: { 'inv-1': 5_000_000 },
      onSql: (sql) => sqls.push(sql),
    });

    const err = await validateAllocationResidual(
      [{ invoice_id: 'inv-1', allocated_amount: 1_000_000 }],
      queryable,
      1_000_000
    );

    expect(err).toBeNull();
    expect(sqls.some((sql) =>
      /SELECT\s+residual\s+FROM\s+saleorders/i.test(sql) && /FOR\s+UPDATE/i.test(sql)
    )).toBe(true);
  });

  it('SELECT amountresidual FOR UPDATE on dotkhams inside the check', async () => {
    const sqls = [];
    const queryable = fakeQueryable({
      dotkhams: { 'dk-1': 5_000_000 },
      onSql: (sql) => sqls.push(sql),
    });

    const err = await validateAllocationResidual(
      [{ dotkham_id: 'dk-1', allocated_amount: 1_000_000 }],
      queryable,
      1_000_000
    );

    expect(err).toBeNull();
    expect(sqls.some((sql) =>
      /SELECT\s+amountresidual\s+FROM\s+dotkhams/i.test(sql) && /FOR\s+UPDATE/i.test(sql)
    )).toBe(true);
  });

  it('locks distinct targets in stable sorted order to reduce deadlock risk', async () => {
    const order = [];
    const queryable = fakeQueryable({
      invoices: {
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb': 10_000_000,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa': 10_000_000,
      },
      onSql: (sql, params) => {
        if (/FROM\s+saleorders/i.test(sql)) order.push(params[0]);
      },
    });

    const err = await validateAllocationResidual(
      [
        { invoice_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', allocated_amount: 1 },
        { invoice_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', allocated_amount: 1 },
      ],
      queryable,
      2
    );

    expect(err).toBeNull();
    expect(order).toEqual([
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    ]);
  });
});
