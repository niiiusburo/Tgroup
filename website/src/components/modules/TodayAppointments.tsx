/**
 * TodayAppointments - Zone 3: Today's appointment sidebar
 * @crossref:used-in[Overview]
 *
 * Shows all appointments for the day, filtered by location.
 * Filter tabs: All / Arrived / Canceled
 * All start as "Scheduled" in the morning.
 * Two actions per card: Edit (pencil) and Check-in (person icon).
 */

import { useState } from 'react';
import { Pencil, UserCheck, Phone, Clock, User, X } from 'lucide-react';
import type { OverviewAppointment, Zone3Filter } from '@/hooks/useOverviewAppointments';

interface TodayAppointmentsProps {
  readonly appointments: readonly OverviewAppointment[];
  readonly filter: Zone3Filter;
  readonly onFilterChange: (filter: Zone3Filter) => void;
  readonly counts: { all: number; arrived: number; cancelled: number };
  readonly onMarkArrived: (id: string) => void;
  readonly onMarkCancelled: (id: string) => void;
  readonly onEdit: (appointment: OverviewAppointment) => void;
}

const FILTER_TABS: { key: Zone3Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'cancelled', label: 'Canceled' },
];

export function TodayAppointments({
  appointments,
  filter,
  onFilterChange,
  counts,
  onMarkArrived,
  onMarkCancelled,
  onEdit,
}: TodayAppointmentsProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">
          Today's Appointments
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
                  px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                  ${isActive
                    ? 'bg-emerald-500 text-white'
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

      {/* Appointment list (scrollable) */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2.5">
        {appointments.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No appointments</p>
        )}

        {appointments.map((apt) => (
          <AppointmentCard
            key={apt.id}
            appointment={apt}
            onMarkArrived={onMarkArrived}
            onMarkCancelled={onMarkCancelled}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Individual Appointment Card ────────────────────────────────

interface AppointmentCardProps {
  readonly appointment: OverviewAppointment;
  readonly onMarkArrived: (id: string) => void;
  readonly onMarkCancelled: (id: string) => void;
  readonly onEdit: (appointment: OverviewAppointment) => void;
}

function AppointmentCard({ appointment, onMarkArrived, onMarkCancelled, onEdit }: AppointmentCardProps) {
  const isArrived = appointment.topStatus === 'arrived';
  const isCancelled = appointment.topStatus === 'cancelled';

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Top row: name + action buttons */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5">
        <span className="text-sm font-semibold text-blue-600 truncate flex-1 mr-2">
          {appointment.customerName || 'No Name'}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Edit button */}
          <button
            type="button"
            onClick={() => onEdit(appointment)}
            className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors"
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
                w-7 h-7 rounded-lg border flex items-center justify-center transition-colors
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

      {/* Detail row */}
      <div
        className={`
          mx-2.5 mb-2.5 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2
          ${isArrived ? 'bg-orange-50' : isCancelled ? 'bg-red-50' : 'bg-gray-50'}
        `}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
            <User className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="truncate">{appointment.doctorName}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {appointment.time}
            </span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <Phone className="w-3 h-3" />
              {appointment.customerPhone}
            </span>
          </div>
        </div>

        {/* Arrived badge */}
        {isArrived && (
          <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
            Đã đến
          </span>
        )}

        {/* Cancelled badge */}
        {isCancelled && (
          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
            Đã hủy
          </span>
        )}
      </div>
    </div>
  );
}
