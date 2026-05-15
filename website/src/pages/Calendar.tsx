import { Calendar as CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useCalendarData } from '@/hooks/useCalendarData';

import { useSmartFilter } from '@/hooks/useSmartFilter';
import { normalizeText } from '@/lib/utils';
import { useDragReschedule } from '@/hooks/useDragReschedule';
import { CalendarToolbar } from '@/components/calendar/CalendarToolbar';
import { CalendarViewPanel } from '@/components/calendar/CalendarViewPanel';
import { SmartFilterDrawer } from '@/components/calendar/SmartFilterDrawer';

import { useLocationFilter } from '@/contexts/LocationContext';
import { useTimezone } from '@/contexts/TimezoneContext';
import { useAuth } from '@/contexts/AuthContext';
import type { CalendarAppointment } from '@/data/mockCalendar';
import type { AppointmentStatus } from '@/types/appointment';
import { AppointmentFormShell, calendarAppointmentToFormData } from '@/components/appointments/unified';
import { PageHeader } from '@/components/shared/PageHeader';
import type { UnifiedAppointmentFormData } from '@/components/appointments/unified';
import { ExportPreviewModal } from '@/components/shared/ExportPreviewModal';
import { ExportDateRangeModal } from '@/components/calendar/ExportDateRangeModal';
import { useExport } from '@/hooks/useExport';

