/**
 * TimePicker - Custom time picker with luxurious design
 * @crossref:used-in[AppointmentForm, EditAppointmentModal, ServiceForm]
 *
 * Matches website aesthetic with rounded-xl, orange accents, and smooth animations
 */

import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface TimePickerProps {
  readonly value: string; // HH:MM
  readonly onChange: (time: string) => void;
  readonly placeholder?: string;
  readonly label?: string;
  readonly icon?: React.ReactNode;
  readonly interval?: number; // minutes between options, default 15
  readonly minTime?: string;
  readonly maxTime?: string;
  readonly error?: string;
  readonly disabled?: boolean;
}

// Generate time slots
function generateTimeSlots(interval: number): string[] {
  const slots: string[] = [];
  for (let hour = 7; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
}

export function TimePicker({
  value,
  onChange,
  placeholder,
  label,
  icon = <Clock className="w-4 h-4" />,
  interval = 15,
  minTime,
  maxTime,
  error,
  disabled = false
}: TimePickerProps) {
  const { t } = useTranslation('common');
  const resolvedPlaceholder = placeholder ?? t('timePicker.chooseTime');
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const timeSlots = generateTimeSlots(interval);

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

  // Scroll to selected time when opening
  useEffect(() => {
    if (isOpen && value && listRef.current) {
      const selectedIndex = timeSlots.indexOf(value);
      if (selectedIndex >= 0) {
        const itemHeight = 40;
        listRef.current.scrollTop = selectedIndex * itemHeight - 80;
      }
    }
  }, [isOpen, value, timeSlots]);

  const isTimeDisabled = (time: string): boolean => {
    if (minTime && time < minTime) return true;
    if (maxTime && time > maxTime) return true;
    return false;
  };

  const handleTimeSelect = (time: string) => {
    if (isTimeDisabled(time)) return;
    onChange(time);
    setIsOpen(false);
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
          <Clock className="w-4 h-4" />
        </span>
        <span className={cn(
          'flex-1 text-sm',
          value ? 'text-gray-900 font-medium' : 'text-gray-400'
        )}>
          {value || resolvedPlaceholder}
        </span>
        <ChevronDown className={cn(
          'w-4 h-4 text-gray-400 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}

      {/* Time dropdown */}
      {isOpen &&
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">{t('timePicker.chooseTime')}</span>
          </div>

          {/* Time list */}
          <div
          ref={listRef}
          className="max-h-[280px] overflow-y-auto py-1">
          
            {timeSlots.map((time) => {
            const isSelected = time === value;
            const isDisabled = isTimeDisabled(time);

            // Determine period (morning/afternoon/evening)
            const hour = parseInt(time.split(':')[0]);
            let periodLabel = '';
            if (hour < 12) periodLabel = t('timePicker.morning');else
            if (hour < 17) periodLabel = t('timePicker.afternoon');else
            periodLabel = t('timePicker.evening');

            return (
              <button
                key={time}
                type="button"
                onClick={() => handleTimeSelect(time)}
                disabled={isDisabled}
                className={cn(
                  'w-full px-4 py-2.5 flex items-center justify-between transition-colors',
                  isSelected ?
                  'bg-primary text-white' :
                  'hover:bg-gray-50 text-gray-700',
                  isDisabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                )}>
                
                  <span className={cn(
                  'text-sm font-medium',
                  isSelected && 'text-white'
                )}>
                    {time}
                  </span>
                  {!isSelected &&
                <span className="text-xs text-gray-400">
                      {periodLabel}
                    </span>
                }
                  {isSelected &&
                <span className="text-xs text-white/80">

                </span>
                }
                </button>);

          })}
          </div>

          {/* Quick select buttons */}
          <div className="px-3 py-3 border-t border-gray-100 grid grid-cols-3 gap-2">
            {['08:00', '12:00', '16:00'].map((quickTime) =>
          <button
            key={quickTime}
            type="button"
            onClick={() => handleTimeSelect(quickTime)}
            disabled={isTimeDisabled(quickTime)}
            className={cn(
              'px-3 py-2 text-xs font-medium rounded-lg transition-colors',
              value === quickTime ?
              'bg-orange-500 text-white' :
              'bg-gray-100 text-gray-700 hover:bg-gray-200',
              isTimeDisabled(quickTime) && 'opacity-40 cursor-not-allowed'
            )}>
            
                {quickTime}
              </button>
          )}
          </div>
        </div>
      }
    </div>);

}