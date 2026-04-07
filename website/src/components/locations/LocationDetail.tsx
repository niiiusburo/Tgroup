import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Clock,
  User,
  Users,
  Calendar,
} from 'lucide-react';
import {
  STATUS_LABELS,
  STATUS_STYLES,
  type LocationBranch,
  type LocationMetrics,
} from '@/data/mockLocations';
import { LocationDashboard } from './LocationDashboard';

/**
 * Location Detail - full branch view with employees, stats, revenue
 * @crossref:used-in[Locations]
 * @crossref:uses[LocationDashboard]
 */

interface LocationDetailProps {
  readonly location: LocationBranch;
  readonly metrics: LocationMetrics | null;
  readonly onBack: () => void;
}

export function LocationDetail({ location, metrics, onBack }: LocationDetailProps) {
  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[location.status]}`}
                >
                  {STATUS_LABELS[location.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500">{location.address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Phone className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Phone</p>
            <p className="text-sm font-medium text-gray-900">{location.phone}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <Mail className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-900">{location.email}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Operating Hours</p>
            <p className="text-sm font-medium text-gray-900">{location.operatingHours}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <User className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Manager</p>
            <p className="text-sm font-medium text-gray-900">{location.manager}</p>
          </div>
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Employees</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{location.employeeCount}</p>
          <p className="text-xs text-gray-400 mt-1">Active staff members</p>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Customers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {location.customerCount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">Total registered patients</p>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Since</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{location.openingDate}</p>
          <p className="text-xs text-gray-400 mt-1">Opening date</p>
        </div>
      </div>

      {/* Branch metrics dashboard */}
      {/* @crossref:uses[LocationDashboard] */}
      {metrics && <LocationDashboard metrics={metrics} />}
    </div>
  );
}
