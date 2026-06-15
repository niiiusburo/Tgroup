'use strict';

const { fetchSaleOrderById } = require('../fetchSaleOrderById');

describe('fetchSaleOrderById ctv_id authority', () => {
  it('SELECT exposes so.ctv_id, not partners.referred_by_ctv_id', async () => {
    const q = jest.fn().mockResolvedValue([]);
    await fetchSaleOrderById('order-1', q);

    expect(q).toHaveBeenCalledTimes(1);
    const sql = q.mock.calls[0][0];
    expect(sql).toMatch(/so\.ctv_id\s+AS\s+ctv_id/i);
    expect(sql).not.toMatch(/p\.referred_by_ctv_id\s+AS\s+ctv_id/i);
  });
});