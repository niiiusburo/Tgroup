import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import { fetchEarnings, fetchPayouts, createPayout, uploadPayoutReceipt, updatePayoutReceipt, type EarningsRow, type PayoutRow } from '@/lib/api/commission';
import { ApiError, getUploadUrl } from '@/lib/api/core';
import { useBusinessUnitOptional } from '@/contexts/BusinessUnitContext';
import { useExport } from '@/hooks/useExport';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { ExportPreviewModal } from '@/components/shared/ExportPreviewModal';
import { ExportDateRangeModal } from '@/components/calendar/ExportDateRangeModal';
import { formatCommissionDate, formatCommissionDateRange } from './dateFormatting';
import { ClientProfileLink, CommissionTabHeader, ServiceDrilldownLink } from './CommissionNavigation';

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);
}

function EarningsTab() {
  const { t, i18n } = useTranslation('commission');
  const { t: tc } = useTranslation('common');
  const businessUnit = useBusinessUnitOptional();
  const [rows, setRows] = useState<EarningsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('pending');
  const [lob, setLob] = useState<'all' | 'dental' | 'cosmetic'>(
    businessUnit?.currentLOB === 'cosmetic' ? 'cosmetic' : 'dental'
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateModalOpen, setDateModalOpen] = useState(false);

  const handleLoad = async (override?: { lob?: 'all' | 'dental' | 'cosmetic'; dateFrom?: string; dateTo?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const lobToUse = override?.lob ?? lob;
      const fromToUse = override?.dateFrom ?? dateFrom;
      const toToUse = override?.dateTo ?? dateTo;
      const data = await fetchEarnings({
        status: status || undefined,
        lob: lobToUse,
        dateFrom: fromToUse || undefined,
        dateTo: toToUse || undefined,
        limit: 100,
      });
      setRows(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  // Load on mount and reload whenever the active business unit (LOB) changes.
  useEffect(() => {
    const next = businessUnit?.currentLOB === 'cosmetic' ? 'cosmetic' : 'dental';
    setLob(next);
    handleLoad({ lob: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessUnit?.currentLOB]);

  const exportFilters = useMemo(
    () => ({ lob, status: status || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    [lob, status, dateFrom, dateTo]
  );
  // ctv-earnings builder queries both LOB DBs → force the plain /api/Exports mount.
  const exporter = useExport({ type: 'ctv-earnings', filters: exportFilters, lobOverride: 'dental' });

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
  const countText = loading || error ? undefined : t('earnings.count', { count: rows.length });

  return (
    <div className="bg-white rounded-xl shadow-card p-6 space-y-4">
      <CommissionTabHeader
        tab="earnings"
        count={countText}
        description={t('earnings.description')}
        previousTab="newClients"
        nextTab="payouts"
      />

      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex gap-3">
          <label className="text-sm text-gray-600">{t('earnings.status')}
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="block mt-1 px-3 py-2 border rounded-lg">
              <option value="pending">{tc('status.pending')}</option>
              <option value="paid">{tc('status.paid')}</option>
              <option value="reversed">Reversed</option>
              <option value="">{tc('all')}</option>
            </select>
          </label>
          <label className="text-sm text-gray-600">{t('earnings.lob')}
            <select value={lob} onChange={(e) => setLob(e.target.value as any)} className="block mt-1 px-3 py-2 border rounded-lg">
              <option value="all">{tc('all')}</option>
              <option value="dental">Dental</option>
              <option value="cosmetic">Cosmetic</option>
            </select>
          </label>
          <div className="text-sm text-gray-600">
            <span className="block mb-1">{t('newClients.dateRange')}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setDateModalOpen(true)} className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span>{dateLabel}</span>
              </button>
              {(dateFrom || dateTo) && (
                <button onClick={clearDates} className="text-xs text-gray-500 hover:text-red-500">{tc('clear')}</button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu onExport={exporter.handleDirectExport} onPreview={exporter.openPreview} loading={exporter.downloading} disabled={loading} />
          <button onClick={() => handleLoad()} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark">{t('earnings.refresh')}</button>
        </div>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {exporter.error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{exporter.error}</div>}
      {loading ? <div className="p-8 text-center text-gray-500">{t('earnings.loading')}</div> : (
        <div className="space-y-3">
          <div className="grid gap-3 md:hidden">
            {rows.map((row) => (
              <article key={`${row.lob}-${row.id}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <ClientProfileLink clientId={row.client_id} name={row.client_name || row.client_id} returnTab="earnings" lob={row.lob} className="text-base" />
                    <div className="mt-1">
                      <ServiceDrilldownLink
                        clientId={row.client_id}
                        serviceLineId={row.service_line_id}
                        serviceName={row.product_name}
                        returnTab="earnings"
                        lob={row.lob}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                    {row.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs font-semibold uppercase text-gray-400">{t('earnings.ctv')}</div>
                    <div className="mt-0.5 font-medium text-gray-800">{row.recipient_name || row.recipient_partner_id}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold uppercase text-gray-400">{t('earnings.amount')}</div>
                    <div className="mt-0.5 font-bold text-gray-900">{formatVnd(row.amount)}</div>
                  </div>
                  <div className="text-gray-600">{row.lob}</div>
                  <div className="text-right text-gray-600">{formatCommissionDate(row.earned_at || row.created_at, i18n.language)}</div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-gray-50 border-y border-gray-200"><tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('earnings.ctv')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('earnings.client')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('earnings.service')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('earnings.lob')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('earnings.level')}</th><th className="text-right px-4 py-3 font-medium text-gray-600">{t('earnings.amount')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('earnings.earnedAt')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('earnings.status')}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => <tr key={`${row.lob}-${row.id}`} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{row.recipient_name || row.recipient_partner_id}</td>
                <td className="px-4 py-3 text-gray-700">
                  <ClientProfileLink clientId={row.client_id} name={row.client_name || row.client_id} returnTab="earnings" lob={row.lob} />
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <ServiceDrilldownLink clientId={row.client_id} serviceLineId={row.service_line_id} serviceName={row.product_name} returnTab="earnings" lob={row.lob} />
                </td>
                <td className="px-4 py-3 text-gray-700">{row.lob}</td><td className="px-4 py-3 text-gray-700">{row.level ?? '-'}</td><td className="px-4 py-3 text-right font-semibold">{formatVnd(row.amount)}</td><td className="px-4 py-3 text-gray-700">{formatCommissionDate(row.earned_at || row.created_at, i18n.language)}</td><td className="px-4 py-3 text-gray-700">{row.status}</td>
              </tr>)}
              {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">{t('earnings.noEarnings')}</td></tr>}
            </tbody>
          </table>
          </div>
        </div>
      )}
      <ExportDateRangeModal isOpen={dateModalOpen} onClose={() => setDateModalOpen(false)} onApply={handleDateApply} />
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

function PayoutsTab() {
  const { t, i18n } = useTranslation('commission');
  const { t: tc } = useTranslation('common');
  const businessUnit = useBusinessUnitOptional();
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [pending, setPending] = useState<EarningsRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [lob, setLob] = useState<'dental' | 'cosmetic'>(
    businessUnit?.currentLOB === 'cosmetic' ? 'cosmetic' : 'dental'
  );
  const [cycleLabel, setCycleLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportFilters = useMemo(
    () => ({ lob, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    [lob, dateFrom, dateTo]
  );
  // ctv-payouts builder queries both LOB DBs → force the plain /api/Exports mount.
  const exporter = useExport({ type: 'ctv-payouts', filters: exportFilters, lobOverride: 'dental' });

  const handleDateApply = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    setDateModalOpen(false);
    handleLoad(lob, { dateFrom: from, dateTo: to });
  };
  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
    handleLoad(lob, { dateFrom: '', dateTo: '' });
  };
  const dateLabel = formatCommissionDateRange(dateFrom, dateTo, {
    allLabel: t('newClients.allDates'),
    fromPrefix: t('date.fromPrefix'),
    untilPrefix: t('date.untilPrefix'),
    locale: i18n.language,
  });

  const handleLoad = async (currentLob?: 'dental' | 'cosmetic', override?: { dateFrom?: string; dateTo?: string }) => {
    setLoading(true); setError(null);
    try {
      const lobToUse = currentLob ?? lob;
      const fromToUse = override?.dateFrom ?? dateFrom;
      const toToUse = override?.dateTo ?? dateTo;
      const [payoutData, earningsData] = await Promise.all([
        fetchPayouts({ lob: lobToUse, limit: 50 }),
        fetchEarnings({
          lob: lobToUse,
          status: 'pending',
          dateFrom: fromToUse || undefined,
          dateTo: toToUse || undefined,
          limit: 200,
        }),
      ]);
      setPayouts(payoutData.items || []);
      setPending(earningsData.items || []);
      setSelected([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load payouts');
    } finally { setLoading(false); }
  };

  // Load on mount and reload whenever the active business unit (LOB) changes.
  useEffect(() => {
    const next = businessUnit?.currentLOB === 'cosmetic' ? 'cosmetic' : 'dental';
    setLob(next);
    handleLoad(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessUnit?.currentLOB]);

  const totalSelected = pending.filter((e) => selected.includes(e.id)).reduce((sum, e) => sum + e.amount, 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setReceiptFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  };

  const runPayout = async () => {
    if (!cycleLabel || selected.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      let receiptUrl: string | undefined;
      if (receiptFile) {
        const uploadRes = await uploadPayoutReceipt(receiptFile);
        receiptUrl = uploadRes.url;
      }
      await createPayout({ lob, earningIds: selected, cycleLabel, notes: notes || undefined, receipt_url: receiptUrl });
      setCycleLabel('');
      setNotes('');
      setReceiptFile(null);
      setReceiptPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await handleLoad();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create payout');
    } finally {
      setSubmitting(false);
    }
  };

  const attachReceipt = async (payoutId: string, file: File) => {
    setSubmitting(true);
    setError(null);
    try {
      const uploadRes = await uploadPayoutReceipt(file);
      await updatePayoutReceipt(payoutId, uploadRes.url, lob);
      await handleLoad();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to attach receipt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-card p-6 space-y-4">
        <CommissionTabHeader
          tab="payouts"
          count={loading || error ? undefined : t('payouts.pendingCount', { count: pending.length })}
          description={t('payouts.description')}
          previousTab="earnings"
        />

        <div className="flex flex-wrap gap-3 items-end justify-between">
          <label className="text-sm text-gray-600">{t('payouts.lob')}
            <select value={lob} onChange={(e) => setLob(e.target.value as any)} className="block mt-1 px-3 py-2 border rounded-lg">
              <option value="cosmetic">Cosmetic</option><option value="dental">Dental</option>
            </select>
          </label>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-600">
              <span className="block mb-1">{t('newClients.dateRange')}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setDateModalOpen(true)} className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span>{dateLabel}</span>
                </button>
                {(dateFrom || dateTo) && (
                  <button onClick={clearDates} className="text-xs text-gray-500 hover:text-red-500">{tc('clear')}</button>
                )}
              </div>
            </div>
            <ExportMenu onExport={exporter.handleDirectExport} onPreview={exporter.openPreview} loading={exporter.downloading} disabled={loading} />
            <button onClick={() => handleLoad()} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200">{t('payouts.reload')}</button>
          </div>
        </div>
        {exporter.error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{exporter.error}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
        <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="text-sm text-gray-600">{t('payouts.cycleLabel')}
            <input value={cycleLabel} onChange={(e) => setCycleLabel(e.target.value)} placeholder={t('payouts.cyclePlaceholder')} className="block mt-1 w-full px-3 py-2 border rounded-lg" />
          </label>
          <button onClick={runPayout} disabled={!cycleLabel || selected.length === 0 || submitting} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:bg-gray-300">
            {submitting ? t('payouts.processing') : t('payouts.paySelected', { count: selected.length, amount: formatVnd(totalSelected) })}
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">{t('payouts.notes')}
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('payouts.notesPlaceholder')} className="block mt-1 w-full px-3 py-2 border rounded-lg" />
          </label>
          <label className="text-sm text-gray-600">{t('payouts.receiptPhoto')}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="block mt-1 w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
          </label>
        </div>
        {receiptPreview && (
          <div className="inline-block">
            <img src={receiptPreview} alt="Receipt preview" className="h-24 rounded-lg border border-gray-200 object-cover" />
          </div>
        )}
        {loading ? <div className="p-8 text-center text-gray-500">{tc('loading')}</div> : (
          <div className="overflow-x-auto max-h-80">
            <table className="w-full min-w-[760px] text-sm"><thead className="bg-gray-50 border-y border-gray-200"><tr><th className="px-4 py-3" /><th className="text-left px-4 py-3 font-medium text-gray-600">{t('payouts.ctv')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('payouts.client')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('payouts.service')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('payouts.earnedAt')}</th><th className="text-right px-4 py-3 font-medium text-gray-600">{t('payouts.amount')}</th></tr></thead><tbody className="divide-y divide-gray-200">
              {pending.map((e) => <tr key={e.id}><td className="px-4 py-3"><input type="checkbox" checked={selected.includes(e.id)} onChange={(ev) => setSelected((s) => ev.target.checked ? [...s, e.id] : s.filter((id) => id !== e.id))} /></td><td className="px-4 py-3">{e.recipient_name || e.recipient_partner_id}</td><td className="px-4 py-3"><ClientProfileLink clientId={e.client_id} name={e.client_name || e.client_id} returnTab="payouts" lob={e.lob} /></td><td className="px-4 py-3"><ServiceDrilldownLink clientId={e.client_id} serviceLineId={e.service_line_id} serviceName={e.product_name} returnTab="payouts" lob={e.lob} /></td><td className="px-4 py-3 text-gray-700">{formatCommissionDate(e.earned_at || e.created_at, i18n.language)}</td><td className="px-4 py-3 text-right font-semibold">{formatVnd(e.amount)}</td></tr>)}
              {pending.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t('payouts.noPending')}</td></tr>}
            </tbody></table>
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-6 py-4 font-semibold text-gray-900">{t('payouts.recentCycles')}</div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-200">
            {payouts.map((p) => (
              <tr key={`${p.lob}-${p.id}`}>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{p.cycle_label}</div>
                      <div className="text-xs text-gray-500">{p.lob} · {t('payouts.earningsCount', { count: p.earnings_count })} · {p.paid_at ? formatCommissionDate(p.paid_at, i18n.language) : '-'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3 text-right font-semibold">{formatVnd(p.total_amount)}</td>
                <td className="px-6 py-3">
                  {p.receipt_url ? (
                    <a href={getUploadUrl(p.receipt_url)} target="_blank" rel="noreferrer" className="inline-block">
                      <img src={getUploadUrl(p.receipt_url)} alt="Receipt" className="h-10 w-10 rounded border border-gray-200 object-cover hover:ring-2 hover:ring-primary/30" />
                    </a>
                  ) : (
                    <label className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer">
                      {t('payouts.attach')}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) attachReceipt(p.id, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </td>
              </tr>
            ))}
            {payouts.length === 0 && <tr><td className="px-6 py-8 text-center text-gray-500">{t('payouts.noCycles')}</td></tr>}
          </tbody>
        </table>
      </div>
      <ExportDateRangeModal isOpen={dateModalOpen} onClose={() => setDateModalOpen(false)} onApply={handleDateApply} />
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

export { EarningsTab, PayoutsTab };
