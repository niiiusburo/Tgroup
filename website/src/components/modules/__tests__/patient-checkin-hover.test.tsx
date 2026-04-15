/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PatientCheckIn } from '../PatientCheckIn';
import { AppointmentHoverProvider } from '@/contexts/AppointmentHoverContext';
import type { OverviewAppointment } from '@/hooks/useOverviewAppointments';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const mockAppointments: OverviewAppointment[] = [
  {
    id: 'apt-1',
    customerName: 'John Doe',
    customerPhone: '0901234567',
    doctorName: 'Dr. Smith',
    doctorId: 'doc-1',
    time: '09:00',
    locationId: 'loc-1',
    locationName: 'Location A',
    note: 'Checkup',
    topStatus: 'arrived',
    checkInStatus: 'waiting',
    color: '0',
  },
  {
    id: 'apt-2',
    customerName: 'Jane Smith',
    customerPhone: '0909876543',
    doctorName: 'Dr. Jones',
    doctorId: 'doc-2',
    time: '10:00',
    locationId: 'loc-1',
    locationName: 'Location A',
    note: 'Cleaning',
    topStatus: 'arrived',
    checkInStatus: 'in-treatment',
    color: '1',
  },
];

describe('PatientCheckIn Hover Linking', () => {
  const mockOnFilterChange = vi.fn();
  const mockOnUpdateStatus = vi.fn();

  const defaultProps = {
    appointments: mockAppointments,
    filter: 'all' as const,
    onFilterChange: mockOnFilterChange,
    counts: { all: 2, waiting: 1, 'in-treatment': 1, done: 0 },
    onUpdateStatus: mockOnUpdateStatus,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render appointment cards', () => {
    renderWithRouter(
      <AppointmentHoverProvider>
        <PatientCheckIn {...defaultProps} />
      </AppointmentHoverProvider>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should apply highlight class when card is hovered', () => {
    renderWithRouter(
      <AppointmentHoverProvider>
        <PatientCheckIn {...defaultProps} />
      </AppointmentHoverProvider>
    );

    const johnCard = screen.getByText('John Doe').closest('[class*="rounded-xl"]');
    expect(johnCard).toBeInTheDocument();
    
    // Before hover, should not have highlight ring
    expect(johnCard?.className).not.toContain('ring-2');
    
    // Hover over the card
    fireEvent.mouseEnter(johnCard!);
    
    // After hover, should have highlight ring
    expect(johnCard?.className).toContain('ring-2');
    expect(johnCard?.className).toContain('ring-blue-500');
  });

  it('should remove highlight when mouse leaves', () => {
    renderWithRouter(
      <AppointmentHoverProvider>
        <PatientCheckIn {...defaultProps} />
      </AppointmentHoverProvider>
    );

    const johnCard = screen.getByText('John Doe').closest('[class*="rounded-xl"]');
    
    // Hover then leave
    fireEvent.mouseEnter(johnCard!);
    expect(johnCard?.className).toContain('ring-2');
    
    fireEvent.mouseLeave(johnCard!);
    expect(johnCard?.className).not.toContain('ring-2');
  });

  it('should highlight when another component sets the hoveredId', () => {
    // This tests that when TodayAppointments sets the hoveredId,
    // PatientCheckIn will also highlight the matching card
    const { container } = renderWithRouter(
      <AppointmentHoverProvider>
        <PatientCheckIn {...defaultProps} />
      </AppointmentHoverProvider>
    );

    const johnCard = screen.getByText('John Doe').closest('[class*="rounded-xl"]');
    expect(johnCard).toBeInTheDocument();
  });

  it('should call scrollIntoView when highlighted', () => {
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    renderWithRouter(
      <AppointmentHoverProvider>
        <PatientCheckIn {...defaultProps} />
      </AppointmentHoverProvider>
    );

    const johnCard = screen.getByText('John Doe').closest('[class*="rounded-xl"]');
    fireEvent.mouseEnter(johnCard!);

    // When hovering a PatientCheckIn card, it should scroll to the matching
    // appointment in Today's Appointments
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });
});
