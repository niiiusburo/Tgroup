import { useMemo } from 'react';
import { MOCK_APPOINTMENTS, type CalendarAppointment } from '@/data/mockCalendar';

/**
 * Hook for today's appointment schedule
 * @crossref:used-in[Overview, Calendar]
 */

interface TodayScheduleResult {
  readonly appointments: readonly CalendarAppointment[];
  readonly isLoading: boolean;
}

export function useTodaySchedule(locationId?: string): TodayScheduleResult {
  const appointments = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    return MOCK_APPOINTMENTS.filter((apt) => {
      const isToday = apt.date === todayStr;
      const matchesLocation =
        !locationId || locationId === 'all' || apt.locationId === locationId;
      return isToday && matchesLocation;
    });
  }, [locationId]);

  return { appointments, isLoading: false } as const;
}
