/**
 * @crossref:domain[ctv]
 * @crossref:used-in[admin new-clients (referral leads) tab: website/src/pages/Commission.tsx]
 * @crossref:uses[website/src/lib/api/commission.ts (fetchNewClients), website/src/lib/api/core.ts, website/src/hooks/useExport.ts, website/src/components/shared/ExportMenu.tsx, website/src/components/commission/CommissionNavigation.tsx, product-map/domains/ctv.yaml]
 */
/**
 * NewClientsTab — Admin "New Clients" surface (commission page).
 * Lists referral-only leads: clients a CTV referred who have NOT yet converted to
 * a paid service, so staff can phone them to book. Shows phone + referring CTV.
 * Filters by LOB and a today/this-week date range (reuses ExportDateRangeModal),
 * with Excel export via the shared export pipeline (type 'new-clients').
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
import { formatCommissionDate, formatCommissionDateRange } from './dateFormatting';
import { ClientProfileLink, CommissionTabHeader } from './CommissionNavigation';

const LOB_LABELS: Record<string, string> = { dental: 'Nha khoa', cosmetic: 'Thẩm mỹ' };

function statusClass(status: NewClientRow['commission_status']) {
  if (status === 'missing_commission') return 'bg-red-50 text-red-700 ring-red-200';
  if (status === 'commission_recorded') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  return 'bg-gray-50 text-gray-600 ring-gray-200';
}

export function NewClientsTab() {
  const { t, i18n } = useTranslation('commission');
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

  const dateLabel = formatCommissionDateRange(dateFrom, dateTo, {
    allLabel: t('newClients.allDates'),
    fromPrefix: t('date.fromPrefix'),
    untilPrefix: t('date.untilPrefix'),
    locale: i18n.language,
  });
  const countText = loading || error ? undefined : t('newClients.count', { count: rows.length });
  const moneyFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }),
    [i18n.language],
  );
  const formatMoney = useCallback((value: number | undefined) => moneyFormatter.format(value || 0), [moneyFormatter]);
  const statusLabel = useCallback(
    (status: NewClientRow['commission_status']) => {
      if (status === 'missing_commission') return t('newClients.statusMissing');
      if (status === 'commission_recorded') return t('newClients.statusRecorded');
      return t('newClients.statusLead');
    },
    [t],
  );

  return (
    <div className="bg-white rounded-xl shadow-card p-6 space-y-4">
      <CommissionTabHeader
        tab="newClients"
        count={countText}
        description={t('newClients.description')}
        previousTab="ctvs"
        nextTab="earnings"
      />

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
              <option value="dental">{tc('lob.dental')}</option>
              <option value="cosmetic">{tc('lob.cosmetic')}</option>
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
        <div className="space-y-3">
          <div className="grid gap-3 md:hidden">
            {rows.map((row) => (
              <article key={`${row.lob}-${row.id}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <ClientProfileLink clientId={row.id} name={row.name} returnTab="newClients" lob={row.lob} className="text-base" />
                    <p className="mt-1 text-xs text-gray-500">
                      {LOB_LABELS[row.lob] || row.lob} · {formatCommissionDate(row.referred_at, i18n.language)}
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                    {LOB_LABELS[row.lob] || row.lob}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  {row.phone ? (
                    <a href={`tel:${row.phone}`} className="inline-flex w-fit items-center gap-1.5 text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" />
                      {row.phone}
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                  <div className="text-gray-700">
                    <span className="text-xs font-semibold uppercase text-gray-400">{t('newClients.ctv')}</span>
                    <div className="mt-0.5 font-medium">{row.referring_ctv_name || '-'}</div>
                    {row.referring_ctv_phone && <div className="text-xs text-gray-400">{row.referring_ctv_phone}</div>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-2 text-xs">
                    <div>
                      <span className="font-semibold uppercase text-gray-400">{t('newClients.serviceTotal')}</span>
                      <div className="mt-0.5 font-semibold text-gray-800">{formatMoney(row.service_total)}</div>
                    </div>
                    <div>
                      <span className="font-semibold uppercase text-gray-400">{t('newClients.commissionTotal')}</span>
                      <div className="mt-0.5 font-semibold text-gray-800">{formatMoney(row.commission_total)}</div>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex rounded-full px-2 py-1 font-semibold ring-1 ${statusClass(row.commission_status)}`}>
                        {statusLabel(row.commission_status)}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('newClients.client')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('newClients.phone')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('newClients.ctv')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('newClients.lob')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('newClients.referredAt')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t('newClients.serviceTotal')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t('newClients.paidTotal')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t('newClients.commissionTotal')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('newClients.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={`${row.lob}-${row.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <ClientProfileLink clientId={row.id} name={row.name} returnTab="newClients" lob={row.lob} />
                  </td>
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
                  <td className="px-4 py-3 text-gray-700">{formatCommissionDate(row.referred_at, i18n.language)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{formatMoney(row.service_total)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatMoney(row.paid_total)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(row.commission_total)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(row.commission_status)}`}>
                      {statusLabel(row.commission_status)}
                    </span>
                    {row.service_count > 0 && (
                      <span className="mt-1 block text-xs text-gray-400">
                        {t('newClients.serviceCount', { count: row.service_count })}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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
