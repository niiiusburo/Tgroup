// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import { useCalendarData, type ViewMode } from '@/hooks/useCalendarData';
import { useDragReschedule } from '@/hooks/useDragReschedule';
import { DayView } from '@/components/calendar/DayView';
import { WeekView } from '@/components/calendar/WeekView';
import { MonthView } from '@/components/calendar/MonthView';
import { AppointmentDetailsModal } from '@/components/calendar/AppointmentDetailsModal';
import { FilterByDoctor, type DoctorOption } from '@/components/shared/FilterByDoctor';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocationFilter } from '@/contexts/LocationContext';
import type { CalendarAppointment } from '@/data/mockCalendar';
import { EditAppointmentModal } from '@/components/modules/EditAppointmentModal';
import type { OverviewAppointment } from '@/hooks/useOverviewAppointments';
import { cn } from '@/lib/utils';

/**
 * Calendar Page with Day/Week/Month view modes
 * @crossref:route[/calendar]
 * @crossref:used-in[App]
 * @crossref:uses[DayView, WeekView, MonthView, AppointmentCard, AppointmentDetailsModal, FilterByDoctor, useLocationFilter, useDragReschedule]
 *
 * Redesigned to match reference images with Vietnamese labels:
 * - Ngày (Day), Tuần (Week), Tháng (Month)
 * - Week view shows appointment cards with status badges
 * - Month view shows status counts per day
 */

const VIEW_TABS: readonly { readonly mode: ViewMode; readonly label: string }[] = [
  { mode: 'day', label: 'Ngày' },
  { mode: 'week', label: 'Tuần' },
  { mode: 'month', label: 'Tháng' },
];

export function Calendar() {
  const { selectedLocationId } = useLocationFilter();
  const {
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
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
    refresh,
  } = useCalendarData(selectedLocationId);

  const [editingAppointment, setEditingAppointment] = useState<CalendarAppointment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Get real doctors from API for FilterByDoctor
  const { allEmployees } = useEmployees();
  const doctors = useMemo((): readonly DoctorOption[] =>
    allEmployees
      .filter((e) => e.status === 'active' && (e.roles.includes('dentist') || e.roles.includes('orthodontist')))
      .map((e) => ({ id: e.id, name: e.name, roles: [...e.roles] })),
    [allEmployees],
  );

  const handleReschedule = useCallback(async (result: { appointmentId: string; newDate: string; newTime: string }) => {
    try {
      const { updateAppointment } = await import('@/lib/api');
      await updateAppointment(result.appointmentId, {
        date: `${result.newDate}T${result.newTime}:00`,
      });
      refresh?.();
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
    }
  }, [refresh]);

  const { handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReschedule(handleReschedule);

  const handleAppointmentClick = useCallback((appointment: CalendarAppointment) => {
    setSelectedAppointment(appointment);
  }, [setSelectedAppointment]);

  const handleEditClick = useCallback((appointment: CalendarAppointment) => {
    setEditingAppointment(appointment);
    setIsEditModalOpen(true);
  }, []);

  const handleEditModalClose = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingAppointment(null);
  }, []);

  const handleEditModalSaved = useCallback(() => {
    refresh?.();
    setIsEditModalOpen(false);
    setEditingAppointment(null);
  }, [refresh]);

  const handleCloseModal = useCallback(() => {
    setSelectedAppointment(null);
  }, [setSelectedAppointment]);

  const handleDayClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
  }, [setCurrentDate, setViewMode]);

  const handleDateChange = useCallback((date: Date) => {
    // This would update currentDate in useCalendarData
    // For now, we use the navigate function
    const current = new Date(currentDate);
    const diff = date.getTime() - current.getTime();
    const daysDiff = Math.round(diff / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 0) {
      for (let i = 0; i < daysDiff; i++) navigate('next');
    } else if (daysDiff < 0) {
      for (let i = 0; i < Math.abs(daysDiff); i++) navigate('prev');
    }
  }, [currentDate, navigate]);

  // Helper to map Calendar status to OverviewAppointment topStatus
  function mapStatusToTopStatus(status: CalendarAppointment['status']): OverviewAppointment['topStatus'] {
    switch (status) {
      case 'cancelled':
        return 'cancelled';
      case 'confirmed':
        return 'arrived';
      case 'in-progress':
        return 'arrived';
      case 'completed':
        return 'arrived';
      default:
        return 'scheduled';
    }
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <CalendarIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch hẹn</h1>
          <p className="text-sm text-gray-500">Quản lý lịch hẹn khám bệnh</p>
        </div>
      </div>

      {/* Toolbar: view tabs + navigation + filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white rounded-xl shadow-card px-4 py-3">
        {/* Left: view mode tabs (Vietnamese) */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.mode}
              onClick={() => setViewMode(tab.mode)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === tab.mode
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Center: date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('prev')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-gray-900 min-w-[150px] text-center">
            {dateLabel}
          </h2>
          <button
            onClick={() => navigate('next')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Hôm nay
          </button>
        </div>

        {/* Right: doctor filter */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="flex-1 lg:flex-none">
            <FilterByDoctor
              selectedDoctorId={selectedDoctorId}
              onChange={setSelectedDoctorId}
              doctors={doctors}
            />
          </div>
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === 'day' && (
        <DayView
          currentDate={currentDate}
          getAppointmentsForDate={getAppointmentsForDate}
          onAppointmentClick={handleAppointmentClick}
          onAppointmentEdit={handleEditClick}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          weekDates={weekDates}
          getAppointmentsForDate={getAppointmentsForDate}
          onAppointmentClick={handleAppointmentClick}
          onAppointmentEdit={handleEditClick}
          onDateChange={handleDateChange}
        />
      )}
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          monthDates={monthDates}
          getAppointmentsForDate={getAppointmentsForDate}
          onDayClick={handleDayClick}
        />
      )}

      {/* Appointment detail modal */}
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        onClose={handleCloseModal}
        onEdit={handleEditClick}
      />

      {/* Edit Appointment Modal */}
      <EditAppointmentModal
        appointment={editingAppointment ? {
          id: editingAppointment.id,
          customerName: editingAppointment.customerName,
          customerPhone: editingAppointment.customerPhone,
          doctorName: editingAppointment.dentist,
          doctorId: editingAppointment.dentistId,
          time: editingAppointment.startTime,
          locationId: editingAppointment.locationId,
          locationName: editingAppointment.locationName,
          note: editingAppointment.notes,
          topStatus: mapStatusToTopStatus(editingAppointment.status),
          checkInStatus: null,
          color: editingAppointment.color,
        } : null}
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onSaved={handleEditModalSaved}
      />
    </div>
  );
}
