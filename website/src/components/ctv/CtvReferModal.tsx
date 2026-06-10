/**
 * @crossref:domain[ctv]
 * @crossref:used-in[refer-a-client sheet (portal + public landing): website/src/pages/CTV/CtvDashboard.tsx, website/src/pages/Landing/Landing.tsx]
 * @crossref:uses[website/src/lib/api/ctv.ts (createBooking/createPublicBooking/lookups), website/src/lib/api/core.ts, website/src/components/ctv/CtvModalSheet.tsx, website/src/components/ctv/ServicePicker.tsx, website/src/components/ui/DatePicker.tsx, product-map/domains/ctv.yaml]
 */
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Check, Info, Loader2 } from 'lucide-react';
import {
  createBooking,
  createPublicBooking,
  fetchCtvServices,
  fetchPublicCtvServices,
  lookupClientByPhone,
  lookupPublicCtvByPhone,
  lookupPublicClientByPhone,
  type CtvClientLookup,
  type CtvLob,
  type PublicCtvLookup,
  type CtvServiceOption,
} from '@/lib/api/ctv';
import { DatePicker } from '@/components/ui/DatePicker';
import { ApiError } from '@/lib/api/core';
import { cn } from '@/lib/utils';
import { ServicePicker } from './ServicePicker';
import { CtvModalSheet } from './CtvModalSheet';

interface CtvReferModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
  /** Public landing mode: no login required, so the CTV is resolved by phone. */
  readonly publicMode?: boolean;
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
  return { name: '', phone: '', ctvPhone: '', date: getVietnamDateInputValue(), lob: 'dental' as CtvLob, serviceId: '', note: '' };
}

