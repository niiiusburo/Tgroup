/**
 * useCtvs — active CTV (Cộng tác viên) options for the service/appointment CTV selector.
 * LOB-aware: reads the current business unit so the cosmetic LOB only lists cosmetic-scoped CTVs.
 * @crossref:used-in[ServiceForm, AppointmentFormCore]
 */

import { useState, useEffect } from 'react';
import { fetchCtvOptions, type CtvOption } from '@/lib/api/ctv';
import { useBusinessUnitOptional } from '@/contexts/BusinessUnitContext';

interface UseCtvsResult {
  readonly ctvs: CtvOption[];
  readonly loading: boolean;
  readonly error: string | null;
}

export function useCtvs(): UseCtvsResult {
  const currentLOB = useBusinessUnitOptional()?.currentLOB ?? 'dental';
  const [ctvs, setCtvs] = useState<CtvOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCtvOptions(currentLOB)
      .then((res) => {
        if (!cancelled) setCtvs(res.ctvs ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load CTVs');
          setCtvs([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentLOB]);

  return { ctvs, loading, error };
}
