/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[CustomerColumns investor column]
 * @crossref:uses[useInvestorVisibilityColumn batch state]
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { InvestorVisibilityState } from '@/lib/api/investorVisibility';

interface InvestorVisibilityCellProps {
  partnerId: string;
  partnerName: string;
  isDeleted?: boolean;
  canToggle: boolean;
  hasInvestors: boolean;
  investors: InvestorVisibilityState[];
  rowStates: InvestorVisibilityState[] | undefined;
  selectedInvestorId: string | null;
  onSelectInvestor: (id: string) => void;
  onToggle: (partnerId: string, investorId: string, next: boolean, investorName: string) => Promise<{ ok: boolean }>;
}

export function InvestorVisibilityCell({
  partnerId,
  partnerName,
  isDeleted,
  canToggle,
  hasInvestors,
  investors,
  rowStates,
  selectedInvestorId,
  onSelectInvestor,
  onToggle,
}: InvestorVisibilityCellProps) {
  const { t } = useTranslation('customers');
  const [pending, setPending] = useState(false);

  if (!canToggle) {
    return (
      <span className="text-xs text-gray-400" title={t('investorVisibility.noPermission')}>
        —
      </span>
    );
  }

  if (isDeleted) {
    return (
      <span className="text-xs text-gray-400" title={t('investorVisibility.deletedClient')}>
        —
      </span>
    );
  }

  if (!hasInvestors) {
    return (
      <span className="text-xs text-gray-400" title={t('investorVisibility.noInvestors')}>
        —
      </span>
    );
  }

  const activeInvestors = investors.filter((i) => i.isActive !== false);
  const investorId = selectedInvestorId || activeInvestors[0]?.investorId;
  const state = (rowStates || activeInvestors).find((i) => i.investorId === investorId);
  const checked = state?.isVisible === true;
  const investorName = state?.investorName || activeInvestors[0]?.investorName || '';

  async function handleChange(next: boolean) {
    if (!investorId || pending) return;
    if (next) {
      const ok = window.confirm(
        t('investorVisibility.confirmOn', { name: investorName, client: partnerName }),
      );
      if (!ok) return;
    }
    setPending(true);
    await onToggle(partnerId, investorId, next, investorName);
    setPending(false);
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {activeInvestors.length > 1 && (
        <select
          className="text-xs border border-gray-200 rounded px-1 py-0.5 max-w-[100px] truncate"
          value={investorId}
          onChange={(e) => onSelectInvestor(e.target.value)}
          aria-label={t('investorVisibility.selectInvestor')}
        >
          {activeInvestors.map((inv) => (
            <option key={inv.investorId} value={inv.investorId}>
              {inv.investorName}
            </option>
          ))}
        </select>
      )}
      <input
        type="checkbox"
        checked={checked}
        disabled={pending}
        onChange={(e) => handleChange(e.target.checked)}
        className="rounded border-gray-300 text-primary focus:ring-primary/30"
        aria-label={t('investorVisibility.toggleLabel', { investor: investorName })}
      />
    </div>
  );
}