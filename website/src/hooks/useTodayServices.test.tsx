import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchSaleOrderActivityLines } from '@/lib/api';
import { useTodayServices } from './useTodayServices';

vi.mock('@/lib/api', () => ({
  fetchSaleOrderActivityLines: vi.fn(),
}));

const getToday = vi.fn().mockReturnValue('2026-05-09');
const getEndOfDay = vi.fn().mockReturnValue('2026-05-09T23:59:59');

vi.mock('@/contexts/TimezoneContext', () => ({
  useTimezone: () => ({
    getToday,
    getEndOfDay,
    timezone: 'Asia/Ho_Chi_Minh',
  }),
}));

describe('useTodayServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSaleOrderActivityLines).mockResolvedValue({
      offset: 0,
      limit: 200,
      totalItems: 1,
      items: [
        {
          id: 'line-1',
          date: '2026-05-09T09:15:00',
          name: null,
          state: 'done',
          orderPartnerId: 'customer-1',
          orderPartnerName: 'Nguyễn Văn A',
          orderPartnerDisplayName: 'Nguyễn Văn A',
          orderPartnerPhone: '0901111222',
          orderPartnerCode: 'T9001',
          orderId: 'order-1',
          orderName: 'SO-2026-0001',
          productId: 'product-1',
          productName: 'Tẩy trắng răng',
          productCode: null,
          employeeId: 'doctor-1',
          employeeName: 'Bác sĩ Đạt',
          assistantId: null,
          assistant: null,
          counselorId: null,
          counselor: null,
          companyId: 'location-1',
          companyName: 'District 1',
          productUOMQty: '2',
          priceUnit: null,
          priceSubTotal: '1500000',
          priceTotal: '1500000',
          amountInvoiced: '1500000',
          amountResidual: '0',
          diagnostic: null,
          toothType: null,
          toothRange: null,
          isActive: true,
          isRewardLine: false,
          isGlobalDiscount: false,
        },
      ],
    });
  });

  it('loads current-day service activity for the selected location', async () => {
    const { result } = renderHook(() => useTodayServices('location-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSaleOrderActivityLines).toHaveBeenCalledWith({
      limit: 200,
      dateFrom: '2026-05-09',
      dateTo: '2026-05-09T23:59:59',
      companyId: 'location-1',
    });
    expect(result.current.services[0]).toMatchObject({
      serviceName: 'Tẩy trắng răng',
      patientName: 'Nguyễn Văn A',
      patientCode: 'T9001',
      quantity: 2,
      doctorName: 'Bác sĩ Đạt',
      amount: 1500000,
      status: 'completed',
    });
  });

  it('filters services with accent-insensitive search', async () => {
    const { result } = renderHook(() => useTodayServices('location-1', 'tay trang'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.services).toHaveLength(1);
    expect(result.current.services[0].serviceName).toBe('Tẩy trắng răng');
  });
});
