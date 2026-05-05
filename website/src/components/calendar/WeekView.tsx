/**
 * WeekView Component - 7-day column view with appointment cards
 * @crossref:used-in[Calendar]
 *
 * Redesigned to match reference: multi-column grid with stacked cards per day
 * Cards show: status badge, customer name, phone, doctor, time, service
 */

import { CalendarDays, Phone, User, Users, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTimezone } from '@/contexts/TimezoneContext';
import { cn } from '@/lib/utils';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { APPOINTMENT_CARD_COLORS } from '@/constants';
import { CustomerNameLink } from '@/components/shared/CustomerNameLink';
import { MedicalHistoryTooltip } from './MedicalHistoryTooltip';
import { calendarStatusToPhase, PHASE_LABEL_KEYS, PHASE_STYLES } from '@/lib/appointmentStatusMapping';
import { StatusBadgeMenu } from './StatusBadgeMenu';
import { CheckInActions } from './CheckInActions';
import { formatAppointmentStartDuration } from '@/lib/appointmentDuration';

interface WeekViewProps {
  readonly weekDates: readonly Date[];
  readonly getAppointmentsForDate: (date: Date) => readonly CalendarAppointment[];
  readonly onAppointmentClick?: (appointment: CalendarAppointment) => void;
  readonly onAppointmentEdit?: (appointment: CalendarAppointment) => void;
  readonly onDateChange?: (date: Date) => void;
  readonly onMarkArrived?: (id: string) => void;
  readonly onUpdateStatus?: (id: string, phase: import('@/lib/appointmentStatusMapping').CalendarPhase) => void;
}

// Color mapping uses the SINGLE SOURCE OF TRUTH from constants
// See APPOINTMENT_CARD_COLORS for the canonical mapping
function getCardStyles(appointment: CalendarAppointment): string {
  // Use color from appointment if available
  if (appointment.color && APPOINTMENT_CARD_COLORS[appointment.color]) {
    const c = APPOINTMENT_CARD_COLORS[appointment.color];
    return `${c.bg} ${c.dot}`;
  }
  // Fallback to neutral border
  return 'bg-white border-l-4 border-gray-200';
}

function formatDateKey(date: Date): string {
  // date comes from YYYY-MM-DD parse; get local components to avoid UTC shift
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const WEEKDAY_NAME_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function AppointmentCard({
  appointment,
  onClick,
  onEdit,
  onMarkArrived,
  onUpdateStatus,
}: {
  readonly appointment: CalendarAppointment;
  readonly onClick?: (apt: CalendarAppointment) => void;
  readonly onEdit?: (apt: CalendarAppointment) => void;
  readonly onMarkArrived?: (id: string) => void;
  readonly onUpdateStatus?: (id: string, phase: import('@/lib/appointmentStatusMapping').CalendarPhase) => void;
}) {
  const { t } = useTranslation('appointments');
  const phase = calendarStatusToPhase(appointment.status);
  const styles = PHASE_STYLES[phase];
  const cardStyles = getCardStyles(appointment);
  const timeLabel = formatAppointmentStartDuration(
    appointment.startTime,
    appointment.timeexpected,
    t('common.minutes'),
  );

  return (
    <div
      onClick={() => onClick?.(appointment)}
      className={cn(
        'relative group rounded-lg p-2.5 border-l-4 shadow-sm cursor-pointer',
        'hover:shadow-md transition-shadow text-xs mb-2',
        cardStyles
      )}
    >
      {/* Header row: badge + actions */}
      <div className="flex items-start justify-between gap-1 mb-1">
        {phase === 'scheduled' ? (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border',
              styles.bg,
              styles.text,
              styles.border
            )}
          >
            {t(PHASE_LABEL_KEYS[phase], { ns: 'appointments' })}
          </span>
        ) : onUpdateStatus ? (
          <StatusBadgeMenu
            phase={phase}
            arrivalTime={appointment.arrivalTime}
            treatmentStartTime={appointment.treatmentStartTime}
            onPhaseChange={(p) => onUpdateStatus?.(appointment.id, p)}
          />
        ) : (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border',
              styles.bg,
              styles.text,
              styles.border
            )}
          >
            {t(PHASE_LABEL_KEYS[phase], { ns: 'appointments' })}
          </span>
        )}

        {phase === 'scheduled' && onMarkArrived && onUpdateStatus && (
          <CheckInActions
            onCheckIn={() => onMarkArrived(appointment.id)}
            onCancel={() => onUpdateStatus(appointment.id, 'cancelled')}
          />
        )}
      </div>

      {/* Customer name */}
      <h5 className="font-semibold text-gray-900 text-xs mb-1.5 break-words">
        <MedicalHistoryTooltip customerId={appointment.customerId} customerName={appointment.customerName}>
          <CustomerNameLink customerId={appointment.customerId}>{appointment.customerName}</CustomerNameLink>
        </MedicalHistoryTooltip>
      </h5>

      {/* Details grid */}
      <div className="space-y-1">
        {/* Phone */}
        <div className="flex items-start gap-1 text-[11px] text-gray-600">
          <Phone className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
          <span className="break-words">{appointment.customerPhone || '---'}</span>
        </div>

        {/* Doctor */}
        <div className="flex items-start gap-1 text-[11px] text-gray-600">
          <User className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
          <span className="break-words">{appointment.dentist}</span>
        </div>

        {/* Assistant */}
        {appointment.assistantName && (
          <div className="flex items-start gap-1 text-[11px] text-gray-600">
            <Users className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
            <span className="break-words">{appointment.assistantName}</span>
          </div>
        )}

        {/* Dental Aide */}
        {appointment.dentalAideName && (
          <div className="flex items-start gap-1 text-[11px] text-gray-600">
            <Users className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
            <span className="break-words">{appointment.dentalAideName}</span>
          </div>
        )}

        {/* Time */}
        <div className="flex items-center gap-1 text-[11px] text-gray-600">
          <Clock className="w-3 h-3 text-gray-400" />
          <span>{timeLabel}</span>
        </div>
      </div>

      {/* Notes at bottom - only if exists */}
      {appointment.notes && (
        <p className="text-[10px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-200/50 break-words font-medium">
          {appointment.notes}
        </p>
      )}

      {/* Edit button on hover */}
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

