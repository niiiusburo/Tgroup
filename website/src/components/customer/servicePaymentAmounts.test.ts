import { describe, expect, it } from 'vitest';
import { resolveSaleOrderLinePayment } from './servicePaymentAmounts';

describe('resolveSaleOrderLinePayment', () => {
  it('uses allocated payments when line amountpaid is a zero string', () => {
    const result = resolveSaleOrderLinePayment({
      amountpaid: '0.00',
      amountresidual: '0.00',
      paid_amount: '700000.00',
      pricetotal: '28000000.00',
      so_residual: '27300000.00',
      so_totalpaid: '0.00',
    });

    expect(result).toEqual({
      paidAmount: 700000,
      residual: 27300000,
    });
  });

  it('infers paid amount from total minus residual when paid fields are stale', () => {
    const result = resolveSaleOrderLinePayment({
      amountpaid: '0.00',
      amountresidual: null,
      paid_amount: null,
      pricetotal: '300000.00',
      so_residual: '0.00',
      so_totalpaid: '0.00',
    });

    expect(result).toEqual({
      paidAmount: 300000,
      residual: 0,
    });
  });
});
