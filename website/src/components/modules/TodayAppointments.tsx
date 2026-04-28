/**
 * TodayAppointments - Zone 3: Today's appointment sidebar
 * @crossref:used-in[Overview]
 *
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║  APPOINTMENT MODULE FAMILY — @crossref:related[]                       ║
 * ╠════════════════════════════════════════════════════════════════════════╣
 * ║  @crossref:related[AppointmentFormShell] — opens edit modal            ║
 * ║  @crossref:color-source[constants/index.ts APPOINTMENT_CARD_COLORS]    ║
 * ║    • Card colors come from constants — DO NOT duplicate locally        ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 *
 * Shows all appointments for the day, filtered by location.
 * Filter tabs: All / Arrived / Canceled
 * All start as "Scheduled" in the morning.
 * Two actions per card: Edit (pencil) and Check-in (person icon).
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type { OverviewAppointment, Zone3Filter } from '@/hooks/useOverviewAppointments';
import { AppointmentFormShell, overviewAppointmentToFormData } from '@/components/appointments/unified';
import { AppointmentCard } from './TodayAppointmentCard';

interface TodayAppointmentsProps {
  readonly appointments: readonly OverviewAppointment[];
  readonly filter: Zone3Filter;
  readonly onFilterChange: (filter: Zone3Filter) => void;
  readonly searchTerm?: string;
  readonly onSearchChange?: (term: string) => void;
  readonly counts: {all: number;arrived: number;cancelled: number;};
  readonly onMarkArrived: (id: string) => void;
  readonly onMarkCancelled: (id: string) => void;
  readonly onEditSaved?: () => void;
  readonly onEditClick?: (appointment: OverviewAppointment) => void;
}

export function TodayAppointments({
  appointments,
  filter,
  onFilterChange,
  searchTerm = '',
  onSearchChange,
  counts,
  onMarkArrived,
  onMarkCancelled,
  onEditSaved,
  onEditClick
}: TodayAppointmentsProps) {
  const { t } = useTranslation();
  const FILTER_TABS: {key: Zone3Filter;label: string;}[] = [
  { key: 'all', label: t('overview:zone3.filterAll') },
  { key: 'arrived', label: t('overview:zone3.filterArrived') },
  { key: 'cancelled', label: t('overview:zone3.filterCancelled') }];

  const [editingAppointment, setEditingAppointment] = useState<OverviewAppointment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditClick = (appointment: OverviewAppointment) => {
    if (onEditClick) {
      onEditClick(appointment);
      return;
    }
    setEditingAppointment(appointment);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setEditingAppointment(null);
  };

  const handleModalSaved = () => {
    // Call parent refresh function
    onEditSaved?.();
    handleModalClose();
  };

  return (
    <section
      data-testid="today-appointments-panel"
      className="bg-white rounded-2xl border border-gray-200 h-full min-h-0 max-h-[calc(100vh-8rem)] flex flex-col overflow-hidden"
      aria-labelledby="today-appointments-title"
    >
      {/* Gradient Header */}
      <div className="relative bg-primary px-5 pt-5 pb-4">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 right-8 w-16 h-16 bg-white/10 rounded-full translate-y-1/2" />
        
        <h2 id="today-appointments-title" className="text-base font-bold text-white uppercase tracking-wide mb-3">
          {t('overview:zone3.title')}
        </h2>

        <div className="flex flex-col gap-3">
          {/* Filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_TABS.map((tab) => {
              const count = counts[tab.key];
              const isActive = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onFilterChange(tab.key)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${isActive ?
                  'bg-white text-purple-700 shadow-lg' :
                  'bg-white/20 text-white hover:bg-white/30'}
                  `
                  }>
                  
                  {tab.label} · {count}
                </button>);

            })}
          </div>

          {/* Quick search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={t('searchPlaceholder', {ns: 'appointments'})}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-white/20 border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/30 transition-all" />
            
          </div>
        </div>
      </div>

      {/* Appointment list (scrollable) */}
      <div
        data-testid="today-appointments-list"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-5 space-y-2.5"
      >
        {appointments.length === 0 &&
        <p className="text-center text-gray-400 text-sm py-8">{t('overview:zone3.noPatients')}</p>
        }

        {appointments.map((apt) =>
        <AppointmentCard
          key={apt.id}
          appointment={apt}
          onMarkArrived={onMarkArrived}
          onMarkCancelled={onMarkCancelled}
          onEdit={handleEditClick} />

        )}

        {/* Edit Modal */}
        <AppointmentFormShell
          key={editingAppointment?.id ?? 'edit'}
          mode="edit"
          isOpen={isEditModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSaved}
          initialData={editingAppointment ? overviewAppointmentToFormData(editingAppointment) : undefined}
          customerReadOnly
        />
        
      </div>
    </section>);

}
