import { CalendarCheck, Clock, MapPin, User, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CustomerAppointment } from '@/types/customer';

/**
 * Appointment History - Past appointments list
 * @crossref:used-in[CustomerProfile, Overview]
 */

interface AppointmentHistoryProps {
  readonly appointments: readonly CustomerAppointment[];
  readonly limit?: number;
}

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, labelKey: 'completed', className: 'text-emerald-600 bg-emerald-50' },
  cancelled: { icon: XCircle, labelKey: 'cancelled', className: 'text-red-600 bg-red-50' },
  'no-show': { icon: AlertTriangle, labelKey: 'no-show', className: 'text-amber-600 bg-amber-50' },
} as const;

export function AppointmentHistory({ appointments, limit }: AppointmentHistoryProps) {
  const displayAppointments = limit ? appointments.slice(0, limit) : appointments;
  const { t } = useTranslation('customers');
  const { t: tApt } = useTranslation('appointments');
  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-gray-900">{t('appointmentHistory')}</h3>
          <span className="text-xs text-gray-400">({appointments.length}{limit && appointments.length > limit ? `+` : ''})</span>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">{t('noAppointmentHistory')}</div>
      ) : (
        <div className="space-y-3">
          {displayAppointments.map((apt) => {
            const statusConfig = STATUS_CONFIG[apt.status];
            const StatusIcon = statusConfig.icon;
            return (
              <div
                key={apt.id}
                className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{apt.service}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {apt.date} at {apt.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {apt.doctor}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {apt.location}
                      </span>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusConfig.className}`}>
                    <StatusIcon className="w-3 h-3" />
                    {tApt(`status.${statusConfig.labelKey}`)}
                  </span>
                </div>
                {apt.notes && (
                  <p className="text-xs text-gray-400 mt-2 border-l-2 border-gray-100 pl-3">
                    {apt.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
