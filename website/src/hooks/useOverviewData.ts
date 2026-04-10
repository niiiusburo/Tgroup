/**
 * Hook for Overview page data management
 * NOW CONNECTED TO REAL API (tgclinic-api → PostgreSQL)
 * @crossref:used-in[Overview]
 */

import { useState, useCallback, useEffect } from 'react';
import type { Notification, LocationOption, RevenueDataPoint } from '@/types/common';
import { fetchCompanies, fetchSaleOrders } from '@/lib/api';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const MONTHLY_TARGET = 200_000_000; // 200M VND monthly target

export function useOverviewData() {
  const [notifications, setNotifications] = useState<readonly Notification[]>([]);
  const [locations, setLocations] = useState<readonly LocationOption[]>([
    { id: 'all', name: 'All Locations' },
  ]);
  const [revenueData, setRevenueData] = useState<readonly RevenueDataPoint[]>([]);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);

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

  // Fetch REAL revenue data from Sale Orders API (single call for full year)
  useEffect(() => {
    async function loadRevenueData() {
      try {
        setIsLoadingRevenue(true);
        const year = new Date().getFullYear();
        const dateFrom = `${year}-01-01`;
        const dateTo = `${year}-12-31`;

        // Single API call to fetch all sale orders for the year
        const res = await fetchSaleOrders({
          dateFrom,
          dateTo,
          limit: 1000, // Get up to 1000 orders
        });

        // Initialize monthly revenue array
        const revenueByMonth = new Array(12).fill(0);

        // Aggregate revenue by month
        for (const order of res.items) {
          if (order.datecreated && order.amounttotal) {
            const date = new Date(order.datecreated);
            const month = date.getMonth(); // 0-11
            const amount = parseFloat(order.amounttotal) || 0;
            revenueByMonth[month] += amount;
          }
        }

        // Convert to RevenueDataPoint format
        const revenuePoints: RevenueDataPoint[] = MONTH_LABELS.map((month, idx) => ({
          month,
          revenue: Math.round(revenueByMonth[idx]), // Round to whole VND
          target: MONTHLY_TARGET,
        }));

        setRevenueData(revenuePoints);
      } catch (err) {
        console.error('useOverviewData: failed to fetch revenue data', err);
        // Fall back to empty array on error
        setRevenueData([]);
      } finally {
        setIsLoadingRevenue(false);
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
    isLoadingRevenue,
  } as const;
}
