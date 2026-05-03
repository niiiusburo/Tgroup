import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeposits } from './useDeposits';
import {
  createPayment,
  fetchCustomerBalance,
  fetchDepositUsage,
  fetchDeposits,
} from '@/lib/api';

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
    }));
    expect(fetchDeposits).toHaveBeenCalledTimes(2);
    expect(fetchDepositUsage).toHaveBeenCalledTimes(2);
    expect(fetchCustomerBalance).toHaveBeenCalledTimes(2);
  });
});
