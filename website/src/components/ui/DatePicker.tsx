/**
 * DatePicker - Custom date picker for modal-safe appointment/date workflows
 * @crossref:used-in[AppointmentForm, EditAppointmentModal, ServiceForm, Appointments]
 *
 * Opens in normal document flow so mobile sheets and scrollable modals do not
 * cover the fields below the selected date.
 */

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  readonly allowClear?: boolean;
  readonly size?: 'default' | 'compact';
}

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
] as const;

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export function DatePicker({
  value: rawValue,
  onChange,
  placeholder,
  label,
  icon = <Calendar className="w-4 h-4" />,
  minDate,
  maxDate,
  error,
  disabled = false,
  allowClear = false,
  size = 'default'
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

  // Get days in month. The clinic calendar is Monday-first, matching the
  // Vietnamese operational calendar used by the CTV booking sheet.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const leadingBlankDays = (firstDayOfMonth + 6) % 7;

  // Generate calendar days
  const calendarDays: Array<{date: number | null;isCurrentMonth: boolean;dateKey?: string;}> = [];

  // Previous month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = leadingBlankDays - 1; i >= 0; i--) {
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

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const displayValue = value ? formatDisplayDate(value) : resolvedPlaceholder;
  const triggerLabel = label ? `${label}: ${displayValue}` : displayValue;
  const isCompact = size === 'compact';

  const isDateDisabled = (dateKey: string): boolean => {
    if (minDate && dateKey < minDate) return true;
    if (maxDate && dateKey > maxDate) return true;
    return false;
  };

  return (
    <div ref={containerRef} className="relative">
      {label &&
      <label className={cn(
        'mb-1.5 flex items-center gap-2 font-medium text-gray-700',
        isCompact ? 'text-xs' : 'text-sm'
      )}>
          {icon}
          {label}
        </label>
      }

      {/* Input trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={triggerLabel}
        className={cn(
          'w-full flex items-center gap-3 border text-left transition-all duration-200',
          isCompact ? 'rounded-lg px-3 py-2' : 'rounded-xl px-4 py-3',
          disabled ?
          'bg-gray-50 border-gray-200 cursor-not-allowed' :
          'bg-white border-gray-200 hover:border-orange-300 hover:shadow-sm cursor-pointer',
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
          'flex-1',
          isCompact ? 'text-xs' : 'text-sm',
          value ? 'text-gray-900 font-medium' : 'text-gray-400'
        )}>
          {displayValue}
        </span>
        <ChevronLeft className={cn(
          'w-4 h-4 text-gray-400 transition-transform duration-200',
          isOpen && '-rotate-90'
        )} />
      </button>

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}

      {/* Calendar dropdown */}
      {isOpen &&
      <div
        role="dialog"
        aria-label={t('datePicker.chooseDate')}
        data-testid="date-picker-panel"
        className={cn(
          'mt-2 w-full overflow-hidden border border-gray-200 bg-white shadow-lg ring-1 ring-gray-900/5 animate-in fade-in slide-in-from-top-2 duration-200',
          isCompact ? 'rounded-xl' : 'rounded-2xl'
        )}
      >
          {/* Header */}
          <div className={cn(
            'flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-3',
            isCompact ? 'py-2' : 'py-2.5'
          )}>
            <button
            type="button"
            onClick={handlePrevMonth}
            aria-label={t('datePicker.previousMonth')}
            className={cn(
              'grid place-items-center rounded-lg text-gray-600 transition-colors hover:bg-white hover:shadow-sm',
              isCompact ? 'h-8 w-8' : 'h-9 w-9'
            )}>
            
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-900" aria-live="polite">
              {t(`months.${MONTH_KEYS[month]}`)} {year}
            </span>
            <button
            type="button"
            onClick={handleNextMonth}
            aria-label={t('datePicker.nextMonth')}
            className={cn(
              'grid place-items-center rounded-lg text-gray-600 transition-colors hover:bg-white hover:shadow-sm',
              isCompact ? 'h-8 w-8' : 'h-9 w-9'
            )}>
            
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className={cn(
            'grid grid-cols-7 gap-1 px-3 pb-1',
            isCompact ? 'pt-2' : 'pt-3'
          )} role="row">
            {WEEKDAY_KEYS.map((day) =>
          <div
            key={day}
            role="columnheader"
            data-testid="date-picker-weekday"
            className="py-1 text-center text-[11px] font-semibold text-gray-400"
          >
                {t(`days.short.${day}`)}
              </div>
          )}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 px-3 pb-3" role="grid">
            {calendarDays.map((day, index) => {
            if (!day.isCurrentMonth || !day.date) {
              return (
                <div key={index} data-testid="date-picker-cell" className={cn(
                  'flex items-center justify-center',
                  isCompact ? 'h-8' : 'h-9'
                )}>
                    <span className={cn(isCompact ? 'text-xs' : 'text-sm', 'text-gray-300')}>{day.date}</span>
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
                aria-label={formatDisplayDate(dateKey)}
                aria-pressed={isSelected}
                data-testid="date-picker-cell"
                className={cn(
                  'flex items-center justify-center rounded-lg font-semibold transition-all',
                  isCompact ? 'h-8 text-xs' : 'h-9 text-sm',
                  isSelected ?
                  'bg-primary text-white shadow-sm' :
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
          <div className={cn(
            'border-t border-gray-100 px-3',
            isCompact ? 'py-2' : 'py-2.5',
            allowClear && value ? 'grid grid-cols-2 gap-2' : ''
          )}>
            {allowClear && value ? (
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  'inline-flex w-full items-center justify-center gap-1.5 rounded-lg font-semibold text-gray-500 transition-colors hover:bg-gray-50',
                  isCompact ? 'py-1.5 text-xs' : 'py-2 text-sm'
                )}
              >
                <X className="h-3.5 w-3.5" />
                {t('datePicker.clear')}
              </button>
            ) : null}
            <button
            type="button"
            onClick={() => handleDateSelect(todayKey)}
            disabled={isDateDisabled(todayKey)}
            className={cn(
              'w-full rounded-lg font-semibold text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-40',
              isCompact ? 'py-1.5 text-xs' : 'py-2 text-sm'
            )}
          >
            {t('datePicker.today')}
          </button>
          </div>
        </div>
      }
    </div>);

}
