'use strict';

const { reverseServiceLine, ServiceReversalError } = require('../serviceReversal');

function makeClient({
  lineRows = [{ id: 'line-1', orderid: 'order-1' }],
  activeRows = [{ id: 'line-1' }],
  allocations = [],
  paidOutRows = [],
  mixedRows = [],
  originalEarnings = [],
} = {}) {
  const query = jest.fn(async (sql, params = []) => {
    if (/FROM dbo\.saleorderlines sol/.test(sql)) return { rows: lineRows };
    if (/FROM dbo\.saleorderlines\s+WHERE orderid/.test(sql)) return { rows: activeRows };
    if (/FROM dbo\.payment_allocations pa\s+JOIN dbo\.payments p/.test(sql)) return { rows: allocations };
    if (/FROM dbo\.earnings\s+WHERE payment_id = ANY/.test(sql)) return { rows: paidOutRows };
    if (/FROM dbo\.payment_allocations\s+WHERE payment_id = ANY/.test(sql)) return { rows: mixedRows };
    if (/FROM dbo\.earnings WHERE payment_id = \$1 AND amount > 0/.test(sql)) return { rows: originalEarnings };
    if (/INSERT INTO dbo\.earnings/.test(sql)) return { rows: [{ id: 'rev-1', amount: params[6], level: params[5], recipient_partner_id: params[1] }] };
    if (/DELETE FROM dbo\.payment_allocations/.test(sql)) return { rows: [] };
    if (/UPDATE dbo\.saleorders SET residual/.test(sql)) return { rows: [] };
    if (/UPDATE dbo\.payments/.test(sql)) return { rows: [...new Set(allocations.map((a) => a.payment_id))].map((id) => ({ id })) };
    if (/UPDATE dbo\.saleorderlines/.test(sql)) return { rows: [{ id: 'line-1', orderid: 'order-1' }] };
    if (/UPDATE dbo\.saleorders\s+SET isdeleted/.test(sql)) return { rows: [] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  return { query };
}

describe('reverseServiceLine', () => {
  test('soft-deletes an unpaid service line and its empty parent order', async () => {
    const client = makeClient();

    const result = await reverseServiceLine({ lineId: 'line-1', lob: 'cosmetic', txClient: client });

    expect(result).toMatchObject({
      success: true,
      id: 'line-1',
      orderId: 'order-1',
      deletedOrder: true,
      voidedPayments: [],
      reversedAllocationTotal: 0,
    });
    expect(client.query.mock.calls.some(([sql]) => /UPDATE dbo\.saleorderlines/.test(sql))).toBe(true);
    expect(client.query.mock.calls.some(([sql]) => /UPDATE dbo\.payments/.test(sql))).toBe(false);
  });

  test('voids linked single-invoice payments and writes earnings reversals before deleting the service', async () => {
    const client = makeClient({
      allocations: [{ payment_id: 'pay-1', invoice_id: 'order-1', dotkham_id: null, allocated_amount: '6000000' }],
      originalEarnings: [
        { client_id: 'client-1', recipient_partner_id: 'ctv-1', service_line_id: 'line-1', source: 'ctv', level: 0, amount: '1999800' },
      ],
    });

    const result = await reverseServiceLine({ lineId: 'line-1', lob: 'cosmetic', txClient: client });

    expect(result).toMatchObject({
      voidedPayments: ['pay-1'],
      reversedAllocationTotal: 6000000,
      reversedEarningsCount: 1,
      deletedOrder: true,
    });
    expect(client.query.mock.calls.some(([sql]) => /INSERT INTO dbo\.earnings/.test(sql))).toBe(true);
    expect(client.query.mock.calls.some(([sql]) => /DELETE FROM dbo\.payment_allocations/.test(sql))).toBe(true);
    expect(client.query.mock.calls.some(([sql]) => /UPDATE dbo\.payments/.test(sql))).toBe(true);
  });

  test('blocks reversal when linked commission has already been paid out', async () => {
    const client = makeClient({
      allocations: [{ payment_id: 'pay-1', invoice_id: 'order-1', dotkham_id: null, allocated_amount: '6000000' }],
      paidOutRows: [{ payment_id: 'pay-1' }],
    });

    await expect(reverseServiceLine({ lineId: 'line-1', lob: 'cosmetic', txClient: client }))
      .rejects.toMatchObject({
        name: 'ServiceReversalError',
        status: 409,
        code: 'B_COMMISSION_PAID_OUT',
      });
    expect(client.query.mock.calls.some(([sql]) => /UPDATE dbo\.saleorderlines/.test(sql))).toBe(false);
  });

  test('blocks auto-reversal when the paid order still has other active service lines', async () => {
    const client = makeClient({
      activeRows: [{ id: 'line-1' }, { id: 'line-2' }],
      allocations: [{ payment_id: 'pay-1', invoice_id: 'order-1', dotkham_id: null, allocated_amount: '3000000' }],
    });

    let thrown;
    try {
      await reverseServiceLine({ lineId: 'line-1', lob: 'cosmetic', txClient: client });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(ServiceReversalError);
    expect(thrown).toMatchObject({ code: 'B_SERVICE_PAYMENT_REQUIRES_ORDER_VOID' });
  });

  test('blocks auto-reversal for mixed payment allocations', async () => {
    const client = makeClient({
      allocations: [{ payment_id: 'pay-1', invoice_id: 'order-1', dotkham_id: null, allocated_amount: '3000000' }],
      mixedRows: [{ payment_id: 'pay-1', invoice_id: 'order-2', dotkham_id: null }],
    });

    await expect(reverseServiceLine({ lineId: 'line-1', lob: 'cosmetic', txClient: client }))
      .rejects.toMatchObject({ code: 'B_PAYMENT_MIXED_ALLOCATIONS' });
  });
});
