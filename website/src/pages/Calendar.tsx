// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useCalendarData, type ViewMode } from '@/hooks/useCalendarData';
import { useSmartFilter } from '@/hooks/useSmartFilter';
import { normalizeText } from '@/lib/utils';
import { useDragReschedule } from '@/hooks/useDragReschedule';
import { DayView } from '@/components/calendar/DayView';
import { WeekView } from '@/components/calendar/WeekView';
import { MonthView } from '@/components/calendar/MonthView';
import { SmartFilterDrawer } from '@/components/calendar/SmartFilterDrawer';

import { useLocationFilter } from '@/contexts/LocationContext';
import { useTimezone } from '@/contexts/TimezoneContext';
import type { CalendarAppointment } from '@/data/mockCalendar';
import type { AppointmentStatus } from '@/types/appointment';
import { AppointmentFormShell, calendarAppointmentToFormData } from '@/components/appointments/unified';
import { QuickAddAppointmentButton } from '@/components/shared/QuickAddAppointmentButton';
import { PageHeader } from '@/components/shared/PageHeader';
import type { UnifiedAppointmentFormData } from '@/components/appointments/unified';
import { ExportDialog, type ExportMode } from '@/components/calendar/ExportDialog';
import { exportAppointmentsXlsx } from '@/lib/exportAppointmentsXlsx';
import { fetchAppointments } from '@/lib/api';
import { mapApiAppointmentToCalendar } from '@/lib/calendarUtils';
import { cn } from '@/lib/utils';

/**
 * Calendar Page with Day/Week/Month view modes
 * @crossref:route[/calendar]
 * @crossref:used-in[App]
 * @crossref:uses[DayView, WeekView, MonthView, AppointmentCard, EditAppointmentModal, SmartFilterDrawer, useLocationFilter, useDragReschedule]
 *
 * Redesigned to match reference images with Vietnamese labels:
 * - Ngày (Day), Tuần (Week), Tháng (Month)
 * - Week view shows appointment cards with status badges
 * - Month view shows status counts per day
 */

const MONTH_NAME_KEYS = [
  'common:months.january', 'common:months.february', 'common:months.march',
  'common:months.april', 'common:months.may', 'common:months.june',
  'common:months.july', 'common:months.august', 'common:months.september',
  'common:months.october', 'common:months.november', 'common:months.december',
] as const;

const WEEKDAY_NAME_SHORT_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const VIEW_TABS: readonly {readonly mode: ViewMode;readonly labelKey: string;}[] = [
{ mode: 'day', labelKey: 'dayView' },
{ mode: 'week', labelKey: 'weekView' },
{ mode: 'month', labelKey: 'monthView' }];




