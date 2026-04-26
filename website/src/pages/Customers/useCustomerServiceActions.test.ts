import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCustomerServiceActions } from './useCustomerServiceActions';

vi.mock('@/lib/api', () => ({
  deleteSaleOrderLine: vi.fn().mockResolvedValue({ success: true }),
}));

describe('useCustomerServiceActions', () => {
  it('refreshes visible service history after deleting a service line', async () => {
    const createServiceRecord = vi.fn().mockResolvedValue(undefined);
    const updateServiceRecord = vi.fn().mockResolvedValue(undefined);
    const loadSaleOrderLines = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useCustomerServiceActions({
        createServiceRecord,
        updateServiceRecord,
        selectedCustomerId: 'customer-1',
        hookProfile: null,
        loadSaleOrderLines,
      }),
    );

    await act(async () => {
      await result.current.handleDeleteService('line-1');
    });

    expect(loadSaleOrderLines).toHaveBeenCalledTimes(1);
  });
});
