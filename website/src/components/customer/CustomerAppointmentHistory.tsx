import { Calendar, CalendarPlus, Clock, Pencil, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiAppointment } from '@/lib/api';
import { formatDate } from './CustomerProfile/formatDate';

interface CustomerAppointmentHistoryProps {
  readonly appointments: readonly ApiAppointment[];
  readonly onCreateAppointment?: () => void;
  readonly onEditAppointment?: (appointment: ApiAppointment) => void;
}

function getStatusConfig(state: string | null | undefined) {
  const s = (state || '').toLowerCase();
  if (s === 'done') {
    return { label: 'completed', className: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' };
  }
  if (s === 'cancelled' || s === 'cancel') {
    return { label: 'cancelled', className: 'text-red-600 bg-red-50', dot: 'bg-red-500' };
  }
  if (s === 'no_show') {
    return { label: 'noShow', className: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' };
  }
  if (s === 'confirmed') {
    return { label: 'confirmed', className: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' };
  }
  return { label: 'scheduled', className: 'text-gray-600 bg-gray-50', dot: 'bg-gray-400' };
}

function getAppointmentTime(appointment: ApiAppointment) {
  return appointment.time || (appointment.datetimeappointment?.includes('T')
    ? appointment.datetimeappointment.split('T')[1]?.slice(0, 5)
    : null) || '--:--';
}

function MetaChip({
  icon,
  children,
  accent = 'text-gray-400',
}: {
  readonly icon: React.ReactNode;
  readonly children: React.ReactNode;
  readonly accent?: string;
}) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
      <span className={accent}>{icon}</span>
      <span>{children}</span>
    </span>
  );
}

export function CustomerAppointmentHistory({
  appointments,
  onCreateAppointment,
  onEditAppointment,
}: CustomerAppointmentHistoryProps) {
  const { t } = useTranslation(['customers', 'appointments']);
  const canEdit = !!onEditAppointment;
  const editLabel = t('labels.edit', { ns: 'appointments' });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('profileSection.appointmentHistory', { ns: 'customers' })} ({appointments.length})
        </h3>
        <button
          onClick={() => onCreateAppointment?.()}
          disabled={!onCreateAppointment}
          className={`flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm ${
            onCreateAppointment
              ? 'bg-primary hover:bg-primary-dark cursor-pointer'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          <CalendarPlus className="w-4 h-4" />
          Add Appointment
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card p-6">
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 mb-3">{t('noAppointmentHistory', { ns: 'customers' })}</p>
            {onCreateAppointment && (
              <button
                onClick={() => onCreateAppointment()}
                className="text-primary hover:text-primary-dark text-sm font-medium"
              >
                {t('thmLchHn', { ns: 'customers' })}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => {
              const statusConfig = getStatusConfig(appointment.state ?? undefined);
              const time = getAppointmentTime(appointment);

              return (
                <div
                  key={appointment.id}
                  onClick={() => onEditAppointment?.(appointment)}
                  className={`group relative rounded-xl border bg-white px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    statusConfig.label === 'scheduled'
                      ? 'border-orange-200 bg-orange-50/35 hover:border-primary/50'
                      : 'border-gray-200 hover:border-primary/30 hover:bg-primary/5'
                  } ${canEdit ? 'cursor-pointer' : ''}`}
                >
                  <div className={`absolute left-4 top-5 h-2.5 w-2.5 rounded-full ${statusConfig.dot}`} />
                  <div className="min-w-0 pl-7">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {appointment.name && (
                            <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                              {appointment.name}
                            </span>
                          )}
                          <span className="text-base font-semibold leading-snug text-gray-900">
                            {appointment.partnername || appointment.partnerdisplayname || 'Appointment'}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig.className}`}>
                            {t(`status.${statusConfig.label}`, { ns: 'appointments' })}
                          </span>
                        </div>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          title={editLabel}
                          aria-label={`${editLabel} ${appointment.name || ''}`.trim()}
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditAppointment?.(appointment);
                          }}
                          className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm opacity-100 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <MetaChip icon={<Clock className="w-3.5 h-3.5" />} accent="text-gray-500">
                        {time}
                      </MetaChip>
                      <MetaChip icon={<User className="w-3.5 h-3.5" />} accent="text-purple-500">
                        {appointment.doctorname || 'N/A'}
                      </MetaChip>
                      {appointment.assistantname && (
                        <MetaChip icon={<User className="w-3.5 h-3.5" />} accent="text-teal-500">
                          {appointment.assistantname}
                        </MetaChip>
                      )}
                      {appointment.dentalaidename && (
                        <MetaChip icon={<User className="w-3.5 h-3.5" />} accent="text-cyan-500">
                          {appointment.dentalaidename}
                        </MetaChip>
                      )}
                      <MetaChip icon={<Calendar className="w-3.5 h-3.5" />} accent="text-gray-500">
                        {formatDate(appointment.date ?? '')}
                      </MetaChip>
                    </div>

                    {appointment.note && (
                      <p className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium leading-relaxed text-gray-500">
                        {appointment.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
