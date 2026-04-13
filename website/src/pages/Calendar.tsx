// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useCalendarData, type ViewMode, type CalendarStatusFilter } from '@/hooks/useCalendarData';
import { normalizeText } from '@/lib/utils';
import { useDragReschedule } from '@/hooks/useDragReschedule';
import { DayView } from '@/components/calendar/DayView';
import { WeekView } from '@/components/calendar/WeekView';
import { MonthView } from '@/components/calendar/MonthView';

import { FilterByDoctor, type DoctorOption } from '@/components/shared/FilterByDoctor';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocationFilter } from '@/contexts/LocationContext';
import type { CalendarAppointment } from '@/data/mockCalendar';
import { EditAppointmentModal } from '@/components/modules/EditAppointmentModal';
import type { OverviewAppointment } from '@/hooks/useOverviewAppointments';
import { QuickAddAppointmentButton } from '@/components/shared/QuickAddAppointmentButton';
import { cn } from '@/lib/utils';

/**
 * Calendar Page with Day/Week/Month view modes
 * @crossref:route[/calendar]
 * @crossref:used-in[App]
 * @crossref:uses[DayView, WeekView, MonthView, AppointmentCard, EditAppointmentModal, FilterByDoctor, useLocationFilter, useDragReschedule]
 *
 * Redesigned to match reference images with Vietnamese labels:
 * - Ngày (Day), Tuần (Week), Tháng (Month)
 * - Week view shows appointment cards with status badges
 * - Month view shows status counts per day
 */

const VIEW_TABS: readonly { readonly mode: ViewMode; readonly label: string }[] = [
  { mode: 'day', label: 'Ngày' },
  { mode: 'week', label: 'Tuần' },
  { mode: 'month', label: 'Tháng' },
];

const STATUS_TABS: readonly { readonly value: CalendarStatusFilter; readonly label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'scheduled', label: 'Đang hẹn' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'in-progress', label: 'Đang khám' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Hủy hẹn' },
];

export function Calendar() {
  const { selectedLocationId } = useLocationFilter();
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
    selectedDoctorId,
    setSelectedDoctorId,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    refresh,
  } = useCalendarData(selectedLocationId);

  // Edit modal state - uses OverviewAppointment to match EditAppointmentModal interface
  const [editingAppointment, setEditingAppointment] = useState<OverviewAppointment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Get real doctors from API for FilterByDoctor
  const { allEmployees } = useEmployees();
  const doctors = useMemo((): readonly DoctorOption[] =>
    allEmployees
      .filter((e) => e.status === 'active' && (e.roles.includes('doctor')))
      .map((e) => ({ id: e.id, name: e.name, roles: [...e.roles] })),
    [allEmployees],
  );

  const handleReschedule = useCallback(async (result: { appointmentId: string; newDate: string; newTime: string }) => {
    try {
      const { updateAppointment } = await import('@/lib/api');
      await updateAppointment(result.appointmentId, {
        date: `${result.newDate}T${result.newTime}:00`,
      });
      refresh?.();
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
    }
  }, [refresh]);

  const { handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReschedule(handleReschedule);

  // Click on appointment card opens edit modal directly (same as TodayAppointments)
  const handleAppointmentClick = useCallback((appointment: CalendarAppointment) => {
    // Map CalendarAppointment to OverviewAppointment format for EditAppointmentModal
    const overviewAppointment: OverviewAppointment = {
      id: appointment.id,
      customerId: appointment.customerId,
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      doctorName: appointment.dentist,
      doctorId: appointment.dentistId || '',
      date: appointment.date,
      time: appointment.startTime,
      locationId: appointment.locationId,
      locationName: appointment.locationName,
      note: appointment.notes || '',
      topStatus: mapStatusToTopStatus(appointment.status),
      checkInStatus: null,
      color: appointment.color || '0',
      arrivalTime: null,
      treatmentStartTime: null,
    };
    setEditingAppointment(overviewAppointment);
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


  // Helper to map Calendar status to OverviewAppointment topStatus
  function mapStatusToTopStatus(status: CalendarAppointment['status']): OverviewAppointment['topStatus'] {
    switch (status) {
      case 'cancelled':
        return 'cancelled';
      case 'confirmed':
        return 'arrived';
      case 'in-progress':
        return 'arrived';
      case 'completed':
        return 'arrived';
      default:
        return 'scheduled';
    }
  }

  // Unified search combobox state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const visibleAppointments = useMemo(() => {
    if (viewMode === 'day') return getAppointmentsForDate(currentDate);
    if (viewMode === 'week') return weekDates.flatMap((d) => getAppointmentsForDate(d));
    return monthDates.flatMap((d) => getAppointmentsForDate(d));
  }, [viewMode, currentDate, weekDates, monthDates, getAppointmentsForDate]);

  const customerSuggestions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string; code: string }>();
    visibleAppointments.forEach((apt) => {
      if (!map.has(apt.customerId)) {
        map.set(apt.customerId, {
          id: apt.customerId,
          name: apt.customerName,
          phone: apt.customerPhone,
          code: apt.customerCode,
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
        normalizeText(c.code).includes(term),
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
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <CalendarIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch hẹn</h1>
          <p className="text-sm text-gray-500">Quản lý lịch hẹn khám bệnh</p>
        </div>
      </div>

      {/* Toolbar: view tabs + navigation + filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white rounded-xl shadow-card px-4 py-3">
        {/* Left: view mode tabs (Vietnamese) */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.mode}
              onClick={() => setViewMode(tab.mode)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === tab.mode
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Center: date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('prev')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-gray-900 min-w-[150px] text-center">
            {dateLabel}
          </h2>
          <button
            onClick={() => navigate('next')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Hôm nay
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
              placeholder="Tìm theo tên, SĐT, mã KH, bác sĩ, dịch vụ..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            {isDropdownOpen && search.trim().length >= 2 && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
                {filteredSuggestions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400 text-center">Không tìm thấy kết quả</div>
                ) : (
                  filteredSuggestions.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer.name)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-xs text-gray-500">{customer.phone} · {customer.code}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <QuickAddAppointmentButton
            onSuccess={refresh}
            size="sm"
          />
          <div className="flex-1 lg:flex-none">
            <FilterByDoctor
              selectedDoctorId={selectedDoctorId}
              onChange={setSelectedDoctorId}
              doctors={doctors}
            />
          </div>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary text-white border-primary'
                : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Calendar view */}
      {viewMode === 'day' && (
        <DayView
          currentDate={currentDate}
          getAppointmentsForDate={getAppointmentsForDate}
          onAppointmentClick={handleAppointmentClick}
          onAppointmentEdit={handleEditClick}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          weekDates={weekDates}
          getAppointmentsForDate={getAppointmentsForDate}
          onAppointmentClick={handleAppointmentClick}
          onAppointmentEdit={handleEditClick}
          onDateChange={setCurrentDate}
        />
      )}
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          monthDates={monthDates}
          getAppointmentsForDate={getAppointmentsForDate}
          onDayClick={handleDayClick}
        />
      )}

      {/* Edit Appointment Modal - single module for both card click and pencil icon */}
      <EditAppointmentModal
        appointment={editingAppointment}
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onSaved={handleEditModalSaved}
      />
    </div>
  );
}
