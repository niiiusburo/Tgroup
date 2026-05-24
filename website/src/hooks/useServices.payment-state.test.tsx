import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createSaleOrder, updateSaleOrder } from '@/lib/api';
import { useServices } from './useServices';

vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({ currentLOB: 'cosmetic' }),
}));

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
  createSaleOrder: vi.fn(() => Promise.resolve({
    id: 'created-order-id',
    name: 'Created service',
    partnerid: 'customer-id',
    partnername: 'Customer',
    productid: 'service-id',
    productname: 'Cosmetic service',
    amounttotal: '100',
    totalpaid: '0',
    residual: '100',
    state: 'sale',
    datecreated: '2026-05-23T00:00:00.000Z',
  })),
  updateSaleOrder: vi.fn(() => Promise.resolve({
    id: 'order-id',
    name: 'Updated service',
    partnerid: 'customer-id',
    partnername: 'Customer',
    productid: 'service-id',
    productname: 'Cosmetic service',
    amounttotal: '100',
    totalpaid: '0',
    residual: '100',
    state: 'sale',
    datecreated: '2026-05-23T00:00:00.000Z',
  })),
  updateSaleOrderState: vi.fn(),
}));

vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({ currentLOB: 'cosmetic' }),
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

  it('writes customer service records through the active cosmetic LOB', async () => {
    const { result } = renderHook(() => useServices(undefined, 'customer-id'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createServiceRecord({
        customerId: 'customer-id',
        customerName: 'Customer',
        customerPhone: '0900000000',
        catalogItemId: 'service-id',
        serviceName: 'Cosmetic service',
        category: 'cosmetic',
        doctorId: null,
        doctorName: '',
        locationId: 'location-id',
        locationName: 'Cosmetic location',
        totalVisits: 1,
        totalCost: 100,
        startDate: '2026-05-23',
        expectedEndDate: '2026-05-23',
        notes: '',
        toothNumbers: [],
      });
    });

    expect(createSaleOrder).toHaveBeenCalledWith(expect.any(Object), 'cosmetic');

    await act(async () => {
      await result.current.updateServiceRecord({
        id: 'order-id',
        customerId: 'customer-id',
        customerName: 'Customer',
        customerPhone: '0900000000',
        catalogItemId: 'service-id',
        serviceName: 'Cosmetic service',
        category: 'cosmetic',
        doctorId: null,
        doctorName: '',
        locationId: 'location-id',
        locationName: 'Cosmetic location',
        totalVisits: 1,
        totalCost: 100,
        startDate: '2026-05-23',
        expectedEndDate: '2026-05-23',
        notes: '',
        toothNumbers: [],
      });
    });

    expect(updateSaleOrder).toHaveBeenCalledWith('order-id', expect.any(Object), 'cosmetic');
  });
});
