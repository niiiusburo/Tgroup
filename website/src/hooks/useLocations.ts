import { useState, useMemo, useCallback } from 'react';
import {
  MOCK_LOCATION_BRANCHES,
  MOCK_LOCATION_METRICS,
  type LocationBranch,
  type LocationMetrics,
  type LocationStatus,
} from '@/data/mockLocations';

/**
 * Hook for location/branch data and operations
 * @crossref:used-in[Locations, Customers, Employees, Appointments, Overview]
 */
export function useLocations() {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LocationStatus | 'all'>('all');

  const locations = useMemo(() => {
    return MOCK_LOCATION_BRANCHES.filter((loc) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !loc.name.toLowerCase().includes(q) &&
          !loc.district.toLowerCase().includes(q) &&
          !loc.address.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (statusFilter !== 'all' && loc.status !== statusFilter) return false;
      return true;
    });
  }, [searchQuery, statusFilter]);

  const allLocations = MOCK_LOCATION_BRANCHES;

  const selectedLocation = useMemo(() => {
    if (!selectedLocationId) return null;
    return MOCK_LOCATION_BRANCHES.find((l) => l.id === selectedLocationId) ?? null;
  }, [selectedLocationId]);

  const getLocationById = useCallback((id: string): LocationBranch | null => {
    return MOCK_LOCATION_BRANCHES.find((l) => l.id === id) ?? null;
  }, []);

  const getMetricsByLocationId = useCallback((id: string): LocationMetrics | null => {
    return MOCK_LOCATION_METRICS.find((m) => m.locationId === id) ?? null;
  }, []);

  const getActiveLocations = useCallback((): readonly LocationBranch[] => {
    return MOCK_LOCATION_BRANCHES.filter((l) => l.status === 'active');
  }, []);

  const totalStats = useMemo(() => {
    const active = MOCK_LOCATION_BRANCHES.filter((l) => l.status === 'active');
    return {
      totalBranches: MOCK_LOCATION_BRANCHES.length,
      activeBranches: active.length,
      totalEmployees: active.reduce((sum, l) => sum + l.employeeCount, 0),
      totalCustomers: active.reduce((sum, l) => sum + l.customerCount, 0),
      totalRevenue: active.reduce((sum, l) => sum + l.monthlyRevenue, 0),
      totalTarget: active.reduce((sum, l) => sum + l.monthlyTarget, 0),
    };
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
  }, []);

  return {
    locations,
    allLocations,
    selectedLocation,
    selectedLocationId,
    setSelectedLocationId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    getLocationById,
    getMetricsByLocationId,
    getActiveLocations,
    totalStats,
    clearFilters,
  } as const;
}

export type { LocationBranch, LocationMetrics, LocationStatus };
