// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { useCallback, useState } from 'react';
import { PatientCheckIn } from '@/components/modules/PatientCheckIn';
import { TodayServicesTable } from '@/components/modules/TodayServicesTable';
import { TodayAppointments } from '@/components/modules/TodayAppointments';
import { useOverviewAppointments } from '@/hooks/useOverviewAppointments';
import type { OverviewAppointment } from '@/hooks/useOverviewAppointments';
import { useLocationFilter } from '@/contexts/LocationContext';
import { QuickAddAppointmentButton } from '@/components/shared/QuickAddAppointmentButton';
import { AppointmentFormShell } from '@/components/appointments/unified';
import { overviewAppointmentToFormData } from '@/components/appointments/unified';
import { useEmployees } from '@/hooks/useEmployees';

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

  // Pre-fetch employees so the edit form selectors are already populated when opened
  const { employees: allEmployees } = useEmployees();

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

  const editFormInitialData = editingAppointment
    ? overviewAppointmentToFormData(editingAppointment)
    : undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end mb-4">
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
            counts={zone1Counts}
            searchTerm={zone1Search}
            onSearchChange={setZone1Search}
            onUpdateStatus={updateCheckInStatus}
            onEditClick={handleEditClick}
          />

          {/* Zone 2: Today's Services */}
          <TodayServicesTable locationId={selectedLocationId} />
        </div>

        {/* Right column: Zone 3 — full height */}
        <div className="min-h-0 h-full">
          <TodayAppointments
            appointments={zone3Appointments}
            filter={zone3Filter}
            onFilterChange={setZone3Filter}
            counts={zone3Counts}
            searchTerm={zone3Search}
            onSearchChange={setZone3Search}
            onMarkArrived={markArrived}
            onMarkCancelled={markCancelled}
            onEditSaved={handleEditAppointmentSaved}
            onEditClick={handleEditClick}
          />
        </div>
      </div>

      {/* Unified Edit Modal for both Zone 1 and Zone 3 */}
      <AppointmentFormShell
        key={editingAppointment?.id ?? 'overview-edit'}
        mode="edit"
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        onSuccess={handleEditAppointmentSaved}
        initialData={editFormInitialData}
        customerReadOnly
        employees={allEmployees}
      />
    </>
  );
}
