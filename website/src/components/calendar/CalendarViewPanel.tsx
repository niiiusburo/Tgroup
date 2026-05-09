import type { ComponentProps } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '@/components/shared/LoadingState';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import type { ViewMode } from '@/hooks/useCalendarData';

type DayViewProps = ComponentProps<typeof DayView>;
type WeekViewProps = ComponentProps<typeof WeekView>;
type MonthViewProps = ComponentProps<typeof MonthView>;

interface CalendarViewPanelProps {
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly viewMode: ViewMode;
  readonly currentDate: Date;
  readonly weekDates: WeekViewProps['weekDates'];
  readonly monthDates: MonthViewProps['monthDates'];
  readonly getAppointmentsForDate: DayViewProps['getAppointmentsForDate'];
  readonly onAppointmentClick: DayViewProps['onAppointmentClick'];
  readonly onAppointmentEdit: DayViewProps['onAppointmentEdit'];
  readonly onDragStart: DayViewProps['onDragStart'];
  readonly onDragOver: DayViewProps['onDragOver'];
  readonly onDrop: DayViewProps['onDrop'];
  readonly onDragEnd: DayViewProps['onDragEnd'];
  readonly onDateChange: WeekViewProps['onDateChange'];
  readonly onDayClick: MonthViewProps['onDayClick'];
  readonly onMarkArrived: DayViewProps['onMarkArrived'];
  readonly onUpdateStatus: DayViewProps['onUpdateStatus'];
  readonly onCreateAppointment: DayViewProps['onCreateAppointment'];
}

export function CalendarViewPanel({
  isLoading,
  isLoadingMore,
  viewMode,
  currentDate,
  weekDates,
  monthDates,
  getAppointmentsForDate,
  onAppointmentClick,
  onAppointmentEdit,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDateChange,
  onDayClick,
  onMarkArrived,
  onUpdateStatus,
  onCreateAppointment,
}: CalendarViewPanelProps) {
  const { t } = useTranslation('calendar');

  if (isLoading) {
    return (
      <LoadingState
        title="Loading calendar..."
        description="Fetching appointments for the selected date range."
      />
    );
  }

  if (viewMode === 'day') {
    return (
      <div className="relative min-w-0">
        <DayView
          currentDate={currentDate}
          getAppointmentsForDate={getAppointmentsForDate}
          onAppointmentClick={onAppointmentClick}
          onAppointmentEdit={onAppointmentEdit}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
          onMarkArrived={onMarkArrived}
          onUpdateStatus={onUpdateStatus}
          onCreateAppointment={onCreateAppointment}
        />
        <CalendarLoadingMoreBadge isLoading={isLoadingMore} label={t('loadingMoreAppointments')} />
      </div>
    );
  }

  if (viewMode === 'week') {
    return (
      <div className="relative min-w-0">
        <WeekView
          weekDates={weekDates}
          getAppointmentsForDate={getAppointmentsForDate}
          onAppointmentClick={onAppointmentClick}
          onAppointmentEdit={onAppointmentEdit}
          onDateChange={onDateChange}
          onMarkArrived={onMarkArrived}
          onUpdateStatus={onUpdateStatus}
        />
        <CalendarLoadingMoreBadge isLoading={isLoadingMore} label={t('loadingMoreAppointments')} />
      </div>
    );
  }

  return (
    <div className="relative min-w-0">
      <MonthView
        currentDate={currentDate}
        monthDates={monthDates}
        getAppointmentsForDate={getAppointmentsForDate}
        onDayClick={onDayClick}
      />
      <CalendarLoadingMoreBadge isLoading={isLoadingMore} label={t('loadingMoreAppointments')} />
    </div>
  );
}

function CalendarLoadingMoreBadge({
  isLoading,
  label,
}: {
  readonly isLoading: boolean;
  readonly label: string;
}) {
  if (!isLoading) return null;

  return (
    <div
      className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/95 px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm"
      aria-live="polite"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
