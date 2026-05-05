import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock all child components and hooks so we only test Overview wiring
vi.mock('@/components/modules/PatientCheckIn', () => ({
  PatientCheckIn: (props: any) => (
    <div data-testid="patient-checkin">
      {props.onSearchChange && (
        <input
          data-testid="zone1-search"
          value={props.searchTerm || ''}
          onChange={(e) => props.onSearchChange?.(e.target.value)}
        />
      )}
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
      {props.onSearchChange && (
        <input
          data-testid="zone3-search"
          value={props.searchTerm || ''}
          onChange={(e) => props.onSearchChange?.(e.target.value)}
        />
      )}
    </div>
  ),
}));
vi.mock('@/components/modules/EditAppointmentModal', () => ({
  EditAppointmentModal: () => null,
}));
vi.mock('@/components/shared/QuickAddAppointmentButton', () => ({
  QuickAddAppointmentButton: () => <button>+ Lịch hẹn</button>,
}));

const setZone3Filter = vi.fn();
const setZone1Filter = vi.fn();
const setZone3Search = vi.fn();
const setZone1Search = vi.fn();

const overviewAppointments = [
  {
    id: 'apt-1',
    customerId: 'customer-1',
    customerName: 'Jane Nguyen',
    customerPhone: '0901111222',
    doctorName: 'Dr. Linh',
    doctorId: 'doctor-1',
    date: '2026-05-05',
    time: '09:00',
    locationId: 'location-1',
    locationName: 'District 1',
    note: 'Cleaning',
    timeexpected: 30,
    topStatus: 'scheduled',
    checkInStatus: null,
    color: null,
    productId: null,
    arrivalTime: null,
    treatmentStartTime: null,
    assistantId: null,
    assistantName: null,
    dentalAideId: null,
    dentalAideName: null,
  },
  {
    id: 'apt-2',
    customerId: 'customer-2',
    customerName: 'Minh Tran',
    customerPhone: '0903333444',
    doctorName: 'Dr. Hoa',
    doctorId: 'doctor-2',
    date: '2026-05-05',
    time: '10:00',
    locationId: 'location-2',
    locationName: 'District 3',
    note: 'Whitening',
    timeexpected: 45,
    topStatus: 'arrived',
    checkInStatus: 'waiting',
    color: null,
    productId: null,
    arrivalTime: '09:50:00',
    treatmentStartTime: null,
    assistantId: null,
    assistantName: null,
    dentalAideId: null,
    dentalAideName: null,
  },
] as const;

vi.mock('@/hooks/useOverviewAppointments', () => ({
  useOverviewAppointments: () => ({
    appointments: overviewAppointments,
    isLoading: false,
    refresh: vi.fn(),
    zone3Filter: 'all',
    setZone3Filter,
    zone3Appointments: overviewAppointments,
    zone3Counts: { all: 0, arrived: 0, cancelled: 0 },
    zone3Search: '',
    setZone3Search,
    markArrived: vi.fn(),
    markCancelled: vi.fn(),
    zone1Filter: 'all',
    setZone1Filter,
    zone1Appointments: overviewAppointments.filter((appointment) => appointment.topStatus === 'arrived'),
    zone1Counts: { all: 0, waiting: 0, 'in-treatment': 0, done: 0 },
    zone1Search: '',
    setZone1Search,
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('renders the sticky appointment search above the overview zones', () => {
    render(<Overview />);

    expect(screen.getByTestId('overview-sticky-search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('stickySearch.placeholder')).toBeInTheDocument();
    expect(screen.getByTestId('zone2-search')).toBeInTheDocument();
    expect(screen.queryByTestId('zone1-search')).not.toBeInTheDocument();
    expect(screen.queryByTestId('zone3-search')).not.toBeInTheDocument();
  });

  it('uses the sticky search to filter both appointment overview zones', async () => {
    render(<Overview />);

    fireEvent.change(
      screen.getByPlaceholderText('stickySearch.placeholder'),
      { target: { value: 'Minh' } },
    );

    await waitFor(() => {
      expect(setZone3Search).toHaveBeenCalledWith('Minh');
      expect(setZone1Search).toHaveBeenCalledWith('Minh');
      expect(setZone3Filter).toHaveBeenCalledWith('all');
      expect(setZone1Filter).toHaveBeenCalledWith('all');
    });
    expect(screen.queryByText(/10:00 · Minh Tran/)).not.toBeInTheDocument();
  });
});
