/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[Customers page investor visibility column]
 * @crossref:uses[investorVisibility API client]
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBusinessUnit } from '@/contexts/BusinessUnitContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchInvestorVisibilityBatch,
  patchPartnerInvestorVisibility,
  type InvestorVisibilityState,
} from '@/lib/api/investorVisibility';
import { ApiError } from '@/lib/api/core';

export function useInvestorVisibilityColumn(partnerIds: string[]) {
  const { currentLOB } = useBusinessUnit();
  const { hasPermission } = useAuth();
  const canToggle = hasPermission('customers.set_investor_visibility');

  const [batch, setBatch] = useState<Record<string, InvestorVisibilityState[]>>({});
  const [investors, setInvestors] = useState<InvestorVisibilityState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idsKey = useMemo(() => partnerIds.slice().sort().join(','), [partnerIds]);

  useEffect(() => {
    if (!canToggle || partnerIds.length === 0) {
      setBatch({});
      setInvestors([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchInvestorVisibilityBatch(partnerIds, currentLOB)
      .then((res) => {
        if (cancelled) return;
        setBatch(res.batch || {});
        const first = partnerIds.find((id) => res.batch?.[id]?.length);
        setInvestors(first ? res.batch[first] : []);
      })
      .catch(() => {
        if (!cancelled) setError('fetch');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canToggle, idsKey, currentLOB, partnerIds]);

  const hasInvestors = investors.some((i) => i.isActive !== false);

  const toggleVisibility = useCallback(
    async (partnerId: string, investorId: string, nextVisible: boolean) => {
      const prev = batch[partnerId]?.find((i) => i.investorId === investorId)?.isVisible ?? false;

      setBatch((old) => {
        const row = old[partnerId] || investors;
        return {
          ...old,
          [partnerId]: row.map((i) =>
            i.investorId === investorId ? { ...i, isVisible: nextVisible } : i,
          ),
        };
      });

      try {
        await patchPartnerInvestorVisibility(partnerId, investorId, nextVisible, currentLOB);
        return { ok: true as const };
      } catch (err) {
        setBatch((old) => ({
          ...old,
          [partnerId]: (old[partnerId] || investors).map((i) =>
            i.investorId === investorId ? { ...i, isVisible: prev } : i,
          ),
        }));
        const code = err instanceof ApiError ? err.code : undefined;
        return { ok: false as const, code };
      }
    },
    [batch, investors, currentLOB],
  );

  return {
    canToggle,
    batch,
    investors,
    hasInvestors,
    loading,
    error,
    toggleVisibility,
  };
}