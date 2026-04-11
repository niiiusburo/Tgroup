import { Clock, User, MapPin } from 'lucide-react';
import type { CalendarAppointment } from '@/data/mockCalendar';
import { STATUS_BADGE_STYLES } from '@/data/mockCalendar';
import { CustomerNameLink } from '@/components/shared/CustomerNameLink';

/**
 * TodaySchedule - Appointment timeline for today
 * @crossref:used-in[Overview, CalendarPage]
 */

interface TodayScheduleProps {
  readonly appointments: readonly CalendarAppointment[];
  readonly title?: string;
}

export function TodaySchedule({
  appointments,
  title = "Today's Schedule",
}: TodayScheduleProps) {
  const sorted = [...appointments].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-xs font-medium text-gray-400">
          {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="py-8 text-center">
          <Clock className="w-10 h-10 mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-500">No appointments scheduled for today</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {sorted.map((apt) => (
            <div
              key={apt.id}
              className="flex gap-3 p-3 rounded-lg border border-gray-100 hover:border-primary/20 hover:bg-primary-lighter/30 transition-colors"
            >
              {/* Time column */}
              <div className="shrink-0 w-16 text-center">
                <div className="text-sm font-semibold text-gray-900">
                  {apt.startTime}
                </div>
                <div className="text-[11px] text-gray-400">{apt.endTime}</div>
              </div>

              {/* Divider */}
              <div className="w-px bg-gray-200 shrink-0" />

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {apt.serviceName}
                  </p>
                  <span
                    className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      STATUS_BADGE_STYLES[apt.status]
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    <CustomerNameLink customerId={apt.customerId}>{apt.customerName}</CustomerNameLink>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    {apt.dentist}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
