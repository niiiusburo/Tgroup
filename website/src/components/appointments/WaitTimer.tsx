/**
 * WaitTimer - Live wait time display
 * @crossref:used-in[CheckInFlow, Overview]
 */

import { Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface WaitTimerProps {
  readonly arrivalTime: string | null;
  readonly treatmentStartTime: string | null;
  readonly compact?: boolean;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 1) return '< 1m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function WaitTimer({ arrivalTime, treatmentStartTime, compact = false }: WaitTimerProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (treatmentStartTime || !arrivalTime) return;
    const interval = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(interval);
  }, [arrivalTime, treatmentStartTime]);

  if (!arrivalTime) return null;

  const arrivalMinutes = parseTimeToMinutes(arrivalTime);
  let waitMinutes: number;

  if (treatmentStartTime) {
    waitMinutes = parseTimeToMinutes(treatmentStartTime) - arrivalMinutes;
  } else {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    waitMinutes = Math.max(0, currentMinutes - arrivalMinutes);
  }

  const isLongWait = waitMinutes > 30;
  const isFinished = treatmentStartTime !== null;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-medium ${
          isFinished
            ? 'text-gray-500'
            : isLongWait
              ? 'text-red-600'
              : 'text-amber-600'
        }`}
      >
        <Clock className="w-3 h-3" />
        {formatDuration(waitMinutes)}
        {!isFinished && <span className="animate-pulse">*</span>}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
        isFinished
          ? 'bg-gray-50 text-gray-600'
          : isLongWait
            ? 'bg-red-50 text-red-700'
            : 'bg-amber-50 text-amber-700'
      }`}
    >
      <Clock className="w-4 h-4" />
      <span>Wait: {formatDuration(waitMinutes)}</span>
      {!isFinished && (
        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      )}
    </div>
  );
}
