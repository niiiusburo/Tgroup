import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTimezone } from '@/contexts/TimezoneContext';
import { cn } from '@/lib/utils';

const MONTH_NAME_KEYS = [
  'common:months.january', 'common:months.february', 'common:months.march',
  'common:months.april', 'common:months.may', 'common:months.june',
  'common:months.july', 'common:months.august', 'common:months.september',
  'common:months.october', 'common:months.november', 'common:months.december',
] as const;

const WEEKDAY_NAME_SHORT_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

interface CalendarDateNavigatorProps {
  readonly currentDate: Date;
  readonly dateLabel: string;
  readonly onDateChange: (date: Date) => void;
  readonly onNavigate: (direction: 'prev' | 'next') => void;
  readonly onToday: () => void;
}

export function CalendarDateNavigator({
  currentDate,
  dateLabel,
  onDateChange,
  onNavigate,
  onToday,
}: CalendarDateNavigatorProps) {
  const { t } = useTranslation('calendar');
  const { getToday, formatDate } = useTimezone();
  const [isOpen, setIsOpen] = useState(false);
  const [pickerViewDate, setPickerViewDate] = useState(currentDate);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPickerViewDate(currentDate);
  }, [currentDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const pickerDays = useMemo(() => {
    const [yearStr, monthStr] = formatDate(pickerViewDate, 'yyyy-MM').split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const daysInMonth = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();
    const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
    const startOffset = firstDayOfMonth.getUTCDay() === 0 ? 6 : firstDayOfMonth.getUTCDay() - 1;
    const prevMonthDays = new Date(Date.UTC(year, month - 1, 0, 12, 0, 0)).getUTCDate();
    const days: Array<{ date: number | null; isCurrentMonth: boolean; dateKey?: string }> = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ date: prevMonthDays - i, isCurrentMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ date: day, isCurrentMonth: true, dateKey });
    }
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      days.push({ date: day, isCurrentMonth: false });
    }
    return days;
  }, [pickerViewDate, formatDate]);

  const todayKeyForPicker = useMemo(() => getToday(), [getToday]);

  function shiftPickerMonth(direction: 'prev' | 'next') {
    setPickerViewDate((date) => {
      const [year, month] = formatDate(date, 'yyyy-MM').split('-').map(Number);
      const nextMonth = direction === 'prev' ? month - 1 : month + 1;
      const nextYear = nextMonth < 1 ? year - 1 : nextMonth > 12 ? year + 1 : year;
      const actualMonth = nextMonth < 1 ? 12 : nextMonth > 12 ? 1 : nextMonth;
      return new Date(`${nextYear}-${String(actualMonth).padStart(2, '0')}-01T12:00:00+07:00`);
    });
  }

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 xl:w-auto xl:flex-nowrap">
      <button
        onClick={() => onNavigate('prev')}
        className="min-h-10 min-w-10 p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        aria-label="Previous"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div ref={datePickerRef} className="relative min-w-0 flex-1 basis-[16rem] xl:flex-none">
        <button
          onClick={() => setIsOpen((value) => !value)}
          className={cn(
            'min-h-10 w-full min-w-0 text-sm font-semibold text-gray-900 text-center px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-2 sm:text-base xl:min-w-[15rem]',
            isOpen ? 'bg-gray-200' : 'hover:bg-gray-100',
          )}
        >
          <CalendarIcon className="w-4 h-4 text-gray-500" />
          <span className="truncate">{dateLabel}</span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[min(16rem,calc(100vw-2rem))] bg-white rounded-xl shadow-xl border border-gray-200 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <button type="button" onClick={() => shiftPickerMonth('prev')} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-sm font-semibold text-gray-900">
                {(() => {
                  const [year, month] = formatDate(pickerViewDate, 'yyyy-MM').split('-').map(Number);
                  return `${t(MONTH_NAME_KEYS[month - 1])} ${year}`;
                })()}
              </span>
              <button type="button" onClick={() => shiftPickerMonth('next')} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="grid grid-cols-7 px-2 pt-2">
              {WEEKDAY_NAME_SHORT_KEYS.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                  {t(`weekDays.${day}`)}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 px-2 pb-2">
              {pickerDays.map((day, index) => {
                if (!day.isCurrentMonth || !day.date) {
                  return (
                    <div key={index} className="h-8 flex items-center justify-center">
                      <span className="text-sm text-gray-300">{day.date}</span>
                    </div>
                  );
                }
                const dateKey = day.dateKey!;
                const isSelected = dateKey === formatDate(currentDate, 'yyyy-MM-dd');
                const isToday = dateKey === todayKeyForPicker;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      onDateChange(new Date(`${dateKey}T12:00:00+07:00`));
                      setIsOpen(false);
                    }}
                    className={cn(
                      'h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                      isSelected
                        ? 'bg-primary text-white shadow-md'
                        : isToday
                          ? 'bg-orange-50 text-orange-600 border border-orange-200'
                          : 'text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    {day.date}
                  </button>
                );
              })}
            </div>

            <div className="px-2 pb-2">
              <button
                type="button"
                onClick={() => {
                  onToday();
                  setIsOpen(false);
                }}
                className="w-full py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              >
                {t('today', 'Today')}
              </button>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={() => onNavigate('next')}
        className="min-h-10 min-w-10 p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        aria-label="Next"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      <button
        onClick={onToday}
        className="min-h-10 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap xl:ml-2"
      >
        {t('today', 'Today')}
      </button>
    </div>
  );
}
