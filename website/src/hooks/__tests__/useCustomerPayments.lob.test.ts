import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomerPayments } from '../useCustomerPayments';

const mockBusinessUnit = vi.hoisted(() => ({
  currentLOB: 'cosmetic' as 'dental' | 'cosmetic',
}));

vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({
    currentLOB: mockBusinessUnit.currentLOB,
    setCurrentLOB: vi.fn(),
    availableLOBs: ['dental', 'cosmetic'],
    isMultiLOBUser: true,
    isCosmeticEnabled: true,
  }),
}));

vi.mock('@/lib/api', () => ({
  fetchPayments: vi.fn(),
  createPayment: vi.fn(),
  voidPayment: vi.fn(),
  deletePayment: vi.fn(),
}));

import { createPayment, deletePayment, fetchPayments, voidPayment } from '@/lib/api';

describe('useCustomerPayments cosmetic LOB mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBusinessUnit.currentLOB = 'cosmetic';
    vi.mocked(fetchPayments).mockResolvedValue({ items: [], totalItems: 0 });
    vi.mocked(createPayment).mockResolvedValue({
      id: 'payment-1',
      customerId: 'customer-1',
      amount: 850000,
      method: 'cash',
      status: 'posted',
      createdAt: '2026-05-22T00:00:00.000Z',
      allocations: [],
    });
    vi.mocked(voidPayment).mockResolvedValue({ success: true });
    vi.mocked(deletePayment).mockResolvedValue({ success: true });
  });

  it('creates cosmetic service payments through the cosmetic mirror route', async () => {
    const { result } = renderHook(() => useCustomerPayments('customer-1'));

    await waitFor(() => {
      expect(fetchPayments).toHaveBeenCalledWith('customer-1', 'payments', undefined, 'cosmetic');
    });

    await act(async () => {
      await result.current.addPayment({
        customerId: 'customer-1',
        amount: 850000,
        method: 'cash',
        allocations: [{ invoice_id: 'saleorder-1', allocated_amount: 850000 }],
      });
    });

    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'customer-1',
        amount: 850000,
        method: 'cash',
      }),
      'cosmetic',
    );
  });

  it('voids and deletes customer payments through the cosmetic mirror route', async () => {
    vi.mocked(fetchPayments).mockResolvedValue({
      totalItems: 1,
      items: [{
        id: 'payment-1',
        customerId: 'customer-1',
        amount: 850000,
        method: 'cash',
        status: 'posted',
        createdAt: '2026-05-22T00:00:00.000Z',
        allocations: [],
      }],
    });
    const { result } = renderHook(() => useCustomerPayments('customer-1'));

    await waitFor(() => expect(result.current.payments).toHaveLength(1));

    await act(async () => {
      await result.current.voidPaymentById('payment-1', 'duplicate');
      await result.current.deletePaymentById('payment-1');
    });

    expect(voidPayment).toHaveBeenCalledWith('payment-1', 'duplicate', 'cosmetic');
    expect(deletePayment).toHaveBeenCalledWith('payment-1', 'cosmetic');
  });
});
