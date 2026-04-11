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

function parseTimeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function WaitTimer({ arrivalTime, treatmentStartTime, compact = false }: WaitTimerProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (treatmentStartTime || !arrivalTime) return;
    const interval = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(interval);
  }, [arrivalTime, treatmentStartTime]);

  if (!arrivalTime) return null;

  const arrivalSeconds = parseTimeToSeconds(arrivalTime);
  let waitSeconds: number;

  if (treatmentStartTime) {
    waitSeconds = parseTimeToSeconds(treatmentStartTime) - arrivalSeconds;
  } else {
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    waitSeconds = Math.max(0, currentSeconds - arrivalSeconds);
  }

  const waitMinutes = Math.floor(waitSeconds / 60);
  const timerColor = waitMinutes < 10 ? 'green' : waitMinutes < 20 ? 'orange' : 'red';
  const isFinished = treatmentStartTime !== null;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-medium ${
          isFinished
            ? 'text-gray-500'
            : timerColor === 'green'
              ? 'text-emerald-600'
              : timerColor === 'orange'
                ? 'text-amber-600'
                : 'text-red-600'
        }`}
      >
        <Clock className="w-3 h-3" />
        {formatDuration(waitSeconds)}
        {!isFinished && <span className="animate-pulse">*</span>}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
        isFinished
          ? 'bg-gray-50 text-gray-600'
          : timerColor === 'green'
            ? 'bg-emerald-50 text-emerald-700'
            : timerColor === 'orange'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-red-50 text-red-700'
      }`}
    >
      <Clock className="w-4 h-4" />
      <span>Wait: {formatDuration(waitSeconds)}</span>
      {!isFinished && (
        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      )}
    </div>
  );
}
