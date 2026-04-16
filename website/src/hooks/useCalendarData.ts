import { useState, useMemo, useCallback, useEffect } from 'react';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { fetchAppointments } from '@/lib/api';
import { useTimezone } from '@/contexts/TimezoneContext';
import { normalizeText } from '@/lib/utils';
import { mapApiAppointmentToCalendar } from '@/lib/calendarUtils';
import type { AppointmentStatus } from '@/types/appointment';

export type ViewMode = 'day' | 'week' | 'month';

export type CalendarStatusFilter = AppointmentStatus | 'all';

/**
 * Hook for Calendar page state and data
 * @crossref:used-in[Calendar]
 */
export function useCalendarData(selectedLocationId?: string) {
  const { formatDate } = useTimezone();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  // Store current date as string in YYYY-MM-DD format for timezone consistency
  const [currentDateStr, setCurrentDateStr] = useState(() => formatDate(new Date(), 'yyyy-MM-dd'));
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<AppointmentStatus[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appointments, setAppointments] = useState<readonly CalendarAppointment[]>([]);

  // Current date as Date object (for display purposes)
  const currentDate = useMemo(() => new Date(currentDateStr), [currentDateStr]);

  const goToToday = useCallback(() => {
    setCurrentDateStr(formatDate(new Date(), 'yyyy-MM-dd'));
  }, [formatDate]);

  const navigate = useCallback((direction: 'prev' | 'next') => {
    setCurrentDateStr((prevStr) => {
      const prev = new Date(prevStr);
      const d = new Date(prev);
      if (viewMode === 'day') {
        d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
      } else if (viewMode === 'week') {
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
      } else {
        d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
      }
      return formatDate(d, 'yyyy-MM-dd');
    });
  }, [viewMode, formatDate]);

  // Fetch appointments when viewMode, currentDate, or timezone changes
  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const current = new Date(currentDateStr);
      const weekDatesLocal = getWeekDates(current);
      const monthDatesLocal = getMonthDates(current);

      let dateFrom: string;
      let dateTo: string;

      if (viewMode === 'day') {
        dateFrom = currentDateStr;
        dateTo = currentDateStr;
      } else if (viewMode === 'week') {
        dateFrom = formatDate(weekDatesLocal[0], 'yyyy-MM-dd');
        dateTo = formatDate(weekDatesLocal[6], 'yyyy-MM-dd');
      } else {
        dateFrom = formatDate(monthDatesLocal[0], 'yyyy-MM-dd');
        dateTo = formatDate(monthDatesLocal[monthDatesLocal.length - 1], 'yyyy-MM-dd');
      }

      const response = await fetchAppointments({
        limit: 200,
        dateFrom,
        dateTo,
        companyId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined,
      });

      const mappedAppointments = response.items.map(mapApiAppointmentToCalendar);
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
    () => getWeekDates(currentDate),
    [currentDate]
  );

  const monthDates = useMemo(
    () => getMonthDates(currentDate),
    [currentDate]
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

  const dateLabel = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('vi-VN', {
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
      return `${start.toLocaleDateString('vi-VN', opts)} - ${end.toLocaleDateString('vi-VN', { ...opts, year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  }, [viewMode, currentDate, weekDates]);

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
  } as const;
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

