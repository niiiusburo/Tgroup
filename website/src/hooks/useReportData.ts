import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useBusinessUnit } from '@/contexts/BusinessUnitContext';

interface ReportParams {
  dateFrom: string;
  dateTo: string;
  companyId?: string;
}

function cleanReportParams(params: ReportParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([key, value]) => {
      if (value === '' || value === null || value === undefined) return false;
      return !(key === 'companyId' && value === 'all');
    })
  );
}

export function useReportData<T>(endpoint: string, params: ReportParams) {
  const { currentLOB } = useBusinessUnit();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetcher = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ success: boolean; data: T }>(endpoint, {
        method: 'POST',
        body: cleanReportParams(params),
        signal,
        lob: currentLOB,
      });
      if (result.success) {
        setData(result.data);
      } else {
        setError('Failed to load report');
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [endpoint, params.dateFrom, params.dateTo, params.companyId, currentLOB]);

  useEffect(() => {
    const controller = new AbortController();
    fetcher(controller.signal);
    return () => controller.abort();
  }, [fetcher]);

  return { data, loading, error, refetch: fetcher };
}

/** Format number as VND currency */
export function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

/** Format number with commas, no currency */
export function formatNum(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

/** Format a Date or string as YYYY-MM-DD */
export function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}
