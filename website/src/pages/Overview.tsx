// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { QuickActionsBar } from '@/components/shared/QuickActionsBar';
import { NotificationsPanel } from '@/components/shared/NotificationsPanel';
import { RevenueChartModule } from '@/components/modules/RevenueChartModule';
import { StatCardModule } from '@/components/modules/StatCardModule';
import { TodaySchedule } from '@/components/modules/TodaySchedule';
import { useOverviewData } from '@/hooks/useOverviewData';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useTodaySchedule } from '@/hooks/useTodaySchedule';
import { useLocationFilter } from '@/contexts/LocationContext';

/**
 * Overview Dashboard Page
 * @crossref:route[/]
 * @crossref:used-in[AppRouter]
 */
export function Overview() {
  const { selectedLocationId } = useLocationFilter();
  const {
    notifications,
    markNotificationRead,
    revenueData,
  } = useOverviewData();

  const { stats } = useDashboardStats(selectedLocationId);
  const { appointments } = useTodaySchedule(selectedLocationId);

  return (
    <div className="space-y-6">
      {/* Dashboard Stats Cards */}
      <StatCardModule stats={stats} />

      {/* Quick Actions */}
      <QuickActionsBar />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart - takes 2 columns */}
        <div className="lg:col-span-2">
          <RevenueChartModule data={revenueData} />
        </div>

        {/* Today's Schedule */}
        <div className="lg:col-span-1">
          <TodaySchedule appointments={appointments} />
        </div>
      </div>

      {/* Notifications Panel - full width */}
      <NotificationsPanel
        notifications={notifications}
        onMarkRead={markNotificationRead}
      />
    </div>
  );
}