export function Calendar() {
  const { t } = useTranslation('calendar');
  const { selectedLocationId } = useLocationFilter();
  const { formatDate } = useTimezone();
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
    isLoading,
    refresh,
    updateAppointmentStatus,
    markArrived
  } = useCalendarData(selectedLocationId);

  const [editingAppointment, setEditingAppointment] = useState<Partial<UnifiedAppointmentFormData> | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createInitialData, setCreateInitialData] = useState<Partial<UnifiedAppointmentFormData> | undefined>(undefined);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateRangeModalOpen, setDateRangeModalOpen] = useState(false);
  const [pendingExportAction, setPendingExportAction] = useState<'export' | 'preview' | null>(null);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
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

  const { hasPermission } = useAuth();
  const canCreateAppointments = hasPermission('appointments.add');
  const canEditAppointments = hasPermission('appointments.edit');
  const canExportAppointments = hasPermission('appointments.export');

  const handleReschedule = useCallback(async (result: {appointmentId: string;newDate: string;newTime: string;}) => {
    if (!canEditAppointments) return;
    try {
      const { updateAppointment } = await import('@/lib/api');
      await updateAppointment(result.appointmentId, {
        date: `${result.newDate}T${result.newTime}:00`
      });
      refresh?.();
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
    }
  }, [canEditAppointments, refresh]);

  const { handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReschedule(handleReschedule);

  // Click on appointment card opens edit modal directly using unified form
  const handleAppointmentClick = useCallback((appointment: CalendarAppointment) => {
    if (!canEditAppointments) return;
    setEditingAppointment(calendarAppointmentToFormData(appointment));
    setIsEditModalOpen(true);
  }, [canEditAppointments]);

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

  const appointmentExportFilters = useMemo(() => {
    let dateFrom = exportDateFrom;
    let dateTo = exportDateTo;
    // Fall back to current calendar view if no custom range set
    if (!dateFrom && !dateTo) {
      if (viewMode === 'day') {
        dateFrom = formatDate(currentDate, 'yyyy-MM-dd');
        dateTo = dateFrom;
      } else if (viewMode === 'week') {
        dateFrom = formatDate(weekDates[0], 'yyyy-MM-dd');
        dateTo = formatDate(weekDates[6], 'yyyy-MM-dd');
      } else {
        dateFrom = formatDate(monthDates[0], 'yyyy-MM-dd');
        dateTo = formatDate(monthDates[monthDates.length - 1], 'yyyy-MM-dd');
      }
    }
    return {
      search: search || '',
      companyId: selectedLocationId !== 'all' ? selectedLocationId : 'all',
      dateFrom,
      dateTo,
      state: selectedStatuses.length === 1 ? selectedStatuses[0] : '',
    };
  }, [exportDateFrom, exportDateTo, viewMode, currentDate, weekDates, monthDates, formatDate, search, selectedLocationId, selectedStatuses]);

  const {
    previewOpen: aptPreviewOpen,
    previewData: aptPreviewData,
    loading: aptExportLoading,
    downloading: aptExportDownloading,
    error: aptExportError,
    openPreview: openAptPreview,
    closePreview: closeAptPreview,
    handleDownload: handleAptDownload,
    handleDirectExport: handleAptDirectExport,
  } = useExport({ type: 'appointments', filters: appointmentExportFilters });

  const handleOpenDateRangeForExport = useCallback(() => {
    setPendingExportAction('export');
    setDateRangeModalOpen(true);
  }, []);

  const handleOpenDateRangeForPreview = useCallback(() => {
    setPendingExportAction('preview');
    setDateRangeModalOpen(true);
  }, []);

  const handleDateRangeApply = useCallback((dateFrom: string, dateTo: string) => {
    setExportDateFrom(dateFrom);
    setExportDateTo(dateTo);
    setDateRangeModalOpen(false);
  }, []);

  useEffect(() => {
    if (!pendingExportAction || dateRangeModalOpen) return;

    if (pendingExportAction === 'export') {
      void handleAptDirectExport();
    } else {
      openAptPreview();
    }

    setPendingExportAction(null);
  }, [pendingExportAction, dateRangeModalOpen, exportDateFrom, exportDateTo, handleAptDirectExport, openAptPreview]);

  const handleCreateAppointment = useCallback((date: string, startTime: string) => {
    if (!canCreateAppointments) return;
    setCreateInitialData({
      date,
      startTime,
      estimatedDuration: 30
    });
    setCreateModalOpen(true);
  }, [canCreateAppointments]);

  const handleCreateSuccess = useCallback(() => {
    setCreateModalOpen(false);
    refresh?.();
  }, [refresh]);

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

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={<CalendarIcon className="w-6 h-6 text-primary" />}
      />

      <CalendarToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentDate={currentDate}
        dateLabel={dateLabel}
        onDateChange={setCurrentDate}
        onNavigate={navigate}
        onToday={goToToday}
        search={search}
        onSearchChange={setSearch}
        suggestions={filteredSuggestions}
        isLoading={isLoading}
        canExportAppointments={canExportAppointments}
        canQuickAddAppointments={canCreateAppointments}
        onExportDirect={handleOpenDateRangeForExport}
        onExportPreview={handleOpenDateRangeForPreview}
        exportDownloading={aptExportDownloading}
        onQuickAddSuccess={refresh}
        onOpenFilter={openFilter}
        filterCount={selectedDoctors.length + selectedStatuses.length + selectedColors.length}
      />

      <CalendarViewPanel
        isLoading={isLoading}
        viewMode={viewMode}
        currentDate={currentDate}
        weekDates={weekDates}
        monthDates={monthDates}
        getAppointmentsForDate={getAppointmentsForDate}
        onAppointmentClick={canEditAppointments ? handleAppointmentClick : undefined}
        onAppointmentEdit={canEditAppointments ? handleEditClick : undefined}
        onDragStart={canEditAppointments ? handleDragStart : undefined}
        onDragOver={canEditAppointments ? handleDragOver : undefined}
        onDrop={canEditAppointments ? handleDrop : undefined}
        onDragEnd={canEditAppointments ? handleDragEnd : undefined}
        onDateChange={setCurrentDate}
        onDayClick={handleDayClick}
        onMarkArrived={canEditAppointments ? markArrived : undefined}
        onUpdateStatus={canEditAppointments ? updateAppointmentStatus : undefined}
        onCreateAppointment={canCreateAppointments ? handleCreateAppointment : undefined}
      />

      {/* Unified Appointment Form — edit mode */}
      {canEditAppointments && (
        <AppointmentFormShell
          key={editingAppointment?.id ?? 'edit-closed'}
          mode="edit"
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          onSuccess={handleEditModalSaved}
          initialData={editingAppointment ?? undefined}
          customerReadOnly
        />
      )}

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
      

      {canExportAppointments && (
        <ExportPreviewModal
          isOpen={aptPreviewOpen}
          onClose={closeAptPreview}
          onDownload={handleAptDownload}
          preview={aptPreviewData}
          loading={aptExportLoading}
          error={aptExportError}
        />
      )}

      {canExportAppointments && (
        <ExportDateRangeModal
          isOpen={dateRangeModalOpen}
          onClose={() => {
            setDateRangeModalOpen(false);
            setPendingExportAction(null);
          }}
          onApply={handleDateRangeApply}
          referenceDate={currentDate}
        />
      )}

      {/* Unified Appointment Form — create mode */}
      {canCreateAppointments && (
        <AppointmentFormShell
          key={createInitialData ? `create-${createInitialData.date}-${createInitialData.startTime}` : 'create-closed'}
          mode="create"
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
          initialData={createInitialData}
        />
      )}
      
    </div>);

}
