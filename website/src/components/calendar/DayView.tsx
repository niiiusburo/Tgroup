import { TIME_SLOTS } from '@/constants';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { TimeSlot } from './TimeSlot';

/**
 * DayView Component - hourly time slots for a single day
 * @crossref:used-in[Calendar]
 * @crossref:uses[TimeSlot]
 */

interface DayViewProps {
  readonly currentDate: Date;
  readonly getAppointmentsForDate: (date: Date) => readonly CalendarAppointment[];
}

export function DayView({ currentDate, getAppointmentsForDate }: DayViewProps) {
  const appointments = getAppointmentsForDate(currentDate);

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
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {TIME_SLOTS.map((time) => {
          const slotAppointments = appointments.filter((apt) => apt.startTime === time);
          return (
            <TimeSlot
              key={time}
              time={time}
              appointments={slotAppointments}
            />
          );
        })}
      </div>
    </div>
  );
}
