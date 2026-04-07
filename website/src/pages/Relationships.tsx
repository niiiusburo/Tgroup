import { Network } from 'lucide-react';

/**
 * Relationships Page
 * @crossref:route[/relationships]
 * @crossref:used-in[App]
 */
export function Relationships() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Network className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relationships</h1>
          <p className="text-sm text-gray-500">Partner clinics and referrals</p>
        </div>
      </div>

      {/* Relationship stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Partner Clinics', 'Active Referrals', 'Collaborations'].map((label) => (
          <div key={label} className="bg-white rounded-xl p-6 shadow-card">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>

      {/* Placeholder relationships list */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-40" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400 text-xs">LOGO</span>
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
              <div className="h-6 bg-gray-100 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
