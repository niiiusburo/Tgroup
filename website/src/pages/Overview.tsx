// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { useCallback } from 'react';
import { PatientCheckIn } from '@/components/modules/PatientCheckIn';
import { TodayServicesTable } from '@/components/modules/TodayServicesTable';
import { TodayAppointments } from '@/components/modules/TodayAppointments';
import { useOverviewAppointments } from '@/hooks/useOverviewAppointments';
import { useLocationFilter } from '@/contexts/LocationContext';
import { AppointmentHoverProvider } from '@/contexts/AppointmentHoverContext';

/**
 * Overview Dashboard Page — Three-Zone Layout
 * @crossref:route[/]
 * @crossref:used-in[AppRouter]
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
    markArrived,
    markCancelled,
    // Zone 1
    zone1Filter,
    setZone1Filter,
    zone1Appointments,
    zone1Counts,
    updateCheckInStatus,
  } = useOverviewAppointments(selectedLocationId);

  const handleEditAppointmentSaved = useCallback(() => {
    // Refresh the appointments list after editing
    refresh();
  }, [refresh]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <AppointmentHoverProvider>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 min-h-0 lg:h-[calc(100vh-100px)]">
        {/* Left column: Zone 1 + Zone 2 stacked */}
        <div className="flex flex-col gap-5 min-h-0 overflow-y-auto">
          {/* Zone 1: Patient Check-in */}
          <PatientCheckIn
            appointments={zone1Appointments}
            filter={zone1Filter}
            onFilterChange={setZone1Filter}
            counts={zone1Counts}
            onUpdateStatus={updateCheckInStatus}
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
            counts={zone3Counts}
            onMarkArrived={markArrived}
            onMarkCancelled={markCancelled}
            onEditSaved={handleEditAppointmentSaved}
          />
        </div>
      </div>
    </AppointmentHoverProvider>
  );
}
