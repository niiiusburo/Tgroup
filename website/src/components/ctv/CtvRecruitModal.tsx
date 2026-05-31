import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, X } from 'lucide-react';
import { createCtv } from '@/lib/api/ctv';
import { ApiError } from '@/lib/api/core';
import { cn } from '@/lib/utils';

interface CtvRecruitModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

const EMPTY = { name: '', phone: '', email: '', password: '', lobs: ['dental'] as string[] };

export function CtvRecruitModal({ open, onClose, onSuccess }: CtvRecruitModalProps) {
  const { t } = useTranslation('ctv');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  function toggleLob(lob: string, checked: boolean) {
    setForm((f) => ({ ...f, lobs: checked ? [...f.lobs, lob] : f.lobs.filter((l) => l !== lob) }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.password.trim()) {
      setError(t('forms.referClient.required'));
      return;
    }
    if (form.lobs.length === 0) {
      setError(t('forms.recruitCtv.selectOne'));
      return;
    }
    setLoading(true);
    try {
      await createCtv({ name: form.name, phone: form.phone, email: form.email, password: form.password, lob_scope: form.lobs });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setForm(EMPTY);
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError((err instanceof ApiError && err.message) || (err instanceof Error && err.message) || t('forms.referClient.required'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{t('forms.recruitCtv.title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('forms.close')} className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-7 w-7" />
            </span>
            <p className="text-sm font-bold text-gray-900">{t('forms.recruitCtv.success')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t('forms.recruitCtv.name')}>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500" />
            </Field>
            <Field label={t('forms.recruitCtv.phone')}>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500" />
            </Field>
            <Field label={t('forms.recruitCtv.email')}>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500" />
            </Field>
            <Field label={t('forms.recruitCtv.password')}>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500" />
            </Field>

            <div>
              <p className="mb-2 block text-sm font-medium text-gray-700">{t('forms.recruitCtv.lobs')}</p>
              <div className="flex flex-col gap-2">
                {['dental', 'cosmetic'].map((lob) => (
                  <label key={lob} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3', form.lobs.includes(lob) ? 'border-orange-300 bg-orange-50' : 'border-gray-200')}>
                    <input
                      type="checkbox"
                      checked={form.lobs.includes(lob)}
                      onChange={(e) => toggleLob(lob, e.target.checked)}
                      className="h-4 w-4 accent-orange-500"
                    />
                    <span className="text-sm font-medium capitalize text-gray-800">{t(`forms.referClient.${lob}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p> : null}

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? t('forms.recruitCtv.submitting') : t('forms.recruitCtv.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
