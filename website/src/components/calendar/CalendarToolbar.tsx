import { useEffect, useRef, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalendarDateNavigator } from './CalendarDateNavigator';
import { QuickAddAppointmentButton } from '@/components/shared/QuickAddAppointmentButton';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/hooks/useCalendarData';

interface CalendarCustomerSuggestion {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly code: string;
}

interface CalendarToolbarProps {
  readonly viewMode: ViewMode;
  readonly onViewModeChange: (mode: ViewMode) => void;
  readonly currentDate: Date;
  readonly dateLabel: string;
  readonly onDateChange: (date: Date) => void;
  readonly onNavigate: (direction: 'prev' | 'next') => void;
  readonly onToday: () => void;
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly suggestions: readonly CalendarCustomerSuggestion[];
  readonly isLoading: boolean;
  readonly canExportAppointments?: boolean;
  readonly canQuickAddAppointments?: boolean;
  readonly onExportDirect?: () => void;
  readonly onExportPreview?: () => void;
  readonly exportDownloading?: boolean;
  readonly onQuickAddSuccess: () => void | Promise<void>;
  readonly onOpenFilter: () => void;
  readonly filterCount: number;
}

const VIEW_TABS: readonly { readonly mode: ViewMode; readonly labelKey: string }[] = [
  { mode: 'day', labelKey: 'dayView' },
  { mode: 'week', labelKey: 'weekView' },
  { mode: 'month', labelKey: 'monthView' },
];

export function CalendarToolbar({
  viewMode,
  onViewModeChange,
  currentDate,
  dateLabel,
  onDateChange,
  onNavigate,
  onToday,
  search,
  onSearchChange,
  suggestions,
  isLoading,
  canExportAppointments = false,
  canQuickAddAppointments = false,
  onExportDirect,
  onExportPreview,
  exportDownloading = false,
  onQuickAddSuccess,
  onOpenFilter,
  filterCount,
}: CalendarToolbarProps) {
  const { t } = useTranslation('calendar');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white rounded-xl shadow-card px-4 py-3">
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => onViewModeChange(tab.mode)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              viewMode === tab.mode
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <CalendarDateNavigator
        currentDate={currentDate}
        dateLabel={dateLabel}
        onDateChange={onDateChange}
        onNavigate={onNavigate}
        onToday={onToday}
      />

      <div className="flex items-center gap-2 w-full lg:w-auto">
        <div ref={dropdownRef} className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(event) => {
              onSearchChange(event.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder={t('searchPlaceholder', { ns: 'customers' })}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />

          {isDropdownOpen && search.trim().length >= 2 && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">{t('loadingAppointments', 'Loading appointments...')}</div>
              ) : suggestions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">{t('khngTmThyKtQu')}</div>
              ) : (
                suggestions.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      onSearchChange(customer.name);
                      setIsDropdownOpen(false);
                    }}
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
        {canExportAppointments && onExportDirect && onExportPreview && (
          <ExportMenu
            onExport={onExportDirect}
            onPreview={onExportPreview}
            loading={exportDownloading}
          />
        )}

        <button
          type="button"
          data-testid="calendar-filter-button"
          onClick={onOpenFilter}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          <Filter className="w-4 h-4" />
          <span>{t('bLc', 'Bộ lọc')}</span>
          {filterCount > 0 && (
            <span
              data-testid="calendar-filter-badge"
              className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium text-white bg-primary rounded-full"
            >
              {filterCount}
            </span>
          )}
        </button>

        {canQuickAddAppointments && <QuickAddAppointmentButton onSuccess={onQuickAddSuccess} size="sm" />}
      </div>
    </div>
  );
}