export function CtvReferModal({ open, onClose, onSuccess, publicMode = false }: CtvReferModalProps) {
  const { t } = useTranslation('ctv');
  const [form, setForm] = useState(createEmptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lookup, setLookup] = useState<{ status: 'idle' | 'checking' | 'done'; result?: CtvClientLookup }>({ status: 'idle' });
  const [ctvLookup, setCtvLookup] = useState<{ status: 'idle' | 'checking' | 'done'; result?: PublicCtvLookup }>({ status: 'idle' });
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
    setLookup({ status: 'checking' });
    const id = setTimeout(async () => {
      try {
        const lookupLob = form.lob;
        const r = publicMode
          ? await lookupPublicClientByPhone(phone, lookupLob, form.ctvPhone.trim() || undefined)
          : await lookupClientByPhone(phone, lookupLob);
        if (!cancelled) {
          setLookup({ status: 'done', result: r });
          const existingName = r.exists && !r.claimed ? r.name?.trim() : '';
          if (existingName) {
            setForm((current) => {
              if (current.phone.trim() !== phone || current.lob !== lookupLob || current.name.trim()) {
                return current;
              }
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
  }, [form.phone, form.lob, form.ctvPhone, open, publicMode]);

  // Public landing attribution check: verify the CTV phone while typing.
  useEffect(() => {
    const ctvPhone = form.ctvPhone.trim();
    if (!open || !publicMode || ctvPhone.length < 6) {
      setCtvLookup({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setCtvLookup({ status: 'checking' });
    const id = setTimeout(async () => {
      try {
        const r = await lookupPublicCtvByPhone(ctvPhone);
        if (!cancelled) setCtvLookup({ status: 'done', result: r });
      } catch {
        if (!cancelled) setCtvLookup({ status: 'done', result: { exists: false } });
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [form.ctvPhone, open, publicMode]);

  // Load the chosen LOB's service catalog for the service picker. Refetches when
  // the LOB toggle flips (a dental service id is invalid in the cosmetic DB, and
  // the selection is reset on toggle — see the LOB buttons below).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setServicesLoading(true);
    setServicesError(false);
    const loadServices = publicMode ? fetchPublicCtvServices : fetchCtvServices;
    loadServices(form.lob)
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
  }, [open, form.lob, publicMode]);

  if (!open) return null;

  const lobLabel = t(`lobs.${form.lob}`);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const ctvPhone = form.ctvPhone.trim();
    if (!form.name.trim() || !form.phone.trim() || !form.date.trim() || (publicMode && !ctvPhone)) {
      setError(t('forms.referClient.required'));
      return;
    }
    if (publicMode && ctvLookup.status === 'checking') {
      setError(t('forms.referClient.ctvChecking'));
      return;
    }
    if (publicMode && (ctvLookup.status !== 'done' || !ctvLookup.result?.exists)) {
      setError(t('forms.referClient.errorCtvNotFound'));
      return;
    }
    if (lookup.status === 'done' && lookup.result?.claimed) {
        setError(t('forms.referClient.errorClaimed', { owner: lookup.result.ownerName || t('common.emDash') }));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        lob: form.lob,
        date: form.date,
        productId: form.serviceId || undefined,
        note: form.note.trim() || undefined,
      };
      if (publicMode) {
        await createPublicBooking({ ...payload, ctvPhone });
      } else {
        await createBooking(payload);
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setForm(createEmptyForm());
        setLookup({ status: 'idle' });
        setCtvLookup({ status: 'idle' });
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === 'B_CLIENT_CLAIMED') {
        const owner = (err instanceof ApiError && (err.body as { error?: { ownerName?: string } })?.error?.ownerName) || t('common.emDash');
        setError(t('forms.referClient.errorClaimed', { owner }));
      } else if (code === 'P_CTV_NOT_FOUND') {
        setError(t('forms.referClient.errorCtvNotFound'));
      } else {
        setError((err instanceof Error && err.message) || t('forms.referClient.required'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <CtvModalSheet title={t('forms.referClient.title')} closeLabel={t('forms.close')} onClose={onClose}>
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
                    {t(`lobs.${l}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-orange-50 px-3 py-2.5 text-orange-800 ring-1 ring-orange-100">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs font-semibold leading-relaxed">{t('forms.referClient.phoneFirstNotice')}</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('forms.referClient.phone')}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t('forms.referClient.phonePlaceholder')}
                autoFocus
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
              />
              <PhoneCheck lookup={lookup} lobLabel={lobLabel} t={t} />
            </div>

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

            {publicMode ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('forms.referClient.ctvPhone')}</label>
                <input
                  type="tel"
                  value={form.ctvPhone}
                  onChange={(e) => setForm({ ...form, ctvPhone: e.target.value })}
                  placeholder={t('forms.referClient.ctvPhonePlaceholder')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
                />
                <CtvPhoneCheck lookup={ctvLookup} t={t} />
              </div>
            ) : null}

            <DatePicker
              value={form.date}
              onChange={(date) => setForm({ ...form, date })}
              label={t('forms.referClient.date')}
              icon={<CalendarDays className="h-3.5 w-3.5" />}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('forms.referClient.service')}</label>
              <ServicePicker
                services={services}
                value={form.serviceId}
                onChange={(serviceId) => setForm({ ...form, serviceId })}
                loading={servicesLoading}
              />
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
    </CtvModalSheet>
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
    return <p className="mt-1.5 text-xs font-bold text-amber-600">{t('forms.referClient.checkClaimed', { lob: lobLabel, owner: r.ownerName || t('common.emDash') })}</p>;
  }
  if (r.claimedByMe) {
    return <p className="mt-1.5 text-xs font-medium text-orange-600">{t('forms.referClient.checkYours', { lob: lobLabel, name: r.name || '' })}</p>;
  }
  return <p className="mt-1.5 text-xs font-medium text-sky-600">{t('forms.referClient.checkExists', { lob: lobLabel, name: r.name || '' })}</p>;
}

function CtvPhoneCheck({
  lookup,
  t,
}: {
  readonly lookup: { status: 'idle' | 'checking' | 'done'; result?: PublicCtvLookup };
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (lookup.status === 'idle') return null;
  if (lookup.status === 'checking') {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t('forms.referClient.ctvChecking')}
      </p>
    );
  }
  if (lookup.result?.exists) {
    return <p className="mt-1.5 text-xs font-semibold text-emerald-600">{t('forms.referClient.ctvFound', { name: lookup.result.name || t('profileFallback') })}</p>;
  }
  return <p className="mt-1.5 text-xs font-semibold text-red-600">{t('forms.referClient.ctvNotFound')}</p>;
}
