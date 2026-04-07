/**
 * Hook for Overview page data management
 * NOW CONNECTED TO REAL API (tdental-api → PostgreSQL)
 * @crossref:used-in[Overview]
 */

import { useState, useCallback, useEffect } from 'react';
import {
  MOCK_NOTIFICATIONS,
  MOCK_REVENUE_DATA,
  type Notification,
  type LocationOption,
} from '@/data/mockDashboard';
import { fetchCompanies } from '@/lib/api';

export function useOverviewData() {
  const [notifications, setNotifications] = useState<readonly Notification[]>(MOCK_NOTIFICATIONS);
  const [locations, setLocations] = useState<readonly LocationOption[]>([
    { id: 'all', name: 'All Locations' },
  ]);

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

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  return {
    locations,
    notifications,
    markNotificationRead,
    revenueData: MOCK_REVENUE_DATA,
  } as const;
}
