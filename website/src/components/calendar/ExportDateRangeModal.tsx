import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CalendarDays } from 'lucide-react';
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-gray-900">{t('selectDateRange', 'Chọn khoảng thởi gian')}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
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
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">{t('fromDate', 'Từ ngày')}</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setActivePreset(null);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <span className="text-gray-400 mt-5">—</span>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">{t('toDate', 'Đến ngày')}</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setActivePreset(null);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('cancel', 'Hủy')}
          </button>
          <button
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
