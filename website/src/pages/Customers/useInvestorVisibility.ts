import { useCallback, useEffect, useState } from 'react';
import { fetchInvestorVisibility, setInvestorCustomerVisibility } from '@/lib/api/partners';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Failed to update investor visibility';
}

export function useInvestorVisibility(enabled: boolean) {
  const [customerIds, setCustomerIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(() => new Set());

  const load = useCallback(async () => {
    if (!enabled) {
      setCustomerIds(new Set());
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchInvestorVisibility();
      setCustomerIds(new Set(res.customerIds));
    } catch (err) {
      setError(getErrorMessage(err));
      setCustomerIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const isVisible = useCallback((customerId: string) => customerIds.has(customerId), [customerIds]);

  const setVisible = useCallback(
    async (customerId: string, visible: boolean) => {
      if (!enabled) return;

      const previous = customerIds;
      setError(null);
      setUpdatingIds((prev) => new Set(prev).add(customerId));
      setCustomerIds((prev) => {
        const next = new Set(prev);
        if (visible) next.add(customerId);
        else next.delete(customerId);
        return next;
      });

      try {
        await setInvestorCustomerVisibility(customerId, visible);
      } catch (err) {
        setCustomerIds(previous);
        setError(getErrorMessage(err));
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(customerId);
          return next;
        });
      }
    },
    [customerIds, enabled],
  );

  return {
    customerIds,
    error,
    isVisible,
    loading,
    refetch: load,
    setVisible,
    updatingIds,
  };
}
