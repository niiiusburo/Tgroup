import { Clock, User } from 'lucide-react';
import { APPOINTMENT_TYPE_COLORS } from '@/constants';
import { STATUS_DOT_COLORS, type CalendarAppointment } from '@/data/mockCalendar';

/**
 * AppointmentCard - Compact appointment summary card
 * @crossref:used-in[Calendar, Overview, Appointments]
 */

interface AppointmentCardProps {
  readonly appointment: CalendarAppointment;
  readonly onClick?: (appointment: CalendarAppointment) => void;
  readonly compact?: boolean;
  readonly draggable?: boolean;
  readonly onDragStart?: (e: React.DragEvent, appointment: CalendarAppointment) => void;
}

export function AppointmentCard({
  appointment,
  onClick,
  compact = false,
  draggable = false,
  onDragStart,
}: AppointmentCardProps) {
  const typeColors = APPOINTMENT_TYPE_COLORS[appointment.appointmentType];
  const statusDot = STATUS_DOT_COLORS[appointment.status];

  function handleDragStart(e: React.DragEvent) {
    if (onDragStart) {
      onDragStart(e, appointment);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onClick?.(appointment)}
        draggable={draggable}
        onDragStart={handleDragStart}
        className={`w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded ${typeColors.bg} ${typeColors.border} border cursor-pointer hover:shadow-sm transition-shadow`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
        <span className={`text-[11px] font-medium truncate ${typeColors.text}`}>
          {appointment.startTime} {appointment.customerName}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick?.(appointment)}
      draggable={draggable}
      onDragStart={handleDragStart}
      className={`w-full text-left rounded-lg border px-3 py-2 mb-1 cursor-pointer hover:shadow-md transition-shadow ${typeColors.bg} ${typeColors.border}`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
        <span className="text-sm font-medium text-gray-900 truncate">
          {appointment.customerName}
        </span>
        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeColors.bg} ${typeColors.text} border ${typeColors.border}`}>
          {appointment.appointmentType}
        </span>
      </div>
      <div className="ml-4 mt-1 space-y-0.5">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{appointment.startTime} - {appointment.endTime}</span>
          <span className="mx-1">&middot;</span>
          <span className="truncate">{appointment.serviceName}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <User className="w-3 h-3" />
          <span>{appointment.dentist}</span>
        </div>
      </div>
    </button>
  );
}
