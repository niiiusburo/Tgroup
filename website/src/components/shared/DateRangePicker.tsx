/**
 * DateRangePicker - Calendar-style date range selector with mini-map view
 * 
 * A popup that shows a month calendar grid. When clicked, opens a beautiful
 * calendar where users can click to select date ranges.
 * Works for Overview (day/week/month) and Calendar.
 * 
 * @crossref:used-in[Overview, Calendar]
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useTimezone } from '@/contexts/TimezoneContext';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
] as const;

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

interface DayInfo {
  dayNum: number;
  isCurrentMonth: boolean;
  dateKey: string;
  dayObj: Date;
}

interface DateRangePickerProps {
  viewMode?: 'day' | 'week' | 'month';
  dateLabel: string;
  onDateChange: (date: Date) => void;
  onRangeSelect?: (start: Date, end: Date) => void;
  currentDate: Date;
  navigate?: (dir: 'prev' | 'next') => void;
  goToToday?: () => void;
  compact?: boolean;
}

export function DateRangePicker({
  viewMode: _viewMode = 'week',
  dateLabel,
  onDateChange,
  onRangeSelect,
  currentDate,
  navigate,
  goToToday,
  compact = false
}: DateRangePickerProps) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const { getToday } = useTimezone();
  const [viewDate, setViewDate] = useState(() => new Date(getToday() + 'T00:00:00'));
  const [selectMode, setSelectMode] = useState<'start' | 'end' | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync view date with current date when popup opens
  useEffect(() => {
    if (isOpen) {
      setViewDate(currentDate);
      setSelectMode(null);
      setStartDate(null);
      setEndDate(null);
    }
  }, [isOpen, currentDate]);

  // Close on outside click
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

  function formatDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const calendarDays = useMemo((): DayInfo[] => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const prevMonthDays = new Date(year, month, 0).getDate();
    const days: DayInfo[] = [];

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({ dayNum: prevMonthDays - i, isCurrentMonth: false, dateKey: formatDateKey(d), dayObj: d });
    }

    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      days.push({ dayNum: day, isCurrentMonth: true, dateKey: formatDateKey(d), dayObj: d });
    }

    // Next month padding
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const d = new Date(year, month + 1, day);
      days.push({ dayNum: day, isCurrentMonth: false, dateKey: formatDateKey(d), dayObj: d });
    }

    return days;
  }, [viewDate]);

  const handleDayClick = useCallback((day: DayInfo) => {
    if (selectMode === null || selectMode === 'start') {
      setStartDate(day.dayObj);
      setSelectMode('end');
      setEndDate(null);
    } else {
      if (day.dayObj < startDate!) {
        setStartDate(day.dayObj);
        setEndDate(null);
      } else {
        setEndDate(day.dayObj);
        if (onRangeSelect && startDate) {
          onRangeSelect(startDate, day.dayObj);
        }
        setIsOpen(false);
        setSelectMode(null);
      }
    }
  }, [selectMode, startDate, onRangeSelect]);

  const handlePrevMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const todayStr = getToday();
    const today = new Date(todayStr + 'T00:00:00');
    setViewDate(today);
    onDateChange(today);
    if (goToToday) goToToday();
    setIsOpen(false);
  };

  function isInRange(dateKey: string): boolean {
    if (!startDate || !endDate) return false;
    return dateKey >= formatDateKey(startDate) && dateKey <= formatDateKey(endDate);
  }

  function isRangeStart(dateKey: string): boolean {
    return startDate ? dateKey === formatDateKey(startDate) : false;
  }

  function isRangeEnd(dateKey: string): boolean {
    return endDate ? dateKey === formatDateKey(endDate) : false;
  }

  function isTodayCell(dateKey: string): boolean {
    return dateKey === getToday();
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-xl transition-all duration-200 font-semibold',
          'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25',
          'hover:from-orange-600 hover:to-amber-600 hover:shadow-xl hover:scale-[1.02]',
          'active:scale-[0.98]',
          compact ? 'px-3 py-1.5 text-sm' : 'px-5 py-2.5 text-base'
        )}>
        
        <MapPin className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        <span>{dateLabel}</span>
      </button>

      {/* Calendar Popup */}
      {isOpen &&
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500">
            <button type="button" onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <div className="text-center">
              <span className="text-sm font-semibold text-white">
                {t(`months.${MONTH_KEYS[viewDate.getMonth()]}`)} {viewDate.getFullYear()}
              </span>
              <div className="text-xs text-orange-100 mt-0.5">
                {selectMode === 'end' && startDate ?
              `${t('dateRange.from')} ${startDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })} \u2014 ${t('dateRange.chooseEndDate')}` :
              selectMode === 'start' ? t("chnNgyBtU") : t("chnKhongNgy")

              }
              </div>
            </div>
            <button type="button" onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 px-3 pt-3">
            {WEEKDAY_KEYS.map((day) =>
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-1.5">
                {t(`days.short.${day}`)}
              </div>
          )}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 px-3 pb-2">
            {calendarDays.map((day, index) => {
            const inRange = isInRange(day.dateKey);
            const isStart = isRangeStart(day.dateKey);
            const isEnd = isRangeEnd(day.dateKey);
            const isTodayCellFlag = isTodayCell(day.dateKey);
            const isPreview = selectMode === 'end' && hoverDate && startDate ?
            day.dateKey > formatDateKey(startDate) && day.dateKey <= hoverDate :
            false;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => selectMode === 'end' && setHoverDate(day.dateKey)}
                onMouseLeave={() => setHoverDate(null)}
                className={cn(
                  'h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-150',
                  'hover:bg-orange-100',
                  inRange && !isStart && !isEnd ? 'bg-orange-100 text-orange-700' : undefined,
                  isStart ? 'bg-gradient-to-br from-orange-500 to-orange-400 text-white rounded-r-none' : undefined,
                  isEnd ? 'bg-gradient-to-br from-orange-500 to-orange-400 text-white rounded-l-none' : undefined,
                  isPreview ? 'bg-orange-50 text-orange-500' : undefined,
                  isStart && isEnd ? 'bg-gradient-to-br from-orange-500 to-orange-400 text-white rounded-lg shadow-md' : undefined,
                  isTodayCellFlag && !inRange && !isStart && !isEnd ?
                  'border-2 border-orange-400 text-orange-600 font-bold' : undefined,
                  !inRange && !isPreview && !isStart && !isEnd ? 'text-gray-700' : undefined,
                  isStart && !isEnd ? 'rounded-r-none' : undefined,
                  !isStart && isEnd ? 'rounded-l-none' : undefined
                )}>
                
                  {day.dayNum}
                </button>);

          })}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 px-3 pb-3">
            <button
            type="button"
            onClick={handleToday}
            className="flex-1 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200 hover:border-orange-300">
            

          </button>

            {navigate &&
          <>
                <button
              type="button"
              onClick={() => {navigate('prev');setIsOpen(false);}}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
              type="button"
              onClick={() => {navigate('next');setIsOpen(false);}}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
          }

            {(startDate || endDate) &&
          <button
            type="button"
            onClick={() => {setStartDate(null);setEndDate(null);setSelectMode(null);}}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-xs">
            
                ✕
              </button>
          }
          </div>
        </div>
      }
    </div>);

}

export default DateRangePicker;