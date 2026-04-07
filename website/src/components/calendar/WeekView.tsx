import { type CalendarAppointment } from '@/data/mockCalendar';
import { AppointmentCard } from './AppointmentCard';

/**
 * WeekView Component - 7-day grid with time slots
 * @crossref:used-in[Calendar]
 * @crossref:uses[AppointmentCard]
 */

interface WeekViewProps {
  readonly weekDates: readonly Date[];
  readonly getAppointmentsForDate: (date: Date) => readonly CalendarAppointment[];
  readonly onAppointmentClick?: (appointment: CalendarAppointment) => void;
  readonly onDragStart?: (e: React.DragEvent, appointment: CalendarAppointment) => void;
  readonly onDragOver?: (e: React.DragEvent) => void;
  readonly onDrop?: (e: React.DragEvent, targetDate: string, targetTime: string) => void;
  readonly onDragEnd?: () => void;
}

const DISPLAY_HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
] as const;

export function WeekView({
  weekDates,
  getAppointmentsForDate,
  onAppointmentClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: WeekViewProps) {
  const today = new Date();
  const todayStr = formatShort(today);

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden" onDragEnd={onDragEnd}>
      {/* Week header */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-gray-200">
        <div className="p-2" />
        {weekDates.map((date) => {
          const isToday = formatShort(date) === todayStr;
          return (
            <div
              key={date.toISOString()}
              className={`p-2 text-center border-l border-gray-100 ${
                isToday ? 'bg-primary-lighter' : ''
              }`}
            >
              <p className="text-xs text-gray-500">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p
                className={`text-sm font-semibold mt-0.5 ${
                  isToday ? 'text-primary' : 'text-gray-900'
                }`}
              >
                {date.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
        {DISPLAY_HOURS.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[64px_repeat(7,1fr)] border-t border-gray-100 min-h-[64px]"
          >
            <div className="py-2 pr-3 text-right">
              <span className="text-xs font-medium text-gray-400">{hour}</span>
            </div>
            {weekDates.map((date) => {
              const dayAppointments = getAppointmentsForDate(date);
              const hourAppointments = dayAppointments.filter((apt) => {
                const aptHour = apt.startTime.split(':')[0];
                const slotHour = hour.split(':')[0];
                return aptHour === slotHour;
              });
              const isToday = formatShort(date) === todayStr;
              const dateStr = formatShort(date);

              return (
                <div
                  key={date.toISOString()}
                  className={`border-l border-gray-100 px-1 py-1 ${
                    isToday ? 'bg-primary-lighter/30' : 'hover:bg-gray-50'
                  }`}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop?.(e, dateStr, hour)}
                >
                  {hourAppointments.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      onClick={onAppointmentClick}
                      compact
                      draggable
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatShort(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
