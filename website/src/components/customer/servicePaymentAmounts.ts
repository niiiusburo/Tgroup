import type { ApiSaleOrderLine } from '@/lib/api';

type PaymentAmountLine = Pick<
  ApiSaleOrderLine,
  'amountpaid' | 'amountresidual' | 'paid_amount' | 'pricetotal' | 'so_residual' | 'so_totalpaid'
>;

function money(value: string | null | undefined): number {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolveSaleOrderLinePayment(line: PaymentAmountLine) {
  const cost = money(line.pricetotal);
  const residual = line.so_residual != null ? money(line.so_residual) : money(line.amountresidual);
  const paidCandidates = [
    money(line.paid_amount),
    money(line.amountpaid),
    money(line.so_totalpaid),
    cost > 0 ? Math.max(0, cost - residual) : 0,
  ];
  const paidAmount = Math.max(...paidCandidates);

  return {
    paidAmount: cost > 0 ? Math.min(cost, paidAmount) : paidAmount,
    residual,
  };
}
