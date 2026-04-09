import {
  CalendarCheck,
  Users,
  Star,
  TrendingUp,
  Activity,
} from 'lucide-react';
import type { LocationMetrics } from '@/types/location';

/**
 * Mini dashboard showing branch-level metrics
 * @crossref:used-in[LocationDetail, Overview]
 */

interface LocationDashboardProps {
  readonly metrics: LocationMetrics;
}

interface MetricCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly icon: React.ReactNode;
  readonly color: string;
  readonly subtitle?: string;
}

function MetricCard({ label, value, icon, color, subtitle }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <div className={`p-1.5 rounded-lg ${color}`}>{icon}</div>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export function LocationDashboard({ metrics }: LocationDashboardProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Branch Metrics</h3>

      {/* Metric cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          label="Today's Appointments"
          value={metrics.appointmentsToday}
          icon={<CalendarCheck className="w-4 h-4 text-blue-600" />}
          color="bg-blue-50"
          subtitle={`${metrics.appointmentsThisWeek} this week`}
        />
        <MetricCard
          label="New Customers"
          value={metrics.newCustomersThisMonth}
          icon={<Users className="w-4 h-4 text-green-600" />}
          color="bg-green-50"
          subtitle="This month"
        />
        <MetricCard
          label="Avg Rating"
          value={metrics.averageRating.toFixed(1)}
          icon={<Star className="w-4 h-4 text-amber-600" />}
          color="bg-amber-50"
          subtitle="Out of 5.0"
        />
        <MetricCard
          label="Occupancy"
          value={`${metrics.occupancyRate}%`}
          icon={<Activity className="w-4 h-4 text-purple-600" />}
          color="bg-purple-50"
          subtitle="Chair utilization"
        />
        <MetricCard
          label="Weekly Appts"
          value={metrics.appointmentsThisWeek}
          icon={<TrendingUp className="w-4 h-4 text-rose-600" />}
          color="bg-rose-50"
          subtitle="Avg per day"
        />
      </div>

      {/* Revenue chart (simple bar visualization) */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <h4 className="text-xs font-medium text-gray-500 mb-3">Revenue Trend (M VND)</h4>
        <div className="flex items-end gap-2 h-32">
          {metrics.revenueData.map((point) => {
            const maxVal = Math.max(
              ...metrics.revenueData.map((p) => Math.max(p.revenue, p.target))
            );
            const revenueHeight = maxVal > 0 ? (point.revenue / maxVal) * 100 : 0;
            const targetHeight = maxVal > 0 ? (point.target / maxVal) * 100 : 0;

            return (
              <div key={point.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-0.5 flex-1">
                  <div
                    className="w-2/5 bg-primary/70 rounded-t transition-all"
                    style={{ height: `${revenueHeight}%` }}
                    title={`Revenue: ${point.revenue}M`}
                  />
                  <div
                    className="w-2/5 bg-gray-200 rounded-t transition-all"
                    style={{ height: `${targetHeight}%` }}
                    title={`Target: ${point.target}M`}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{point.month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 bg-primary/70 rounded-sm" />
            <span className="text-[10px] text-gray-500">Revenue</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 bg-gray-200 rounded-sm" />
            <span className="text-[10px] text-gray-500">Target</span>
          </div>
        </div>
      </div>
    </div>
  );
}
