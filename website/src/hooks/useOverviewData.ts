/**
 * Hook for Overview page data management
 * NOW CONNECTED TO REAL API (tdental-api → PostgreSQL)
 * @crossref:used-in[Overview]
 */

import { useState, useCallback, useEffect } from 'react';
import {
  MOCK_NOTIFICATIONS,
  type Notification,
  type LocationOption,
  type RevenueDataPoint,
} from '@/data/mockDashboard';
import { fetchCompanies, fetchAppointments } from '@/lib/api';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function useOverviewData() {
  const [notifications, setNotifications] = useState<readonly Notification[]>(MOCK_NOTIFICATIONS);
  const [locations, setLocations] = useState<readonly LocationOption[]>([
    { id: 'all', name: 'All Locations' },
  ]);
  const [revenueData, setRevenueData] = useState<readonly RevenueDataPoint[]>([]);

  // Fetch real locations from API
  useEffect(() => {
    fetchCompanies({ limit: 50 })
      .then((res) => {
        const opts: LocationOption[] = [
          { id: 'all', name: 'All Locations' },
          ...res.items.map((c) => ({ id: c.id, name: c.name })),
        ];
        setLocations(opts);
      })
      .catch((err) => {
        console.error('useOverviewData: failed to fetch locations', err);
      });
  }, []);

  // Derive revenue chart data from real appointment counts by month (current year)
  useEffect(() => {
    async function loadRevenueData() {
      try {
        const year = new Date().getFullYear();
        const counts = await Promise.all(
          MONTH_LABELS.map(async (month, idx) => {
            const mm = String(idx + 1).padStart(2, '0');
            const lastDay = new Date(year, idx + 1, 0).getDate();
            const dateFrom = `${year}-${mm}-01`;
            const dateTo = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
            const res = await fetchAppointments({ limit: 1, dateFrom, dateTo });
            return { month, revenue: res.totalItems, target: 0 };
          })
        );
        setRevenueData(counts);
      } catch (err) {
        console.error('useOverviewData: failed to fetch revenue data', err);
      }
    }

    loadRevenueData();
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  return {
    locations,
    notifications,
    markNotificationRead,
    revenueData,
  } as const;
}
