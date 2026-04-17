import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, User, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { APPOINTMENT_CARD_COLORS } from '@/constants';
import { CustomerNameLink } from '@/components/shared/CustomerNameLink';
import { MedicalHistoryTooltip } from './MedicalHistoryTooltip';
import { calendarStatusToPhase, PHASE_LABEL_KEYS, PHASE_STYLES } from '@/lib/appointmentStatusMapping';
import { StatusBadgeMenu } from './StatusBadgeMenu';
import { CheckInActions } from './CheckInActions';
import { EmptyTimeSlot } from './EmptyTimeSlot';

/**
 * DayView Component - 27-slot hourly rail for a single day
 *
 * Fixed 30-minute slots from 07:00 to 20:00. Empty slots collapse to 24px.
 * Cards show interactive status flow matching WeekView.
 *
 * @crossref:used-in[Calendar]
 */

interface DayViewProps {
  readonly currentDate: Date;
  readonly getAppointmentsForDate: (date: Date) => readonly CalendarAppointment[];
  readonly onAppointmentClick?: (appointment: CalendarAppointment) => void;
  readonly onAppointmentEdit?: (appointment: CalendarAppointment) => void;
  readonly onDragStart?: (e: React.DragEvent, appointment: CalendarAppointment) => void;
  readonly onDragOver?: (e: React.DragEvent) => void;
  readonly onDrop?: (e: React.DragEvent, targetDate: string, targetTime: string) => void;
  readonly onDragEnd?: () => void;
  readonly onMarkArrived?: (id: string) => void;
  readonly onUpdateStatus?: (id: string, phase: import('@/lib/appointmentStatusMapping').CalendarPhase) => void;
  readonly onCreateAppointment?: (date: string, startTime: string) => void;
}

// Color mapping uses SINGLE SOURCE OF TRUTH from constants
function getCardColor(color: string | null | undefined) {
  if (color && APPOINTMENT_CARD_COLORS[color]) {
    return APPOINTMENT_CARD_COLORS[color];
  }
  return APPOINTMENT_CARD_COLORS['0'];
}

const SLOTS: string[] = [];
for (let h = 7; h <= 20; h++) {
  SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h !== 20) SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

// ── Appointment Card ─────────────────────────────────────────────

interface DayCardProps {
  readonly appointment: CalendarAppointment;
  readonly onClick?: (apt: CalendarAppointment) => void;
  readonly onEdit?: (apt: CalendarAppointment) => void;
  readonly onMarkArrived?: (id: string) => void;
  readonly onUpdateStatus?: (id: string, phase: import('@/lib/appointmentStatusMapping').CalendarPhase) => void;
}

function DayCard({ appointment, onClick, onEdit, onMarkArrived, onUpdateStatus }: DayCardProps) {
  const { t } = useTranslation('appointments');
  const phase = calendarStatusToPhase(appointment.status);
  const styles = PHASE_STYLES[phase];
  const colors = getCardColor(appointment.color);

  return (
    <div
      onClick={() => onClick?.(appointment)}
      className={cn(
        'group relative w-full text-left rounded-lg p-2.5 border-l-4 shadow-sm cursor-pointer',
        'hover:shadow-md transition-shadow text-xs mb-2 h-full',
        colors.bg,
        colors.dot
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

      {/* Customer name */}
      <h5 className="font-semibold text-gray-900 truncate text-xs mb-1.5">
        <MedicalHistoryTooltip customerId={appointment.customerId} customerName={appointment.customerName}>
          <CustomerNameLink customerId={appointment.customerId}>{appointment.customerName}</CustomerNameLink>
        </MedicalHistoryTooltip>
      </h5>

      {/* Details grid */}
      <div className="space-y-1">
        {/* Phone */}
        <div className="flex items-center gap-1 text-[11px] text-gray-600">
          <Phone className="w-3 h-3 text-gray-400" />
          <span className="truncate">{appointment.customerPhone || '---'}</span>
        </div>

        {/* Doctor */}
        <div className="flex items-center gap-1 text-[11px] text-gray-600">
          <User className="w-3 h-3 text-gray-400" />
          <span className="truncate">{appointment.dentist}</span>
        </div>

        {/* Assistant */}
        {appointment.assistantName && (
          <div className="flex items-center gap-1 text-[11px] text-gray-600">
            <Users className="w-3 h-3 text-gray-400" />
            <span className="truncate">{appointment.assistantName}</span>
          </div>
        )}

        {/* Dental Aide */}
        {appointment.dentalAideName && (
          <div className="flex items-center gap-1 text-[11px] text-gray-600">
            <Users className="w-3 h-3 text-gray-400" />
            <span className="truncate">{appointment.dentalAideName}</span>
          </div>
        )}

        {/* Time */}
        <div className="flex items-center gap-1 text-[11px] text-gray-600">
          <Clock className="w-3 h-3 text-gray-400" />
          <span>{appointment.startTime} - {appointment.endTime}</span>
        </div>
      </div>

      {/* Notes at bottom - only if exists */}
      {appointment.notes && (
        <p className="text-[10px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-200/50 truncate font-medium">
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

// ── Main DayView ─────────────────────────────────────────────────

export function DayView({
  currentDate,
  getAppointmentsForDate,
  onAppointmentClick,
  onAppointmentEdit,
  onMarkArrived,
  onUpdateStatus,
  onCreateAppointment,
}: DayViewProps) {
  const { t } = useTranslation();
  const appointments = getAppointmentsForDate(currentDate);

  const slotMap = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const apt of appointments) {
      const [hStr, mStr] = apt.startTime.slice(0, 5).split(':');
      const mm = Number(mStr) >= 30 ? '30' : '00';
      const slot = `${hStr.padStart(2, '0')}:${mm}`;
      if (!map.has(slot)) map.set(slot, []);
      map.get(slot)!.push(apt);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [appointments]);

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      {/* Day header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {currentDate.toLocaleDateString('vi-VN', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
          <span className="text-xs text-gray-500">
            {`${appointments.length} ${t('labelsAppointments', { ns: 'calendar' })}`}
          </span>
        </div>
      </div>

      {/* Time rail */}
      <div className="p-3 space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
        {SLOTS.map((slot) => {
          const slotAppointments = slotMap.get(slot) ?? [];
          const hasAppointments = slotAppointments.length > 0;

          return (
            <div key={slot} className={hasAppointments ? 'py-2' : ''}>
              {hasAppointments ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-400 tracking-wide">{slot}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] text-gray-300 font-medium">
                      {`${slotAppointments.length} ${t('labelsAppointments', { ns: 'calendar' })}`}
                    </span>
                  </div>
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gridAutoRows: '1fr' }}
                  >
                    {slotAppointments.map((apt) => (
                      <DayCard
                        key={apt.id}
                        appointment={apt}
                        onClick={onAppointmentClick}
                        onEdit={onAppointmentEdit}
                        onMarkArrived={onMarkArrived}
                        onUpdateStatus={onUpdateStatus}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyTimeSlot
                  time={slot}
                  onClick={(time: string) => {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    onCreateAppointment?.(dateStr, time);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
