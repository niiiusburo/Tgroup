import { LayoutDashboard } from 'lucide-react';
import { QuickActionsBar } from '@/components/shared/QuickActionsBar';
import { NotificationsPanel } from '@/components/shared/NotificationsPanel';
import { RevenueChartModule } from '@/components/modules/RevenueChartModule';
import { StatCardModule } from '@/components/modules/StatCardModule';
import { TodaySchedule } from '@/components/modules/TodaySchedule';
import { FilterByLocation } from '@/components/shared/FilterByLocation';
import { useOverviewData } from '@/hooks/useOverviewData';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useTodaySchedule } from '@/hooks/useTodaySchedule';

/**
 * Overview Dashboard Page
 * @crossref:route[/]
 * @crossref:used-in[AppRouter]
 * @crossref:uses[QuickActionsBar, NotificationsPanel, RevenueChartModule, StatCardModule, TodaySchedule, FilterByLocation]
 */
export function Overview() {
  const {
    locations,
    selectedLocationId,
    setSelectedLocationId,
    notifications,
    markNotificationRead,
    revenueData,
  } = useOverviewData();

  const { stats } = useDashboardStats();
  const { appointments } = useTodaySchedule(selectedLocationId);

  return (
    <div className="space-y-6">
      {/* Page header with location filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
            <p className="text-sm text-gray-500">Dashboard and clinic insights</p>
          </div>
        </div>

        {/* @crossref:used-in[Overview, Calendar, Customers] */}
        <FilterByLocation
          locations={locations}
          selectedId={selectedLocationId}
          onChange={setSelectedLocationId}
        />
      </div>

      {/* Dashboard Stats Cards */}
      {/* @crossref:used-in[Overview, Reports, LocationDashboard] */}
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
        {/* @crossref:used-in[Overview, CalendarPage] */}
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
