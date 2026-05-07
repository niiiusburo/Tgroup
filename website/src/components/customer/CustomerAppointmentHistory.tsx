import { Calendar, CalendarPlus, Clock, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiAppointment } from '@/lib/api';
import { RecordDateBadge } from './RecordDateBadge';

interface CustomerAppointmentHistoryProps {
  readonly appointments: readonly ApiAppointment[];
  readonly onCreateAppointment?: () => void;
  readonly onEditAppointment?: (appointment: ApiAppointment) => void;
}

function getStatusConfig(state: string | null | undefined) {
  const s = (state || '').toLowerCase();
  if (s === 'done') {
    return { label: 'completed', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
  }
  if (s === 'cancelled' || s === 'cancel') {
    return { label: 'cancelled', className: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' };
  }
  if (s === 'no_show') {
    return { label: 'noShow', className: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
  }
  if (s === 'confirmed') {
    return { label: 'confirmed', className: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' };
  }
  return { label: 'scheduled', className: 'border-orange-200 bg-orange-50 text-orange-700', dot: 'bg-orange-500' };
}

function getAppointmentTime(appointment: ApiAppointment) {
  return appointment.time || (appointment.datetimeappointment?.includes('T')
    ? appointment.datetimeappointment.split('T')[1]?.slice(0, 5)
    : null) || '--:--';
}

function getDuration(appointment: ApiAppointment) {
  const minutes = appointment.timeExpected ?? appointment.timeexpected;
  return minutes && minutes > 0 ? `${minutes} min` : null;
}

function getAppointmentTitle(appointment: ApiAppointment) {
  return appointment.productname || appointment.reason || appointment.note || 'Lịch hẹn';
}

function shouldRenderNote(appointment: ApiAppointment, title: string) {
  return !!appointment.note && appointment.note !== title;
}

function TeamLine({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | null | undefined;
}) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className="min-w-14 font-semibold text-gray-700">{label}</span>
      <span className="truncate">{value || 'N/A'}</span>
    </p>
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
  const addLabel = t('addAppointment', { ns: 'appointments', defaultValue: 'Add Appointment' });

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
          {addLabel}
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-4">{t('table.date', { ns: 'appointments' })}</th>
                  <th className="pb-3 pr-4">{t('table.appointment', { ns: 'appointments' })}</th>
                  <th className="pb-3 pr-4">{t('table.time', { ns: 'appointments' })}</th>
                  <th className="pb-3 pr-4">{t('table.team', { ns: 'appointments' })}</th>
                  <th className="pb-3 pr-4">{t('table.status', { ns: 'appointments' })}</th>
                  <th className="pb-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((appointment) => {
                  const statusConfig = getStatusConfig(appointment.state ?? undefined);
                  const time = getAppointmentTime(appointment);
                  const duration = getDuration(appointment);
                  const title = getAppointmentTitle(appointment);

                  return (
                    <tr
                      key={appointment.id}
                      onClick={() => onEditAppointment?.(appointment)}
                      className={`group transition-colors ${
                        canEdit ? 'cursor-pointer' : ''
                      } ${statusConfig.label === 'scheduled' ? 'bg-orange-50/25 hover:bg-orange-50/60' : 'hover:bg-gray-50'}`}
                    >
                      <td className="py-3 pr-4 align-top whitespace-nowrap">
                        <RecordDateBadge value={appointment.date} ariaLabel="Appointment date" />
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <div className="flex items-start gap-2">
                          <div className={`mt-2 h-2 w-2 shrink-0 rounded-full ${statusConfig.dot}`} />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {appointment.name && (
                                <span className="rounded-lg bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary">
                                  {appointment.name}
                                </span>
                              )}
                              <span className="line-clamp-1 font-medium leading-snug text-gray-900">{title}</span>
                            </div>
                            <p className="mt-1 truncate text-xs font-medium text-gray-500">
                              {appointment.partnerdisplayname || appointment.partnername || appointment.partnercode || 'N/A'}
                            </p>
                            {shouldRenderNote(appointment, title) && (
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">{appointment.note}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 align-top whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                          <Clock className="h-3.5 w-3.5 text-gray-500" />
                          {time}
                        </div>
                        {duration && <p className="mt-1 text-xs font-medium text-gray-400">{duration}</p>}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <div className="min-w-[150px] space-y-1">
                          <TeamLine label="Bác sĩ" value={appointment.doctorname} />
                          {appointment.assistantname && <TeamLine label="Phụ tá" value={appointment.assistantname} />}
                          {appointment.dentalaidename && <TeamLine label="Nha tá" value={appointment.dentalaidename} />}
                        </div>
                      </td>
                      <td className="py-3 pr-4 align-top whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusConfig.className}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                          {t(`status.${statusConfig.label}`, { ns: 'appointments' })}
                        </span>
                      </td>
                      <td className="py-3 text-center align-top">
                        {canEdit && (
                          <button
                            type="button"
                            title={editLabel}
                            aria-label={`${editLabel} ${appointment.name || ''}`.trim()}
                            onClick={(event) => {
                              event.stopPropagation();
                              onEditAppointment?.(appointment);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
