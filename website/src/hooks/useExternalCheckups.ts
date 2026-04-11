import { useState, useEffect, useCallback } from 'react';
import { fetchExternalCheckups, type ExternalCheckupsResponse } from '@/lib/api';

export interface UseExternalCheckupsResult {
  data: ExternalCheckupsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useExternalCheckups(customerCode: string | null | undefined): UseExternalCheckupsResult {
  const [data, setData] = useState<ExternalCheckupsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!customerCode) {
      setData(null);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchExternalCheckups(customerCode);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load external checkups');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [customerCode]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
}
