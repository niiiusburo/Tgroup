import { Clock, User, Pencil } from 'lucide-react';
import { APPOINTMENT_TYPE_COLORS } from '@/constants';
import { STATUS_DOT_COLORS, type CalendarAppointment } from '@/data/mockCalendar';

const TYPE_LABELS_VI: Record<string, string> = {
  cleaning: 'Vệ sinh',
  consultation: 'Tư vấn',
  treatment: 'Điều trị',
  surgery: 'Phẫu thuật',
  orthodontics: 'Chỉnh nha',
  cosmetic: 'Thẩm mỹ',
  emergency: 'Cấp cứu',
};

/**
 * AppointmentCard - Compact appointment summary card
 * @crossref:used-in[Calendar, Overview, Appointments]
 * 
 * Color codes from database (0-7):
 * 0: Blue, 1: Green, 2: Orange, 3: Red, 4: Purple, 5: Pink, 6: Cyan, 7: Lime
 */

interface AppointmentCardProps {
  readonly appointment: CalendarAppointment;
  readonly onClick?: (appointment: CalendarAppointment) => void;
  readonly onEdit?: (appointment: CalendarAppointment) => void;
  readonly compact?: boolean;
  readonly draggable?: boolean;
  readonly onDragStart?: (e: React.DragEvent, appointment: CalendarAppointment) => void;
}

// Color code to tailwind classes mapping (matching TodayAppointments and EditAppointmentModal)
const COLOR_CODE_TO_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  '0': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },      // Blue
  '1': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },   // Green
  '2': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },    // Orange
  '3': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },       // Red
  '4': { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },   // Purple
  '5': { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },      // Pink
  '6': { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },      // Cyan
  '7': { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700' },      // Lime
};

export function AppointmentCard({
  appointment,
  onClick,
  onEdit,
  compact = false,
  draggable = false,
  onDragStart,
}: AppointmentCardProps) {
  const typeColors = APPOINTMENT_TYPE_COLORS[appointment.appointmentType];
  const statusDot = STATUS_DOT_COLORS[appointment.status];
  
  // Use appointment color if set, otherwise fall back to type-based colors
  const colorStyles = appointment.color && COLOR_CODE_TO_STYLES[appointment.color]
    ? COLOR_CODE_TO_STYLES[appointment.color]
    : typeColors;

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
        className={`w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded ${colorStyles.bg} ${colorStyles.border} border cursor-pointer hover:shadow-sm transition-shadow`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
        <span className={`text-[11px] font-medium truncate ${colorStyles.text}`}>
          {appointment.startTime} {appointment.customerName}
        </span>
      </button>
    );
  }

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      className={`w-full text-left rounded-lg border px-3 py-2 mb-1 cursor-pointer hover:shadow-md transition-shadow ${colorStyles.bg} ${colorStyles.border}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onClick?.(appointment)}
          className="flex-1 flex items-center gap-2 min-w-0 text-left"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
          <span className="text-sm font-medium text-gray-900 truncate">
            {appointment.customerName}
          </span>
        </button>
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(appointment);
            }}
            className="p-1 rounded hover:bg-white/60 transition-colors text-gray-400 hover:text-blue-600"
            title="Edit appointment"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colorStyles.bg} ${colorStyles.text} border ${colorStyles.border}`}>
          {TYPE_LABELS_VI[appointment.appointmentType] ?? appointment.appointmentType}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onClick?.(appointment)}
        className="w-full text-left"
      >
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
    </div>
  );
}
