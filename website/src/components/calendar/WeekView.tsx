/**
 * WeekView Component - 7-day column view with appointment cards
 * @crossref:used-in[Calendar]
 *
 * Redesigned to match reference: multi-column grid with stacked cards per day
 * Cards show: status badge, customer name, phone, doctor, time, service
 */

import { CalendarDays, Phone, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type CalendarAppointment } from '@/data/mockCalendar';
import { APPOINTMENT_CARD_COLORS } from '@/constants';
import { CustomerNameLink } from '@/components/shared/CustomerNameLink';

interface WeekViewProps {
  readonly weekDates: readonly Date[];
  readonly getAppointmentsForDate: (date: Date) => readonly CalendarAppointment[];
  readonly onAppointmentClick?: (appointment: CalendarAppointment) => void;
  readonly onAppointmentEdit?: (appointment: CalendarAppointment) => void;
  readonly onDateChange?: (date: Date) => void;
}

// Status configuration matching reference image
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  arrived: {
    label: 'Đã đến',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  confirmed: {
    label: 'Đang hẹn',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  scheduled: {
    label: 'Đang hẹn',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  cancelled: {
    label: 'Hủy hẹn',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  'no-show': {
    label: 'Quá hẹn',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  completed: {
    label: 'Hoàn thành',
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
  },
  'in-progress': {
    label: 'Đang khám',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
};

// Color mapping uses the SINGLE SOURCE OF TRUTH from constants
// See APPOINTMENT_CARD_COLORS for the canonical mapping
function getCardStyles(appointment: CalendarAppointment): string {
  // Use color from appointment if available
  if (appointment.color && APPOINTMENT_CARD_COLORS[appointment.color]) {
    const c = APPOINTMENT_CARD_COLORS[appointment.color];
    return `${c.bg} ${c.dot}`;
  }
  // Fallback to status-based color
  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled;
  return `${statusConfig.bg} border-l-4 ${statusConfig.border}`;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

const WEEKDAY_NAMES = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function AppointmentCard({
  appointment,
  onClick,
  onEdit,
}: {
  readonly appointment: CalendarAppointment;
  readonly onClick?: (apt: CalendarAppointment) => void;
  readonly onEdit?: (apt: CalendarAppointment) => void;
}) {
  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled;
  const cardStyles = getCardStyles(appointment);

  return (
    <div
      onClick={() => onClick?.(appointment)}
      className={cn(
        'relative group rounded-lg p-2.5 border-l-4 shadow-sm cursor-pointer',
        'hover:shadow-md transition-shadow text-xs mb-2',
        cardStyles
      )}
    >
      {/* Status badge */}
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mb-1.5',
          statusConfig.bg,
          statusConfig.text
        )}
      >
        {statusConfig.label}
      </span>

      {/* Customer name */}
      <h5 className="font-semibold text-gray-900 truncate text-xs mb-1.5">
        <CustomerNameLink customerId={appointment.customerId}>{appointment.customerName}</CustomerNameLink>
      </h5>

      {/* Details grid */}
      <div className="space-y-1">
        {/* Phone */}
        <div className="flex items-center gap-1 text-[11px] text-gray-600">
          <Phone className="w-3 h-3 text-gray-400" />
          <span className="truncate">{appointment.customerPhone || '---'}</span>
        </div>

        {/* Doctor */}
        <div className="flex items-center gap-1 text-[11px] text-gray-600">
          <User className="w-3 h-3 text-gray-400" />
          <span className="truncate">{appointment.dentist}</span>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 text-[11px] text-gray-600">
          <Clock className="w-3 h-3 text-gray-400" />
          <span>{appointment.startTime} - {appointment.endTime}</span>
        </div>
      </div>

      {/* Service note */}
      {appointment.serviceName && (
        <p className="text-[10px] text-gray-500 mt-1.5 pt-1.5 border-t border-gray-200/50 truncate">
          {appointment.serviceName}
        </p>
      )}

      {/* Edit button on hover */}
      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(appointment);
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600"
        >
          ✎
        </button>
      )}
    </div>
  );
}

export function WeekView({
  weekDates,
  getAppointmentsForDate,
  onAppointmentClick,
  onAppointmentEdit,
}: WeekViewProps) {
  const today = new Date();
  const todayKey = formatDateKey(today);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card">
      {/* Week grid */}
      <div className="flex overflow-x-auto">
        {weekDates.map((date, index) => {
          const dateKey = formatDateKey(date);
          const isToday = dateKey === todayKey;
          const appointments = getAppointmentsForDate(date);
          const sortedAppointments = [...appointments].sort((a, b) =>
            a.startTime.localeCompare(b.startTime)
          );

          return (
            <div
              key={dateKey}
              className={cn(
                'flex-1 min-w-[180px] border-r border-gray-100 last:border-r-0',
                isToday && 'bg-orange-50/30 ring-2 ring-inset ring-orange-400'
              )}
            >
              {/* Day header */}
              <div
                className={cn(
                  'text-center py-3 border-b border-gray-100',
                  isToday && 'bg-orange-100'
                )}
              >
                <div
                  className={cn(
                    'text-sm font-semibold',
                    isToday ? 'text-orange-700' : 'text-gray-900'
                  )}
                >
                  {formatDateDisplay(date)}
                </div>
                <div
                  className={cn(
                    'text-xs mt-0.5',
                    isToday ? 'text-orange-600' : 'text-gray-500'
                  )}
                >
                  {WEEKDAY_NAMES[index]}
                </div>
              </div>

              {/* Appointments */}
              <div className="p-2.5 space-y-2 min-h-[400px]">
                {sortedAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-gray-300">
                    <CalendarDays className="w-6 h-6 mb-1" />
                    <span className="text-xs">Không có lịch hẹn</span>
                  </div>
                ) : (
                  sortedAppointments.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      onClick={onAppointmentClick}
                      onEdit={onAppointmentEdit}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
