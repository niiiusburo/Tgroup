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

import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, User, Search, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WaitTimer } from '@/components/appointments/WaitTimer';
import { CustomerNameLink } from '@/components/shared/CustomerNameLink';
import type { OverviewAppointment, CheckInStatus, Zone1Filter } from '@/hooks/useOverviewAppointments';
import { useAppointmentHover } from '@/contexts/AppointmentHoverContext';
import { parseAppointmentNote } from '@/lib/appointmentNotes';

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


const STATUS_CONFIG: Record<CheckInStatus, {labelKey: string;bg: string;text: string;border: string;dot: string;}> = {
  waiting: {
    labelKey: 'overview:zone1.filterWaiting',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200/80',
    dot: 'bg-amber-400'
  },
  'in-treatment': {
    labelKey: 'overview:zone1.filterInProgress',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200/80',
    dot: 'bg-sky-400'
  },
  done: {
    labelKey: 'overview:zone1.filterCompleted',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    dot: 'bg-emerald-400'
  }
};

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
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all" />
            
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

        <div ref={doneSectionRef}>
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

// ─── Individual Patient Card ────────────────────────────────────

interface PatientCardProps {
  readonly appointment: OverviewAppointment;
  readonly onUpdateStatus: (id: string, status: CheckInStatus, onSuccess?: () => void) => void;
  readonly onEditClick?: (appointment: OverviewAppointment) => void;
  readonly onDone?: () => void;
}

function PatientCard({ appointment, onUpdateStatus, onEditClick, onDone }: PatientCardProps) {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { hoveredId, setHoveredId, registerRef, scrollToAppointment } = useAppointmentHover();
  const cardRef = useRef<HTMLDivElement>(null);
  const currentStatus = appointment.checkInStatus ?? 'waiting';
  const config = STATUS_CONFIG[currentStatus];
  const isHighlighted = hoveredId === appointment.id;

  // Register this card's ref for scrolling
  useEffect(() => {
    registerRef(appointment.id, cardRef.current);
    return () => registerRef(appointment.id, null);
  }, [appointment.id, registerRef]);

  // Scroll into view when highlighted or changed to done
  useEffect(() => {
    if (isHighlighted && cardRef.current && typeof cardRef.current.scrollIntoView === 'function') {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  useEffect(() => {
    if (currentStatus === 'done' && cardRef.current && typeof cardRef.current.scrollIntoView === 'function') {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStatus]);

  const handleMouseEnter = () => {
    setHoveredId(appointment.id);
    // Scroll to matching appointment in Today's Appointments
    scrollToAppointment(appointment.id);
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
  };

  const parsed = parseAppointmentNote(appointment.note || '');

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onEditClick?.(appointment)}
      className={`
        border rounded-xl p-3.5 transition-all relative cursor-pointer h-full flex flex-col
        ${isHighlighted ?
      'ring-2 ring-blue-500 ring-offset-2 bg-blue-50/50 border-blue-300' :
      'border-gray-200 bg-gray-50/50 hover:shadow-sm'}
      `
      }>
      
      {/* Status badge — clickable to open dropdown */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDropdownOpen(!dropdownOpen);
        }}
        className={`
          inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer
          ${config.bg} ${config.text} ${config.border}
        `}>
        
        {t(config.labelKey)} <span className="text-[10px] opacity-60">▾</span>
      </button>

      {currentStatus === 'waiting' && appointment.arrivalTime &&
      <div className="mt-2">
          <WaitTimer arrivalTime={appointment.arrivalTime} treatmentStartTime={appointment.treatmentStartTime} compact />
        </div>
      }

      {/* Status change dropdown */}
      {dropdownOpen &&
      <div className="absolute top-2 left-2 right-2 bg-white border border-gray-200 rounded-xl p-3.5 shadow-lg z-10" onClick={(e) => e.stopPropagation()}>
          <div className="text-xs font-bold text-gray-700 mb-2.5">{t('overview:zone1.changeStatus')}</div>
          {(['waiting', 'in-treatment', 'done'] as CheckInStatus[]).map((status) => {
          const isSelected = currentStatus === status;
          return (
            <label
              key={status}
              className="flex items-center gap-2.5 py-2 text-sm text-gray-600 cursor-pointer hover:text-blue-600"
              onClick={() => {
                onUpdateStatus(appointment.id, status, status === 'done' ? onDone : undefined);
                setDropdownOpen(false);
              }}>
              
                <span
                className={`
                    w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                    ${isSelected ? 'border-blue-600' : 'border-gray-300'}
                  `}>
                
                  {isSelected && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                </span>
                {t(STATUS_CONFIG[status].labelKey)}
              </label>);

        })}
          <div className="flex gap-2 mt-3 justify-end">
            <button
            type="button"
            onClick={() => setDropdownOpen(false)}
            className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            

          </button>
          </div>
        </div>
      }

      {/* Patient info — NO truncate: display full name per layout lock */}
      <div className="mt-2.5 flex-1 flex flex-col gap-2">
        <div className="text-sm font-semibold text-gray-800 break-words">
          <CustomerNameLink customerId={appointment.customerId}>{appointment.customerName}</CustomerNameLink>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <User className="w-3 h-3" />
          <span>{appointment.doctorName}</span>
          <span className="mx-1">·</span>
          <Clock className="w-3 h-3" />
          <span>{appointment.time}</span>
        </div>

        {/* Duration + Type pills */}
        {(parsed.duration || parsed.type) &&
        <div className="flex flex-wrap gap-2">
            {parsed.duration &&
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-gray-200 text-[11px] text-gray-600">
                <Clock className="w-3 h-3 text-gray-400" />
                {parsed.duration}
              </span>
          }
            {parsed.type &&
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-gray-200 text-[11px] text-gray-600">
                <User className="w-3 h-3 text-gray-400" />
                {parsed.type}
              </span>
          }
          </div>
        }

        {/* Free-text notes */}
        {parsed.freeText &&
        <div className="rounded-r-lg rounded-l-md bg-amber-50/40 border border-gray-100 border-l-4 border-l-amber-200 p-2 text-xs text-gray-600 break-words whitespace-pre-wrap flex items-start gap-1.5">
            <FileText className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
            <span>{parsed.freeText}</span>
          </div>
        }
      </div>
    </div>);

}