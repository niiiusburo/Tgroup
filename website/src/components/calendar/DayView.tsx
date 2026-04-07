import { TIME_SLOTS } from '@/constants';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { AppointmentCard } from './AppointmentCard';

/**
 * DayView Component - hourly time slots for a single day
 * @crossref:used-in[Calendar]
 * @crossref:uses[AppointmentCard]
 */

interface DayViewProps {
  readonly currentDate: Date;
  readonly getAppointmentsForDate: (date: Date) => readonly CalendarAppointment[];
  readonly onAppointmentClick?: (appointment: CalendarAppointment) => void;
  readonly onDragStart?: (e: React.DragEvent, appointment: CalendarAppointment) => void;
  readonly onDragOver?: (e: React.DragEvent) => void;
  readonly onDrop?: (e: React.DragEvent, targetDate: string, targetTime: string) => void;
  readonly onDragEnd?: () => void;
}

export function DayView({
  currentDate,
  getAppointmentsForDate,
  onAppointmentClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: DayViewProps) {
  const appointments = getAppointmentsForDate(currentDate);
  const dateStr = formatDateStr(currentDate);

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      {/* Day header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
          <span className="text-xs text-gray-500">
            {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Time slots */}
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto" onDragEnd={onDragEnd}>
        {TIME_SLOTS.map((time) => {
          const slotAppointments = appointments.filter((apt) => apt.startTime === time);
          const hasAppointments = slotAppointments.length > 0;

          return (
            <div
              key={time}
              className="flex items-stretch border-t border-gray-100 min-h-[60px] group"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop?.(e, dateStr, time)}
            >
              <div className="w-16 shrink-0 py-2 pr-3 text-right">
                <span className="text-xs font-medium text-gray-400">{time}</span>
              </div>
              <div
                className={`flex-1 py-1.5 px-2 border-l border-gray-100 transition-colors ${
                  hasAppointments ? '' : 'hover:bg-gray-50'
                }`}
              >
                {slotAppointments.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onClick={onAppointmentClick}
                    draggable
                    onDragStart={onDragStart}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
