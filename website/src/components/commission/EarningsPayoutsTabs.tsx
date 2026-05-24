import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchEarnings, fetchPayouts, createPayout, uploadPayoutReceipt, updatePayoutReceipt, type EarningsRow, type PayoutRow } from '@/lib/api/commission';
import { ApiError } from '@/lib/api/core';

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);
}

function EarningsTab() {
  const { t } = useTranslation('commission');
  const { t: tc } = useTranslation('common');
  const [rows, setRows] = useState<EarningsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('pending');
  const [lob, setLob] = useState<'all' | 'dental' | 'cosmetic'>('all');

  const handleLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEarnings({ status: status || undefined, lob, limit: 100 });
      setRows(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };
  const [hasLoaded, setHasLoaded] = useState(false);
  if (!hasLoaded) { setHasLoaded(true); handleLoad(); }

  return (
    <div className="bg-white rounded-xl shadow-card p-6 space-y-4">
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
        </div>
        <button onClick={handleLoad} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark">{t('earnings.refresh')}</button>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {loading ? <div className="p-8 text-center text-gray-500">{t('earnings.loading')}</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-y border-gray-200"><tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('earnings.ctv')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('earnings.client')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('earnings.service')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('earnings.lob')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('earnings.level')}</th><th className="text-right px-4 py-3 font-medium text-gray-600">{t('earnings.amount')}</th><th className="text-left px-4 py-3 font-medium text-gray-600">{t('earnings.status')}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => <tr key={`${row.lob}-${row.id}`} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{row.recipient_name || row.recipient_partner_id}</td><td className="px-4 py-3 text-gray-700">{row.client_name || row.client_id || '—'}</td><td className="px-4 py-3 text-gray-700">{row.product_name || '—'}</td><td className="px-4 py-3 text-gray-700">{row.lob}</td><td className="px-4 py-3 text-gray-700">{row.level ?? '—'}</td><td className="px-4 py-3 text-right font-semibold">{formatVnd(row.amount)}</td><td className="px-4 py-3 text-gray-700">{row.status}</td>
              </tr>)}
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t('earnings.noEarnings')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PayoutsTab() {
  const { t } = useTranslation('commission');
  const { t: tc } = useTranslation('common');
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [pending, setPending] = useState<EarningsRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [lob, setLob] = useState<'dental' | 'cosmetic'>('cosmetic');
  const [cycleLabel, setCycleLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoad = async () => {
    setLoading(true); setError(null);
    try {
      const [payoutData, earningsData] = await Promise.all([
        fetchPayouts({ lob, limit: 50 }),
        fetchEarnings({ lob, status: 'pending', limit: 200 }),
      ]);
      setPayouts(payoutData.items || []);
      setPending(earningsData.items || []);
      setSelected([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load payouts');
    } finally { setLoading(false); }
  };
  const [hasLoaded, setHasLoaded] = useState(false);
  if (!hasLoaded) { setHasLoaded(true); handleLoad(); }

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
        <div className="flex flex-wrap gap-3 items-end justify-between">
          <label className="text-sm text-gray-600">{t('payouts.lob')}
            <select value={lob} onChange={(e) => setLob(e.target.value as any)} className="block mt-1 px-3 py-2 border rounded-lg">
              <option value="cosmetic">Cosmetic</option><option value="dental">Dental</option>
            </select>
          </label>
          <button onClick={handleLoad} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200">{t('payouts.reload')}</button>
        </div>
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
            <table className="w-full text-sm"><thead className="bg-gray-50 border-y border-gray-200"><tr><th className="px-4 py-3" /><th className="text-left px-4 py-3 font-medium text-gray-600">CTV</th><th className="text-left px-4 py-3 font-medium text-gray-600">Client</th><th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th></tr></thead><tbody className="divide-y divide-gray-200">
              {pending.map((e) => <tr key={e.id}><td className="px-4 py-3"><input type="checkbox" checked={selected.includes(e.id)} onChange={(ev) => setSelected((s) => ev.target.checked ? [...s, e.id] : s.filter((id) => id !== e.id))} /></td><td className="px-4 py-3">{e.recipient_name || e.recipient_partner_id}</td><td className="px-4 py-3">{e.client_name || '—'}</td><td className="px-4 py-3 text-right font-semibold">{formatVnd(e.amount)}</td></tr>)}
              {pending.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">{t('payouts.noPending')}</td></tr>}
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
                      <div className="text-xs text-gray-500">{p.lob} · {t('payouts.earningsCount', { count: p.earnings_count })} · {p.paid_at ? new Date(p.paid_at).toLocaleDateString('vi-VN') : '—'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3 text-right font-semibold">{formatVnd(p.total_amount)}</td>
                <td className="px-6 py-3">
                  {p.receipt_url ? (
                    <a href={p.receipt_url} target="_blank" rel="noreferrer" className="inline-block">
                      <img src={p.receipt_url} alt="Receipt" className="h-10 w-10 rounded border border-gray-200 object-cover hover:ring-2 hover:ring-primary/30" />
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
    </div>
  );
}

export { EarningsTab, PayoutsTab };