export function Calendar() {
  const { t } = useTranslation('calendar');
  const { selectedLocationId } = useLocationFilter();
  const { getToday, formatDate } = useTimezone();
  const {
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    goToToday,
    navigate,
    weekDates,
    monthDates,
    getAppointmentsForDate,
    dateLabel,
    search,
    setSearch,
    selectedDoctors,
    setSelectedDoctors,
    selectedStatuses,
    setSelectedStatuses,
    selectedColors,
    setSelectedColors,
    clearFilters,
    appointments,
    refresh,
    updateAppointmentStatus,
    markArrived
  } = useCalendarData(selectedLocationId);

  // Edit modal state - pre-mapped form data from calendar appointment
  const [editingAppointment, setEditingAppointment] = useState<Partial<UnifiedAppointmentFormData> | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Export dialog state
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Create appointment modal state (triggered from empty time slot)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createInitialData, setCreateInitialData] = useState<Partial<UnifiedAppointmentFormData> | undefined>(undefined);

  // Smart filter drawer state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const doctorsFilter = useSmartFilter<string>(selectedDoctors);
  const statusesFilter = useSmartFilter<AppointmentStatus>(selectedStatuses);
  const colorsFilter = useSmartFilter<string>(selectedColors);

  const openFilter = useCallback(() => {
    doctorsFilter.setSelected(selectedDoctors);
    statusesFilter.setSelected(selectedStatuses);
    colorsFilter.setSelected(selectedColors);
    setIsFilterOpen(true);
  }, [selectedDoctors, selectedStatuses, selectedColors]);

  const closeFilter = useCallback(() => {
    setIsFilterOpen(false);
  }, []);

  const applyFilter = useCallback(() => {
    setSelectedDoctors(doctorsFilter.selected);
    setSelectedStatuses(statusesFilter.selected);
    setSelectedColors(colorsFilter.selected);
    setIsFilterOpen(false);
  }, [doctorsFilter.selected, statusesFilter.selected, colorsFilter.selected]);

  const clearFilter = useCallback(() => {
    doctorsFilter.clear();
    statusesFilter.clear();
    colorsFilter.clear();
    clearFilters();
  }, [clearFilters]);

  const handleReschedule = useCallback(async (result: {appointmentId: string;newDate: string;newTime: string;}) => {
    try {
      const { updateAppointment } = await import('@/lib/api');
      await updateAppointment(result.appointmentId, {
        date: `${result.newDate}T${result.newTime}:00`
      });
      refresh?.();
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
    }
  }, [refresh]);

  const { handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReschedule(handleReschedule);

  // Click on appointment card opens edit modal directly using unified form
  const handleAppointmentClick = useCallback((appointment: CalendarAppointment) => {
    setEditingAppointment(calendarAppointmentToFormData(appointment));
    setIsEditModalOpen(true);
  }, []);

  // Handle pencil icon edit - same action as card click in Calendar
  const handleEditClick = useCallback((appointment: CalendarAppointment) => {
    handleAppointmentClick(appointment);
  }, [handleAppointmentClick]);

  const handleEditModalClose = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingAppointment(null);
  }, []);

  const handleEditModalSaved = useCallback(() => {
    refresh?.();
    setIsEditModalOpen(false);
    setEditingAppointment(null);
  }, [refresh]);

  const handleDayClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
  }, [setCurrentDate, setViewMode]);

  const getExportDateRange = useCallback((mode: ExportMode): [string, string] => {
    if (mode === 'current-filter') {
      if (viewMode === 'day') {
        const d = formatDate(currentDate, 'yyyy-MM-dd');
        return [d, d];
      }
      if (viewMode === 'week') {
        return [
        formatDate(weekDates[0], 'yyyy-MM-dd'),
        formatDate(weekDates[6], 'yyyy-MM-dd')];

      }
      return [
      formatDate(monthDates[0], 'yyyy-MM-dd'),
      formatDate(monthDates[monthDates.length - 1], 'yyyy-MM-dd')];

    }
    return ['', ''];
  }, [viewMode, currentDate, weekDates, monthDates, formatDate]);

  const handleExport = useCallback(async (mode: ExportMode, dateFrom: string, dateTo: string) => {
    let rows: CalendarAppointment[];
    if (mode === 'current-filter') {
      rows = [...appointments];
    } else {
      const response = await fetchAppointments({
        limit: 1000,
        dateFrom,
        dateTo,
        companyId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined
      });
      rows = response.items.map(mapApiAppointmentToCalendar);
    }
    const [from, to] = mode === 'current-filter' ? getExportDateRange('current-filter') : [dateFrom, dateTo];
    const suffix = from === to ? from : `${from}_${to}`;
    await exportAppointmentsXlsx(rows, `DanhSachLichHen_${suffix}.xlsx`, t);
  }, [appointments, selectedLocationId, getExportDateRange]);

  const handleCreateAppointment = useCallback((date: string, startTime: string) => {
    const [h, m] = startTime.split(':').map(Number);
    const endH = h + Math.floor((m + 30) / 60);
    const endM = (m + 30) % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    setCreateInitialData({
      date,
      startTime,
      endTime
    });
    setCreateModalOpen(true);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setCreateModalOpen(false);
    refresh?.();
  }, [refresh]);

  // Inline date picker state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerViewDate, setPickerViewDate] = useState(currentDate);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPickerViewDate(currentDate);
  }, [currentDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    }
    if (isDatePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDatePickerOpen]);

  const pickerDays = useMemo(() => {
    const [yearStr, monthStr] = formatDate(pickerViewDate, 'yyyy-MM').split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const daysInMonth = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();
    const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
    const startOffset = firstDayOfMonth.getUTCDay() === 0 ? 6 : firstDayOfMonth.getUTCDay() - 1;
    const prevMonthDays = new Date(Date.UTC(year, month - 1, 0, 12, 0, 0)).getUTCDate();
    const days: Array<{date: number | null;isCurrentMonth: boolean;dateKey?: string;}> = [];
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

  // Unified search combobox state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const visibleAppointments = useMemo(() => {
    if (viewMode === 'day') return getAppointmentsForDate(currentDate);
    if (viewMode === 'week') return weekDates.flatMap((d) => getAppointmentsForDate(d));
    return monthDates.flatMap((d) => getAppointmentsForDate(d));
  }, [viewMode, currentDate, weekDates, monthDates, getAppointmentsForDate]);

  const customerSuggestions = useMemo(() => {
    const map = new Map<string, {id: string;name: string;phone: string;code: string;}>();
    visibleAppointments.forEach((apt) => {
      if (!map.has(apt.customerId)) {
        map.set(apt.customerId, {
          id: apt.customerId,
          name: apt.customerName,
          phone: apt.customerPhone,
          code: apt.customerCode
        });
      }
    });
    return Array.from(map.values());
  }, [visibleAppointments]);

  const filteredSuggestions = useMemo(() => {
    if (search.trim().length < 2) return [];
    const term = normalizeText(search.trim());
    return customerSuggestions.filter(
      (c) =>
      normalizeText(c.name).includes(term) ||
      normalizeText(c.phone).includes(term) ||
      normalizeText(c.code).includes(term)
    );
  }, [customerSuggestions, search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setIsDropdownOpen(true);
  }, [setSearch]);

  const handleSelectCustomer = useCallback((name: string) => {
    setSearch(name);
    setIsDropdownOpen(false);
  }, [setSearch]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={<CalendarIcon className="w-6 h-6 text-primary" />}
      />

      {/* Toolbar: view tabs + navigation + filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white rounded-xl shadow-card px-4 py-3">
        {/* Left: view mode tabs (Vietnamese) */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  {VIEW_TABS.map((tab) =>
                  <button
                    key={tab.mode}
                    onClick={() => setViewMode(tab.mode)}
                    className={cn(
                      'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                      viewMode === tab.mode ?
                      'bg-white text-blue-600 shadow-sm' :
                      'text-gray-600 hover:text-gray-900'
                    )}>
                    
                      {t(tab.labelKey)}
                    </button>
                  )}
        </div>

        {/* Center: date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('prev')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Previous">
            
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div ref={datePickerRef} className="relative">
            <button
              onClick={() => setIsDatePickerOpen((v) => !v)}
              className={cn(
                'text-base font-semibold text-gray-900 min-w-[150px] text-center px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-2',
                isDatePickerOpen ? 'bg-gray-200' : 'hover:bg-gray-100'
              )}>
              
              <CalendarIcon className="w-4 h-4 text-gray-500" />
              {dateLabel}
            </button>

            {isDatePickerOpen &&
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                  <button
                  type="button"
                  onClick={() => setPickerViewDate((d) => {
                    const [y, m] = formatDate(d, 'yyyy-MM').split('-').map(Number);
                    const newMonth = m - 1;
                    const newYear = newMonth < 1 ? y - 1 : y;
                    const actualMonth = newMonth < 1 ? 12 : newMonth;
                    return new Date(`${newYear}-${String(actualMonth).padStart(2, '0')}-01T12:00:00+07:00`);
                  })}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                  
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-sm font-semibold text-gray-900">
                    {(() => {
                      const [y, m] = formatDate(pickerViewDate, 'yyyy-MM').split('-').map(Number);
                      return `${t(MONTH_NAME_KEYS[m - 1])} ${y}`;
                    })()}
                  </span>
                  <button
                  type="button"
                  onClick={() => setPickerViewDate((d) => {
                    const [y, m] = formatDate(d, 'yyyy-MM').split('-').map(Number);
                    const newMonth = m + 1;
                    const newYear = newMonth > 12 ? y + 1 : y;
                    const actualMonth = newMonth > 12 ? 1 : newMonth;
                    return new Date(`${newYear}-${String(actualMonth).padStart(2, '0')}-01T12:00:00+07:00`);
                  })}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                  
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 px-2 pt-2">
                  {WEEKDAY_NAME_SHORT_KEYS.map((day) =>
                <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                      {t(`weekDays.${day}`)}
                    </div>
                )}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 px-2 pb-2">
                  {pickerDays.map((day, index) => {
                  if (!day.isCurrentMonth || !day.date) {
                    return (
                      <div key={index} className="h-8 flex items-center justify-center">
                          <span className="text-sm text-gray-300">{day.date}</span>
                        </div>);

                  }
                  const dateKey = day.dateKey!;
                  const isSelected = dateKey === formatDate(currentDate, 'yyyy-MM-dd');
                  const isToday = dateKey === todayKeyForPicker;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setCurrentDate(new Date(dateKey + 'T12:00:00+07:00'));
                        setIsDatePickerOpen(false);
                      }}
                      className={cn(
                        'h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                        isSelected ?
                        'bg-primary text-white shadow-md' :
                        isToday ?
                        'bg-orange-50 text-orange-600 border border-orange-200' :
                        'text-gray-700 hover:bg-gray-100'
                      )}>
                      
                        {day.date}
                      </button>);

                })}
                </div>

                {/* Today button */}
                <div className="px-2 pb-2">
                  <button
                  type="button"
                  onClick={() => {
                    goToToday();
                    setIsDatePickerOpen(false);
                  }}
                  className="w-full py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                  

                </button>
                </div>
              </div>
            }
          </div>
          <button
            onClick={() => navigate('next')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Next">
            
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            

          </button>
        </div>

        {/* Right: Quick add + unified search combobox + doctor filter */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div ref={dropdownRef} className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={handleSearchInputChange}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder={t('searchPlaceholder', { ns: 'customers' })}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
            
            {isDropdownOpen && search.trim().length >= 2 &&
            <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
                {filteredSuggestions.length === 0 ?
              <div className="px-4 py-3 text-sm text-gray-400 text-center">{t('khngTmThyKtQu')}</div> :

              filteredSuggestions.map((customer) =>
              <button
                key={customer.id}
                type="button"
                onClick={() => handleSelectCustomer(customer.name)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
                
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-xs text-gray-500">{customer.phone} · {customer.code}</div>
                    </button>
              )
              }
              </div>
            }
          </div>
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            {t('xutExcel', 'Xuất Excel')}
          </button>
          <QuickAddAppointmentButton onSuccess={refresh} size="sm" />
          
          <button
            type="button"
            data-testid="calendar-filter-button"
            onClick={openFilter}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <span>{t('bLc', 'Bộ lọc')}</span>
            {selectedDoctors.length + selectedStatuses.length + selectedColors.length > 0 &&
            <span
              data-testid="calendar-filter-badge"
              className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium text-white bg-primary rounded-full">
              
                {selectedDoctors.length + selectedStatuses.length + selectedColors.length}
              </span>
            }
          </button>
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === 'day' &&
      <DayView
        currentDate={currentDate}
        getAppointmentsForDate={getAppointmentsForDate}
        onAppointmentClick={handleAppointmentClick}
        onAppointmentEdit={handleEditClick}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onMarkArrived={markArrived}
        onUpdateStatus={updateAppointmentStatus}
        onCreateAppointment={handleCreateAppointment} />

      }
      {viewMode === 'week' &&
      <WeekView
        weekDates={weekDates}
        getAppointmentsForDate={getAppointmentsForDate}
        onAppointmentClick={handleAppointmentClick}
        onAppointmentEdit={handleEditClick}
        onDateChange={setCurrentDate}
        onMarkArrived={markArrived}
        onUpdateStatus={updateAppointmentStatus} />

      }
      {viewMode === 'month' &&
      <MonthView
        currentDate={currentDate}
        monthDates={monthDates}
        getAppointmentsForDate={getAppointmentsForDate}
        onDayClick={handleDayClick} />

      }

      {/* Unified Appointment Form — edit mode */}
      <AppointmentFormShell
        key={editingAppointment?.id ?? 'edit-closed'}
        mode="edit"
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onSuccess={handleEditModalSaved}
        initialData={editingAppointment ?? undefined}
        customerReadOnly
      />

      <SmartFilterDrawer
        isOpen={isFilterOpen}
        onClose={closeFilter}
        appointments={appointments}
        draftDoctors={doctorsFilter.selected}
        onToggleDoctor={(name) => {
          if (name === '__ALL__') doctorsFilter.clear();else
          doctorsFilter.toggle(name);
        }}
        draftStatuses={statusesFilter.selected}
        onToggleStatus={(value) => {
          if (value as unknown as string === '__ALL__') statusesFilter.clear();else
          statusesFilter.toggle(value);
        }}
        draftColors={colorsFilter.selected}
        onToggleColor={(code) => {
          if (code === '__ALL__') colorsFilter.clear();else
          colorsFilter.toggle(code);
        }}
        onApply={applyFilter}
        onClear={clearFilter} />
      

      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExport={handleExport}
        defaultDateFrom={getToday()}
        defaultDateTo={getToday()} />
      

      {/* Unified Appointment Form — create mode */}
      <AppointmentFormShell
        key={createInitialData ? `create-${createInitialData.date}-${createInitialData.startTime}` : 'create-closed'}
        mode="create"
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        initialData={createInitialData}
      />
      
    </div>);

}