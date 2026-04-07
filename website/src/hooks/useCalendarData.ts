import { useState, useMemo, useCallback, useEffect } from 'react';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { fetchAppointments, type ApiAppointment } from '@/lib/api';

export type ViewMode = 'day' | 'week' | 'month';

/**
 * Hook for Calendar page state and data
 * @crossref:used-in[Calendar]
 */
export function useCalendarData(selectedLocationId?: string) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appointments, setAppointments] = useState<readonly CalendarAppointment[]>([]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const navigate = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'day') {
        d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
      } else if (viewMode === 'week') {
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
      } else {
        d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
      }
      return d;
    });
  }, [viewMode]);

  // Fetch appointments when viewMode or currentDate changes
  useEffect(() => {
    async function loadAppointments() {
      setIsLoading(true);
      try {
        const weekDatesLocal = getWeekDates(currentDate);
        const monthDatesLocal = getMonthDates(currentDate);

        let dateFrom: string;
        let dateTo: string;

        if (viewMode === 'day') {
          dateFrom = formatDateStr(currentDate);
          dateTo = formatDateStr(currentDate);
        } else if (viewMode === 'week') {
          dateFrom = formatDateStr(weekDatesLocal[0]);
          dateTo = formatDateStr(weekDatesLocal[6]);
        } else {
          dateFrom = formatDateStr(monthDatesLocal[0]);
          dateTo = formatDateStr(monthDatesLocal[monthDatesLocal.length - 1]);
        }

        const response = await fetchAppointments({
          limit: 200,
          dateFrom,
          dateTo,
          companyId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined,
          doctorId: selectedDoctorId || undefined,
        });

        const mappedAppointments = response.items.map(mapApiAppointmentToCalendar);
        setAppointments(mappedAppointments);
      } catch (error) {
        console.error('Failed to load calendar appointments:', error);
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadAppointments();
  }, [viewMode, currentDate, selectedDoctorId]);

  const filteredAppointments = useMemo(() => {
    if (!selectedDoctorId) return appointments;
    return appointments.filter((apt) => apt.dentistId === selectedDoctorId);
  }, [appointments, selectedDoctorId]);

  const weekDates = useMemo(
    () => getWeekDates(currentDate),
    [currentDate]
  );

  const monthDates = useMemo(
    () => getMonthDates(currentDate),
    [currentDate]
  );

  const getAppointmentsForDate = useCallback((date: Date): readonly CalendarAppointment[] => {
    const dateStr = formatDateStr(date);
    return filteredAppointments.filter((apt) => apt.date === dateStr);
  }, [filteredAppointments]);

  const dateLabel = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (viewMode === 'week') {
      const start = weekDates[0];
      const end = weekDates[6];
      const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [viewMode, currentDate, weekDates]);

  return {
    viewMode,
    setViewMode,
    currentDate,
    goToToday,
    navigate,
    weekDates,
    monthDates,
    getAppointmentsForDate,
    dateLabel,
    selectedDoctorId,
    setSelectedDoctorId,
    selectedAppointment,
    setSelectedAppointment,
    isLoading,
  } as const;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekDates(currentDate: Date): Date[] {
  const start = new Date(currentDate);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMonthDates(currentDate: Date): Date[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const start = new Date(firstDay);
  start.setDate(start.getDate() - startOffset);

  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
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
