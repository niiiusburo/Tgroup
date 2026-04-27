import { useCallback } from 'react';
import type { TFunction } from 'i18next';
import type { CalendarAppointment } from '@/data/mockCalendar';
import type { ViewMode } from '@/hooks/useCalendarData';
import type { ExportMode } from '@/components/calendar/ExportDialog';
import { fetchAppointments } from '@/lib/api';
import { mapApiAppointmentToCalendar } from '@/lib/calendarUtils';
import { exportAppointmentsXlsx } from '@/lib/exportAppointmentsXlsx';

interface UseCalendarExportOptions {
  readonly viewMode: ViewMode;
  readonly currentDate: Date;
  readonly weekDates: readonly Date[];
  readonly monthDates: readonly Date[];
  readonly formatDate: (date: Date, format: string) => string;
  readonly appointments: readonly CalendarAppointment[];
  readonly selectedLocationId?: string;
  readonly t: TFunction<'calendar'>;
}

export function useCalendarExport({
  viewMode,
  currentDate,
  weekDates,
  monthDates,
  formatDate,
  appointments,
  selectedLocationId,
  t,
}: UseCalendarExportOptions) {
  const getExportDateRange = useCallback((mode: ExportMode): [string, string] => {
    if (mode !== 'current-filter') return ['', ''];
    if (viewMode === 'day') {
      const date = formatDate(currentDate, 'yyyy-MM-dd');
      return [date, date];
    }
    if (viewMode === 'week') {
      return [formatDate(weekDates[0], 'yyyy-MM-dd'), formatDate(weekDates[6], 'yyyy-MM-dd')];
    }
    return [
      formatDate(monthDates[0], 'yyyy-MM-dd'),
      formatDate(monthDates[monthDates.length - 1], 'yyyy-MM-dd'),
    ];
  }, [viewMode, currentDate, weekDates, monthDates, formatDate]);

  return useCallback(async (mode: ExportMode, dateFrom: string, dateTo: string) => {
    let rows: CalendarAppointment[];
    if (mode === 'current-filter') {
      rows = [...appointments];
    } else {
      const response = await fetchAppointments({
        limit: 1000,
        dateFrom,
        dateTo,
        companyId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined,
      });
      rows = response.items.map(mapApiAppointmentToCalendar);
    }
    const [from, to] = mode === 'current-filter' ? getExportDateRange('current-filter') : [dateFrom, dateTo];
    const suffix = from === to ? from : `${from}_${to}`;
    await exportAppointmentsXlsx(rows, `DanhSachLichHen_${suffix}.xlsx`, t);
  }, [appointments, selectedLocationId, getExportDateRange, t]);
}
