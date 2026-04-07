import { useState } from 'react';
import { MapPin, Plus, Search, Building2 } from 'lucide-react';
import { LocationCard } from '@/components/locations/LocationCard';
import { LocationDetail } from '@/components/locations/LocationDetail';
import { useLocations } from '@/hooks/useLocations';
import { STATUS_LABELS, type LocationStatus } from '@/data/mockLocations';

/**
 * Locations Page - Manage clinic branches with grid, detail view, and dashboard
 * @crossref:route[/locations]
 * @crossref:used-in[App]
 * @crossref:uses[LocationCard, LocationDetail, LocationDashboard, useLocations]
 */
export function Locations() {
  const {
    locations,
    selectedLocation,
    setSelectedLocationId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    getMetricsByLocationId,
    totalStats,
    clearFilters,
  } = useLocations();

  const [showAddForm, setShowAddForm] = useState(false);

  // Detail view when a location is selected
  if (selectedLocation) {
    const metrics = getMetricsByLocationId(selectedLocation.id);
    return (
      <LocationDetail
        location={selectedLocation}
        metrics={metrics}
        onBack={() => setSelectedLocationId(null)}
      />
    );
  }

  const statusOptions: readonly (LocationStatus | 'all')[] = ['all', 'active', 'renovation', 'closed'];

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
            <p className="text-sm text-gray-500">Manage clinic locations and branches</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {/* Summary stats */}
      {/* @crossref:uses[useLocations.totalStats] */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Total Branches</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalStats.totalBranches}</p>
          <p className="text-xs text-green-600 mt-0.5">{totalStats.activeBranches} active</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Staff</p>
          <p className="text-2xl font-bold text-gray-900">{totalStats.totalEmployees}</p>
          <p className="text-xs text-gray-400 mt-0.5">Across all branches</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Customers</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalStats.totalCustomers.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Registered patients</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Monthly Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{totalStats.totalRevenue}M</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Target: {totalStats.totalTarget}M VND
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, district, or address..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-card"
          />
        </div>
        <div className="flex items-center gap-2">
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? 'All' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        {(searchQuery || statusFilter !== 'all') && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Location cards grid */}
      {/* @crossref:uses[LocationCard] */}
      {locations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No locations found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onSelect={setSelectedLocationId}
            />
          ))}
        </div>
      )}

      {/* Add Location Modal placeholder */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Location</h2>
            <p className="text-sm text-gray-500 mb-6">
              Location creation form will be implemented in a future update.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
