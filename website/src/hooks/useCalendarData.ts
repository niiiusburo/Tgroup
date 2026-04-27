import { useState, useMemo, useCallback, useEffect } from 'react';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { fetchAppointments, updateAppointment } from '@/lib/api';
import { useTimezone } from '@/contexts/TimezoneContext';
import { PHASE_TO_API_STATE, type CalendarPhase } from '@/lib/appointmentStatusMapping';
import { setStoredArrivalTime } from '@/lib/arrivalTimeStorage';
import { normalizeText } from '@/lib/utils';
import { mapApiAppointmentToCalendar } from '@/lib/calendarUtils';
import type { AppointmentStatus } from '@/types/appointment';

export type ViewMode = 'day' | 'week' | 'month';

export type CalendarStatusFilter = AppointmentStatus | 'all';

const CALENDAR_APPOINTMENTS_PAGE_SIZE = 500;

/** Create a Date at noon Vietnam time from a YYYY-MM-DD string */
function toVnDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00+07:00`);
}

type CalendarAppointmentQuery = Parameters<typeof fetchAppointments>[0];
type CalendarAppointmentPage = Awaited<ReturnType<typeof fetchAppointments>>;

export async function fetchAllCalendarAppointments(params: CalendarAppointmentQuery) {
  const items: CalendarAppointmentPage['items'] = [];
  let offset = 0;
  let totalItems: number | null = null;

  while (totalItems === null || offset < totalItems) {
    const response = await fetchAppointments({
      ...params,
      offset,
      limit: CALENDAR_APPOINTMENTS_PAGE_SIZE,
    });

    items.push(...response.items);
    totalItems = response.totalItems ?? items.length;

    if (response.items.length === 0) break;
    offset += response.items.length;
  }

  return items;
}

/**
 * Hook for Calendar page state and data
 * @crossref:used-in[Calendar]
 */
export function useCalendarData(selectedLocationId?: string) {
  const { formatDate, getToday, addDaysInTimezone, addMonthsInTimezone, timezone } = useTimezone();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  // Store current date as string in YYYY-MM-DD format for timezone consistency
  const [currentDateStr, setCurrentDateStr] = useState(() => getToday());
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<AppointmentStatus[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<readonly CalendarAppointment[]>([]);

  // Current date as Date object at noon Vietnam time (avoids all timezone drift)
  const currentDate = useMemo(() => toVnDate(currentDateStr), [currentDateStr]);

  const goToToday = useCallback(() => {
    setCurrentDateStr(getToday());
  }, [getToday]);

  const navigate = useCallback((direction: 'prev' | 'next') => {
    setCurrentDateStr((prevStr) => {
      if (viewMode === 'day') {
        return addDaysInTimezone(prevStr, direction === 'next' ? 1 : -1);
      } else if (viewMode === 'week') {
        return addDaysInTimezone(prevStr, direction === 'next' ? 7 : -7);
      } else {
        return addMonthsInTimezone(prevStr, direction === 'next' ? 1 : -1);
      }
    });
  }, [viewMode, addDaysInTimezone, addMonthsInTimezone]);

  // Fetch appointments when viewMode, currentDate, or timezone changes
  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const current = toVnDate(currentDateStr);
      const weekDatesLocal = getWeekDates(current, formatDate);
      const monthDatesLocal = getMonthDates(current, formatDate);

      let dateFrom: string;
      let dateTo: string;

      // Backend applies `date <= dateTo`; a bare date parses as 00:00:00, which
      // drops everything after midnight. Pin dateTo to end-of-day so the full
      // day is included (matters most in day view where from === to).
      const endOfDay = (d: string) => `${d} 23:59:59`;

      if (viewMode === 'day') {
        dateFrom = currentDateStr;
        dateTo = endOfDay(currentDateStr);
      } else if (viewMode === 'week') {
        dateFrom = formatDate(weekDatesLocal[0], 'yyyy-MM-dd');
        dateTo = endOfDay(formatDate(weekDatesLocal[6], 'yyyy-MM-dd'));
      } else {
        dateFrom = formatDate(monthDatesLocal[0], 'yyyy-MM-dd');
        dateTo = endOfDay(formatDate(monthDatesLocal[monthDatesLocal.length - 1], 'yyyy-MM-dd'));
      }

      const allAppointments = await fetchAllCalendarAppointments({
        dateFrom,
        dateTo,
        companyId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined,
      });

      const mappedAppointments = allAppointments.map(mapApiAppointmentToCalendar);
      setAppointments(mappedAppointments);
    } catch (error) {
      console.error('Failed to load calendar appointments:', error);
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, currentDateStr, selectedLocationId, formatDate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const matchesDoctor = selectedDoctors.length === 0 || selectedDoctors.includes(apt.dentist);
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(apt.status);
      const matchesColor = selectedColors.length === 0 || selectedColors.includes(apt.color ?? '0');
      const searchTerm = normalizeText(search.trim());
      const matchesSearch = searchTerm
        ? normalizeText(apt.customerName).includes(searchTerm) ||
          normalizeText(apt.customerPhone).includes(searchTerm) ||
          normalizeText(apt.customerCode || '').includes(searchTerm) ||
          normalizeText(apt.dentist).includes(searchTerm) ||
          normalizeText(apt.serviceName || '').includes(searchTerm)
        : true;
      return matchesDoctor && matchesStatus && matchesColor && matchesSearch;
    });
  }, [appointments, selectedDoctors, selectedStatuses, selectedColors, search]);

  const weekDates = useMemo(
    () => getWeekDates(currentDate, formatDate),
    [currentDate, formatDate]
  );

  const monthDates = useMemo(
    () => getMonthDates(currentDate, formatDate),
    [currentDate, formatDate]
  );

  const getAppointmentsForDate = useCallback((date: Date): readonly CalendarAppointment[] => {
    const dateStr = formatDate(date, 'yyyy-MM-dd');
    return filteredAppointments.filter((apt) => apt.date === dateStr);
  }, [filteredAppointments, formatDate]);

  const clearFilters = useCallback(() => {
    setSelectedDoctors([]);
    setSelectedStatuses([]);
    setSelectedColors([]);
    setSearch('');
  }, []);

  const updateAppointmentStatus = useCallback(async (id: string, phase: CalendarPhase) => {
    try {
      await updateAppointment(id, { state: PHASE_TO_API_STATE[phase] });
      if (phase === 'waiting') {
        const arrivalTime = formatDate(new Date(), 'HH:mm');
        setStoredArrivalTime(id, arrivalTime);
      }
      await loadAppointments();
    } catch (error) {
      console.error('Failed to update appointment status:', error);
    }
  }, [loadAppointments, formatDate]);

  const markArrived = useCallback(async (id: string) => {
    await updateAppointmentStatus(id, 'waiting');
  }, [updateAppointmentStatus]);

  const dateLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { timeZone: timezone, month: 'short', day: 'numeric' };
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('vi-VN', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (viewMode === 'week') {
      const start = weekDates[0];
      const end = weekDates[6];
      return `${start.toLocaleDateString('vi-VN', opts)} - ${end.toLocaleDateString('vi-VN', { ...opts, year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('vi-VN', { timeZone: timezone, month: 'long', year: 'numeric' });
  }, [viewMode, currentDate, weekDates, timezone]);

  return {
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate: (date: Date) => setCurrentDateStr(formatDate(date, 'yyyy-MM-dd')),
    goToToday,
    navigate,
    weekDates,
    monthDates,
    getAppointmentsForDate,
    dateLabel,
    appointments,
    selectedDoctors,
    setSelectedDoctors,
    selectedStatuses,
    setSelectedStatuses,
    selectedColors,
    setSelectedColors,
    search,
    setSearch,
    clearFilters,
    selectedAppointment,
    setSelectedAppointment,
    isLoading,
    refresh: loadAppointments,
    updateAppointmentStatus,
    markArrived,
  } as const;
}

/** Compute week dates (Mon–Sun) in Vietnam timezone */
function getWeekDates(currentDate: Date, formatDate: (date: Date, format: string) => string): Date[] {
  const dateStr = formatDate(currentDate, 'yyyy-MM-dd');
  const [year, month, day] = dateStr.split('-').map(Number);

  // Noon UTC = 19:00 Vietnam — always same calendar day
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const start = new Date(Date.UTC(year, month - 1, day - daysToMonday, 12, 0, 0));

  return Array.from({ length: 7 }, (_, i) => {
    const result = new Date(start);
    result.setUTCDate(result.getUTCDate() + i);
    return result;
  });
}

/** Compute month grid dates in Vietnam timezone */
function getMonthDates(currentDate: Date, formatDate: (date: Date, format: string) => string): Date[] {
  const dateStr = formatDate(currentDate, 'yyyy-MM-dd');
  const [year, month] = dateStr.split('-').map(Number);

  const daysInMonth = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();
  const firstDay = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const startOffset = firstDay.getUTCDay() === 0 ? 6 : firstDay.getUTCDay() - 1;

  const start = new Date(Date.UTC(year, month - 1, 1 - startOffset, 12, 0, 0));

  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}
