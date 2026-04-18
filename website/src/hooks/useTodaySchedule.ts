import { useState, useEffect } from 'react';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { fetchAppointments } from '@/lib/api';
import { mapApiAppointmentToCalendar } from '@/lib/calendarUtils';
import { getTodayInTimezone } from '@/lib/dateUtils';

/**
 * Hook for today's appointment schedule
 * @crossref:used-in[Overview, Calendar]
 */

interface TodayScheduleResult {
  readonly appointments: readonly CalendarAppointment[];
  readonly isLoading: boolean;
}

export function useTodaySchedule(locationId?: string): TodayScheduleResult {
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<readonly CalendarAppointment[]>([]);

  useEffect(() => {
    async function loadTodaySchedule() {
      setIsLoading(true);
      try {
        const todayStr = getTodayInTimezone('Asia/Ho_Chi_Minh');

        const response = await fetchAppointments({
          limit: 100,
          dateFrom: todayStr,
          dateTo: `${todayStr}T23:59:59`,
          companyId: locationId && locationId !== 'all' ? locationId : undefined,
        });

        const mappedAppointments = response.items.map(mapApiAppointmentToCalendar);
        setAppointments(mappedAppointments);
      } catch (error) {
        console.error('Failed to load today schedule:', error);
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadTodaySchedule();
  }, [locationId]);

  return { appointments, isLoading } as const;
}
