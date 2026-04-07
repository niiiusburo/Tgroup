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

/**
 * Calendar Page with Day/Week/Month view modes
 * @crossref:route[/calendar]
 * @crossref:used-in[App]
 * @crossref:uses[DayView, WeekView, MonthView, AppointmentCard, AppointmentDetailsModal, FilterByDoctor, useLocationFilter, useDragReschedule]
 */

const VIEW_TABS: readonly { readonly mode: ViewMode; readonly label: string }[] = [
  { mode: 'day', label: 'Day' },
  { mode: 'week', label: 'Week' },
  { mode: 'month', label: 'Month' },
];

export function Calendar() {
  const { selectedLocationId } = useLocationFilter();
  const {
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

  const handleReschedule = useCallback((result: { appointmentId: string; newDate: string; newTime: string }) => {
    // In production, this would call an API. For now, log the reschedule.
    void result;
  }, []);

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
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500">Schedule and manage appointments</p>
        </div>
      </div>

      {/* Toolbar: navigation + filters + view tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white rounded-xl shadow-card px-4 py-3">
        {/* Left: date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary-lighter transition-colors"
          >
            Today
          </button>
          <div className="flex items-center">
            <button
              onClick={() => navigate('prev')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('next')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-base font-semibold text-gray-900 ml-1">{dateLabel}</h2>
        </div>

        {/* Center: doctor filter */}
        <div className="flex items-center gap-2">
          <FilterByDoctor
            selectedDoctorId={selectedDoctorId}
            onChange={setSelectedDoctorId}
            doctors={doctors}
          />
        </div>

        {/* Right: view mode tabs */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.mode}
              onClick={() => setViewMode(tab.mode)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === tab.mode
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        />
      )}
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          monthDates={monthDates}
          getAppointmentsForDate={getAppointmentsForDate}
          onAppointmentClick={handleAppointmentClick}
          onAppointmentEdit={handleEditClick}
        />
      )}

      {/* Appointment detail modal */}
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        onClose={handleCloseModal}
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
