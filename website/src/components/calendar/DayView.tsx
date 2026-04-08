import { useMemo } from 'react';
import { User, Phone, Clock, MessageSquare, Pencil, UserPlus } from 'lucide-react';
import { type CalendarAppointment } from '@/data/mockCalendar';

/**
 * DayView Component - card grid layout for a single day's appointments
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
}

// ── Status config ────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  scheduled:    { label: 'Đang hẹn',    bg: 'bg-blue-600',   text: 'text-white' },
  confirmed:    { label: 'Đã xác nhận', bg: 'bg-blue-600',   text: 'text-white' },
  'in-progress': { label: 'Đang khám',  bg: 'bg-orange-500', text: 'text-white' },
  completed:    { label: 'Hoàn thành',  bg: 'bg-green-600',  text: 'text-white' },
  cancelled:    { label: 'Hủy hẹn',     bg: 'bg-red-500',    text: 'text-white' },
};

// Card background colors based on appointment color code
const CARD_BG: Record<string, string> = {
  '0': 'bg-blue-50 border-blue-200',
  '1': 'bg-emerald-50 border-emerald-200',
  '2': 'bg-amber-50 border-amber-200',
  '3': 'bg-red-50 border-red-200',
  '4': 'bg-violet-50 border-violet-200',
  '5': 'bg-pink-50 border-pink-200',
  '6': 'bg-cyan-50 border-cyan-200',
  '7': 'bg-lime-50 border-lime-200',
};

const CARD_NAME_COLOR: Record<string, string> = {
  '0': 'text-blue-600',
  '1': 'text-emerald-600',
  '2': 'text-amber-700',
  '3': 'text-red-600',
  '4': 'text-violet-600',
  '5': 'text-pink-600',
  '6': 'text-cyan-600',
  '7': 'text-lime-700',
};

const DEFAULT_CARD_BG = 'bg-blue-50 border-blue-200';
const DEFAULT_NAME_COLOR = 'text-blue-600';

// ── Time group helpers ───────────────────────────────────────────

interface TimeGroup {
  time: string; // e.g. "15:00"
  appointments: CalendarAppointment[];
}

function groupByHalfHour(appointments: readonly CalendarAppointment[]): TimeGroup[] {
  const sorted = [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const groups: Map<string, CalendarAppointment[]> = new Map();

  for (const apt of sorted) {
    // Round down to nearest half hour for grouping
    const [h, m] = apt.startTime.split(':').map(Number);
    const roundedMin = m < 30 ? '00' : '30';
    const key = `${String(h).padStart(2, '0')}:${roundedMin}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(apt);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, appts]) => ({ time, appointments: appts }));
}

// ── Appointment Card ─────────────────────────────────────────────

interface DayCardProps {
  readonly appointment: CalendarAppointment;
  readonly onClick?: (apt: CalendarAppointment) => void;
  readonly onEdit?: (apt: CalendarAppointment) => void;
}

function DayCard({ appointment, onClick, onEdit }: DayCardProps) {
  const status = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.scheduled;
  const cardBg = appointment.color ? (CARD_BG[appointment.color] ?? DEFAULT_CARD_BG) : DEFAULT_CARD_BG;
  const nameColor = appointment.color ? (CARD_NAME_COLOR[appointment.color] ?? DEFAULT_NAME_COLOR) : DEFAULT_NAME_COLOR;

  return (
    <div className={`rounded-lg border ${cardBg} overflow-hidden`}>
      {/* Header: status badge + action icons */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded ${status.bg} ${status.text}`}>
          {status.label}
        </span>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(appointment); }}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-white/60 rounded transition-colors"
              title="Sửa"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onClick?.(appointment)}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-white/60 rounded transition-colors"
            title="Chi tiết"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <button
        type="button"
        onClick={() => onClick?.(appointment)}
        className="w-full text-left px-3 pb-3 pt-1 space-y-1.5"
      >
        {/* Patient name */}
        <div className={`text-sm font-semibold ${nameColor} leading-tight`}>
          {appointment.customerName}
        </div>

        {/* Doctor */}
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>{appointment.dentist}</span>
        </div>

        {/* Phone */}
        {appointment.customerPhone && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{appointment.customerPhone}</span>
          </div>
        )}

        {/* Time */}
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>{appointment.startTime} - {appointment.endTime}</span>
        </div>

        {/* Service / Notes */}
        {appointment.serviceName && (
          <div className="flex items-start gap-1.5 text-xs text-gray-500">
            <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{appointment.serviceName}</span>
          </div>
        )}
      </button>
    </div>
  );
}

// ── Main DayView ─────────────────────────────────────────────────

export function DayView({
  currentDate,
  getAppointmentsForDate,
  onAppointmentClick,
  onAppointmentEdit,
}: DayViewProps) {
  const appointments = getAppointmentsForDate(currentDate);

  const timeGroups = useMemo(() => groupByHalfHour(appointments), [appointments]);

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
            {appointments.length} lịch hẹn
          </span>
        </div>
      </div>

      {/* Card grid */}
      <div className="p-4 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
        {timeGroups.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">Không có lịch hẹn</p>
          </div>
        )}

        {timeGroups.map((group) => (
          <div key={group.time} className="flex gap-4">
            {/* Time label */}
            <div className="w-12 shrink-0 pt-2">
              <span className="text-xs font-medium text-gray-400">{group.time}</span>
            </div>

            {/* Cards grid — 4 columns */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {group.appointments.map((apt) => (
                <DayCard
                  key={apt.id}
                  appointment={apt}
                  onClick={onAppointmentClick}
                  onEdit={onAppointmentEdit}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
