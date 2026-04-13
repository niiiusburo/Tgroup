import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface ReportParams {
  dateFrom: string;
  dateTo: string;
  companyId?: string;
}

export function useReportData<T>(endpoint: string, params: ReportParams) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ success: boolean; data: T }>(endpoint, {
        method: 'POST',
        body: params,
      });
      if (result.success) {
        setData(result.data);
      } else {
        setError('Failed to load report');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [endpoint, params.dateFrom, params.dateTo, params.companyId]);

  useEffect(() => { fetcher(); }, [fetcher]);

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
