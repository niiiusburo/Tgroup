import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeposits } from './useDeposits';
import {
  createPayment,
  createRefund,
  deletePayment,
  fetchCustomerBalance,
  fetchDepositUsage,
  fetchDeposits,
  updatePayment,
  voidPayment,
} from '@/lib/api';

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
  fetchDeposits: vi.fn(),
  fetchDepositUsage: vi.fn(),
  fetchCustomerBalance: vi.fn(),
  createPayment: vi.fn(),
  createRefund: vi.fn(),
  voidPayment: vi.fn(),
  updatePayment: vi.fn(),
  deletePayment: vi.fn(),
}));

describe('useDeposits mutation refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBusinessUnit.currentLOB = 'cosmetic';
    vi.mocked(fetchDeposits).mockResolvedValue({ items: [], totalItems: 0 });
    vi.mocked(fetchDepositUsage).mockResolvedValue({ items: [], totalItems: 0 });
    vi.mocked(fetchCustomerBalance).mockResolvedValue({
      id: 'customer-1',
      name: '',
      depositBalance: 0,
      outstandingBalance: 0,
      totalDeposited: 0,
      totalUsed: 0,
      totalRefunded: 0,
    });
    vi.mocked(createPayment).mockResolvedValue({
      id: 'deposit-1',
      customerId: 'customer-1',
      amount: 500000,
      method: 'cash',
      depositType: 'deposit',
      status: 'posted',
      createdAt: '2026-05-02T00:00:00.000Z',
      allocations: [],
    });
    vi.mocked(createRefund).mockResolvedValue({
      id: 'refund-1',
      customerId: 'customer-1',
      amount: -100000,
      method: 'cash',
      depositType: 'refund',
      status: 'posted',
      createdAt: '2026-05-02T00:00:00.000Z',
      allocations: [],
    });
    vi.mocked(voidPayment).mockResolvedValue({ success: true });
    vi.mocked(updatePayment).mockResolvedValue({
      id: 'deposit-1',
      customerId: 'customer-1',
      amount: 450000,
      method: 'cash',
      depositType: 'deposit',
      status: 'posted',
      createdAt: '2026-05-02T00:00:00.000Z',
      allocations: [],
    });
    vi.mocked(deletePayment).mockResolvedValue({ success: true });
  });

  it('reloads deposit rows and balance after adding a deposit', async () => {
    const { result } = renderHook(() => useDeposits());

    await act(async () => {
      await result.current.loadDeposits('customer-1');
    });
    await waitFor(() => expect(fetchDeposits).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.addDeposit('customer-1', 500000, 'cash', '2026-05-02', 'counter top-up');
    });

    expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-1',
      amount: 500000,
      method: 'cash',
      depositType: 'deposit',
    }), 'cosmetic');
    expect(fetchDeposits).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-1',
      lob: 'cosmetic',
    }));
    expect(fetchDepositUsage).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-1',
      lob: 'cosmetic',
    }));
    expect(fetchCustomerBalance).toHaveBeenCalledWith('customer-1', 'cosmetic');
    expect(fetchDeposits).toHaveBeenCalledTimes(2);
    expect(fetchDepositUsage).toHaveBeenCalledTimes(2);
    expect(fetchCustomerBalance).toHaveBeenCalledTimes(2);
  });

  it('uses cosmetic LOB for refund, void, update, and delete deposit mutations', async () => {
    const { result } = renderHook(() => useDeposits());

    await act(async () => {
      await result.current.loadDeposits('customer-1');
    });

    await act(async () => {
      await result.current.addRefund('customer-1', 100000, 'cash', '2026-05-02', 'refund note');
      await result.current.voidDeposit('deposit-1', 'duplicate');
      await result.current.editDeposit('deposit-1', { amount: 450000, method: 'cash' });
      await result.current.removeDeposit('deposit-1');
    });

    expect(createRefund).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-1',
      amount: 100000,
      method: 'cash',
    }), 'cosmetic');
    expect(voidPayment).toHaveBeenCalledWith('deposit-1', 'duplicate', 'cosmetic');
    expect(updatePayment).toHaveBeenCalledWith('deposit-1', expect.objectContaining({
      amount: 450000,
      method: 'cash',
    }), 'cosmetic');
    expect(deletePayment).toHaveBeenCalledWith('deposit-1', 'cosmetic');
  });
});
