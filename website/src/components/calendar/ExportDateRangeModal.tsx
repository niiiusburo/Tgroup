import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CalendarDays } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { useTimezone } from '@/contexts/TimezoneContext';

interface ExportDateRangeModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onApply: (dateFrom: string, dateTo: string) => void;
  readonly referenceDate?: Date;
}

type PresetKey = '1day' | '7days' | 'week' | 'month' | '3weeks' | 'all';

interface Preset {
  readonly key: PresetKey;
  readonly label: string;
}

const PRESETS: readonly Preset[] = [
  { key: '1day', label: '1 ngày' },
  { key: '7days', label: '7 ngày' },
  { key: 'week', label: 'Tuần này' },
  { key: 'month', label: 'Tháng này' },
  { key: '3weeks', label: '3 tuần' },
  { key: 'all', label: 'Tất cả' },
];

export function ExportDateRangeModal({
  isOpen,
  onClose,
  onApply,
  referenceDate,
}: ExportDateRangeModalProps) {
  const { t } = useTranslation('exports');
  const { getToday, formatDate } = useTimezone();

  const baseDate = useMemo(() => {
    if (referenceDate) return new Date(referenceDate);
    return new Date(getToday() + 'T00:00:00');
  }, [referenceDate, getToday]);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDateFrom('');
      setDateTo('');
      setActivePreset(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getMonday = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  };

  const getMonthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

  const applyPreset = (key: PresetKey) => {
    setActivePreset(key);
    const to = formatDate(baseDate, 'yyyy-MM-dd');
    let from = '';

    switch (key) {
      case '1day': {
        from = formatDate(baseDate, 'yyyy-MM-dd');
        break;
      }
      case '7days': {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - 6);
        from = formatDate(d, 'yyyy-MM-dd');
        break;
      }
      case 'week': {
        from = formatDate(getMonday(baseDate), 'yyyy-MM-dd');
        break;
      }
      case 'month': {
        from = formatDate(getMonthStart(baseDate), 'yyyy-MM-dd');
        break;
      }
      case '3weeks': {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - 20);
        from = formatDate(d, 'yyyy-MM-dd');
        break;
      }
      case 'all': {
        from = '';
        break;
      }
    }

    setDateFrom(from);
    setDateTo(to);
  };

  const handleApply = () => {
    onApply(dateFrom, dateTo);
  };

  const canApply = activePreset !== null || (dateFrom && dateTo);

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t('selectDateRange', 'Chọn khoảng thởi gian')}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[calc(100dvh-0.75rem)] min-h-0 w-full max-w-sm flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:max-h-[90dvh] sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
            <h3 className="text-base font-semibold leading-snug text-gray-900">{t('selectDateRange', 'Chọn khoảng thởi gian')}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={t('close', 'Đóng')} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {/* Presets */}
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => applyPreset(preset.key)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activePreset === preset.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom range */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('customRange', 'Hoặc chọn ngày tùy chỉnh')}
            </p>
            <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_auto_1fr]">
              <DatePicker
                value={dateFrom}
                onChange={(date) => {
                  setDateFrom(date);
                  setActivePreset(null);
                }}
                label={t('fromDate', 'Từ ngày')}
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                allowClear
                size="compact"
              />
              <span className="hidden pb-2 text-gray-400 sm:inline">—</span>
              <DatePicker
                value={dateTo}
                onChange={(date) => {
                  setDateTo(date);
                  setActivePreset(null);
                }}
                label={t('toDate', 'Đến ngày')}
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                allowClear
                size="compact"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('cancel', 'Hủy')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!canApply}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {t('apply', 'Áp dụng')}
          </button>
        </div>
      </div>
    </div>
  );
}
