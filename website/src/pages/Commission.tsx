/**
 * Commission Page — Placeholder for commission management
 * @crossref:route[/commission]
 * @crossref:used-in[App, Employees, Reports]
 */

import { Percent, Users, BarChart3 } from 'lucide-react';

export function Commission() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Percent className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Commission</h1>
            <p className="text-sm text-gray-500">Track and manage employee commissions</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm">
          Configure Rules
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Commissions (MTD)', value: '₫12,450,000', icon: Percent, color: '#EC4899' },
          { label: 'Eligible Employees', value: '14', icon: Users, color: '#10B981' },
          { label: 'Avg. Commission Rate', value: '8.5%', icon: BarChart3, color: '#8B5CF6' },
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
          </div>
        ))}
      </div>

      {/* Placeholder table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Commission Records</h3>
          <span className="text-xs text-gray-400">Coming soon</span>
        </div>
        <div className="p-12 text-center">
          <Percent className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-medium">Commission tracking coming soon</p>
          <p className="text-sm text-gray-400 mt-1">
            Automated commission calculation based on service revenue and employee roles
          </p>
        </div>
      </div>
    </div>
  );
}
