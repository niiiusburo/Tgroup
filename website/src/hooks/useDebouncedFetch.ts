/**
 * useDebouncedFetch — Generic hook for debounced API fetching
 * Replaces duplicated debounce-then-fetch patterns across 6+ hooks.
 * @crossref:used-in[useCustomers, useAppointments, useServices, usePayment, useEmployees, useMonthlyPlans]
 */
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseDebouncedFetchOptions {
  /** Debounce delay in milliseconds */
  delayMs?: number;
  /** Whether to skip fetching (e.g., while another condition is false) */
  enabled?: boolean;
}

interface UseDebouncedFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDebouncedFetch<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = [],
  options: UseDebouncedFetchOptions = {}
): UseDebouncedFetchResult<T> {
  const { delayMs = 300, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchCounter, setRefetchCounter] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(() => {
    setRefetchCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setLoading(true);
    setError(null);

    timerRef.current = setTimeout(() => {
      fetchFn()
        .then((result) => {
          setData(result);
          setError(null);
        })
        .catch((err) => {
          setError(err instanceof Error ? err : new Error(String(err)));
          setData(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refetchCounter, enabled, delayMs]);

  return { data, loading, error, refetch };
}
