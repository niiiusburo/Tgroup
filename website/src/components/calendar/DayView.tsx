import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimezone } from '@/contexts/TimezoneContext';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { EmptyTimeSlot } from './EmptyTimeSlot';
import { DayAppointmentCard } from './DayAppointmentCard';

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

const SLOTS: string[] = [];
for (let h = 7; h <= 20; h++) {
  SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h !== 20) SLOTS.push(`${String(h).padStart(2, '0')}:30`);
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
  const { formatDate, timezone } = useTimezone();
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
              timeZone: timezone,
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
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))' }}
                  >
                    {slotAppointments.map((apt) => (
                      <DayAppointmentCard
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
                    const dateStr = formatDate(currentDate, 'yyyy-MM-dd');
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
