import { useMemo } from 'react';
import {
  Users,
  CalendarCheck,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import type { StatCardData } from '@/components/modules/StatCardModule';

/**
 * Hook for dashboard statistics data
 * @crossref:used-in[Overview, Reports]
 */

interface DashboardStatsResult {
  readonly stats: readonly StatCardData[];
  readonly isLoading: boolean;
}

export function useDashboardStats(): DashboardStatsResult {
  const stats = useMemo<readonly StatCardData[]>(
    () => [
      {
        id: 'total-patients',
        label: 'Total Patients',
        value: '1,284',
        change: '+12.5%',
        changeType: 'positive',
        icon: Users,
        color: '#0EA5E9',
      },
      {
        id: 'appointments-today',
        label: 'Appointments Today',
        value: '24',
        change: '+8%',
        changeType: 'positive',
        icon: CalendarCheck,
        color: '#8B5CF6',
      },
      {
        id: 'revenue-mtd',
        label: 'Revenue (MTD)',
        value: '₫245,600,000',
        change: '+18.2%',
        changeType: 'positive',
        icon: DollarSign,
        color: '#10B981',
      },
      {
        id: 'avg-per-visit',
        label: 'Avg. per Visit',
        value: '₫458,000',
        change: '-2.1%',
        changeType: 'negative',
        icon: TrendingUp,
        color: '#F97316',
      },
    ],
    []
  );

  return { stats, isLoading: false } as const;
}
