import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAllCalendarAppointments } from '../useCalendarData';
import { fetchAppointments } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  fetchAppointments: vi.fn(),
  updateAppointment: vi.fn(),
}));

const mockFetchAppointments = vi.mocked(fetchAppointments);

describe('fetchAllCalendarAppointments', () => {
  beforeEach(() => {
    mockFetchAppointments.mockReset();
  });

  it('loads every appointment page for large calendar ranges', async () => {
    mockFetchAppointments
      .mockResolvedValueOnce({
        offset: 0,
        limit: 3000,
        totalItems: null,
        items: Array.from({ length: 1001 }, (_, index) => ({ id: `apt-${index}` })),
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
      limit: 3000,
      calendarMode: true,
      includeCounts: false,
    });
  });

  it('continues when the no-count calendar page is exactly full', async () => {
    mockFetchAppointments
      .mockResolvedValueOnce({
        offset: 0,
        limit: 3000,
        totalItems: 3000,
        items: Array.from({ length: 3000 }, (_, index) => ({ id: `apt-${index}` })),
      } as Awaited<ReturnType<typeof fetchAppointments>>)
      .mockResolvedValueOnce({
        offset: 3000,
        limit: 3000,
        totalItems: 3674,
        items: Array.from({ length: 674 }, (_, index) => ({ id: `apt-next-${index}` })),
      } as Awaited<ReturnType<typeof fetchAppointments>>);

    const result = await fetchAllCalendarAppointments({
      dateFrom: '2026-05-04',
      dateTo: '2026-05-10 23:59:59',
    });

    expect(result).toHaveLength(3674);
    expect(mockFetchAppointments).toHaveBeenCalledTimes(2);
    expect(mockFetchAppointments).toHaveBeenNthCalledWith(2, {
      dateFrom: '2026-05-04',
      dateTo: '2026-05-10 23:59:59',
      offset: 3000,
      limit: 3000,
      calendarMode: true,
      includeCounts: false,
    });
  });
});
