import { X } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { FilterSummaryCards } from './FilterSummaryCards';
import { DoctorFilterChips } from './DoctorFilterChips';
import { StatusFilterChips } from './StatusFilterChips';
import { ColorFilterCircles } from './ColorFilterCircles';
import type { AppointmentStatus } from '@/types/appointment';
import type { CalendarAppointment } from '@/data/mockCalendar';
import { APPOINTMENT_STATUS_I18N_KEYS } from '@/constants';
import { useTranslation } from 'react-i18next';

interface SmartFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: readonly CalendarAppointment[];
  draftDoctors: string[];
  onToggleDoctor: (name: string) => void;
  draftStatuses: AppointmentStatus[];
  onToggleStatus: (value: AppointmentStatus) => void;
  draftColors: string[];
  onToggleColor: (code: string) => void;
  onApply: () => void;
  onClear: () => void;
}

export function SmartFilterDrawer({
  isOpen,
  onClose,
  appointments,
  draftDoctors,
  onToggleDoctor,
  draftStatuses,
  onToggleStatus,
  draftColors,
  onToggleColor,
  onApply,
  onClear
}: SmartFilterDrawerProps) {
  const { t } = useTranslation('calendar');
  // Doctor list with counts (from unfiltered appointments)
  const doctorData = useMemo(() => {
    const map = new Map<string, number>();
    appointments.forEach((apt) => {
      const name = apt.dentist || t('common:unknown');
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).
    map(([name, count]) => ({ name, count })).
    sort((a, b) => a.name.localeCompare(b.name));
  }, [appointments]);

  // Status list with counts
  const statusData = useMemo(() => {
    const map = new Map<AppointmentStatus, number>();
    appointments.forEach((apt) => {
      map.set(apt.status, (map.get(apt.status) ?? 0) + 1);
    });
    return (Object.keys(APPOINTMENT_STATUS_I18N_KEYS) as AppointmentStatus[]).
    filter((s) => map.has(s)).
    map((value) => ({ value, count: map.get(value) ?? 0 }));
  }, [appointments]);

  // Color counts
  const colorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((apt) => {
      const code = apt.color ?? '0';
      counts[code] = (counts[code] ?? 0) + 1;
    });
    return counts;
  }, [appointments]);

  // Summary based on draft selections
  const filteredForSummary = useMemo(() => {
    return appointments.filter((apt) => {
      const matchDoctor = draftDoctors.length === 0 || draftDoctors.includes(apt.dentist);
      const matchStatus = draftStatuses.length === 0 || draftStatuses.includes(apt.status);
      const matchColor = draftColors.length === 0 || draftColors.includes(apt.color ?? '0');
      return matchDoctor && matchStatus && matchColor;
    });
  }, [appointments, draftDoctors, draftStatuses, draftColors]);

  const totalAppointments = filteredForSummary.length;
  const totalDuration = useMemo(
    () => filteredForSummary.reduce((sum, apt) => sum + (apt.timeexpected ?? 0), 0),
    [filteredForSummary]
  );

  const activeFilterCount = draftDoctors.length + draftStatuses.length + draftColors.length;

  const handleDoctorToggle = (name: string) => {
    if (name === '__ALL__') onToggleDoctor('__ALL__');else
    onToggleDoctor(name);
  };

  const handleStatusToggle = (value: AppointmentStatus) => {
    if (value as unknown as string === '__ALL__') onToggleStatus('__ALL__' as AppointmentStatus);else
    onToggleStatus(value);
  };

  const handleColorToggle = (code: string) => {
    if (code === '__ALL__') onToggleColor('__ALL__');else
    onToggleColor(code);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="smart-filter-backdrop"
        className={cn(
          'fixed inset-0 bg-black/30 z-[100] transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'
        )}
        onClick={onClose}
        aria-hidden="true" />
      
      {/* Drawer */}
      <div
        data-testid="smart-filter-drawer"
        className={cn(
          'fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-[110] transform transition-transform duration-200 ease-out flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full hidden'
        )}
        role="dialog"
        aria-label={t("bLc")}
        aria-modal="true">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{t('smartFilter.title')}</h2>
          <button
            type="button"
            data-testid="smart-filter-close"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label={t("ng")}>
            
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <FilterSummaryCards
            totalAppointments={totalAppointments}
            totalDurationMinutes={totalDuration} />
          

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('smartFilter.doctors')}</h3>
            <DoctorFilterChips
              doctors={doctorData}
              selected={draftDoctors}
              onToggle={handleDoctorToggle} />
            
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('smartFilter.status')}</h3>
            <StatusFilterChips
              statuses={statusData}
              selected={draftStatuses}
              onToggle={handleStatusToggle} />
            
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('smartFilter.colorLabel')}</h3>
            <ColorFilterCircles
              selected={draftColors}
              counts={colorCounts}
              onToggle={handleColorToggle} />
            
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              {t('smartFilter.close')}
            </button>
            <button
              type="button"
              data-testid="smart-filter-clear"
              onClick={onClear}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              {t('smartFilter.clear')}
            </button>
            <button
              type="button"
              data-testid="smart-filter-apply"
              onClick={onApply}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              {t('smartFilter.apply')} {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </>);

}