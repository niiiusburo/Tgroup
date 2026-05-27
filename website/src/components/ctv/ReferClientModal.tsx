import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { createCtvReferral } from '@/lib/api/ctv';
import type { CtvLob } from '@/lib/api/ctv';

interface Props {
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

export function ReferClientModal({ onClose, onSuccess }: Props) {
  const { t } = useTranslation('ctv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    serviceInterest: '',
    notes: '',
    lob: 'dental' as CtvLob,
  });

  const handleChange = useCallback(
    (field: string, value: string) => {
      setForm((f) => ({ ...f, [field]: value }));
      setError(null);
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!form.clientName.trim() || !form.clientPhone.trim()) {
        setError(t('referral.namePhoneRequired'));
        return;
      }

      setLoading(true);
      try {
        await createCtvReferral({
          clientName: form.clientName.trim(),
          clientPhone: form.clientPhone.trim(),
          clientEmail: form.clientEmail.trim() || undefined,
          serviceInterest: form.serviceInterest.trim() || undefined,
          notes: form.notes.trim() || undefined,
          lob: form.lob,
        });
        onSuccess();
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('REFERRED_BY_OTHER')) {
          setError(t('referral.referredByOther'));
        } else if (msg.includes('ACTIVE_REFERRAL_EXISTS')) {
          setError(t('referral.activeExists'));
        } else if (msg.includes('409')) {
          setError(t('referral.alreadyReferred'));
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    },
    [form, t, onSuccess, onClose]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-0 sm:p-4">
      <div className="w-full max-w-[430px] rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('referral.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('referral.clientName')} *
            </label>
            <input
              type="text"
              required
              value={form.clientName}
              onChange={(e) => handleChange('clientName', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('referral.clientPhone')} *
            </label>
            <input
              type="tel"
              required
              value={form.clientPhone}
              onChange={(e) => handleChange('clientPhone', e.target.value)}
              placeholder="0xxxxxxxxxx"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('referral.clientEmail')}
            </label>
            <input
              type="email"
              value={form.clientEmail}
              onChange={(e) => handleChange('clientEmail', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('referral.serviceInterest')}
            </label>
            <input
              type="text"
              value={form.serviceInterest}
              onChange={(e) => handleChange('serviceInterest', e.target.value)}
              placeholder={t('referral.servicePlaceholder')}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('referral.lob')}
            </label>
            <div className="mt-1 flex gap-2">
              {(['dental', 'cosmetic'] as CtvLob[]).map((lob) => (
                <button
                  key={lob}
                  type="button"
                  onClick={() => handleChange('lob', lob)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.lob === lob
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t(`lobs.${lob}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('referral.notes')}
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {loading ? t('referral.submitting') : t('referral.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
