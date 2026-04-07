import { LayoutDashboard } from 'lucide-react';
import { QuickActionsBar } from '@/components/shared/QuickActionsBar';
import { NotificationsPanel } from '@/components/shared/NotificationsPanel';
import { RevenueChartModule } from '@/components/modules/RevenueChartModule';
import { FilterByLocation } from '@/components/shared/FilterByLocation';
import { useOverviewData } from '@/hooks/useOverviewData';

/**
 * Overview Dashboard Page
 * @crossref:route[/]
 * @crossref:used-in[App]
 * @crossref:uses[QuickActionsBar, NotificationsPanel, RevenueChartModule, FilterByLocation]
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

      {/* Quick Actions */}
      <QuickActionsBar />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart - takes 2 columns */}
        <div className="lg:col-span-2">
          <RevenueChartModule data={revenueData} />
        </div>

        {/* Notifications Panel */}
        <div className="lg:col-span-1">
          <NotificationsPanel
            notifications={notifications}
            onMarkRead={markNotificationRead}
          />
        </div>
      </div>
    </div>
  );
}
