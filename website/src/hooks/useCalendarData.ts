import { useState, useMemo, useCallback, useEffect } from 'react';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { fetchAppointments, type ApiAppointment } from '@/lib/api';
import { useTimezone } from '@/contexts/TimezoneContext';
import { normalizeText } from '@/lib/utils';
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
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>('all');
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
  }, [viewMode, currentDateStr, selectedDoctorId, selectedLocationId, formatDate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const matchesDoctor = selectedDoctorId ? apt.dentistId === selectedDoctorId : true;
      const matchesStatus = statusFilter !== 'all' ? apt.status === statusFilter : true;
      const term = normalizeText(searchTerm.trim());
      const matchesSearch = term
        ? normalizeText(apt.customerName).includes(term) ||
          normalizeText(apt.customerPhone).includes(term) ||
          normalizeText(apt.dentist).includes(term)
        : true;
      return matchesDoctor && matchesStatus && matchesSearch;
    });
  }, [appointments, selectedDoctorId, statusFilter, searchTerm]);

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
    selectedDoctorId,
    setSelectedDoctorId,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
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

function mapApiAppointmentToCalendar(apt: ApiAppointment): CalendarAppointment {
  // Convert UTC date to Vietnam local date (UTC+7)
  // apt.date may be UTC like "2026-04-07T17:00:00.000Z" which is actually 2026-04-08 in VN
  const dateStr = apt.date ? utcToLocalDateStr(apt.date) : '';
  const startTime = apt.time || '09:00';
  const endTime = calculateEndTime(startTime, apt.timeexpected);

  return {
    id: apt.id,
    customerName: apt.partnername || '',
    customerPhone: apt.partnerphone || '',
    serviceName: apt.name || apt.note || '',
    appointmentType: deriveAppointmentType(apt.reason || apt.note || ''),
    dentist: apt.doctorname || '',
    dentistId: apt.doctorid || '',
    date: dateStr,
    startTime,
    endTime,
    status: mapStateToStatus(apt.state),
    locationId: apt.companyid || '',
    locationName: apt.companyname || '',
    notes: apt.note || '',
    color: mapHexToColorCode(apt.color),
  };
}

/**
 * Convert a UTC ISO date string to a local YYYY-MM-DD string in Vietnam timezone.
 * E.g. "2026-04-07T17:00:00.000Z" → "2026-04-08" (UTC+7)
 */
function utcToLocalDateStr(isoDate: string): string {
  // If it's already just a date (no 'T'), return as-is
  if (!isoDate.includes('T')) return isoDate;
  const d = new Date(isoDate);
  // Format in Vietnam timezone
  const parts = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // en-CA gives YYYY-MM-DD
  return parts;
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
    draft: 'scheduled',
    scheduled: 'scheduled',
    confirmed: 'confirmed',
    arrived: 'confirmed',
    'in examination': 'in-progress',
    'in-progress': 'in-progress',
    done: 'completed',
    completed: 'completed',
    cancelled: 'cancelled',
  };
  return stateMap[state?.toLowerCase().trim() || ''] || 'scheduled';
}

function mapHexToColorCode(color: string | null | undefined): string | null {
  if (color === null || color === undefined) return null;
  if (/^[0-7]$/.test(color)) return color;
  const hexMap: Record<string, string> = {
    '#ef4444': '3',
    '#3b82f6': '0',
    '#10b981': '1',
    '#f59e0b': '2',
    '#8b5cf6': '4',
    '#ec4899': '5',
    '#06b6d4': '6',
    '#84cc16': '7',
  };
  return hexMap[color.toLowerCase()] ?? null;
}

function deriveAppointmentType(text: string): CalendarAppointment['appointmentType'] {
  const lower = text.toLowerCase();
  if (/lấy cao|vệ sinh/.test(lower)) return 'cleaning';
  if (/niềng|chỉnh nha/.test(lower)) return 'orthodontics';
  if (/nhổ|phẫu/.test(lower)) return 'surgery';
  if (/tẩy trắng|thẩm mỹ/.test(lower)) return 'cosmetic';
  if (/cấp cứu|đau/.test(lower)) return 'emergency';
  if (/khám|tư vấn/.test(lower)) return 'consultation';
  return 'treatment';
}
