import { MapPin, Users, Phone, Clock } from 'lucide-react';
import {
  STATUS_LABELS,
  STATUS_STYLES,
  type LocationBranch,
} from '@/data/mockLocations';

/**
 * Location Card - displays branch summary in grid
 * @crossref:used-in[Locations, OverviewFilter, CustomerForm]
 */

interface LocationCardProps {
  readonly location: LocationBranch;
  readonly onSelect: (id: string) => void;
}

export function LocationCard({ location, onSelect }: LocationCardProps) {
  const revenuePercent =
    location.monthlyTarget > 0
      ? Math.round((location.monthlyRevenue / location.monthlyTarget) * 100)
      : 0;

  return (
    <div
      onClick={() => onSelect(location.id)}
      className="bg-white rounded-xl shadow-card overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
    >
      {/* Header bar with status color */}
      <div
        className={`h-2 ${
          location.status === 'active'
            ? 'bg-green-500'
            : location.status === 'renovation'
              ? 'bg-yellow-500'
              : 'bg-gray-400'
        }`}
      />

      <div className="p-5">
        {/* Name and status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">
                {location.name}
              </h3>
              <p className="text-xs text-gray-500">{location.district}</p>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[location.status]}`}
          >
            {STATUS_LABELS[location.status]}
          </span>
        </div>

        {/* Address */}
        <p className="text-xs text-gray-500 mb-4 line-clamp-2">{location.address}</p>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-600">
              <span className="font-medium">{location.employeeCount}</span> staff
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-600 truncate">{location.phone}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-600 truncate">{location.operatingHours}</span>
          </div>
        </div>

        {/* Revenue bar */}
        {location.status === 'active' && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">Monthly Revenue</span>
              <span className="font-medium text-gray-700">
                {location.monthlyRevenue}M / {location.monthlyTarget}M VND
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  revenuePercent >= 90
                    ? 'bg-green-500'
                    : revenuePercent >= 70
                      ? 'bg-blue-500'
                      : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(revenuePercent, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
