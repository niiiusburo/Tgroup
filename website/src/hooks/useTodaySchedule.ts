import { useState, useEffect } from 'react';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { fetchAppointments } from '@/lib/api';
import { mapApiAppointmentToCalendar } from '@/lib/calendarUtils';

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
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

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
