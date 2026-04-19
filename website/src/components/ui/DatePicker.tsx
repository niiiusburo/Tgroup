/**
 * DatePicker - Custom date picker with luxurious design
 * @crossref:used-in[AppointmentForm, EditAppointmentModal, ServiceForm, Appointments]
 *
 * Matches website aesthetic with rounded-xl, orange accents, and smooth animations
 */

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toISODateString } from '@/lib/dateUtils';
import { useTranslation } from 'react-i18next';
import { useTimezone } from '@/contexts/TimezoneContext';

interface DatePickerProps {
  readonly value: string; // YYYY-MM-DD
  readonly onChange: (date: string) => void;
  readonly placeholder?: string;
  readonly label?: string;
  readonly icon?: React.ReactNode;
  readonly minDate?: string;
  readonly maxDate?: string;
  readonly error?: string;
  readonly disabled?: boolean;
}

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
] as const;

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export function DatePicker({
  value: rawValue,
  onChange,
  placeholder,
  label,
  icon = <Calendar className="w-4 h-4" />,
  minDate,
  maxDate,
  error,
  disabled = false
}: DatePickerProps) {
  const { t } = useTranslation('common');
  // Defensive normalize: accept clean YYYY-MM-DD, ISO timestamps, or empty.
  const value = toISODateString(rawValue);
  const { getToday } = useTimezone();
  const resolvedPlaceholder = placeholder ?? t('datePicker.chooseDate');
  const todayStr = getToday();
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value + 'T00:00:00');
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Update view date when value changes
  useEffect(() => {
    if (value) {
      setViewDate(new Date(value + 'T00:00:00'));
    }
  }, [value]);

  // Compute calendar display using browser local Date methods (viewDate is local)
  // but highlight "today" using the Vietnam timezone
  const todayKey = todayStr;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Generate calendar days
  const calendarDays: Array<{date: number | null;isCurrentMonth: boolean;dateKey?: string;}> = [];

  // Previous month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({ date: prevMonthDays - i, isCurrentMonth: false });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({ date: day, isCurrentMonth: true, dateKey });
  }

  // Next month padding
  const remainingCells = 42 - calendarDays.length;
  for (let day = 1; day <= remainingCells; day++) {
    calendarDays.push({ date: day, isCurrentMonth: false });
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDateSelect = (dateKey: string) => {
    if (minDate && dateKey < minDate) return;
    if (maxDate && dateKey > maxDate) return;
    onChange(dateKey);
    setIsOpen(false);
  };

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const isDateDisabled = (dateKey: string): boolean => {
    if (minDate && dateKey < minDate) return true;
    if (maxDate && dateKey > maxDate) return true;
    return false;
  };

  return (
    <div ref={containerRef} className="relative">
      {label &&
      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
          {icon}
          {label}
        </label>
      }

      {/* Input trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 text-left',
          disabled ?
          'bg-gray-50 border-gray-200 cursor-not-allowed' :
          'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md cursor-pointer',
          error && 'border-red-300 focus:border-red-400',
          isOpen && 'border-orange-400 ring-2 ring-orange-500/20'
        )}>
        
        <span className={cn(
          'text-gray-400',
          value && 'text-orange-500'
        )}>
          <Calendar className="w-4 h-4" />
        </span>
        <span className={cn(
          'flex-1 text-sm',
          value ? 'text-gray-900 font-medium' : 'text-gray-400'
        )}>
          {value ? formatDisplayDate(value) : resolvedPlaceholder}
        </span>
        <ChevronLeft className={cn(
          'w-4 h-4 text-gray-400 transition-transform duration-200',
          isOpen && '-rotate-90'
        )} />
      </button>

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}

      {/* Calendar dropdown */}
      {isOpen &&
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {t(`months.${MONTH_KEYS[month]}`)} {year}
            </span>
            <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 px-2 py-2">
            {WEEKDAY_KEYS.map((day) =>
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                {t(`days.short.${day}`)}
              </div>
          )}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 px-2 pb-3">
            {calendarDays.map((day, index) => {
            if (!day.isCurrentMonth || !day.date) {
              return (
                <div key={index} className="h-9 flex items-center justify-center">
                    <span className="text-sm text-gray-300">{day.date}</span>
                  </div>);

            }

            const dateKey = day.dateKey!;
            const isSelected = dateKey === value;
            const isToday = dateKey === todayKey;
            const isDisabled = isDateDisabled(dateKey);

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleDateSelect(dateKey)}
                disabled={isDisabled}
                className={cn(
                  'h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                  isSelected ?
                  'bg-primary text-white shadow-md' :
                  isToday ?
                  'bg-orange-50 text-orange-600 border border-orange-200' :
                  'text-gray-700 hover:bg-gray-100',
                  isDisabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                )}>
                
                  {day.date}
                </button>);

          })}
          </div>

          {/* Today button */}
          <div className="px-3 pb-3">
            <button
            type="button"
            onClick={() => handleDateSelect(todayKey)}
            disabled={isDateDisabled(todayKey)}
            className="w-full py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-40"
          >
            {t('datePicker.today')}
          </button>
          </div>
        </div>
      }
    </div>);

}