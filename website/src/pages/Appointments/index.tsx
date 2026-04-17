// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
/**
 * Appointments Management Page
 * @crossref:route[/appointments]
 * @crossref:used-in[App]
 * @crossref:uses[AppointmentForm, StatusBadge, CheckInFlow, WaitTimer, ConvertToService, useLocationFilter]
 */

import { useState } from 'react';
import {
  CalendarCheck, Plus, Search, Filter, Edit2,
  ChevronDown, ChevronUp, Clock, Users, Stethoscope, CheckCircle2,
  Calendar } from
'lucide-react';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@/components/ui/DatePicker';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import { CustomerNameLink } from '@/components/shared/CustomerNameLink';
import { AppointmentForm, type AppointmentFormData } from '@/components/appointments/AppointmentForm';
import { CheckInFlow } from '@/components/appointments/CheckInFlow';
import { WaitTimer } from '@/components/appointments/WaitTimer';
import { ConvertToService } from '@/components/appointments/ConvertToService';
import { useAppointments, type AppointmentFilter } from '@/hooks/useAppointments';
import { useLocationFilter } from '@/contexts/LocationContext';
import {
  CHECK_IN_STATUS_LABELS,
  CHECK_IN_STATUS_STYLES } from
'@/data/mockAppointments';
import { APPOINTMENT_TYPE_COLORS, APPOINTMENT_TYPE_LABELS } from '@/constants';
import type { AppointmentStatus } from '@/data/mockCalendar';

// STATUS_TABS moved inside component for i18n

const STATUS_TO_BADGE: Record<AppointmentStatus, StatusVariant> = {
  scheduled: 'pending',
  confirmed: 'active',
  'in-progress': 'draft',
  completed: 'completed',
  cancelled: 'cancelled'
};

