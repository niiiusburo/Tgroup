import { MapPin } from 'lucide-react';

/**
 * Locations Page
 * @crossref:route[/locations]
 * @crossref:used-in[App]
 */
export function Locations() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
            <p className="text-sm text-gray-500">Manage clinic locations and facilities</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          Add Location
        </button>
      </div>

      {/* Placeholder locations list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="h-32 bg-gray-100" />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="h-6 bg-gray-200 rounded w-40 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-56" />
                </div>
                <div className="h-6 bg-gray-100 rounded w-20" />
              </div>
              <div className="flex gap-4 text-sm">
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="h-4 bg-gray-100 rounded w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
