import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Pencil, Phone, User, UserCheck } from 'lucide-react';
import type { OverviewAppointment } from '@/hooks/useOverviewAppointments';
import { useAppointmentHover } from '@/contexts/AppointmentHoverContext';
import { CustomerNameLink } from '@/components/shared/CustomerNameLink';
import { APPOINTMENT_CARD_COLORS } from '@/constants';

interface AppointmentCardProps {
  readonly appointment: OverviewAppointment;
  readonly onMarkArrived: (id: string) => void;
  readonly onMarkCancelled: (id: string) => void;
  readonly onEdit: (appointment: OverviewAppointment) => void;
}

function getColorConfig(color: string | null | undefined): string {
  if (color && APPOINTMENT_CARD_COLORS[color]) {
    const c = APPOINTMENT_CARD_COLORS[color];
    return `${c.bgHighlight} ${c.border}`;
  }
  return 'bg-gray-100 border-gray-300';
}

export function AppointmentCard({
  appointment,
  onMarkArrived,
  onMarkCancelled: _onMarkCancelled,
  onEdit,
}: AppointmentCardProps) {
  const { t } = useTranslation('overview');
  const { hoveredId, setHoveredId, registerRef } = useAppointmentHover();
  const cardRef = useRef<HTMLDivElement>(null);
  const isArrived = appointment.topStatus === 'arrived';
  const isCancelled = appointment.topStatus === 'cancelled';
  const isHighlighted = hoveredId === appointment.id;

  useEffect(() => {
    registerRef(appointment.id, cardRef.current);
    return () => registerRef(appointment.id, null);
  }, [appointment.id, registerRef]);

  const colorConfig = getColorConfig(appointment.color);
  const statusBadgeColor = isArrived
    ? 'bg-emerald-500 text-white'
    : isCancelled
      ? 'bg-red-500 text-white'
      : 'bg-purple-500 text-white';
  const statusLabel = isArrived
    ? t('stats.arrived')
    : isCancelled
      ? t('stats.cancelled')
      : t('stats.pending');

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHoveredId(appointment.id)}
      onMouseLeave={() => setHoveredId(null)}
      className={`
        rounded-xl border overflow-hidden transition-all cursor-pointer
        ${
          isHighlighted
            ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-300 shadow-lg'
            : 'border-gray-200 shadow-sm hover:shadow-md'
        }
      `}
    >
      <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5 bg-white">
        <span className="text-sm font-bold text-slate-800 truncate flex-1 mr-2">
          <CustomerNameLink customerId={appointment.customerId}>
            {appointment.customerName || t('zone3.noPatients')}
          </CustomerNameLink>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(appointment)}
            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-all"
            title={t('editAppointment')}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {!isCancelled && (
            <button
              type="button"
              onClick={() => !isArrived && onMarkArrived(appointment.id)}
              className={`
                w-7 h-7 rounded-lg border flex items-center justify-center transition-all
                ${
                  isArrived
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'border-gray-200 bg-white text-gray-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50'
                }
              `}
              title={isArrived ? t('stats.arrived') : t('markArrived')}
            >
              <UserCheck className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        className={`
          mx-2.5 mb-2.5 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2 border
          ${colorConfig}
        `}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-1">
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
              <User className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span className="truncate">{appointment.doctorName}</span>
            </div>
            {appointment.assistantName && (
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                <User className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <span className="truncate">{appointment.assistantName}</span>
              </div>
            )}
            {appointment.dentalAideName && (
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                <User className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span className="truncate">{appointment.dentalAideName}</span>
              </div>
            )}
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

        <span className={`${statusBadgeColor} px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-sm`}>
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
