import { Clock, Phone, User, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APPOINTMENT_CARD_COLORS } from '@/constants';
import { CustomerNameLink } from '@/components/shared/CustomerNameLink';
import { formatAppointmentStartDuration } from '@/lib/appointmentDuration';
import { calendarStatusToPhase, PHASE_LABEL_KEYS, PHASE_STYLES } from '@/lib/appointmentStatusMapping';
import { cn } from '@/lib/utils';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { CheckInActions } from './CheckInActions';
import { MedicalHistoryTooltip } from './MedicalHistoryTooltip';
import { StatusBadgeMenu } from './StatusBadgeMenu';

interface DayAppointmentCardProps {
  readonly appointment: CalendarAppointment;
  readonly onClick?: (apt: CalendarAppointment) => void;
  readonly onEdit?: (apt: CalendarAppointment) => void;
  readonly onMarkArrived?: (id: string) => void;
  readonly onUpdateStatus?: (id: string, phase: import('@/lib/appointmentStatusMapping').CalendarPhase) => void;
}

function getCardColor(color: string | null | undefined) {
  if (color && APPOINTMENT_CARD_COLORS[color]) return APPOINTMENT_CARD_COLORS[color];
  return APPOINTMENT_CARD_COLORS['0'];
}

export function DayAppointmentCard({
  appointment,
  onClick,
  onEdit,
  onMarkArrived,
  onUpdateStatus,
}: DayAppointmentCardProps) {
  const { t } = useTranslation('appointments');
  const phase = calendarStatusToPhase(appointment.status);
  const styles = PHASE_STYLES[phase];
  const colors = getCardColor(appointment.color);
  const timeLabel = formatAppointmentStartDuration(
    appointment.startTime,
    appointment.timeexpected,
    t('common.minutes'),
  );

  return (
    <div
      onClick={() => onClick?.(appointment)}
      className={cn(
        'group relative w-full text-left rounded-lg p-2.5 border-l-4 shadow-sm cursor-pointer',
        'hover:shadow-md transition-shadow text-xs mb-2',
        colors.bg,
        colors.dot,
      )}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        {phase === 'scheduled' ? (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border', styles.bg, styles.text, styles.border)}>
            {t(PHASE_LABEL_KEYS[phase], { ns: 'appointments' })}
          </span>
        ) : (
          <StatusBadgeMenu
            phase={phase}
            arrivalTime={appointment.arrivalTime}
            treatmentStartTime={appointment.treatmentStartTime}
            onPhaseChange={(p) => onUpdateStatus?.(appointment.id, p)}
          />
        )}

        {phase === 'scheduled' && onMarkArrived && onUpdateStatus && (
          <CheckInActions
            onCheckIn={() => onMarkArrived(appointment.id)}
            onCancel={() => onUpdateStatus(appointment.id, 'cancelled')}
          />
        )}
      </div>

      <h5 className="font-semibold text-gray-900 text-xs mb-1.5 break-words">
        <MedicalHistoryTooltip customerId={appointment.customerId} customerName={appointment.customerName}>
          <CustomerNameLink customerId={appointment.customerId}>{appointment.customerName}</CustomerNameLink>
        </MedicalHistoryTooltip>
      </h5>

      <div className="space-y-1">
        <div className="flex items-start gap-1 text-[11px] text-gray-600">
          <Phone className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
          <span className="break-words">{appointment.customerPhone || '---'}</span>
        </div>

        <div className="flex items-start gap-1 text-[11px] text-gray-600">
          <User className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
          <span className="break-words">{appointment.dentist}</span>
        </div>

        {appointment.assistantName && (
          <div className="flex items-start gap-1 text-[11px] text-gray-600">
            <Users className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
            <span className="break-words">{appointment.assistantName}</span>
          </div>
        )}

        {appointment.dentalAideName && (
          <div className="flex items-start gap-1 text-[11px] text-gray-600">
            <Users className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
            <span className="break-words">{appointment.dentalAideName}</span>
          </div>
        )}

        <div className="flex items-start gap-1 text-[11px] text-gray-600">
          <Clock className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
          <span className="break-words">{timeLabel}</span>
        </div>
      </div>

      {appointment.notes && (
        <p className="text-[10px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-200/50 break-words font-medium">
          {appointment.notes}
        </p>
      )}

      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(appointment);
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600"
        >
          ✎
        </button>
      )}
    </div>
  );
}
