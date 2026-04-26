import type { ApiSaleOrderLine } from '@/lib/api';

type PaymentAmountLine = Pick<
  ApiSaleOrderLine,
  | 'amountpaid'
  | 'amountPaid'
  | 'amountresidual'
  | 'amountResidual'
  | 'paid_amount'
  | 'pricetotal'
  | 'priceTotal'
  | 'so_residual'
  | 'so_totalpaid'
>;

function firstDefined<T>(...values: Array<T | null | undefined>): T | undefined {
  return values.find((value): value is T => value !== null && value !== undefined);
}

function money(value: string | null | undefined): number {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolveSaleOrderLinePayment(line: PaymentAmountLine) {
  const cost = money(firstDefined(line.priceTotal, line.pricetotal));
  const residual = money(firstDefined(line.so_residual, line.amountResidual, line.amountresidual));
  const paidCandidates = [
    money(line.paid_amount),
    money(firstDefined(line.amountPaid, line.amountpaid)),
    money(line.so_totalpaid),
    cost > 0 ? Math.max(0, cost - residual) : 0,
  ];
  const paidAmount = Math.max(...paidCandidates);

  return {
    paidAmount: cost > 0 ? Math.min(cost, paidAmount) : paidAmount,
    residual,
  };
}
