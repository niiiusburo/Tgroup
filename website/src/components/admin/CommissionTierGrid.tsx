import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { CommissionTier, CommissionTierLob } from '@/lib/api/commissionTiers';

interface Props {
  readonly lob: CommissionTierLob;
  readonly tiers: CommissionTier[];
  readonly onSave: (lob: CommissionTierLob, tiers: CommissionTier[]) => void;
  readonly isSaving: boolean;
}

export function CommissionTierGrid({ lob, tiers, onSave, isSaving }: Props) {
  const { t } = useTranslation('admin');
  const [draft, setDraft] = useState<CommissionTier[]>(() =>
    [...tiers].sort((a, b) => a.level - b.level)
  );

  const updateField = useCallback(
    (level: number, field: keyof CommissionTier, value: string | number | boolean) => {
      setDraft((prev) =>
        prev.map((tier) =>
          tier.level === level ? { ...tier, [field]: value } : tier
        )
      );
    },
    []
  );

  const handleSave = useCallback(() => {
    onSave(lob, draft);
  }, [lob, draft, onSave]);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(tiers);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tiers.level')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tiers.label')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tiers.rate')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{t('tiers.active')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {draft.map((tier) => (
              <tr key={tier.level} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  L{tier.level}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={tier.label}
                    onChange={(e) => updateField(tier.level, 'label', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    maxLength={80}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={Math.round(tier.rate * 10000) / 100}
                      onChange={(e) => {
                        const pct = parseFloat(e.target.value);
                        updateField(tier.level, 'rate', Number.isNaN(pct) ? 0 : pct / 100);
                      }}
                      step={0.01}
                      min={0}
                      max={100}
                      className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={tier.isActive}
                      onChange={(e) => updateField(tier.level, 'isActive', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-gray-600">
                      {tier.isActive ? t('tiers.yes') : t('tiers.no')}
                    </span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {t('tiers.lobHint', { lob: lob === 'dental' ? t('lobs.dental') : t('lobs.cosmetic') })}
        </p>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? t('tiers.saving') : t('tiers.save')}
        </button>
      </div>
    </div>
  );
}
