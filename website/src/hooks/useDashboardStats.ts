import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  CalendarCheck,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import type { StatCardData } from '@/components/modules/StatCardModule';
import { fetchPartners, fetchAppointments, fetchSaleOrders } from '@/lib/api';

/**
 * Hook for dashboard statistics data
 * @crossref:used-in[Overview, Reports]
 */

interface DashboardStatsResult {
  readonly stats: readonly StatCardData[];
  readonly isLoading: boolean;
}

export function useDashboardStats(selectedLocationId?: string): DashboardStatsResult {
  const [isLoading, setIsLoading] = useState(true);
  const [totalPatients, setTotalPatients] = useState(0);
  const [appointmentsToday, setAppointmentsToday] = useState(0);
  const [revenue, setRevenue] = useState(0);

  const companyId =
    selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined;

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        // Fetch total patients
        const partnersResponse = await fetchPartners({ limit: 1, companyId });
        setTotalPatients(partnersResponse.totalItems);

        // Fetch today's appointments
        const appointmentsResponse = await fetchAppointments({
          limit: 1,
          dateFrom: todayStr,
          dateTo: `${todayStr}T23:59:59`,
          companyId,
        });
        setAppointmentsToday(appointmentsResponse.totalItems);

        // Fetch sale orders and calculate revenue (MTD)
        const firstDayOfMonth = `${yyyy}-${mm}-01`;
        const ordersResponse = await fetchSaleOrders({
          limit: 200,
          companyId,
          dateFrom: firstDayOfMonth,
          dateTo: todayStr,
        });
        const totalRevenue = ordersResponse.items.reduce((sum, order) => {
          const amount = parseFloat(order.amounttotal || '0');
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
        setRevenue(totalRevenue);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [companyId]);

  const stats = useMemo<readonly StatCardData[]>(() => {
    const avgPerVisit =
      appointmentsToday > 0 ? Math.round(revenue / appointmentsToday) : 0;

    return [
      {
        id: 'total-patients',
        label: 'Total Patients',
        value: totalPatients.toLocaleString(),
        change: '+12.5%',
        changeType: 'positive',
        icon: Users,
        color: '#0EA5E9',
      },
      {
        id: 'appointments-today',
        label: 'Appointments Today',
        value: appointmentsToday.toString(),
        change: '+8%',
        changeType: 'positive',
        icon: CalendarCheck,
        color: '#8B5CF6',
      },
      {
        id: 'revenue-mtd',
        label: 'Revenue (MTD)',
        value: `₫${Math.round(revenue).toLocaleString()}`,
        change: '+18.2%',
        changeType: 'positive',
        icon: DollarSign,
        color: '#10B981',
      },
      {
        id: 'avg-per-visit',
        label: 'Avg. per Visit',
        value: `₫${avgPerVisit.toLocaleString()}`,
        change: '-2.1%',
        changeType: 'negative',
        icon: TrendingUp,
        color: '#F97316',
      },
    ];
  }, [totalPatients, appointmentsToday, revenue]);

  return { stats, isLoading } as const;
}
