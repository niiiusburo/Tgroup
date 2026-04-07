import { useState, useCallback } from 'react';
import {
  MOCK_NOTIFICATIONS,
  MOCK_REVENUE_DATA,
  MOCK_LOCATIONS,
  type Notification,
} from '@/data/mockDashboard';

/**
 * Hook for Overview page data management
 * @crossref:used-in[Overview]
 */
export function useOverviewData() {
  const [selectedLocationId, setSelectedLocationId] = useState('all');
  const [notifications, setNotifications] = useState<readonly Notification[]>(MOCK_NOTIFICATIONS);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  return {
    locations: MOCK_LOCATIONS,
    selectedLocationId,
    setSelectedLocationId,
    notifications,
    markNotificationRead,
    revenueData: MOCK_REVENUE_DATA,
  } as const;
}
