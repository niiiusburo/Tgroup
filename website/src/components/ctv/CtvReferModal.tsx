import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, X } from 'lucide-react';
import { createBooking, fetchCtvServices, lookupClientByPhone, type CtvClientLookup, type CtvLob, type CtvServiceOption } from '@/lib/api/ctv';
import { ApiError } from '@/lib/api/core';
import { cn } from '@/lib/utils';

interface CtvReferModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

function getVietnamDateInputValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function createEmptyForm() {
  return { name: '', phone: '', date: getVietnamDateInputValue(), lob: 'dental' as CtvLob, serviceId: '', note: '' };
}

export function CtvReferModal({ open, onClose, onSuccess }: CtvReferModalProps) {
  const { t } = useTranslation('ctv');
  const [form, setForm] = useState(createEmptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lookup, setLookup] = useState<{ status: 'idle' | 'checking' | 'done'; result?: CtvClientLookup }>({ status: 'idle' });
  const [services, setServices] = useState<CtvServiceOption[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm((current) => (current.date ? current : { ...current, date: getVietnamDateInputValue() }));
  }, [open]);

  // Live phone cross-check against the CHOSEN LOB's database (debounced).
  useEffect(() => {
    const phone = form.phone.trim();
    if (!open || phone.length < 6) {
      setLookup({ status: 'idle' });
      return;
    }
    let cancelled = false;
    const lookupLob = form.lob;
    setLookup({ status: 'checking' });
    const id = setTimeout(async () => {
      try {
        const r = await lookupClientByPhone(phone, lookupLob);
        if (!cancelled) {
          setLookup({ status: 'done', result: r });
          const existingName = r.exists && !r.claimed ? r.name?.trim() : '';
          if (existingName) {
            setForm((current) => {
              if (current.phone.trim() !== phone || current.lob !== lookupLob || current.name.trim()) return current;
              return { ...current, name: existingName };
            });
          }
        }
      } catch {
        if (!cancelled) setLookup({ status: 'idle' });
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [form.phone, form.lob, open]);

  // Load the chosen LOB's service catalog for the service picker. Refetches when
  // the LOB toggle flips (a dental service id is invalid in the cosmetic DB, and
  // the selection is reset on toggle — see the LOB buttons below).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setServicesLoading(true);
    setServicesError(false);
    fetchCtvServices(form.lob)
      .then((r) => {
        if (!cancelled) setServices(r.services || []);
      })
      .catch(() => {
        if (!cancelled) {
          setServices([]);
          setServicesError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, form.lob]);

  if (!open) return null;

  const lobLabel = t(`forms.referClient.${form.lob}`);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.phone.trim() || !form.date.trim()) {
      setError(t('forms.referClient.required'));
      return;
    }
    if (lookup.status === 'done' && lookup.result?.claimed) {
      setError(t('forms.referClient.errorClaimed', { owner: lookup.result.ownerName || '—' }));
      return;
    }
    setLoading(true);
    try {
      await createBooking({
        name: form.name,
        phone: form.phone,
        lob: form.lob,
        date: form.date,
        productId: form.serviceId || undefined,
        note: form.note.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setForm(createEmptyForm());
        setLookup({ status: 'idle' });
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === 'B_CLIENT_CLAIMED') {
        const owner = (err instanceof ApiError && (err.body as { error?: { ownerName?: string } })?.error?.ownerName) || '—';
        setError(t('forms.referClient.errorClaimed', { owner }));
      } else {
        setError((err instanceof Error && err.message) || t('forms.referClient.required'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{t('forms.referClient.title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('forms.close')} className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-7 w-7" />
            </span>
            <p className="text-sm font-bold text-gray-900">{t('forms.referClient.success')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('forms.referClient.name')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('forms.referClient.namePlaceholder')}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('forms.referClient.phone')}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t('forms.referClient.phonePlaceholder')}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
              />
              <PhoneCheck lookup={lookup} lobLabel={lobLabel} t={t} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('forms.referClient.date')}</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('forms.referClient.lob')}</label>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
                {(['dental', 'cosmetic'] as CtvLob[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setForm({ ...form, lob: l, serviceId: '' })}
                    className={cn(
                      'rounded-lg py-2 text-sm font-bold transition-colors',
                      form.lob === l
                        ? l === 'dental'
                          ? 'bg-white text-orange-700 shadow-sm'
                          : 'bg-white text-rose-700 shadow-sm'
                        : 'text-gray-600'
                    )}
                  >
                    {t(`forms.referClient.${l}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('forms.referClient.service')}</label>
              <select
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                disabled={servicesLoading}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
              >
                <option value="">
                  {servicesLoading ? t('forms.referClient.serviceLoading') : t('forms.referClient.servicePlaceholder')}
                </option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {servicesError ? (
                <p className="mt-1.5 text-xs font-medium text-amber-600">{t('forms.referClient.serviceError')}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('forms.referClient.notes')}</label>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder={t('forms.referClient.notesPlaceholder')}
                rows={3}
                maxLength={2000}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? t('forms.referClient.submitting') : t('forms.referClient.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function PhoneCheck({
  lookup,
  lobLabel,
  t,
}: {
  readonly lookup: { status: 'idle' | 'checking' | 'done'; result?: CtvClientLookup };
  readonly lobLabel: string;
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (lookup.status === 'idle') return null;
  if (lookup.status === 'checking') {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t('forms.referClient.checking', { lob: lobLabel })}
      </p>
    );
  }
  const r = lookup.result;
  if (!r) return null;
  if (!r.exists) {
    return <p className="mt-1.5 text-xs font-medium text-emerald-600">{t('forms.referClient.checkNew', { lob: lobLabel })}</p>;
  }
  if (r.claimed) {
    return <p className="mt-1.5 text-xs font-bold text-amber-600">{t('forms.referClient.checkClaimed', { lob: lobLabel, owner: r.ownerName || '—' })}</p>;
  }
  if (r.claimedByMe) {
    return <p className="mt-1.5 text-xs font-medium text-orange-600">{t('forms.referClient.checkYours', { lob: lobLabel, name: r.name || '' })}</p>;
  }
  return <p className="mt-1.5 text-xs font-medium text-sky-600">{t('forms.referClient.checkExists', { lob: lobLabel, name: r.name || '' })}</p>;
}