export function WeekView({
  weekDates,
  getAppointmentsForDate,
  onAppointmentClick,
  onAppointmentEdit,
  onMarkArrived,
  onUpdateStatus,
}: WeekViewProps) {
  const { t } = useTranslation('calendar');
  const { getToday } = useTimezone();
  const todayKey = getToday();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card">
      {/* Week grid - keep day columns readable by showing about five days per desktop viewport */}
      <div className="overflow-x-auto overscroll-x-contain custom-scrollbar" data-testid="calendar-week-scroll">
        <div className="grid min-w-[77rem] grid-cols-7 lg:min-w-[140%]">
        {weekDates.map((date, index) => {
          const dateKey = formatDateKey(date);
          const isToday = dateKey === todayKey;
          const appointments = getAppointmentsForDate(date);
          const sortedAppointments = [...appointments].sort((a, b) =>
            a.startTime.localeCompare(b.startTime)
          );

          return (
            <div
              key={dateKey}
              className={cn(
                'border-r border-gray-100 last:border-r-0 min-w-0',
                isToday && 'bg-orange-50/30 ring-2 ring-inset ring-orange-400'
              )}
            >
              {/* Day header */}
              <div
                className={cn(
                  'text-center py-3 border-b border-gray-100',
                  isToday && 'bg-orange-100'
                )}
              >
                <div
                  className={cn(
                    'text-sm font-semibold',
                    isToday ? 'text-orange-700' : 'text-gray-900'
                  )}
                >
                  {formatDateDisplay(date)}
                </div>
                <div
                  className={cn(
                    'text-xs mt-0.5',
                    isToday ? 'text-orange-600' : 'text-gray-500'
                  )}
                >
                  {t(`weekDays.${WEEKDAY_NAME_KEYS[index]}`)}
                </div>
              </div>

              {/* Appointments */}
              <div className="p-2.5 min-h-[400px] max-h-[65vh] overflow-y-auto overscroll-contain">
                {sortedAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-gray-300">
                    <CalendarDays className="w-6 h-6 mb-1" />
                    <span className="text-xs">{`${t('noAppointments', { ns: 'calendar' })}`}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sortedAppointments.map((apt) => (
                      <AppointmentCard
                        key={apt.id}
                        appointment={apt}
                        onClick={onAppointmentClick}
                        onEdit={onAppointmentEdit}
                        onMarkArrived={onMarkArrived}
                        onUpdateStatus={onUpdateStatus}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
