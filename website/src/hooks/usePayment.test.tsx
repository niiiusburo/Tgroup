import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePayment } from './usePayment';
import { fetchSaleOrders } from '@/lib/api';
import { createPayment, fetchPayments, confirmPayment } from '@/lib/api/payments';

vi.mock('@/lib/api', () => ({
  fetchSaleOrders: vi.fn(),
}));

vi.mock('@/lib/api/payments', () => ({
  createPayment: vi.fn(),
  fetchPayments: vi.fn(),
  confirmPayment: vi.fn(),
}));

describe('usePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSaleOrders).mockResolvedValue({ items: [], totalItems: 0 });
  });

  it('uses the canonical payment API for payment history when it is available', async () => {
    vi.mocked(fetchPayments).mockResolvedValue({
      totalItems: 1,
      items: [{
        id: 'payment-1',
        customerId: 'customer-1',
        amount: 1200000,
        method: 'cash',
        paymentDate: '2026-05-02',
        referenceCode: 'CUST.IN/2026/1',
        status: 'posted',
        createdAt: '2026-05-02T00:00:00.000Z',
        notes: 'cash payment',
        allocations: [{
          id: 'allocation-1',
          invoiceId: 'saleorder-1',
          invoiceName: 'SO-1',
          invoiceCode: 'SO-1',
          allocatedAmount: 1200000,
        }],
      }],
    });

    const { result } = renderHook(() => usePayment());

    await waitFor(() => expect(result.current.payments).toHaveLength(1));

    expect(fetchPayments).toHaveBeenCalledWith(undefined, 'payments');
    expect(result.current.payments[0]).toEqual(expect.objectContaining({
      id: 'payment-1',
      recordId: 'saleorder-1',
      recordName: 'SO-1',
      amount: 1200000,
      status: 'completed',
    }));
  });

  it('confirms a payment and refreshes the list', async () => {
    vi.mocked(fetchPayments)
      .mockResolvedValueOnce({
        totalItems: 1,
        items: [{
          id: 'payment-1',
          customerId: 'customer-1',
          amount: 1200000,
          method: 'cash',
          paymentDate: '2026-05-02',
          referenceCode: 'CUST.IN/2026/1',
          status: 'posted',
          createdAt: '2026-05-02T00:00:00.000Z',
          notes: 'cash payment',
          allocations: [],
        }],
      })
      .mockResolvedValueOnce({
        totalItems: 1,
        items: [{
          id: 'payment-1',
          customerId: 'customer-1',
          amount: 1200000,
          method: 'cash',
          paymentDate: '2026-05-02',
          referenceCode: 'CUST.IN/2026/1',
          status: 'confirmed',
          createdAt: '2026-05-02T00:00:00.000Z',
          notes: 'cash payment',
          confirmedAt: '2026-05-07T00:00:00.000Z',
          confirmedBy: 'employee-1',
          allocations: [],
        }],
      });
    vi.mocked(confirmPayment).mockResolvedValue({
      id: 'payment-1',
      customerId: 'customer-1',
      amount: 1200000,
      method: 'cash',
      paymentDate: '2026-05-02',
      status: 'confirmed',
      createdAt: '2026-05-02T00:00:00.000Z',
      confirmedAt: '2026-05-07T00:00:00.000Z',
      confirmedBy: 'employee-1',
    });

    const { result } = renderHook(() => usePayment());

    await waitFor(() => expect(result.current.payments).toHaveLength(1));
    expect(result.current.payments[0].status).toBe('completed');

    await act(async () => {
      await result.current.confirmPayment('payment-1', true);
    });

    expect(confirmPayment).toHaveBeenCalledWith('payment-1', { confirmed: true, notes: undefined });
    expect(fetchPayments).toHaveBeenCalledTimes(2);
    expect(result.current.payments[0].status).toBe('confirmed');
  });

  it('refreshes payment history after a wallet top-up', async () => {
    vi.mocked(fetchPayments)
      .mockResolvedValueOnce({ totalItems: 0, items: [] })
      .mockResolvedValueOnce({
        totalItems: 1,
        items: [{
          id: 'deposit-1',
          customerId: 'customer-1',
          amount: 500000,
          method: 'cash',
          depositType: 'deposit',
          paymentDate: '2026-05-02',
          status: 'posted',
          createdAt: '2026-05-02T00:00:00.000Z',
          allocations: [],
        }],
      });
    vi.mocked(createPayment).mockResolvedValue({
      id: 'deposit-1',
      customerId: 'customer-1',
      amount: 500000,
      method: 'cash',
      depositType: 'deposit',
      paymentDate: '2026-05-02',
      status: 'posted',
      createdAt: '2026-05-02T00:00:00.000Z',
      allocations: [],
    });

    const { result } = renderHook(() => usePayment());

    await waitFor(() => expect(fetchPayments).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.topUpWallet({
        customerId: 'customer-1',
        amount: 500000,
        method: 'cash',
        date: '2026-05-02',
        note: 'counter top-up',
      });
    });

    expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-1',
      amount: 500000,
      method: 'cash',
      depositType: 'deposit',
    }));
    expect(fetchPayments).toHaveBeenCalledTimes(2);
  });
});
