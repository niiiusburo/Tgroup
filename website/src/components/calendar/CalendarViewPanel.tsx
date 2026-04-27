import type { ComponentProps } from 'react';
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
    );
  }

  if (viewMode === 'week') {
    return (
      <WeekView
        weekDates={weekDates}
        getAppointmentsForDate={getAppointmentsForDate}
        onAppointmentClick={onAppointmentClick}
        onAppointmentEdit={onAppointmentEdit}
        onDateChange={onDateChange}
        onMarkArrived={onMarkArrived}
        onUpdateStatus={onUpdateStatus}
      />
    );
  }

  return (
    <MonthView
      currentDate={currentDate}
      monthDates={monthDates}
      getAppointmentsForDate={getAppointmentsForDate}
      onDayClick={onDayClick}
    />
  );
}
