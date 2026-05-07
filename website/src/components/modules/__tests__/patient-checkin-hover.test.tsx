/**
 * @jest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PatientCheckIn } from '../PatientCheckIn';
import type { OverviewAppointment } from '@/hooks/useOverviewAppointments';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const mockAppointments: OverviewAppointment[] = [
  {
    id: 'apt-1',
    customerId: 'customer-1',
    customerName: 'John Doe',
    customerPhone: '0901234567',
    doctorName: 'Dr. Smith',
    doctorId: 'doc-1',
    date: '2026-05-07',
    time: '09:00',
    locationId: 'loc-1',
    locationName: 'Location A',
    note: 'Checkup',
    timeexpected: 30,
    topStatus: 'arrived',
    checkInStatus: 'waiting',
    color: '0',
    productId: null,
    arrivalTime: '08:55:00',
    treatmentStartTime: null,
    assistantId: null,
    assistantName: null,
    dentalAideId: null,
    dentalAideName: null,
  },
  {
    id: 'apt-2',
    customerId: 'customer-2',
    customerName: 'Jane Smith',
    customerPhone: '0909876543',
    doctorName: 'Dr. Jones',
    doctorId: 'doc-2',
    date: '2026-05-07',
    time: '10:00',
    locationId: 'loc-1',
    locationName: 'Location A',
    note: 'Cleaning',
    timeexpected: 30,
    topStatus: 'arrived',
    checkInStatus: 'in-treatment',
    color: '1',
    productId: null,
    arrivalTime: '09:55:00',
    treatmentStartTime: '10:00:00',
    assistantId: null,
    assistantName: null,
    dentalAideId: null,
    dentalAideName: null,
  },
];

describe('PatientCheckIn independent cards', () => {
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
    renderWithRouter(<PatientCheckIn {...defaultProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('does not apply cross-section highlight when a card is hovered', () => {
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    renderWithRouter(<PatientCheckIn {...defaultProps} />);

    const johnCard = screen.getByText('John Doe').closest('[class*="rounded-xl"]');
    expect(johnCard).toBeInTheDocument();
    
    expect(johnCard?.className).not.toContain('ring-2');
    
    fireEvent.mouseEnter(johnCard!);
    
    expect(johnCard?.className).not.toContain('ring-2');
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
