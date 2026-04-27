import { describe, expect, it, vi } from 'vitest';
import { fetchAllCalendarAppointments } from '../useCalendarData';
import { fetchAppointments } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  fetchAppointments: vi.fn(),
  updateAppointment: vi.fn(),
}));

const mockFetchAppointments = vi.mocked(fetchAppointments);

describe('fetchAllCalendarAppointments', () => {
  it('loads every appointment page for large calendar ranges', async () => {
    mockFetchAppointments
      .mockResolvedValueOnce({
        offset: 0,
        limit: 500,
        totalItems: 1001,
        items: Array.from({ length: 500 }, (_, index) => ({ id: `apt-${index}` })),
      } as Awaited<ReturnType<typeof fetchAppointments>>)
      .mockResolvedValueOnce({
        offset: 500,
        limit: 500,
        totalItems: 1001,
        items: Array.from({ length: 500 }, (_, index) => ({ id: `apt-${index + 500}` })),
      } as Awaited<ReturnType<typeof fetchAppointments>>)
      .mockResolvedValueOnce({
        offset: 1000,
        limit: 500,
        totalItems: 1001,
        items: [{ id: 'apt-1000' }],
      } as Awaited<ReturnType<typeof fetchAppointments>>);

    const result = await fetchAllCalendarAppointments({
      dateFrom: '2026-04-27',
      dateTo: '2026-05-03 23:59:59',
    });

    expect(result).toHaveLength(1001);
    expect(mockFetchAppointments).toHaveBeenNthCalledWith(1, {
      dateFrom: '2026-04-27',
      dateTo: '2026-05-03 23:59:59',
      offset: 0,
      limit: 500,
    });
    expect(mockFetchAppointments).toHaveBeenNthCalledWith(2, {
      dateFrom: '2026-04-27',
      dateTo: '2026-05-03 23:59:59',
      offset: 500,
      limit: 500,
    });
    expect(mockFetchAppointments).toHaveBeenNthCalledWith(3, {
      dateFrom: '2026-04-27',
      dateTo: '2026-05-03 23:59:59',
      offset: 1000,
      limit: 500,
    });
  });
});
