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

function parseTimerPointToMs(value: string, referenceDate: Date): number | null {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const [, hours = '0', minutes = '0', seconds = '0'] = match;
  const date = new Date(referenceDate);
  date.setHours(Number(hours), Number(minutes), Number(seconds), 0);
  return date.getTime();
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours === 0) return `${minutes}m ${seconds}s`;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export function WaitTimer({ arrivalTime, treatmentStartTime, compact = false }: WaitTimerProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (treatmentStartTime || !arrivalTime) return;
    const interval = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(interval);
  }, [arrivalTime, treatmentStartTime]);

  if (!arrivalTime) return null;

  const arrivalMs = parseTimerPointToMs(arrivalTime, now);
  if (arrivalMs === null) return null;

  const treatmentStartMs = treatmentStartTime
    ? parseTimerPointToMs(treatmentStartTime, now)
    : null;
  const waitMs = treatmentStartMs !== null
    ? treatmentStartMs - arrivalMs
    : now.getTime() - arrivalMs;
  const waitSeconds = Math.max(0, Math.floor(waitMs / 1_000));

  const waitMinutes = Math.floor(waitSeconds / 60);
  const timerColor = waitMinutes < 10 ? 'green' : waitMinutes < 20 ? 'orange' : 'red';
  const isFinished = treatmentStartMs !== null;

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
