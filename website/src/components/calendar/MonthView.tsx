/**
 * MonthView Component - monthly calendar grid with status counts
 * @crossref:used-in[Calendar]
 *
 * Redesigned to match reference: day cells show appointment counts by status
 */

import { CheckCircle, Calendar, XCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { type CalendarAppointment } from '@/data/mockCalendar';

interface MonthViewProps {
  readonly currentDate: Date;
  readonly monthDates: readonly Date[];
  readonly getAppointmentsForDate: (date: Date) => readonly CalendarAppointment[];
  readonly onDayClick?: (date: Date) => void;
}

const WEEKDAY_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

interface StatusCounts {
  confirmed: number;
  scheduled: number;
  cancelled: number;
  completed: number;
  inProgress: number;
}

function countByStatus(appointments: readonly CalendarAppointment[]): StatusCounts {
  return appointments.reduce(
    (acc, apt) => {
      switch (apt.status) {
        case 'confirmed':
          acc.confirmed += 1;
          break;
        case 'scheduled':
          acc.scheduled += 1;
          break;
        case 'cancelled':
          acc.cancelled += 1;
          break;
        case 'completed':
          acc.completed += 1;
          break;
        case 'in-progress':
          acc.inProgress += 1;
          break;
      }
      return acc;
    },
    { confirmed: 0, scheduled: 0, cancelled: 0, completed: 0, inProgress: 0 } as StatusCounts,
  );
}

export function MonthView({
  currentDate,
  monthDates,
  getAppointmentsForDate,
  onDayClick,
}: MonthViewProps) {
  const { t } = useTranslation();
  const currentMonth = currentDate.getMonth();
  const today = new Date();
  const todayKey = formatDateKey(today);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAY_HEADERS.map((day) => (
          <div key={day} className="py-3 text-center">
            <span className="text-sm font-semibold text-gray-700">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {monthDates.map((date, index) => {
          const isCurrentMonth = date.getMonth() === currentMonth;
          const isToday = formatDateKey(date) === todayKey;
          const appointments = getAppointmentsForDate(date);
          const counts = countByStatus(appointments);
          const hasAppointments = appointments.length > 0;

          return (
            <div
              key={index}
              onClick={() => onDayClick?.(date)}
              className={cn(
                'min-h-[100px] p-2 border-b border-r border-gray-100',
                'cursor-pointer transition-colors',
                isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50',
                isToday && 'bg-blue-50',
                (index + 1) % 7 === 0 && 'border-r-0',
              )}
            >
              {/* Date number */}
              <div
                className={cn(
                  'text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full',
                  isToday
                    ? 'bg-blue-600 text-white'
                    : isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400',
                )}
              >
                {date.getDate()}
              </div>

              {/* Status counts */}
              {hasAppointments && (
                <div className="space-y-0.5">
                  {counts.confirmed > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                      <CheckCircle className="w-3 h-3" />
                      <span>Đã đến: ({counts.confirmed})</span>
                    </div>
                  )}
                  {counts.scheduled > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-blue-600">
                      <Calendar className="w-3 h-3" />
                      <span>Đang hẹn: ({counts.scheduled})</span>
                    </div>
                  )}
                  {counts.cancelled > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-red-600">
                      <XCircle className="w-3 h-3" />
                      <span>Hủy hẹn: ({counts.cancelled})</span>
                    </div>
                  )}
                  {counts.completed > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-600">
                      <CheckCircle className="w-3 h-3" />
                      <span>{t('appointmentTypes.treatment')}: ({counts.completed})</span>
                    </div>
                  )}
                  {counts.inProgress > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-purple-600">
                      <AlertCircle className="w-3 h-3" />
                      <span>{t('appointmentTypes.consultation')}: ({counts.inProgress})</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
