import { STATUS_DOT_COLORS, type CalendarAppointment } from '@/data/mockCalendar';

/**
 * MonthView Component - monthly calendar grid
 * @crossref:used-in[Calendar]
 */

interface MonthViewProps {
  readonly currentDate: Date;
  readonly monthDates: readonly Date[];
  readonly getAppointmentsForDate: (date: Date) => readonly CalendarAppointment[];
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function MonthView({ currentDate, monthDates, getAppointmentsForDate }: MonthViewProps) {
  const currentMonth = currentDate.getMonth();
  const today = new Date();
  const todayStr = formatShort(today);

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {WEEKDAY_HEADERS.map((day) => (
          <div key={day} className="py-2.5 text-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {day}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {monthDates.map((date, i) => {
          const isCurrentMonth = date.getMonth() === currentMonth;
          const isToday = formatShort(date) === todayStr;
          const appointments = getAppointmentsForDate(date);

          return (
            <div
              key={i}
              className={`min-h-[100px] border-b border-r border-gray-100 p-1.5 transition-colors ${
                isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50'
              }`}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm inline-flex items-center justify-center w-7 h-7 rounded-full ${
                    isToday
                      ? 'bg-primary text-white font-bold'
                      : isCurrentMonth
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-400'
                  }`}
                >
                  {date.getDate()}
                </span>
                {appointments.length > 0 && (
                  <span className="text-[10px] text-gray-400">
                    {appointments.length}
                  </span>
                )}
              </div>

              {/* Appointment dots */}
              <div className="space-y-0.5">
                {appointments.slice(0, 3).map((apt) => (
                  <MonthAppointmentDot key={apt.id} appointment={apt} />
                ))}
                {appointments.length > 3 && (
                  <p className="text-[10px] text-gray-400 pl-1">
                    +{appointments.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthAppointmentDot({ appointment }: { readonly appointment: CalendarAppointment }) {
  const dotColor = STATUS_DOT_COLORS[appointment.status];

  return (
    <div className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-100 cursor-pointer">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span className="text-[11px] text-gray-700 truncate">
        {appointment.startTime} {appointment.customerName}
      </span>
    </div>
  );
}

function formatShort(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
