/**
 * Reports Page — Placeholder for reporting and analytics
 * @crossref:route[/reports]
 * @crossref:used-in[App]
 * @crossref:uses[RevenueChart, DataTable, StatCard]
 */

import { BarChart3, TrendingUp, DollarSign, Calendar } from 'lucide-react';

export function Reports() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500">Analytics and business insights</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm">
          Export Data
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Revenue (MTD)', value: '₫156,800,000', change: '+12%', icon: DollarSign, color: '#10B981' },
          { label: 'Appointments', value: '342', change: '+8%', icon: Calendar, color: '#0EA5E9' },
          { label: 'New Customers', value: '28', change: '+15%', icon: TrendingUp, color: '#8B5CF6' },
          { label: 'Avg. Revenue/Visit', value: '₫458,000', change: '+3%', icon: BarChart3, color: '#F97316' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium text-gray-500">{stat.label}</div>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-green-600 font-medium mt-1">{stat.change} vs last month</div>
          </div>
        ))}
      </div>

      {/* Placeholder chart area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="font-medium text-gray-900 mb-4">Revenue Trend</h3>
          <div className="h-48 flex items-end gap-2 px-2">
            {[65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 92].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary/80 transition-all"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[9px] text-gray-400">
                  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="font-medium text-gray-900 mb-4">Service Breakdown</h3>
          <div className="space-y-3">
            {[
              { name: 'Teeth Cleaning', pct: 35, color: '#0EA5E9' },
              { name: 'Fillings', pct: 25, color: '#8B5CF6' },
              { name: 'Whitening', pct: 20, color: '#F97316' },
              { name: 'Orthodontics', pct: 12, color: '#10B981' },
              { name: 'Other', pct: 8, color: '#6B7280' },
            ].map((svc) => (
              <div key={svc.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-24 shrink-0">{svc.name}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${svc.pct}%`, backgroundColor: svc.color }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500 w-8 text-right">
                  {svc.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Placeholder data table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Detailed Reports</h3>
          <span className="text-xs text-gray-400">Coming soon</span>
        </div>
        <div className="p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-medium">Advanced reporting coming soon</p>
          <p className="text-sm text-gray-400 mt-1">
            Customizable reports with date ranges, filters, and export capabilities
          </p>
        </div>
      </div>
    </div>
  );
}
