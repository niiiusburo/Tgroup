/**
 * TodayAppointments - Zone 3: Today's appointment sidebar
 * @crossref:used-in[Overview]
 *
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║  APPOINTMENT MODULE FAMILY — @crossref:related[]                       ║
 * ╠════════════════════════════════════════════════════════════════════════╣
 * ║  @crossref:related[EditAppointmentModal] — opens edit modal            ║
 * ║  @crossref:related[AppointmentForm] — CREATE variant                   ║
 * ║  @crossref:color-source[constants/index.ts APPOINTMENT_CARD_COLORS]    ║
 * ║    • Card colors come from constants — DO NOT duplicate locally        ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 *
 * Shows all appointments for the day, filtered by location.
 * Filter tabs: All / Arrived / Canceled
 * All start as "Scheduled" in the morning.
 * Two actions per card: Edit (pencil) and Check-in (person icon).
 */

import { useState, useEffect, useRef } from 'react';
import { Pencil, UserCheck, Phone, Clock, User } from 'lucide-react';
import type { OverviewAppointment, Zone3Filter } from '@/hooks/useOverviewAppointments';
import { useAppointmentHover } from '@/contexts/AppointmentHoverContext';
import { APPOINTMENT_CARD_COLORS } from '@/constants';
import { EditAppointmentModal } from './EditAppointmentModal';

interface TodayAppointmentsProps {
  readonly appointments: readonly OverviewAppointment[];
  readonly filter: Zone3Filter;
  readonly onFilterChange: (filter: Zone3Filter) => void;
  readonly counts: { all: number; arrived: number; cancelled: number };
  readonly onMarkArrived: (id: string) => void;
  readonly onMarkCancelled: (id: string) => void;
  readonly onEditSaved?: () => void;
}

const FILTER_TABS: { key: Zone3Filter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'arrived', label: 'Đã đến' },
  { key: 'cancelled', label: 'Hủy hẹn' },
];

export function TodayAppointments({
  appointments,
  filter,
  onFilterChange,
  counts,
  onMarkArrived,
  onMarkCancelled,
  onEditSaved,
}: TodayAppointmentsProps) {
  const [editingAppointment, setEditingAppointment] = useState<OverviewAppointment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditClick = (appointment: OverviewAppointment) => {
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
    <div className="bg-white rounded-2xl border border-gray-200 h-full flex flex-col overflow-hidden">
      {/* Gradient Header */}
      <div className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 px-5 pt-5 pb-4">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 right-8 w-16 h-16 bg-white/10 rounded-full translate-y-1/2" />
        
        <h2 className="text-base font-bold text-white uppercase tracking-wide mb-3">
          Lịch hẹn hôm nay
        </h2>

        {/* Filter tabs */}
        <div className="flex gap-1.5">
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
                  ${isActive
                    ? 'bg-white text-purple-700 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                  }
                `}
              >
                {tab.label} · {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointment list (scrollable) */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2.5">
        {appointments.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Không có lịch hẹn</p>
        )}

        {appointments.map((apt) => (
          <AppointmentCard
            key={apt.id}
            appointment={apt}
            onMarkArrived={onMarkArrived}
            onMarkCancelled={onMarkCancelled}
            onEdit={handleEditClick}
          />
        ))}

        {/* Edit Modal */}
        <EditAppointmentModal
          appointment={editingAppointment}
          isOpen={isEditModalOpen}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
        />
      </div>
    </div>
  );
}

// Color mapping uses SINGLE SOURCE OF TRUTH from constants
function getColorConfig(color: string | null | undefined): string {
  if (color && APPOINTMENT_CARD_COLORS[color]) {
    const c = APPOINTMENT_CARD_COLORS[color];
    return `${c.bgHighlight} ${c.border}`;
  }
  return 'bg-gradient-to-br from-gray-100 to-slate-200 border-gray-300';
}

// ─── Individual Appointment Card ────────────────────────────────

interface AppointmentCardProps {
  readonly appointment: OverviewAppointment;
  readonly onMarkArrived: (id: string) => void;
  readonly onMarkCancelled: (id: string) => void;
  readonly onEdit: (appointment: OverviewAppointment) => void;
}

function AppointmentCard({ appointment, onMarkArrived, onMarkCancelled: _onMarkCancelled, onEdit }: AppointmentCardProps) {
  const { hoveredId, setHoveredId, registerRef } = useAppointmentHover();
  const cardRef = useRef<HTMLDivElement>(null);
  const isArrived = appointment.topStatus === 'arrived';
  const isCancelled = appointment.topStatus === 'cancelled';
  const isHighlighted = hoveredId === appointment.id;

  // Register this card's ref for scrolling
  useEffect(() => {
    registerRef(appointment.id, cardRef.current);
    return () => registerRef(appointment.id, null);
  }, [appointment.id, registerRef]);

  const handleMouseEnter = () => {
    setHoveredId(appointment.id);
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
  };

  // Use appointment color if set, otherwise fall back to status-based colors with gradients
  const colorConfig = getColorConfig(appointment.color);

  // Get status badge color
  const statusBadgeColor = isArrived
    ? 'bg-emerald-500 text-white'
    : isCancelled
    ? 'bg-red-500 text-white'
    : 'bg-purple-500 text-white';

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        rounded-xl border overflow-hidden transition-all cursor-pointer
        ${isHighlighted 
          ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-300 shadow-lg' 
          : 'border-gray-200 shadow-sm hover:shadow-md'
        }
      `}
    >
      {/* Top row: name + action buttons */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5 bg-gradient-to-r from-white to-slate-50">
        <span className="text-sm font-bold text-slate-800 truncate flex-1 mr-2">
          {appointment.customerName || 'No Name'}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Edit button */}
          <button
            type="button"
            onClick={() => onEdit(appointment)}
            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-all"
            title="Edit appointment"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Check-in / status button */}
          {!isCancelled && (
            <button
              type="button"
              onClick={() => !isArrived && onMarkArrived(appointment.id)}
              className={`
                w-7 h-7 rounded-lg border flex items-center justify-center transition-all
                ${isArrived
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'border-gray-200 bg-white text-gray-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50'
                }
              `}
              title={isArrived ? 'Arrived' : 'Mark as arrived'}
            >
              <UserCheck className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Detail row with gradient */}
      <div
        className={`
          mx-2.5 mb-2.5 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2 border
          ${colorConfig}
        `}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
            <User className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span className="truncate">{appointment.doctorName}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-500" />
              {appointment.time}
            </span>
            <span className="flex items-center gap-1 text-blue-600 font-semibold">
              <Phone className="w-3 h-3" />
              {appointment.customerPhone}
            </span>
          </div>
        </div>

        {/* Status badge - 3 states only */}
        {isArrived && (
          <span className={`${statusBadgeColor} px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-sm`}>
            Đã đến
          </span>
        )}

        {/* Cancelled badge */}
        {isCancelled && (
          <span className={`${statusBadgeColor} px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-sm`}>
            Hủy hẹn
          </span>
        )}

        {/* Scheduled badge */}
        {!isArrived && !isCancelled && (
          <span className={`${statusBadgeColor} px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-sm`}>
            Đang hẹn
          </span>
        )}
      </div>
    </div>
  );
}
