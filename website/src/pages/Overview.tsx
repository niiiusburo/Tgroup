// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PatientCheckIn } from '@/components/modules/PatientCheckIn';
import { TodayServicesTable } from '@/components/modules/TodayServicesTable';
import { TodayAppointments } from '@/components/modules/TodayAppointments';
import { useOverviewAppointments } from '@/hooks/useOverviewAppointments';
import type { OverviewAppointment } from '@/hooks/useOverviewAppointments';
import { useLocationFilter } from '@/contexts/LocationContext';
import { AppointmentHoverProvider, useAppointmentHover } from '@/contexts/AppointmentHoverContext';
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
    appointments,
    isLoading,
    refresh,
    // Zone 3
    zone3Filter,
    setZone3Filter,
    zone3Appointments,
    zone3Counts,
    setZone3Search,
    markArrived,
    markCancelled,
    // Zone 1
    zone1Filter,
    setZone1Filter,
    zone1Appointments,
    zone1Counts,
    setZone1Search,
    updateCheckInStatus,
  } = useOverviewAppointments(selectedLocationId);

  const [editingAppointment, setEditingAppointment] = useState<OverviewAppointment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [overviewSearch, setOverviewSearch] = useState('');

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

  const handleOverviewSearchChange = useCallback((term: string) => {
    setOverviewSearch(term);
    setZone3Search(term);
    setZone1Search(term);
    if (term.trim()) {
      setZone3Filter('all');
      setZone1Filter('all');
    }
  }, [setZone1Filter, setZone1Search, setZone3Filter, setZone3Search]);

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
    <AppointmentHoverProvider>
      <div className="flex items-center justify-end mb-4">
        <QuickAddAppointmentButton onSuccess={refresh} size="sm" />
      </div>

      <OverviewStickyAppointmentSearch
        appointments={appointments}
        searchTerm={overviewSearch}
        onSearchChange={handleOverviewSearchChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 min-h-0 lg:h-[calc(100vh-120px)]">
        {/* Left column: Zone 1 + Zone 2 stacked */}
        <div className="flex flex-col gap-6 min-h-0 overflow-y-auto">
          {/* Zone 1: Patient Check-in */}
          <PatientCheckIn
            appointments={zone1Appointments}
            filter={zone1Filter}
            onFilterChange={setZone1Filter}
            counts={zone1Counts}
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
    </AppointmentHoverProvider>
  );
}

function getAppointmentSearchText(appointment: OverviewAppointment): string {
  return [
    appointment.customerName,
    appointment.customerPhone,
    appointment.doctorName,
    appointment.assistantName,
    appointment.dentalAideName,
    appointment.locationName,
    appointment.time,
    appointment.note,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

interface OverviewStickyAppointmentSearchProps {
  readonly appointments: readonly OverviewAppointment[];
  readonly searchTerm: string;
  readonly onSearchChange: (term: string) => void;
}

function OverviewStickyAppointmentSearch({
  appointments,
  searchTerm,
  onSearchChange,
}: OverviewStickyAppointmentSearchProps) {
  const { t } = useTranslation('overview');
  const { setHoveredId, scrollToAppointment } = useAppointmentHover();
  const query = searchTerm.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return [];
    return appointments
      .filter((appointment) => getAppointmentSearchText(appointment).includes(query))
      .slice(0, 8);
  }, [appointments, query]);
  const firstMatch = matches[0];

  const focusAppointment = useCallback((appointment: OverviewAppointment) => {
    setHoveredId(appointment.id);
    scrollToAppointment(appointment.id);
  }, [scrollToAppointment, setHoveredId]);

  useEffect(() => {
    if (!query || !firstMatch) {
      setHoveredId(null);
      return undefined;
    }

    setHoveredId(firstMatch.id);
    const scroll = () => scrollToAppointment(firstMatch.id);
    const frame = window.requestAnimationFrame
      ? window.requestAnimationFrame(scroll)
      : window.setTimeout(scroll, 0);

    return () => {
      if (window.cancelAnimationFrame && typeof frame === 'number') {
        window.cancelAnimationFrame(frame);
      } else {
        window.clearTimeout(frame);
      }
    };
  }, [firstMatch, query, scrollToAppointment, setHoveredId]);

  return (
    <section
      className="sticky top-16 z-40 mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
      aria-label={t('stickySearch.label')}
      data-testid="overview-sticky-search"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-700">
          <Search className="h-4 w-4 text-primary" />
          <span>{t('stickySearch.title')}</span>
        </div>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && firstMatch) focusAppointment(firstMatch);
            }}
            placeholder={t('stickySearch.placeholder')}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label={t('stickySearch.clear')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
