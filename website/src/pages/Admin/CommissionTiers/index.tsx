import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CommissionTierGrid } from '@/components/admin/CommissionTierGrid';
import {
  fetchCommissionTiers,
  updateCommissionTiers,
  type CommissionTierLob,
  type CommissionTier,
} from '@/lib/api/commissionTiers';

export default function CommissionTiersPage() {
  const { t } = useTranslation('admin');
  const [lob, setLob] = useState<CommissionTierLob>('dental');
  const [tiers, setTiers] = useState<CommissionTier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchCommissionTiers(lob);
      setTiers(res.tiers);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [lob]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = useCallback(
    async (saveLob: CommissionTierLob, saveTiers: CommissionTier[]) => {
      setIsSaving(true);
      setError(null);
      try {
        const res = await updateCommissionTiers(saveLob, saveTiers);
        setTiers(res.tiers);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('tiers.title')}</h1>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="lob"
            value="dental"
            checked={lob === 'dental'}
            onChange={() => setLob('dental')}
            className="h-4 w-4 text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-gray-700">{t('lobs.dental')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="lob"
            value="cosmetic"
            checked={lob === 'cosmetic'}
            onChange={() => setLob('cosmetic')}
            className="h-4 w-4 text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-gray-700">{t('lobs.cosmetic')}</span>
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">{t('common.loading')}</div>
      ) : (
        <CommissionTierGrid lob={lob} tiers={tiers} onSave={handleSave} isSaving={isSaving} />
      )}
    </div>
  );
}
