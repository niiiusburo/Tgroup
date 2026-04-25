import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useServices } from './useServices';

vi.mock('@/lib/api', () => ({
  fetchSaleOrders: vi.fn(() =>
    Promise.resolve({
      offset: 0,
      limit: 500,
      totalItems: 1,
      items: [{
        id: 'order-id',
        name: 'SO12763',
        partnerid: 'customer-id',
        partnername: 'Tạ Thị Minh Huệ',
        productname: 'Niềng Mắc Cài Kim Loại Tiêu Chuẩn',
        state: 'sale',
        amounttotal: '1000000',
        totalpaid: '0',
        residual: '0',
        datecreated: '2024-05-26T00:00:00.000Z',
      }],
      aggregates: { total: 1 },
    })
  ),
  createSaleOrder: vi.fn(),
  updateSaleOrder: vi.fn(),
  updateSaleOrderState: vi.fn(),
}));

describe('useServices payment state mapping', () => {
  it('trusts explicit zero totalpaid instead of inferring fully paid from stale zero residual', async () => {
    const { result } = renderHook(() => useServices(undefined, 'customer-id'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.records[0]).toMatchObject({
      id: 'order-id',
      totalCost: 1000000,
      paidAmount: 0,
      residual: 0,
    });
  });
});
