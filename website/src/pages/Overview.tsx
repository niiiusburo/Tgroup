// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { useCallback, useState, useMemo } from 'react';
import { PatientCheckIn } from '@/components/modules/PatientCheckIn';
import { TodayServicesTable } from '@/components/modules/TodayServicesTable';
import { TodayAppointments } from '@/components/modules/TodayAppointments';
import { EditAppointmentModal } from '@/components/modules/EditAppointmentModal';
import { useOverviewAppointments } from '@/hooks/useOverviewAppointments';
import type { OverviewAppointment } from '@/hooks/useOverviewAppointments';
import { useLocationFilter } from '@/contexts/LocationContext';
import { AppointmentHoverProvider } from '@/contexts/AppointmentHoverContext';
import { QuickAddAppointmentButton } from '@/components/shared/QuickAddAppointmentButton';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { useTimezone } from '@/contexts/TimezoneContext';

/**
 * Overview Dashboard Page — Three-Zone Layout
 * @crossref:route[/]
 * @crossref:used-in[AppRouter]
 * @crossref:uses[QuickAddAppointmentButton]
 *
 * Zone 1 (top-left):    Patient Check-in / Reception — downline status cards
 * Zone 2 (bottom-left): Today's Services / Activity — service table
 * Zone 3 (right):       Today's Appointments — master appointment list
 */
export function Overview() {
  const { selectedLocationId } = useLocationFilter();
  const { formatDate: _formatDate } = useTimezone();

  // Date range picker state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');

  // Compute date label for the picker button
  const dateLabel = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    } else if (viewMode === 'week') {
      // Get week start (Monday)
      const d = new Date(currentDate);
      const day = d.getDay();
      const start = new Date(d);
      start.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return `${start.toLocaleDateString('vi-VN', opts)} — ${end.toLocaleDateString('vi-VN', { ...opts, year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  }, [viewMode, currentDate]);

  // Navigate the calendar
  const navigate = useCallback((dir: 'prev' | 'next') => {
    setCurrentDate((d) => {
      const next = new Date(d);
      if (viewMode === 'day') {
        next.setDate(d.getDate() + (dir === 'next' ? 1 : -1));
      } else if (viewMode === 'week') {
        next.setDate(d.getDate() + (dir === 'next' ? 7 : -7));
      } else {
        next.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
      }
      return next;
    });
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setViewMode('day');
  }, []);

  const {
    isLoading,
    refresh,
    // Zone 3
    zone3Filter,
    setZone3Filter,
    zone3Appointments,
    zone3Counts,
    zone3Search,
    setZone3Search,
    markArrived,
    markCancelled,
    // Zone 1
    zone1Filter,
    setZone1Filter,
    zone1Appointments,
    zone1Counts,
    zone1Search,
    setZone1Search,
    updateCheckInStatus,
  } = useOverviewAppointments(selectedLocationId);

  const [editingAppointment, setEditingAppointment] = useState<OverviewAppointment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditClick = useCallback((appointment: OverviewAppointment) => {
    setEditingAppointment(appointment);
    setIsEditModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingAppointment(null);
  }, []);

  const handleEditAppointmentSaved = useCallback(() => {
    // Refresh the appointments list after editing
    refresh();
    handleModalClose();
  }, [refresh, handleModalClose]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <AppointmentHoverProvider>
      {/* Header: View tabs + DateRangePicker + Quick Add */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        {/* View mode tabs */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          {(['day', 'week', 'month'] as const).map((mode) => {
            const labels = { day: 'Ngày', week: 'Tuần', month: 'Tháng' };
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  viewMode === mode
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>

        {/* Date Range Picker */}
        <DateRangePicker
          viewMode={viewMode}
          dateLabel={dateLabel}
          onDateChange={setCurrentDate}
          currentDate={currentDate}
          navigate={navigate}
          goToToday={goToToday}
        />

        {/* Quick Add */}
        <QuickAddAppointmentButton onSuccess={refresh} size="sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 min-h-0 lg:h-[calc(100vh-120px)]">
        {/* Left column: Zone 1 + Zone 2 stacked */}
        <div className="flex flex-col gap-6 min-h-0 overflow-y-auto">
          {/* Zone 1: Patient Check-in */}
          <PatientCheckIn
            appointments={zone1Appointments}
            filter={zone1Filter}
            onFilterChange={setZone1Filter}
            searchTerm={zone1Search}
            onSearchChange={setZone1Search}
            counts={zone1Counts}
            onUpdateStatus={updateCheckInStatus}
            onEditClick={handleEditClick}
          />

          {/* Zone 2: Today's Services */}
          <TodayServicesTable locationId={selectedLocationId} />
        </div>

        {/* Right column: Zone 3 — full height */}
        <div className="min-h-0">
          <TodayAppointments
            appointments={zone3Appointments}
            filter={zone3Filter}
            onFilterChange={setZone3Filter}
            searchTerm={zone3Search}
            onSearchChange={setZone3Search}
            counts={zone3Counts}
            onMarkArrived={markArrived}
            onMarkCancelled={markCancelled}
            onEditSaved={handleEditAppointmentSaved}
            onEditClick={handleEditClick}
          />
        </div>
      </div>

      {/* Shared Edit Modal for both Zone 1 and Zone 3 */}
      <EditAppointmentModal
        appointment={editingAppointment}
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        onSaved={handleEditAppointmentSaved}
      />
    </AppointmentHoverProvider>
  );
}
