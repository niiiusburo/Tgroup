import { CalendarDays, Clock } from 'lucide-react';

interface FilterSummaryCardsProps {
  totalAppointments: number;
  totalDurationMinutes: number;
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}g${String(m).padStart(2, '0')}p`;
}

export function FilterSummaryCards({ totalAppointments, totalDurationMinutes }: FilterSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <CalendarDays className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <div className="text-xl font-bold text-gray-900">{totalAppointments}</div>
          <div className="text-xs text-gray-500">Lịch hẹn</div>
        </div>
      </div>
      <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <Clock className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <div className="text-xl font-bold text-gray-900">{formatDuration(totalDurationMinutes)}</div>
          <div className="text-xs text-gray-500">Dự kiến</div>
        </div>
      </div>
    </div>
  );
}
