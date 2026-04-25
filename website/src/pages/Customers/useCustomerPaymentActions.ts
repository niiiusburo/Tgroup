import { useCallback } from 'react';
import type { PaymentFormData } from '@/components/payment/PaymentForm';
import type { UseCustomerPaymentsResult } from '@/hooks/useCustomerPayments';

type MaybePromise<T> = T | Promise<T>;
type RefreshAction = () => MaybePromise<void>;

interface UseCustomerPaymentActionsOptions {
  readonly addPayment: UseCustomerPaymentsResult['addPayment'];
  readonly refetchProfile: RefreshAction;
  readonly refetchPayments: RefreshAction;
  readonly loadDeposits: (customerId: string) => MaybePromise<void>;
  readonly refetchServices: RefreshAction;
  readonly loadSaleOrderLines: RefreshAction;
}

export function useCustomerPaymentActions({
  addPayment,
  refetchProfile,
  refetchPayments,
  loadDeposits,
  refetchServices,
  loadSaleOrderLines,
}: UseCustomerPaymentActionsOptions) {
  return useCallback(
    async (data: PaymentFormData) => {
      await addPayment({
        customerId: data.customerId,
        amount: data.amount,
        method: data.method,
        notes: data.notes,
        paymentDate: data.paymentDate,
        referenceCode: data.referenceCode,
        depositUsed: data.sources?.depositAmount,
        cashAmount: data.sources?.cashAmount,
        bankAmount: data.sources?.bankAmount,
        allocations: data.allocations?.map((a) => ({
          invoice_id: a.invoiceId,
          dotkham_id: a.dotkhamId,
          allocated_amount: a.allocatedAmount,
        })),
      });

      await Promise.all([
        Promise.resolve(refetchProfile()),
        Promise.resolve(refetchPayments()),
        Promise.resolve(loadDeposits(data.customerId)),
        Promise.resolve(refetchServices()),
        Promise.resolve(loadSaleOrderLines()),
      ]);
    },
    [
      addPayment,
      refetchProfile,
      refetchPayments,
      loadDeposits,
      refetchServices,
      loadSaleOrderLines,
    ],
  );
}
