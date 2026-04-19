import { motion } from 'framer-motion';

interface ReportsFiltersProps {
  dateFrom: string;
  dateTo: string;
  companyId: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  locations: { id: string; name: string }[];
}

import { useTranslation } from 'react-i18next';
import { useTimezone } from '@/contexts/TimezoneContext';

export function ReportsFilters({
  dateFrom, dateTo, companyId,
  onDateFromChange, onDateToChange, onCompanyChange,
  locations,
}: ReportsFiltersProps) {
  const { t } = useTranslation('reports');
  const { getToday } = useTimezone();
  // Quick range presets
  const today = getToday();
  const year = parseInt(today.split('-')[0], 10);
  const ytd = `${year}-01-01`;
  const last30Date = new Date(new Date(today + 'T00:00:00Z').getTime() - 30 * 86400000);
  const last30 = `${last30Date.getUTCFullYear()}-${String(last30Date.getUTCMonth() + 1).padStart(2, '0')}-${String(last30Date.getUTCDate()).padStart(2, '0')}`;
  const last90Date = new Date(new Date(today + 'T00:00:00Z').getTime() - 90 * 86400000);
  const last90 = `${last90Date.getUTCFullYear()}-${String(last90Date.getUTCMonth() + 1).padStart(2, '0')}-${String(last90Date.getUTCDate()).padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-wrap items-center gap-3 bg-white rounded-xl shadow-card p-4"
    >
      {/* Quick presets */}
      <div className="flex items-center gap-1 mr-2">
        {[
          { label: t('filters.ytd'), from: ytd, to: today },
          { label: t('filters.30d'), from: last30, to: today },
          { label: t('filters.90d'), from: last90, to: today },
        ].map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => { onDateFromChange(p.from); onDateToChange(p.to); }}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors duration-150
              ${dateFrom === p.from && dateTo === p.to
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date inputs */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <span className="text-gray-400 text-sm">→</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Location filter */}
      <select
        value={companyId}
        onChange={(e) => onCompanyChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      >
        <option value="">{t('allLocations', 'Tất cả chi nhánh')}</option>
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>{loc.name}</option>
        ))}
      </select>
    </motion.div>
  );
}

/** Section card wrapper with title and optional export */
export function SectionCard({
  title,
  children,
  action,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className={`bg-white rounded-xl shadow-card overflow-hidden ${className}`}
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

/** CSV Export Button */
export function ExportCSVButton({ data, filename, headers }: { data: Record<string, any>[]; filename: string; headers?: string[] }) {
  function handleExport() {
    if (!data.length) return;
    const cols = headers || Object.keys(data[0]);
    const csvRows = [
      cols.join(','),
      ...data.map(row => cols.map(col => {
        const val = row[col] ?? '';
        let str = String(val).replace(/"/g, '""');
        // Prevent CSV injection from formulas
        if (/^[=+\-@]/.test(str)) str = "'" + str;
        return `"${str}"`;
      }).join(','))
    ];
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 active:scale-[0.97] transition-all duration-150"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      CSV
    </button>
  );
}
