/**
 * Appointments Management Page
 * @crossref:route[/appointments]
 * @crossref:used-in[App]
 * @crossref:uses[AppointmentForm, StatusBadge, CheckInFlow, WaitTimer, ConvertToService]
 */

import { useState } from 'react';
import {
  CalendarCheck, Plus, Search, Filter,
  ChevronDown, ChevronUp, Clock, Users, Stethoscope, CheckCircle2,
} from 'lucide-react';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import { AppointmentForm, type AppointmentFormData } from '@/components/appointments/AppointmentForm';
import { CheckInFlow } from '@/components/appointments/CheckInFlow';
import { WaitTimer } from '@/components/appointments/WaitTimer';
import { ConvertToService } from '@/components/appointments/ConvertToService';
import { useAppointments, type AppointmentFilter } from '@/hooks/useAppointments';
import {
  CHECK_IN_STATUS_LABELS,
  CHECK_IN_STATUS_STYLES,
} from '@/data/mockAppointments';
import { APPOINTMENT_TYPE_COLORS, APPOINTMENT_TYPE_LABELS } from '@/constants';
import type { AppointmentStatus } from '@/data/mockCalendar';

const STATUS_TABS: { label: string; value: AppointmentFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const STATUS_TO_BADGE: Record<AppointmentStatus, StatusVariant> = {
  scheduled: 'pending',
  confirmed: 'active',
  'in-progress': 'draft',
  completed: 'completed',
  cancelled: 'cancelled',
};

export function Appointments() {
  const {
    appointments,
    stats,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    dateFilter,
    setDateFilter,
    createAppointment,
    advanceCheckIn,
    convertToService,
  } = useAppointments();

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleCreate(data: AppointmentFormData) {
    createAppointment(data);
    setShowForm(false);
  }

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CalendarCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-sm text-gray-500">Manage appointments, check-ins, and status workflow</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Appointment
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5 text-blue-600" />} label="Today Total" value={stats.total} bg="bg-blue-50" />
        <StatCard icon={<Clock className="w-5 h-5 text-amber-600" />} label="Waiting" value={stats.waiting} bg="bg-amber-50" />
        <StatCard icon={<Stethoscope className="w-5 h-5 text-purple-600" />} label="In Treatment" value={stats.inTreatment} bg="bg-purple-50" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} label="Completed" value={stats.completed} bg="bg-green-50" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, doctor, service..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
        {/* Date filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary text-white border-primary'
                : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Appointments list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {appointments.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No appointments found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {appointments.map((apt) => {
              const typeColors = APPOINTMENT_TYPE_COLORS[apt.appointmentType];
              const isExpanded = expandedId === apt.id;

              return (
                <div key={apt.id} className="transition-colors hover:bg-gray-50/50">
                  {/* Row */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(apt.id)}
                    className="w-full text-left p-4 flex items-center gap-4"
                  >
                    {/* Date/Time block */}
                    <div className="w-16 text-center shrink-0">
                      <div className="text-xs text-gray-500">{apt.date.slice(5)}</div>
                      <div className="text-sm font-semibold text-gray-900">{apt.startTime}</div>
                    </div>

                    {/* Type dot + info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${typeColors.dot}`} />
                        <span className="font-medium text-gray-900 truncate">{apt.customerName}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {apt.serviceName} &middot; {apt.doctorName} &middot; {apt.locationName}
                      </div>
                    </div>

                    {/* Check-in status */}
                    <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CHECK_IN_STATUS_STYLES[apt.checkInStatus]}`}>
                      {CHECK_IN_STATUS_LABELS[apt.checkInStatus]}
                    </span>

                    {/* Wait timer compact */}
                    {apt.checkInStatus === 'waiting' && (
                      <WaitTimer arrivalTime={apt.arrivalTime} treatmentStartTime={apt.treatmentStartTime} compact />
                    )}

                    {/* Status badge */}
                    <StatusBadge status={STATUS_TO_BADGE[apt.status]} label={apt.status.replace('-', ' ')} />

                    {/* Expand chevron */}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    }
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 ml-20 space-y-4 border-t border-gray-50">
                      {/* Appointment type badge */}
                      <div className="flex items-center gap-2 pt-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors.bg} ${typeColors.text}`}>
                          {APPOINTMENT_TYPE_LABELS[apt.appointmentType]}
                        </span>
                        <span className="text-xs text-gray-400">
                          {apt.startTime} - {apt.endTime}
                        </span>
                        <span className="text-xs text-gray-400">
                          {apt.customerPhone}
                        </span>
                      </div>

                      {/* Notes */}
                      {apt.notes && (
                        <p className="text-sm text-gray-600">{apt.notes}</p>
                      )}

                      {/* Check-in flow */}
                      <CheckInFlow
                        appointment={apt}
                        onAdvance={advanceCheckIn}
                      />

                      {/* Convert to service */}
                      <ConvertToService
                        appointment={apt}
                        onConvert={convertToService}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Appointment form modal */}
      {showForm && (
        <AppointmentForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

/* -- Internal stat card -- */
interface StatCardProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: number;
  readonly bg: string;
}

function StatCard({ icon, label, value, bg }: StatCardProps) {
  return (
    <div className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
      <div className="p-2 bg-white/60 rounded-lg">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-600">{label}</div>
      </div>
    </div>
  );
}
