import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePayment } from './usePayment';
import { fetchSaleOrders } from '@/lib/api';
import { createPayment, fetchPayments } from '@/lib/api/payments';

vi.mock('@/lib/api', () => ({
  fetchSaleOrders: vi.fn(),
}));

vi.mock('@/lib/api/payments', () => ({
  createPayment: vi.fn(),
  fetchPayments: vi.fn(),
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
        customerName: 'MÃ VĂN THÀNH - UP',
        customerPhone: '0985227087',
        amount: 1200000,
        method: 'cash',
        locationName: 'TGroup 1',
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

    expect(fetchPayments).toHaveBeenCalledWith(undefined, 'payments', undefined);
    expect(result.current.payments[0]).toEqual(expect.objectContaining({
      id: 'payment-1',
      recordId: 'saleorder-1',
      recordName: 'SO-1',
      amount: 1200000,
      status: 'completed',
      customerName: 'MÃ VĂN THÀNH - UP',
      customerPhone: '0985227087',
      locationName: 'TGroup 1',
    }));
  });

  it('filters canonical payment rows by customer name', async () => {
    vi.mocked(fetchPayments).mockResolvedValue({
      totalItems: 1,
      items: [{
        id: 'payment-1',
        customerId: 'customer-1',
        customerName: 'MÃ VĂN THÀNH - UP',
        customerPhone: '0985227087',
        amount: 2109000,
        method: 'cash',
        paymentDate: '2026-03-21',
        referenceCode: 'CUST.IN/2026/103918',
        status: 'posted',
        createdAt: '2026-03-21T00:00:00.000Z',
        notes: 'TGL6',
        allocations: [],
      }],
    });

    const { result } = renderHook(() => usePayment());

    await waitFor(() => expect(result.current.payments).toHaveLength(1));

    act(() => {
      result.current.setSearchTerm('ma van thanh');
    });

    await waitFor(() => expect(result.current.payments).toHaveLength(1));

    await waitFor(() => {
      expect(fetchPayments).toHaveBeenLastCalledWith(undefined, 'payments', 'ma van thanh');
    });
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
