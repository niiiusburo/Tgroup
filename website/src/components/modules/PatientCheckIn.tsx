/**
 * PatientCheckIn - Zone 1: Treatment tracker for arrived patients
 * @crossref:used-in[Overview]
 *
 * Only shows patients who have been marked "Arrived" in Zone 3.
 * Downline status: Chờ khám (waiting) → Đang khám (in-treatment) → Hoàn thành (done)
 * Status is changed via dropdown on the status badge.
 */

import { useState, useEffect, useRef } from 'react';
import { Clock, User } from 'lucide-react';
import type { OverviewAppointment, CheckInStatus, Zone1Filter } from '@/hooks/useOverviewAppointments';
import { useAppointmentHover } from '@/contexts/AppointmentHoverContext';

interface PatientCheckInProps {
  readonly appointments: readonly OverviewAppointment[];
  readonly filter: Zone1Filter;
  readonly onFilterChange: (filter: Zone1Filter) => void;
  readonly counts: { all: number; waiting: number; 'in-treatment': number; done: number };
  readonly onUpdateStatus: (id: string, status: CheckInStatus) => void;
}

const FILTER_TABS: { key: Zone1Filter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'waiting', label: 'Chờ khám' },
  { key: 'in-treatment', label: 'Đang khám' },
  { key: 'done', label: 'Hoàn thành' },
];

const STATUS_CONFIG: Record<CheckInStatus, { label: string; bg: string; text: string; border: string }> = {
  waiting: {
    label: 'Chờ khám',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  'in-treatment': {
    label: 'Đang khám',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  done: {
    label: 'Hoàn thành',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
};

export function PatientCheckIn({
  appointments,
  filter,
  onFilterChange,
  counts,
  onUpdateStatus,
}: PatientCheckInProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">
          Patient Check-in / Reception
        </h2>

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
                  px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                  ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                {tab.label} · {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient card grid */}
      <div className="px-5 pb-5">
        {appointments.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">
            No arrived patients yet. Mark patients as arrived in Today's Appointments.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {appointments.map((apt) => (
              <PatientCard
                key={apt.id}
                appointment={apt}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Individual Patient Card ────────────────────────────────────

interface PatientCardProps {
  readonly appointment: OverviewAppointment;
  readonly onUpdateStatus: (id: string, status: CheckInStatus) => void;
}

function PatientCard({ appointment, onUpdateStatus }: PatientCardProps) {
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

  // Scroll into view when highlighted
  useEffect(() => {
    if (isHighlighted && cardRef.current && typeof cardRef.current.scrollIntoView === 'function') {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  const handleMouseEnter = () => {
    setHoveredId(appointment.id);
    // Scroll to matching appointment in Today's Appointments
    scrollToAppointment(appointment.id);
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        border rounded-xl p-3.5 transition-all relative cursor-pointer
        ${isHighlighted 
          ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50/50 border-blue-300' 
          : 'border-gray-200 bg-gray-50/50 hover:shadow-sm'
        }
      `}
    >
      {/* Status badge — clickable to open dropdown */}
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`
          inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer
          ${config.bg} ${config.text} ${config.border}
        `}
      >
        {config.label} <span className="text-[10px] opacity-60">▾</span>
      </button>

      {/* Status change dropdown */}
      {dropdownOpen && (
        <div className="absolute top-2 left-2 right-2 bg-white border border-gray-200 rounded-xl p-3.5 shadow-lg z-10">
          <div className="text-xs font-bold text-gray-700 mb-2.5">Chuyển trạng thái</div>
          {(['waiting', 'in-treatment', 'done'] as CheckInStatus[]).map((status) => {
            const isSelected = currentStatus === status;
            return (
              <label
                key={status}
                className="flex items-center gap-2.5 py-2 text-sm text-gray-600 cursor-pointer hover:text-blue-600"
                onClick={() => {
                  onUpdateStatus(appointment.id, status);
                  setDropdownOpen(false);
                }}
              >
                <span
                  className={`
                    w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                    ${isSelected ? 'border-blue-600' : 'border-gray-300'}
                  `}
                >
                  {isSelected && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                </span>
                {STATUS_CONFIG[status].label}
              </label>
            );
          })}
          <div className="flex gap-2 mt-3 justify-end">
            <button
              type="button"
              onClick={() => setDropdownOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Patient info */}
      <div className="mt-2.5">
        <div className="text-sm font-semibold text-gray-800 truncate">{appointment.customerName}</div>
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
          <User className="w-3 h-3" />
          <span>{appointment.doctorName}</span>
          <span className="mx-1">·</span>
          <Clock className="w-3 h-3" />
          <span>{appointment.time}</span>
        </div>
        {appointment.note && (
          <div className="text-xs text-gray-400 mt-1 truncate">{appointment.note}</div>
        )}
      </div>
    </div>
  );
}
