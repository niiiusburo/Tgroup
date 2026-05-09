import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSaleOrderActivityLines, type ApiSaleOrderActivityLine } from '@/lib/api';
import { useTimezone } from '@/contexts/TimezoneContext';
import { normalizeText } from '@/lib/utils';

export type TodayServiceStatus = 'active' | 'completed' | 'cancelled';

export interface TodayServiceActivity {
  readonly id: string;
  readonly serviceName: string;
  readonly patientName: string;
  readonly patientPhone: string;
  readonly patientCode: string | null;
  readonly quantity: number | null;
  readonly doctorName: string;
  readonly amount: number;
  readonly status: TodayServiceStatus;
  readonly orderName: string | null;
  readonly date: string | null;
}

interface UseTodayServicesResult {
  readonly services: readonly TodayServiceActivity[];
  readonly allServices: readonly TodayServiceActivity[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
}

function parseNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value: string | number | null | undefined): number | null {
  const parsed = parseNumber(value);
  return parsed > 0 ? parsed : null;
}

function mapStatus(state: string | null | undefined): TodayServiceStatus {
  const normalized = state?.toLowerCase() ?? '';
  if (normalized === 'done' || normalized === 'completed') return 'completed';
  if (normalized === 'cancel' || normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
  return 'active';
}

export function mapTodayServiceActivity(line: ApiSaleOrderActivityLine): TodayServiceActivity {
  const patientName = line.orderPartnerDisplayName || line.orderPartnerName || '-';
  return {
    id: line.id,
    serviceName: line.productName || line.name || line.orderName || '-',
    patientName,
    patientPhone: line.orderPartnerPhone || '',
    patientCode: line.orderPartnerCode ?? null,
    quantity: optionalNumber(line.productUOMQty),
    doctorName: line.employeeName || '-',
    amount: parseNumber(line.priceTotal ?? line.priceSubTotal ?? line.amountInvoiced),
    status: mapStatus(line.state),
    orderName: line.orderName ?? null,
    date: line.date,
  };
}

function matchesSearch(service: TodayServiceActivity, searchTerm: string): boolean {
  const query = normalizeText(searchTerm.trim());
  if (!query) return true;
  return [
    service.serviceName,
    service.patientName,
    service.patientPhone,
    service.patientCode,
    service.doctorName,
    service.orderName,
  ].some((value) => normalizeText(value).includes(query));
}

export function useTodayServices(locationId?: string, searchTerm = ''): UseTodayServicesResult {
  const { getToday, getEndOfDay, timezone } = useTimezone();
  const [allServices, setAllServices] = useState<TodayServiceActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const today = getToday();
      const response = await fetchSaleOrderActivityLines({
        limit: 200,
        dateFrom: today,
        dateTo: getEndOfDay(today),
        companyId: locationId && locationId !== 'all' ? locationId : undefined,
      });
      setAllServices(response.items.map(mapTodayServiceActivity));
    } catch (err) {
      console.error('Failed to load today services:', err);
      setAllServices([]);
      setError(err instanceof Error ? err.message : 'Failed to load today services');
    } finally {
      setIsLoading(false);
    }
  }, [getToday, getEndOfDay, locationId]);

  useEffect(() => {
    loadServices();
  }, [loadServices, timezone]);

  useEffect(() => {
    const handleRefresh = () => {
      if (document.visibilityState === 'visible') {
        void loadServices();
      }
    };
    document.addEventListener('visibilitychange', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    return () => {
      document.removeEventListener('visibilitychange', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [loadServices]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadServices();
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [loadServices]);

  const services = useMemo(
    () => allServices.filter((service) => matchesSearch(service, searchTerm)),
    [allServices, searchTerm],
  );

  return {
    services,
    allServices,
    isLoading,
    error,
    refresh: loadServices,
  };
}
