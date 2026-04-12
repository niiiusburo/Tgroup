// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { useCallback, useState } from 'react';
import { WalkInForm } from '@/components/forms/WalkInForm';
import { PatientCheckIn } from '@/components/modules/PatientCheckIn';
import { TodayServicesTable } from '@/components/modules/TodayServicesTable';
import { TodayAppointments } from '@/components/modules/TodayAppointments';
import { EditAppointmentModal } from '@/components/modules/EditAppointmentModal';
import { useOverviewAppointments } from '@/hooks/useOverviewAppointments';
import type { OverviewAppointment } from '@/hooks/useOverviewAppointments';
import { useLocationFilter } from '@/contexts/LocationContext';
import { AppointmentHoverProvider } from '@/contexts/AppointmentHoverContext';
import { QuickAddAppointmentButton } from '@/components/shared/QuickAddAppointmentButton';
import { useLocations } from '@/hooks/useLocations';

/**
 * Overview Dashboard Page — Three-Zone Layout
 * @crossref:route[/]
 * @crossref:used-in[AppRouter]
 * @crossref:uses[QuickAddAppointmentButton, WalkInForm]
 *
 * Zone 1 (top-left):    Patient Check-in / Reception — downline status cards
 * Zone 2 (bottom-left): Today's Services / Activity — service table
 * Zone 3 (right):       Today's Appointments — master appointment list
 */
export function Overview() {
  const { selectedLocationId } = useLocationFilter();
  const { getLocationById } = useLocations();

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
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);

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

  const selectedLocation = selectedLocationId ? getLocationById(selectedLocationId) : null;

  return (
    <AppointmentHoverProvider>
      {/* Quick Add Appointment Button — Top Right */}
      <div className="flex justify-end mb-6 gap-3">
        <button
          onClick={() => setIsWalkInOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-lg shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-emerald-500 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-200 hover:scale-105"
        >
          <span>Khách vãng lai</span>
        </button>
        <QuickAddAppointmentButton
          onSuccess={refresh}
          size="sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 min-h-0 lg:h-[calc(100vh-100px)]">
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

      {/* Walk-in Patient Modal */}
      {isWalkInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsWalkInOpen(false)}
          />
          <div className="relative animate-in zoom-in-95 duration-200">
            <WalkInForm
              locationId={selectedLocationId === 'all' ? undefined : selectedLocationId}
              locationName={selectedLocation?.name}
              onSuccess={() => {
                setIsWalkInOpen(false);
                refresh();
              }}
              onCancel={() => setIsWalkInOpen(false)}
            />
          </div>
        </div>
      )}
    </AppointmentHoverProvider>
  );
}