export function Appointments() {
  const { t } = useTranslation('appointments');
  const { selectedLocationId } = useLocationFilter();
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
    updateAppointment,
    advanceCheckIn,
    convertToService
  } = useAppointments(selectedLocationId);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentFormData | null>(null);
  const STATUS_TABS: {label: string;value: AppointmentFilter;}[] = [
  { label: t('all'), value: 'all' },
  { label: t('status.scheduled'), value: 'scheduled' },
  { label: t('status.confirmed'), value: 'confirmed' },
  { label: t('status.inProgress'), value: 'in-progress' },
  { label: t('status.completed'), value: 'completed' },
  { label: t('status.cancelled'), value: 'cancelled' }];


  const [expandedId, setExpandedId] = useState<string | null>(null);
  function toggleExpanded(id: string) {
    setExpandedId((prev) => prev === id ? null : id);
  }

  function handleCreate(data: AppointmentFormData) {
    createAppointment(data);
    setShowForm(false);
  }

  function handleUpdate(data: AppointmentFormData) {
    if (editingAppointmentId) {
      updateAppointment(editingAppointmentId, data);
    }
    setShowForm(false);
    setIsEditMode(false);
    setEditingAppointmentId(null);
    setEditingAppointment(null);
  }

  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);

  function handleEditClick(apt: typeof appointments[0]) {
    setEditingAppointmentId(apt.id);
    setEditingAppointment({
      customerId: apt.customerId,
      customerName: apt.customerName,
      customerPhone: apt.customerPhone,
      doctorId: apt.doctorId,
      doctorName: apt.doctorName,
      assistantId: apt.assistantId,
      assistantName: apt.assistantName,
      dentalAideId: apt.dentalAideId,
      dentalAideName: apt.dentalAideName,
      locationId: apt.locationId,
      locationName: apt.locationName,
      appointmentType: apt.appointmentType,
      serviceName: apt.serviceName,
      serviceId: apt.productId,
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      notes: apt.notes,
      estimatedDuration: apt.estimatedDuration,
      color: apt.color,
      status: apt.status,
    });
    setIsEditMode(true);
    setShowForm(true);
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
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500">{t('list')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsEditMode(false);
            setEditingAppointment(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          
          <Plus className="w-4 h-4" />
          {t('addAppointment')}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5 text-blue-600" />} label={t('checkIn.waiting')} value={stats.total} bg="bg-blue-50" />
        <StatCard icon={<Clock className="w-5 h-5 text-amber-600" />} label={t('checkIn.waiting')} value={stats.waiting} bg="bg-amber-50" />
        <StatCard icon={<Stethoscope className="w-5 h-5 text-purple-600" />} label={t('checkIn.inProgress')} value={stats.inTreatment} bg="bg-purple-50" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} label={t('checkIn.completed')} value={stats.completed} bg="bg-green-50" />
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
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
          
        </div>
        {/* Location filter */}
        {/* Date filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="w-44">
            <DatePicker
              value={dateFilter}
              onChange={setDateFilter}
              placeholder={t('form.date')}
              icon={<Calendar className="w-3.5 h-3.5" />} />
            
          </div>
          {dateFilter &&
          <button
            type="button"
            onClick={() => setDateFilter('')}
            className="text-xs text-gray-500 hover:text-gray-700">
            
              {t('cancel', { ns: 'common' })}
            </button>
          }
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) =>
        <button
          key={tab.value}
          type="button"
          onClick={() => setStatusFilter(tab.value)}
          className={`px-4 py-2 text-sm font-medium rounded-lg border whitespace-nowrap transition-colors ${
          statusFilter === tab.value ?
          'bg-primary text-white border-primary' :
          'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'}`
          }>
          
            {tab.label}
          </button>
        )}
      </div>

      {/* Appointments list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {appointments.length === 0 ?
        <div className="p-8 text-center text-gray-400">
            <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{t('searchPlaceholder')}</p>
          </div> :

        <div className="divide-y divide-gray-100">
            {appointments.map((apt) => {
            const typeColors = APPOINTMENT_TYPE_COLORS[apt.appointmentType];
            const isExpanded = expandedId === apt.id;

            return (
              <div key={apt.id} className="transition-colors hover:bg-gray-50/50">
                  {/* Row */}
                  <div className="w-full text-left p-4 flex items-center gap-4">
                    {/* Date/Time block */}
                    <button type="button" onClick={() => toggleExpanded(apt.id)} className="w-16 text-center shrink-0">
                      <div className="text-xs text-gray-500">{apt.date.slice(5)}</div>
                      <div className="text-sm font-semibold text-gray-900">{apt.startTime}</div>
                    </button>

                    {/* Type dot + info */}
                    <button type="button" onClick={() => toggleExpanded(apt.id)} className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${typeColors.dot}`} />
                        <span className="font-medium text-gray-900 truncate"><CustomerNameLink customerId={apt.customerId}>{apt.customerName}</CustomerNameLink></span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {apt.serviceName} &middot; {apt.doctorName} &middot; {apt.locationName}
                      </div>
                    </button>

                    {/* Check-in status */}
                    <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CHECK_IN_STATUS_STYLES[apt.checkInStatus]}`}>
                      {CHECK_IN_STATUS_LABELS[apt.checkInStatus]}
                    </span>

                    {/* Wait timer compact */}
                    {apt.checkInStatus === 'waiting' &&
                  <WaitTimer arrivalTime={apt.arrivalTime} treatmentStartTime={apt.treatmentStartTime} compact />
                  }

                    {/* Status badge */}
                    <StatusBadge status={STATUS_TO_BADGE[apt.status]} label={apt.status.replace('-', ' ')} />

                    {/* Expand chevron */}
                    <button type="button" onClick={() => toggleExpanded(apt.id)} className="shrink-0 p-1 rounded hover:bg-gray-100 transition-colors" aria-label={isExpanded ? t("thuGnChiTit") : t("mRngChiTit")}>
                      {isExpanded ?
                    <ChevronUp className="w-4 h-4 text-gray-400" /> :
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded &&
                <div className="px-4 pb-4 pt-0 ml-0 sm:ml-20 space-y-4 border-t border-gray-50">
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
                      {apt.notes &&
                  <p className="text-sm text-gray-600">{apt.notes}</p>
                  }

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                      type="button"
                      onClick={() => handleEditClick(apt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors">
                      
                          <Edit2 className="w-4 h-4" />
                          {t('edit', { ns: 'common' })}
                        </button>
                      </div>

                      {/* Check-in flow */}
                      <CheckInFlow
                    appointment={apt}
                    onAdvance={advanceCheckIn} />
                  

                      {/* Convert to service */}
                      <ConvertToService
                    appointment={apt}
                    onConvert={convertToService} />
                  
                    </div>
                }
                </div>);

          })}
          </div>
        }
      </div>

      {/* Appointment form modal */}
      {showForm &&
      <AppointmentForm
        isEdit={isEditMode}
        initialData={editingAppointment || undefined}
        onSubmit={isEditMode ? handleUpdate : handleCreate}
        onClose={() => {
          setShowForm(false);
          setIsEditMode(false);
          setEditingAppointmentId(null);
          setEditingAppointment(null);
        }} />

      }
    </div>);

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
    <div className={`${bg} rounded-xl p-4 flex items-center gap-3 card-hover-subtle`}>
      <div className="p-2 bg-white/60 rounded-lg">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-600">{label}</div>
      </div>
    </div>);

}