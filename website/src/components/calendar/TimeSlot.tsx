import { APPOINTMENT_TYPE_COLORS } from '@/constants';
import { STATUS_DOT_COLORS, type CalendarAppointment } from '@/data/mockCalendar';
import { CustomerNameLink } from '@/components/shared/CustomerNameLink';
import { formatAppointmentStartDuration } from '@/lib/appointmentDuration';

/**
 * TimeSlot Component - displays a time slot with optional appointments
 * @crossref:used-in[CalendarDayView, CalendarWeekView, OverviewTodaySchedule]
 */

interface TimeSlotProps {
  readonly time: string;
  readonly appointments: readonly CalendarAppointment[];
  readonly compact?: boolean;
}

export function TimeSlot({ time, appointments, compact = false }: TimeSlotProps) {
  const hasAppointments = appointments.length > 0;

  if (compact) {
    return (
      <div className="flex items-start gap-2 py-1">
        <span className="text-xs text-gray-400 w-10 shrink-0 pt-0.5">{time}</span>
        <div className="flex-1 min-h-[20px]">
          {appointments.map((apt) => (
            <CompactAppointment key={apt.id} appointment={apt} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-stretch border-t border-gray-100 min-h-[60px] group">
      <div className="w-16 shrink-0 py-2 pr-3 text-right">
        <span className="text-xs font-medium text-gray-400">{time}</span>
      </div>
      <div
        className={`flex-1 py-1.5 px-2 border-l border-gray-100 transition-colors ${
          hasAppointments ? '' : 'hover:bg-gray-50'
        }`}
      >
        {appointments.map((apt) => (
          <AppointmentBlock key={apt.id} appointment={apt} />
        ))}
      </div>
    </div>
  );
}

interface AppointmentBlockProps {
  readonly appointment: CalendarAppointment;
}

function AppointmentBlock({ appointment }: AppointmentBlockProps) {
  const dotColor = STATUS_DOT_COLORS[appointment.status];
  const typeColors = APPOINTMENT_TYPE_COLORS[appointment.appointmentType];
  const timeLabel = formatAppointmentStartDuration(appointment.startTime, appointment.timeexpected);

  return (
    <div className={`${typeColors.bg} border ${typeColors.border} rounded-lg px-3 py-2 mb-1 cursor-pointer hover:shadow-card transition-shadow`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <span className="text-sm font-medium text-gray-900 truncate">
          <CustomerNameLink customerId={appointment.customerId}>{appointment.customerName}</CustomerNameLink>
        </span>
      </div>
      <div className="ml-4 mt-0.5">
        <p className="text-xs text-gray-500">
          {timeLabel} &middot; {appointment.serviceName}
        </p>
        <p className="text-xs text-gray-400">{appointment.dentist}</p>
      </div>
    </div>
  );
}

function CompactAppointment({ appointment }: AppointmentBlockProps) {
  const dotColor = STATUS_DOT_COLORS[appointment.status];
  const typeColors = APPOINTMENT_TYPE_COLORS[appointment.appointmentType];

  return (
    <div className={`flex items-center gap-1.5 py-0.5 px-1 rounded ${typeColors.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span className={`text-xs truncate ${typeColors.text}`}><CustomerNameLink customerId={appointment.customerId}>{appointment.customerName}</CustomerNameLink></span>
    </div>
  );
}
