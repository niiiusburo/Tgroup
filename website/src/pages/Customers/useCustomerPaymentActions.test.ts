import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCustomerPaymentActions } from './useCustomerPaymentActions';
import type { PaymentFormData } from '@/components/payment/PaymentForm';

describe('useCustomerPaymentActions', () => {
  it('refreshes the visible service history after recording a payment', async () => {
    const addPayment = vi.fn().mockResolvedValue({ id: 'payment-1' });
    const refetchProfile = vi.fn().mockResolvedValue(undefined);
    const refetchPayments = vi.fn().mockResolvedValue(undefined);
    const loadDeposits = vi.fn().mockResolvedValue(undefined);
    const refetchServices = vi.fn().mockResolvedValue(undefined);
    const loadSaleOrderLines = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useCustomerPaymentActions({
        addPayment,
        refetchProfile,
        refetchPayments,
        loadDeposits,
        refetchServices,
        loadSaleOrderLines,
      }),
    );

    const payment: PaymentFormData = {
      customerId: 'customer-1',
      amount: 1200000,
      method: 'cash',
      notes: 'partial payment',
      paymentDate: '2026-04-25',
      referenceCode: 'CUST.IN/2026/1',
      sources: {
        depositAmount: 0,
        cashAmount: 1200000,
        bankAmount: 0,
      },
      allocations: [
        {
          invoiceId: 'saleorder-1',
          allocatedAmount: 1200000,
        },
      ],
    };

    await act(async () => {
      await result.current(payment);
    });

    expect(addPayment).toHaveBeenCalledWith({
      customerId: 'customer-1',
      amount: 1200000,
      method: 'cash',
      notes: 'partial payment',
      paymentDate: '2026-04-25',
      referenceCode: 'CUST.IN/2026/1',
      depositUsed: 0,
      cashAmount: 1200000,
      bankAmount: 0,
      allocations: [
        {
          invoice_id: 'saleorder-1',
          dotkham_id: undefined,
          allocated_amount: 1200000,
        },
      ],
    });
    expect(refetchProfile).toHaveBeenCalledTimes(1);
    expect(refetchPayments).toHaveBeenCalledTimes(1);
    expect(loadDeposits).toHaveBeenCalledWith('customer-1');
    expect(refetchServices).toHaveBeenCalledTimes(1);
    expect(loadSaleOrderLines).toHaveBeenCalledTimes(1);
  });
});
