import { WEEK_DAYS, TIME_SLOTS } from '@/constants';
import type { ScheduleBlock } from '@/types/employee';

/**
 * Weekly schedule calendar showing employee availability
 * @crossref:used-in[EmployeeProfile, Appointments, Calendar]
 */

interface ScheduleCalendarProps {
  readonly schedule: readonly ScheduleBlock[];
}

const DISPLAY_SLOTS = TIME_SLOTS.filter((_, i) => i % 2 === 0);

function isSlotActive(
  day: string,
  slotTime: string,
  schedule: readonly ScheduleBlock[],
): boolean {
  const block = schedule.find((s) => s.day === day);
  if (!block) return false;
  return slotTime >= block.startTime && slotTime < block.endTime;
}

function getBlockTimes(day: string, schedule: readonly ScheduleBlock[]): string | null {
  const block = schedule.find((s) => s.day === day);
  if (!block) return null;
  return `${block.startTime} - ${block.endTime}`;
}

export function ScheduleCalendar({ schedule }: ScheduleCalendarProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left text-gray-500 font-medium w-16">Time</th>
            {WEEK_DAYS.map((day) => (
              <th key={day} className="p-2 text-center font-medium text-gray-700">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.slice(0, 3)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DISPLAY_SLOTS.map((slot) => (
            <tr key={slot}>
              <td className="p-1 text-xs text-gray-400 font-mono">{slot}</td>
              {WEEK_DAYS.map((day) => {
                const active = isSlotActive(day, slot, schedule);
                return (
                  <td key={day} className="p-0.5">
                    <div
                      className={`h-6 rounded transition-colors ${
                        active
                          ? 'bg-primary/20 border border-primary/30'
                          : 'bg-gray-50 border border-transparent'
                      }`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary row */}
      <div className="mt-3 flex flex-wrap gap-2">
        {WEEK_DAYS.map((day) => {
          const times = getBlockTimes(day, schedule);
          return (
            <div
              key={day}
              className={`px-2 py-1 rounded text-xs ${
                times ? 'bg-primary/10 text-primary-dark' : 'bg-gray-50 text-gray-400'
              }`}
            >
              <span className="font-medium">{day.slice(0, 3)}:</span>{' '}
              {times ?? 'Off'}
            </div>
          );
        })}
      </div>
    </div>
  );
}
