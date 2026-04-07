import { STATUS_DOT_COLORS, type CalendarAppointment } from '@/data/mockCalendar';

/**
 * WeekView Component - 7-day grid with time slots
 * @crossref:used-in[Calendar]
 * @crossref:uses[TimeSlot]
 */

interface WeekViewProps {
  readonly weekDates: readonly Date[];
  readonly getAppointmentsForDate: (date: Date) => readonly CalendarAppointment[];
}

const DISPLAY_HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
] as const;

export function WeekView({ weekDates, getAppointmentsForDate }: WeekViewProps) {
  const today = new Date();
  const todayStr = formatShort(today);

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
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

              return (
                <div
                  key={date.toISOString()}
                  className={`border-l border-gray-100 px-1 py-1 ${
                    isToday ? 'bg-primary-lighter/30' : 'hover:bg-gray-50'
                  }`}
                >
                  {hourAppointments.map((apt) => (
                    <WeekAppointment key={apt.id} appointment={apt} />
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

function WeekAppointment({ appointment }: { readonly appointment: CalendarAppointment }) {
  const dotColor = STATUS_DOT_COLORS[appointment.status];

  return (
    <div className="bg-primary-lighter border border-primary-light rounded px-1.5 py-1 mb-0.5 cursor-pointer hover:shadow-card transition-shadow">
      <div className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
        <span className="text-[11px] font-medium text-gray-800 truncate">
          {appointment.customerName}
        </span>
      </div>
      <p className="text-[10px] text-gray-500 truncate ml-2.5">
        {appointment.startTime} {appointment.serviceName}
      </p>
    </div>
  );
}

function formatShort(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
