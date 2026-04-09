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
  readonly onEditClick?: (appointment: OverviewAppointment) => void;
}

const FILTER_TABS: { key: Zone1Filter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'waiting', label: 'Chờ khám' },
  { key: 'in-treatment', label: 'Đang khám' },
  { key: 'done', label: 'Hoàn thành' },
];

const STATUS_CONFIG: Record<CheckInStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  waiting: {
    label: 'Chờ khám',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200/80',
    dot: 'bg-amber-400',
  },
  'in-treatment': {
    label: 'Đang khám',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200/80',
    dot: 'bg-sky-400',
  },
  done: {
    label: 'Hoàn thành',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    dot: 'bg-emerald-400',
  },
};

export function PatientCheckIn({
  appointments,
  filter,
  onFilterChange,
  counts,
  onUpdateStatus,
  onEditClick,
}: PatientCheckInProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm">
      {/* Header */}
      <div className="px-6 pt-5 pb-4">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Đón tiếp / Tiếp nhận bệnh nhân
        </h2>

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
                  ${isActive
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
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
      <div className="px-6 pb-6">
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">Chưa có bệnh nhân đến</p>
            <p className="text-xs text-slate-400 mt-1">Đánh dấu "Đã đến" trong lịch hẹn hôm nay</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {appointments.map((apt) => (
              <PatientCard
                key={apt.id}
                appointment={apt}
                onUpdateStatus={onUpdateStatus}
                onEditClick={onEditClick}
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
  readonly onEditClick?: (appointment: OverviewAppointment) => void;
}

function PatientCard({ appointment, onUpdateStatus, onEditClick }: PatientCardProps) {
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
      onClick={() => onEditClick?.(appointment)}
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
        onClick={(e) => {
          e.stopPropagation();
          setDropdownOpen(!dropdownOpen);
        }}
        className={`
          inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer
          ${config.bg} ${config.text} ${config.border}
        `}
      >
        {config.label} <span className="text-[10px] opacity-60">▾</span>
      </button>

      {/* Status change dropdown */}
      {dropdownOpen && (
        <div className="absolute top-2 left-2 right-2 bg-white border border-gray-200 rounded-xl p-3.5 shadow-lg z-10" onClick={(e) => e.stopPropagation()}>
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

      {/* Patient info — NO truncate: display full name per layout lock */}
      <div className="mt-2.5">
        <div className="text-sm font-semibold text-gray-800 break-words">{appointment.customerName}</div>
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
          <User className="w-3 h-3" />
          <span>{appointment.doctorName}</span>
          <span className="mx-1">·</span>
          <Clock className="w-3 h-3" />
          <span>{appointment.time}</span>
        </div>
        {appointment.note && (
          <div className="text-xs text-gray-400 mt-1 break-words">{appointment.note}</div>
        )}
      </div>
    </div>
  );
}
