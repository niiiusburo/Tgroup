import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Phone, Clock, MessageSquare, Pencil } from 'lucide-react';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { APPOINTMENT_CARD_COLORS } from '@/constants';
import { CustomerNameLink } from '@/components/shared/CustomerNameLink';

/**
 * DayView Component - responsive card grid layout for a single day's appointments
 *
 * Cards are grouped by half-hour time slots. The grid auto-fills columns based
 * on available width (6 cols on wide screens, scaling down to 2 on narrow).
 * Each card has a colored left border matching the appointment's color code.
 *
 * ⚠️ LAYOUT LOCK: Do NOT change the responsive grid (grid-cols-[repeat(auto-fill,...)])
 *    without user approval. The auto-fill behavior is intentionally designed so cards
 *    reflow dynamically when the window resizes.
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
}

// ── Status config ────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; ring: string }> = {
  scheduled:     { label: 'Đang hẹn',    bg: 'bg-blue-100',   text: 'text-blue-700',   ring: 'ring-blue-200' },
  confirmed:     { label: 'Đã xác nhận', bg: 'bg-blue-100',   text: 'text-blue-700',   ring: 'ring-blue-200' },
  'in-progress': { label: 'Đang khám',   bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-200' },
  completed:     { label: 'Hoàn thành',  bg: 'bg-green-100',  text: 'text-green-700',  ring: 'ring-green-200' },
  cancelled:     { label: 'Hủy hẹn',     bg: 'bg-red-100',    text: 'text-red-700',    ring: 'ring-red-200' },
};

// Color mapping uses SINGLE SOURCE OF TRUTH from constants
function getCardColor(color: string | null | undefined) {
  if (color && APPOINTMENT_CARD_COLORS[color]) {
    return APPOINTMENT_CARD_COLORS[color];
  }
  return APPOINTMENT_CARD_COLORS['0'];
}

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
  const colors = getCardColor(appointment.color);

  return (
    <div
      onClick={() => onClick?.(appointment)}
      className="group w-full text-left rounded-xl border border-gray-200 bg-white shadow-sm card-hover overflow-hidden cursor-pointer"
    >
      {/* Colored left accent + content */}
      <div className={`flex border-l-[3px] ${colors.dot}`}>
        <div className="flex-1 p-3 space-y-2">
          {/* Row 1: Time + Status badge + Edit icon */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-2 min-w-0">
              {/* Time */}
              <span className="text-xs font-semibold text-gray-500 shrink-0">
                {appointment.startTime}
              </span>
              {/* Status pill */}
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ring-1 ring-inset ${status.bg} ${status.text} ${status.ring} truncate`}>
                {status.label}
              </span>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(appointment); }}
                className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-all"
                title="Sửa"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Row 2: Patient name */}
          <div className="text-sm font-bold text-gray-900 leading-tight truncate">
            <CustomerNameLink customerId={appointment.customerId}>{appointment.customerName}</CustomerNameLink>
          </div>

          {/* Row 3: Doctor */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="truncate">{appointment.dentist}</span>
          </div>

          {/* Row 4: Phone (if available) */}
          {appointment.customerPhone && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Phone className="w-3 h-3 text-gray-400 shrink-0" />
              <span>{appointment.customerPhone}</span>
            </div>
          )}

          {/* Row 5: Service / Notes (if available) */}
          {appointment.serviceName && (
            <div className="flex items-start gap-1.5 text-xs text-gray-400">
              <MessageSquare className="w-3 h-3 text-gray-300 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{appointment.serviceName}</span>
            </div>
          )}

          {/* Row 6: Time range with clock icon */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3 h-3 text-gray-300 shrink-0" />
            <span>{appointment.startTime} – {appointment.endTime}</span>
          </div>
        </div>
      </div>
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
  const { t } = useTranslation();
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
            {`${appointments.length} ${t('labels.appointments')}`}
          </span>
        </div>
      </div>

      {/* Card grid — scrollable area */}
      <div className="p-4 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
        {timeGroups.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">{`${t('noAppointments')}`}</p>
          </div>
        )}

        {timeGroups.map((group) => (
          <div key={group.time}>
            {/* Time group header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-gray-400 tracking-wide">
                {group.time}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] text-gray-300 font-medium">
                {`${group.appointments.length} ${t('labels.appointments')}`}
              </span>
            </div>

            {/*
              Responsive auto-fill grid:
              - min 185px per card
              - Wide screen (≈1200px content): ~6 columns
              - Medium (≈900px): ~4 columns
              - Narrow (≈600px): ~3 columns
              - Small (≈400px): ~2 columns
            */}
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))' }}
            >
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
