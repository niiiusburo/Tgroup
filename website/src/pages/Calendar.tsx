import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendarData, type ViewMode } from '@/hooks/useCalendarData';
import { DayView } from '@/components/calendar/DayView';
import { WeekView } from '@/components/calendar/WeekView';
import { MonthView } from '@/components/calendar/MonthView';

/**
 * Calendar Page with Day/Week/Month view modes
 * @crossref:route[/calendar]
 * @crossref:used-in[App]
 * @crossref:uses[DayView, WeekView, MonthView]
 */

const VIEW_TABS: readonly { readonly mode: ViewMode; readonly label: string }[] = [
  { mode: 'day', label: 'Day' },
  { mode: 'week', label: 'Week' },
  { mode: 'month', label: 'Month' },
];

export function Calendar() {
  const {
    viewMode,
    setViewMode,
    currentDate,
    goToToday,
    navigate,
    weekDates,
    monthDates,
    getAppointmentsForDate,
    dateLabel,
  } = useCalendarData();

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <CalendarIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500">Schedule and manage appointments</p>
        </div>
      </div>

      {/* Toolbar: navigation + view tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white rounded-xl shadow-card px-4 py-3">
        {/* Left: date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary-lighter transition-colors"
          >
            Today
          </button>
          <div className="flex items-center">
            <button
              onClick={() => navigate('prev')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('next')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-base font-semibold text-gray-900 ml-1">{dateLabel}</h2>
        </div>

        {/* Right: view mode tabs */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.mode}
              onClick={() => setViewMode(tab.mode)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === tab.mode
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === 'day' && (
        <DayView
          currentDate={currentDate}
          getAppointmentsForDate={getAppointmentsForDate}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          weekDates={weekDates}
          getAppointmentsForDate={getAppointmentsForDate}
        />
      )}
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          monthDates={monthDates}
          getAppointmentsForDate={getAppointmentsForDate}
        />
      )}
    </div>
  );
}
