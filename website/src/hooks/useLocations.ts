import { useState, useMemo, useCallback, useEffect } from 'react';
import { fetchCompanies, type ApiCompany } from '@/lib/api';
import { normalizeText } from '@/lib/utils';
import {
  type LocationBranch,
  type LocationMetrics,
  type LocationStatus,
} from '@/data/mockLocations';

/**
 * Hook for location/branch data and operations
 * Fetches from real API and maps ApiCompany to LocationBranch
 * @crossref:used-in[Locations, Customers, Employees, Appointments, Overview]
 */
export function useLocations() {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LocationStatus | 'all'>('all');
  const [allLocations, setAllLocations] = useState<LocationBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Map ApiCompany to LocationBranch
   * Extracts district from company name (e.g., "Tấm Dentist Quận 3" -> "Quận 3")
   */
  const mapApiCompanyToLocationBranch = useCallback((company: ApiCompany): LocationBranch => {
    // Extract district from name using pattern matching
    let district = '';
    const districtMatch = company.name.match(/(Quận \d+|TP\. \w+|\w+ \w+)/);
    if (districtMatch) {
      district = districtMatch[1];
    }

    const status: LocationStatus = company.active ? 'active' : 'closed';

    return {
      id: company.id,
      name: company.name,
      address: '',
      district,
      phone: company.phone || '',
      email: company.email || '',
      status,
      employeeCount: 0,
      customerCount: 0,
      monthlyRevenue: 0,
      monthlyTarget: 0,
      openingDate: company.datecreated ? company.datecreated.slice(0, 10) : '',
      operatingHours: '08:00 - 20:00',
      manager: '',
    };
  }, []);

  /**
   * Fetch locations from API
   */
  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchCompanies({ limit: 50 });
      const mapped = response.items.map((company) =>
        mapApiCompanyToLocationBranch(company)
      );
      setAllLocations(mapped);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load locations';
      setError(errorMessage);
      console.error('Error loading locations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [mapApiCompanyToLocationBranch]);

  /**
   * Load locations on mount
   */
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  /**
   * Filter locations based on search query and status filter
   */
  const locations = useMemo(() => {
    return allLocations.filter((loc) => {
      if (searchQuery) {
        const q = normalizeText(searchQuery);
        if (
          !normalizeText(loc.name).includes(q) &&
          !normalizeText(loc.district).includes(q) &&
          !normalizeText(loc.address).includes(q)
        ) {
          return false;
        }
      }
      if (statusFilter !== 'all' && loc.status !== statusFilter) return false;
      return true;
    });
  }, [searchQuery, statusFilter, allLocations]);

  /**
   * Get selected location by ID
   */
  const selectedLocation = useMemo(() => {
    if (!selectedLocationId) return null;
    return allLocations.find((l) => l.id === selectedLocationId) ?? null;
  }, [selectedLocationId, allLocations]);

  /**
   * Get location by ID
   */
  const getLocationById = useCallback(
    (id: string): LocationBranch | null => {
      return allLocations.find((l) => l.id === id) ?? null;
    },
    [allLocations]
  );

  /**
   * Get metrics for location - returns null since metrics not available from API
   */
  const getMetricsByLocationId = useCallback((_id: string): LocationMetrics | null => {
    return null;
  }, []);

  /**
   * Get all active locations
   */
  const getActiveLocations = useCallback((): LocationBranch[] => {
    return allLocations.filter((l) => l.status === 'active');
  }, [allLocations]);

  /**
   * Calculate total stats across all locations
   */
  const totalStats = useMemo(() => {
    const active = allLocations.filter((l) => l.status === 'active');
    return {
      totalBranches: allLocations.length,
      activeBranches: active.length,
      totalEmployees: active.reduce((sum, l) => sum + l.employeeCount, 0),
      totalCustomers: active.reduce((sum, l) => sum + l.customerCount, 0),
      totalRevenue: active.reduce((sum, l) => sum + l.monthlyRevenue, 0),
      totalTarget: active.reduce((sum, l) => sum + l.monthlyTarget, 0),
    };
  }, [allLocations]);

  /**
   * Update a location in the state
   */
  const updateLocation = useCallback((updatedLocation: LocationBranch) => {
    setAllLocations((prev) =>
      prev.map((loc) =>
        loc.id === updatedLocation.id ? updatedLocation : loc
      )
    );
  }, []);

  /**
   * Clear all filters
   */
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
    updateLocation,
    refetch: loadLocations,
    isLoading,
    error,
  } as const;
}

export type { LocationBranch, LocationMetrics, LocationStatus };
