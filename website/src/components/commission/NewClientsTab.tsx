/**
 * NewClientsTab — Admin "New Clients" surface (commission page).
 * Lists referral-only leads: clients a CTV referred who have NOT yet converted to
 * a paid service, so staff can phone them to book. Shows phone + referring CTV.
 * Filters by LOB and a today/this-week date range (reuses ExportDateRangeModal),
 * with Excel export via the shared export pipeline (type 'new-clients').
 *
 * @crossref:uses[lib/api/commission fetchNewClients, hooks/useExport, components/shared/ExportMenu]
 * @crossref:used-in[pages/Commission]
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, AlertCircle, CalendarDays, Phone, UserPlus } from 'lucide-react';
import { fetchNewClients, type NewClientRow } from '@/lib/api/commission';
import { ApiError } from '@/lib/api/core';
import { useBusinessUnitOptional } from '@/contexts/BusinessUnitContext';
import { useExport } from '@/hooks/useExport';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { ExportPreviewModal } from '@/components/shared/ExportPreviewModal';
import { ExportDateRangeModal } from '@/components/calendar/ExportDateRangeModal';

const LOB_LABELS: Record<string, string> = { dental: 'Nha khoa', cosmetic: 'Thẩm mỹ' };

function formatDateVN(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
}

export function NewClientsTab() {
  const { t } = useTranslation('commission');
  const { t: tc } = useTranslation('common');
  const businessUnit = useBusinessUnitOptional();

  const [rows, setRows] = useState<NewClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lob, setLob] = useState<'all' | 'dental' | 'cosmetic'>(
    businessUnit?.currentLOB === 'cosmetic' ? 'cosmetic' : 'dental'
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateModalOpen, setDateModalOpen] = useState(false);

  const handleLoad = useCallback(
    async (override?: { lob?: 'all' | 'dental' | 'cosmetic'; dateFrom?: string; dateTo?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchNewClients({
          lob: override?.lob ?? lob,
          dateFrom: (override?.dateFrom ?? dateFrom) || undefined,
          dateTo: (override?.dateTo ?? dateTo) || undefined,
          limit: 500,
        });
        setRows(data.items || []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('newClients.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [lob, dateFrom, dateTo, t]
  );

  // Load on mount + when the active business unit (LOB) changes.
  useEffect(() => {
    const next = businessUnit?.currentLOB === 'cosmetic' ? 'cosmetic' : 'dental';
    setLob(next);
    handleLoad({ lob: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessUnit?.currentLOB]);

  const exportFilters = useMemo(
    () => ({ lob, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    [lob, dateFrom, dateTo]
  );
  // Builder queries both LOB DBs → force the plain /api/Exports mount.
  const exporter = useExport({ type: 'new-clients', filters: exportFilters, lobOverride: 'dental' });

  const handleDateApply = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    setDateModalOpen(false);
    handleLoad({ dateFrom: from, dateTo: to });
  };

  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
    handleLoad({ dateFrom: '', dateTo: '' });
  };

  const dateLabel = dateFrom || dateTo ? `${dateFrom || '…'} → ${dateTo || '…'}` : t('newClients.allDates');

  return (
    <div className="bg-white rounded-xl shadow-card p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm text-gray-600">
            {t('newClients.lob')}
            <select
              value={lob}
              onChange={(e) => {
                const next = e.target.value as 'all' | 'dental' | 'cosmetic';
                setLob(next);
                handleLoad({ lob: next });
              }}
              className="block mt-1 px-3 py-2 border rounded-lg"
            >
              <option value="all">{tc('all')}</option>
              <option value="dental">Dental</option>
              <option value="cosmetic">Cosmetic</option>
            </select>
          </label>
          <div className="text-sm text-gray-600">
            <span className="block mb-1">{t('newClients.dateRange')}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDateModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CalendarDays className="w-4 h-4 text-primary" />
                <span>{dateLabel}</span>
              </button>
              {(dateFrom || dateTo) && (
                <button onClick={clearDates} className="text-xs text-gray-500 hover:text-red-500">
                  {tc('clear')}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            onExport={exporter.handleDirectExport}
            onPreview={exporter.openPreview}
            loading={exporter.downloading}
            disabled={loading}
          />
          <button
            onClick={() => handleLoad()}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark"
          >
            {t('newClients.refresh')}
          </button>
        </div>
      </div>

      {exporter.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{exporter.error}</div>
      )}

      {/* States */}
      {loading ? (
        <div className="p-12 flex items-center justify-center gap-3 text-gray-500">
          <Loader className="w-5 h-5 animate-spin" />
          {t('newClients.loading')}
        </div>
      ) : error ? (
        <div className="rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 flex items-start gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center gap-2 text-center text-gray-500">
          <UserPlus className="w-8 h-8 text-gray-300" />
          <p>{t('newClients.empty')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="text-sm text-gray-500 mb-2">{t('newClients.count', { count: rows.length })}</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('newClients.client')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('newClients.phone')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('newClients.ctv')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('newClients.lob')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('newClients.referredAt')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={`${row.lob}-${row.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {row.phone ? (
                      <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                        <Phone className="w-3.5 h-3.5" />
                        {row.phone}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row.referring_ctv_name || '—'}
                    {row.referring_ctv_phone && (
                      <span className="block text-xs text-gray-400">{row.referring_ctv_phone}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{LOB_LABELS[row.lob] || row.lob}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDateVN(row.referred_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ExportDateRangeModal
        isOpen={dateModalOpen}
        onClose={() => setDateModalOpen(false)}
        onApply={handleDateApply}
      />
      <ExportPreviewModal
        isOpen={exporter.previewOpen}
        onClose={exporter.closePreview}
        onDownload={exporter.handleDownload}
        preview={exporter.previewData}
        loading={exporter.loading}
        error={exporter.error}
      />
    </div>
  );
}
