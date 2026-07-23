import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useServices } from './useServices';
import { updateSaleOrder } from '@/lib/api';

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

  it('omits an unchanged effective source and sends only an explicit source change', async () => {
    vi.mocked(updateSaleOrder).mockResolvedValue({
      id: 'order-id',
      name: 'SO12763',
      partnerid: 'customer-id',
      partnername: 'Tạ Thị Minh Huệ',
      companyid: 'company-id',
      companyname: 'Quận 10',
      doctorid: null,
      doctorname: null,
      assistantid: null,
      assistantname: null,
      dentalaideid: null,
      dentalaidename: null,
      productid: 'product-id',
      productname: 'Điều trị',
      quantity: '1',
      unit: 'service',
      state: 'sale',
      amounttotal: '1000000',
      totalpaid: '0',
      residual: '1000000',
      datecreated: '2026-06-30T00:00:00.000Z',
      datestart: '2026-06-30',
      dateend: '2026-07-30',
      notes: null,
      tooth_numbers: null,
      tooth_comment: null,
      sourceid: 'active-source',
      sourcename: 'Hotline',
      lastupdated: null,
    });
    const { result } = renderHook(() => useServices(undefined, 'customer-id'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const input = {
      id: 'order-id',
      customerId: 'customer-id',
      customerName: 'Tạ Thị Minh Huệ',
      customerPhone: '',
      catalogItemId: 'product-id',
      serviceName: 'Điều trị',
      category: 'treatment' as const,
      doctorId: null,
      doctorName: '',
      locationId: 'company-id',
      locationName: 'Quận 10',
      totalVisits: 1,
      totalCost: 1000000,
      startDate: '2026-06-30',
      expectedEndDate: '2026-07-30',
      notes: 'Unrelated edit',
      toothNumbers: [],
      sourceId: 'historical-inherited-source',
    };

    await act(async () => {
      await result.current.updateServiceRecord({ ...input, sourceChanged: false });
    });
    const unchangedPayload = vi.mocked(updateSaleOrder).mock.calls[0][1];
    expect('sourceid' in unchangedPayload).toBe(false);

    await act(async () => {
      await result.current.updateServiceRecord({
        ...input,
        sourceId: 'active-source',
        sourceChanged: true,
      });
    });
    expect(updateSaleOrder).toHaveBeenLastCalledWith(
      'order-id',
      expect.objectContaining({ sourceid: 'active-source' }),
    );
  });
});
