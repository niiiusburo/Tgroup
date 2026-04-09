/**
 * Location-related type definitions
 * @crossref:used-in[useLocations, Locations, LocationCard, LocationDetail, LocationDashboard]
 */

export type LocationStatus = 'active' | 'renovation' | 'closed';

export interface LocationBranch {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly district: string;
  readonly phone: string;
  readonly email: string;
  readonly status: LocationStatus;
  readonly employeeCount: number;
  readonly customerCount: number;
  readonly monthlyRevenue: number;
  readonly monthlyTarget: number;
  readonly openingDate: string;
  readonly operatingHours: string;
  readonly manager: string;
}

export interface LocationRevenuePoint {
  readonly month: string;
  readonly revenue: number;
  readonly target: number;
}

export interface LocationMetrics {
  readonly locationId: string;
  readonly appointmentsToday: number;
  readonly appointmentsThisWeek: number;
  readonly newCustomersThisMonth: number;
  readonly averageRating: number;
  readonly occupancyRate: number;
  readonly revenueData: readonly LocationRevenuePoint[];
}

export const STATUS_LABELS: Record<LocationStatus, string> = {
  active: 'Active',
  renovation: 'Renovation',
  closed: 'Closed',
};

export const STATUS_STYLES: Record<LocationStatus, string> = {
  active: 'bg-green-100 text-green-700',
  renovation: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-100 text-gray-500',
};
