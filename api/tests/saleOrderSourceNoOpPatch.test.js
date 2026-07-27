/**
 * INV-026 no-op contract for PATCH /api/SaleOrders/:id.
 *
 * Resubmitting the CURRENT source with no other field is a no-op, not an error. It used to
 * fall through to 400 "No fields to update", which made an idempotent PATCH (retry, autosave,
 * unchanged form resubmit) look like a client error — and did so on locked orders too, where
 * it read as "the lock rejected me" when nothing was being changed at all.
 *
 * Kept out of saleOrderSourceImmutability.test.js, which is already an oversized module.
 */

jest.mock('../src/db', () => {
  const query = jest.fn();
  return {
    query,
    withTransaction: jest.fn(async (work) => work(query)),
  };
});

const { query } = require('../src/db');
const { updateSaleOrder } = require('../src/routes/saleOrders/updateSaleOrder');
const { getOpenPeriodStart } = require('../src/lib/saleOrderSourceLock');

const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function responseDouble() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('PATCH sale order: source-only no-op', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks does not drain mockResolvedValueOnce queues: an unconsumed value would
    // leak into the next test and shift its assertions. Reset explicitly.
    query.mockReset();
  });

  it.each([
    ['locked', { totalpaid: 100, datestart: '2026-06-01' }],
    ['unlocked', { totalpaid: 0, datestart: getOpenPeriodStart() }],
  ])('returns the unchanged order on a %s order, with zero write and zero audit', async (_l, state) => {
    query
      .mockResolvedValueOnce([{
        id: ORDER_ID,
        order_sourceid: SOURCE_A,
        totalpaid: state.totalpaid,
        datestart: state.datestart,
        datecreated: state.datestart,
        isdeleted: false,
      }])
      .mockResolvedValueOnce([{ totalpaid: state.totalpaid }])
      .mockResolvedValueOnce([{ id: ORDER_ID, sourceid: SOURCE_A, totalpaid: state.totalpaid }]);

    const res = responseDouble();
    await updateSaleOrder({ params: { id: ORDER_ID }, body: { sourceid: SOURCE_A } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: ORDER_ID, sourceid: SOURCE_A }),
    );
    expect(query.mock.calls.some(([sql]) => /UPDATE\s+saleorders/i.test(sql))).toBe(false);
    expect(query.mock.calls.some(([sql]) => /INSERT INTO dbo\.source_change_audit/i.test(sql)))
      .toBe(false);
  });

  it('still rejects a genuinely empty PATCH with 400', async () => {
    const res = responseDouble();
    await updateSaleOrder({ params: { id: ORDER_ID }, body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No fields to update' });
  });
});
