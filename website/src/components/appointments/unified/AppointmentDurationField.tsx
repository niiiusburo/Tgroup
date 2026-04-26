import { ChevronDown, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  APPOINTMENT_DURATION_OPTIONS,
  DEFAULT_APPOINTMENT_DURATION,
} from '@/lib/appointmentDuration';

interface AppointmentDurationFieldProps {
  readonly value: number | undefined;
  readonly error?: string;
  readonly onChange: (durationMinutes: number) => void;
}

export function AppointmentDurationField({
  value,
  error,
  onChange,
}: AppointmentDurationFieldProps) {
  const { t } = useTranslation();
  const minuteUnit = t('appointments:common.minutes');
  const selectedValue = value ?? DEFAULT_APPOINTMENT_DURATION;
  const durationOptions = (APPOINTMENT_DURATION_OPTIONS as readonly number[]).includes(selectedValue)
    ? APPOINTMENT_DURATION_OPTIONS
    : [...APPOINTMENT_DURATION_OPTIONS, selectedValue].sort((a, b) => a - b);

  return (
    <div>
      <label
        htmlFor="appointment-duration"
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
      >
        <Clock className="w-3.5 h-3.5" />
        {t('appointments:form.duration')}
      </label>
      <div className="relative">
        <select
          id="appointment-duration"
          value={selectedValue}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full appearance-none px-4 py-3 pr-10 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-150"
        >
          {durationOptions.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} {minuteUnit}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
