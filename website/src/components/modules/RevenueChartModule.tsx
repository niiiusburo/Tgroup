import { TrendingUp, TrendingDown } from 'lucide-react';
import type { RevenueDataPoint } from '@/types/common';

/**
 * RevenueChartModule - Revenue chart visualization using pure CSS bars
 * @crossref:used-in[Overview, Reports]
 */

interface RevenueChartModuleProps {
  readonly data: readonly RevenueDataPoint[];
  readonly title?: string;
}

export function RevenueChartModule({
  data,
  title = 'Revenue Overview',
}: RevenueChartModuleProps) {
  const maxValue = Math.max(...data.map((d) => Math.max(d.revenue, d.target)));
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalTarget = data.reduce((sum, d) => sum + d.target, 0);
  const growthPercent = totalTarget > 0
    ? ((totalRevenue - totalTarget) / totalTarget * 100).toFixed(1)
    : '0';
  const isPositiveGrowth = totalRevenue >= totalTarget;

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">Monthly revenue vs target (millions VND)</p>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${
          isPositiveGrowth
            ? 'bg-dental-green/10 text-dental-green'
            : 'bg-red-50 text-red-500'
        }`}>
          {isPositiveGrowth
            ? <TrendingUp className="w-4 h-4" />
            : <TrendingDown className="w-4 h-4" />
          }
          {growthPercent}%
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-48 mb-4">
        {data.map((point) => {
          const revenueHeight = maxValue > 0 ? (point.revenue / maxValue) * 100 : 0;
          const targetHeight = maxValue > 0 ? (point.target / maxValue) * 100 : 0;
          return (
            <div key={point.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center gap-0.5 h-40">
                <div
                  className="w-2/5 bg-primary/80 rounded-t transition-all duration-300"
                  style={{ height: `${revenueHeight}%` }}
                  title={`Revenue: ${point.revenue}M`}
                />
                <div
                  className="w-2/5 bg-gray-200 rounded-t transition-all duration-300"
                  style={{ height: `${targetHeight}%` }}
                  title={`Target: ${point.target}M`}
                />
              </div>
              <span className="text-xs text-gray-400">{point.month}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/80" />
          <span className="text-xs text-gray-500">Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-200" />
          <span className="text-xs text-gray-500">Target</span>
        </div>
        <div className="ml-auto text-sm text-gray-600 font-medium">
          Total: {totalRevenue}M VND
        </div>
      </div>
    </div>
  );
}
