import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock all child components and hooks so we only test Overview wiring
vi.mock('@/components/modules/PatientCheckIn', () => ({
  PatientCheckIn: (props: any) => (
    <div data-testid="patient-checkin">
      <input
        data-testid="zone1-search"
        value={props.searchTerm || ''}
        onChange={(e) => props.onSearchChange?.(e.target.value)}
      />
    </div>
  ),
}));
vi.mock('@/components/modules/TodayServicesTable', () => ({
  TodayServicesTable: () => (
    <div data-testid="today-services">
      <input data-testid="zone2-search" placeholder="Tìm nhanh dịch vụ..." />
    </div>
  ),
}));
vi.mock('@/components/modules/TodayAppointments', () => ({
  TodayAppointments: (props: any) => (
    <div data-testid="today-appointments">
      <input
        data-testid="zone3-search"
        value={props.searchTerm || ''}
        onChange={(e) => props.onSearchChange?.(e.target.value)}
      />
    </div>
  ),
}));
vi.mock('@/components/modules/EditAppointmentModal', () => ({
  EditAppointmentModal: () => null,
}));
vi.mock('@/components/shared/QuickAddAppointmentButton', () => ({
  QuickAddAppointmentButton: () => <button>+ Lịch hẹn</button>,
}));

vi.mock('@/hooks/useOverviewAppointments', () => ({
  useOverviewAppointments: () => ({
    isLoading: false,
    refresh: vi.fn(),
    zone3Filter: 'all',
    setZone3Filter: vi.fn(),
    zone3Appointments: [],
    zone3Counts: { all: 0, arrived: 0, cancelled: 0 },
    zone3Search: '',
    setZone3Search: vi.fn(),
    markArrived: vi.fn(),
    markCancelled: vi.fn(),
    zone1Filter: 'all',
    setZone1Filter: vi.fn(),
    zone1Appointments: [],
    zone1Counts: { all: 0, waiting: 0, 'in-treatment': 0, done: 0 },
    zone1Search: '',
    setZone1Search: vi.fn(),
    updateCheckInStatus: vi.fn(),
  }),
}));

vi.mock('@/contexts/LocationContext', () => ({
  useLocationFilter: () => ({ selectedLocationId: 'all' }),
}));
vi.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({ getLocationById: () => null }),
}));

import { Overview } from './Overview';

describe('Overview search boxes', () => {
  it('renders 3 quick search boxes in correct zones', () => {
    render(<Overview />);

    expect(screen.getByTestId('zone1-search')).toBeInTheDocument();
    expect(screen.getByTestId('zone2-search')).toBeInTheDocument();
    expect(screen.getByTestId('zone3-search')).toBeInTheDocument();
  });
});
