import { useState, useEffect } from 'react';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { fetchAppointments, type ApiAppointment } from '@/lib/api';

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

function mapApiAppointmentToCalendar(apt: ApiAppointment): CalendarAppointment {
  const dateStr = apt.date;
  const startTime = apt.time || '09:00';
  const endTime = calculateEndTime(startTime, apt.timeexpected);

  return {
    id: apt.id,
    customerName: apt.partnername || '',
    customerPhone: apt.partnerphone || '',
    serviceName: apt.name || apt.note || '',
    appointmentType: 'consultation',
    dentist: apt.doctorname || '',
    dentistId: apt.doctorid || '',
    date: dateStr,
    startTime,
    endTime,
    status: mapStateToStatus(apt.state),
    locationId: apt.companyid || '',
    locationName: apt.companyname || '',
    notes: apt.note || '',
  };
}

function calculateEndTime(startTime: string, durationMinutes: number | null): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + (durationMinutes || 30);
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

function mapStateToStatus(state: string | null): CalendarAppointment['status'] {
  const stateMap: Record<string, CalendarAppointment['status']> = {
    scheduled: 'scheduled',
    confirmed: 'confirmed',
    'in-progress': 'in-progress',
    completed: 'completed',
    cancelled: 'cancelled',
  };
  return stateMap[state?.toLowerCase() || ''] || 'scheduled';
}
