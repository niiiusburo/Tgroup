import { type LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * StatCardModule - Reusable stat card for dashboard metrics
 * @crossref:used-in[Overview, Reports, LocationDashboard]
 */

export interface StatCardData {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly change: string;
  readonly changeType: 'positive' | 'negative' | 'neutral';
  readonly icon: LucideIcon;
  readonly color: string;
}

interface StatCardModuleProps {
  readonly stats: readonly StatCardData[];
}

export function StatCardModule({ stats }: StatCardModuleProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="bg-white rounded-xl p-5 shadow-card hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {stat.label}
            </span>
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${stat.color}15` }}
            >
              <stat.icon className="w-4.5 h-4.5" style={{ color: stat.color }} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          <div className="flex items-center gap-1 mt-1.5">
            {stat.changeType === 'positive' && (
              <TrendingUp className="w-3.5 h-3.5 text-green-600" />
            )}
            {stat.changeType === 'negative' && (
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            )}
            <span
              className={`text-xs font-medium ${
                stat.changeType === 'positive'
                  ? 'text-green-600'
                  : stat.changeType === 'negative'
                    ? 'text-red-500'
                    : 'text-gray-500'
              }`}
            >
              {stat.change}
            </span>
            <span className="text-xs text-gray-400">vs last month</span>
          </div>
        </div>
      ))}
    </div>
  );
}
