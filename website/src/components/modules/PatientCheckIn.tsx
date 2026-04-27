/**
 * PatientCheckIn - Zone 1: Treatment tracker for arrived patients
 * @crossref:used-in[Overview]
 *
 * Only shows patients who have been marked "Arrived" in Zone 3.
 * Downline status: Chờ khám (waiting) → Đang khám (in-treatment) → Hoàn thành (done)
 * Status is changed via dropdown on the status badge.
 *
 * ⚠️ LAYOUT LOCK: Do NOT add width/height constraints or truncate classes to PatientCard.
 *    The card content (customer name, doctor info, notes) MUST display fully without truncation.
 *    Any changes to card dimensions require explicit user approval.
 */

import { useRef, useCallback } from 'react';
import { User, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { OverviewAppointment, CheckInStatus, Zone1Filter } from '@/hooks/useOverviewAppointments';
import { PatientCard } from './PatientCheckInCard';

export { parseAppointmentNote } from '@/lib/appointmentNotes';

interface PatientCheckInProps {
  readonly appointments: readonly OverviewAppointment[];
  readonly filter: Zone1Filter;
  readonly onFilterChange: (filter: Zone1Filter) => void;
  readonly searchTerm?: string;
  readonly onSearchChange?: (term: string) => void;
  readonly counts: {all: number;waiting: number;'in-treatment': number;done: number;};
  readonly onUpdateStatus: (id: string, status: CheckInStatus, onSuccess?: () => void) => void;
  readonly onEditClick?: (appointment: OverviewAppointment) => void;
}

const FILTER_TABS: {key: Zone1Filter;labelKey: string;}[] = [
{ key: 'all', labelKey: 'overview:zone1.filterAll' },
{ key: 'waiting', labelKey: 'overview:zone1.filterWaiting' },
{ key: 'in-treatment', labelKey: 'overview:zone1.filterInProgress' },
{ key: 'done', labelKey: 'overview:zone1.filterCompleted' }];


export function PatientCheckIn({
  appointments,
  filter,
  onFilterChange,
  searchTerm = '',
  onSearchChange,
  counts,
  onUpdateStatus,
  onEditClick
}: PatientCheckInProps) {
  const { t } = useTranslation();
  const doneSectionRef = useRef<HTMLDivElement>(null);
  const scrollToDone = useCallback(() => {
    doneSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm">
      {/* Header */}
      <div className="px-6 pt-5 pb-4">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          {t('overview:zone1.title')}
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {FILTER_TABS.map((tab) => {
              const count = counts[tab.key];
              const isActive = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onFilterChange(tab.key)}
                  className={`
                    px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                    ${isActive ?
                  'bg-slate-800 text-white shadow-sm' :
                  'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}
                  `
                  }>
                  {t(tab.labelKey)} · {count}
                </button>);

            })}
          </div>

          {/* Quick search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={t('overview:zone1.searchPlaceholder')}
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all" />
          </div>
        </div>
      </div>

      {/* Patient card grid */}
      <div className="px-6 pb-6">
        {appointments.length === 0 ?
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">{t('overview:zone1.noPatients')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('overview:zone1.noPatientsHint')}</p>
          </div> :

        <div
          ref={doneSectionRef}
          data-testid="patient-checkin-scroll-region"
          className="max-h-[24rem] overflow-y-auto overscroll-contain pr-2 -mr-2"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {appointments.map((apt) =>
            <PatientCard
              key={apt.id}
              appointment={apt}
              onUpdateStatus={onUpdateStatus}
              onEditClick={onEditClick}
              onDone={scrollToDone} />

            )}
            </div>
          </div>
        }
      </div>
    </div>);

}
