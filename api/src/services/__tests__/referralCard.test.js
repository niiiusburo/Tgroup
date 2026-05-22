'use strict';

const { createReferralStartCard } = require('../referralCard');

describe('createReferralStartCard', () => {
  test('throws REFERRAL_PRODUCT_NOT_CONFIGURED when settings has no product id', async () => {
    const q = jest.fn(async (sql) => {
      if (/referral_start_product_id/.test(sql)) return [{ referral_start_product_id: null }];
      return [];
    });
    await expect(createReferralStartCard({ clientId: 'c1', lob: 'dental', runQuery: q }))
      .rejects.toThrow('REFERRAL_PRODUCT_NOT_CONFIGURED');
  });

  test('inserts a saleorder + saleorderline for the referral product', async () => {
    const calls = [];
    const q = jest.fn(async (sql, params) => {
      calls.push(sql);
      if (/referral_start_product_id/.test(sql)) return [{ referral_start_product_id: 'prod-ref' }];
      if (/nextval/.test(sql)) return [{ seq: 7 }];
      return [{}];
    });
    await createReferralStartCard({ clientId: 'c1', lob: 'dental', runQuery: q });
    expect(calls.some((s) => /INSERT INTO saleorders/.test(s))).toBe(true);
    expect(calls.some((s) => /INSERT INTO saleorderlines/.test(s))).toBe(true);
  });
});
