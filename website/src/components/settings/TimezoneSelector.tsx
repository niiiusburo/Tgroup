/**
 * TimezoneSelector - Settings component for selecting timezone
 * @crossref:used-in[Settings]
 * @crossref:uses[useTimezone]
 */

import { Globe, Clock, Check } from 'lucide-react';
import { useTimezone } from '@/contexts/TimezoneContext';

interface TimezoneSelectorProps {
  readonly compact?: boolean;
}

export function TimezoneSelector({ compact = false }: TimezoneSelectorProps) {
  const { timezone, setTimezone, availableTimezones } = useTimezone();

  const currentTimezone = availableTimezones.find(tz => tz.value === timezone);

  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <label htmlFor="timezone-select-compact" className="block text-sm font-medium text-gray-700 mb-2">
            Select Timezone
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              id="timezone-select-compact"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-sm"
            >
              {availableTimezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Check className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 rounded-lg border border-primary/20">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-gray-500">Current Selection</p>
            <p className="text-sm font-medium text-gray-900">
              {currentTimezone?.label || timezone}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Timezone</h3>
        </div>
      </div>
      <div className="p-4">
        <label htmlFor="timezone-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Timezone
        </label>
        <select
          id="timezone-select"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white"
        >
          {availableTimezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-500">
          This timezone will be used throughout the application for all date and time displays.
        </p>
        <div className="mt-3 px-3 py-2 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Current:</strong> {availableTimezones.find(tz => tz.value === timezone)?.label || timezone}
          </p>
        </div>
      </div>
    </div>
  );
}
