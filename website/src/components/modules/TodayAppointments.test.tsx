import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppointmentHoverProvider } from '@/contexts/AppointmentHoverContext';
import type { OverviewAppointment } from '@/hooks/useOverviewAppointments';
import { TodayAppointments } from './TodayAppointments';

vi.mock('@/components/appointments/unified', () => ({
  AppointmentFormShell: () => null,
  overviewAppointmentToFormData: vi.fn(),
}));

const makeAppointment = (index: number): OverviewAppointment => ({
  id: `appointment-${index}`,
  customerId: `customer-${index}`,
  customerName: `Patient ${index}`,
  customerPhone: `0900000${index}`,
  doctorName: `Doctor ${index}`,
  doctorId: `doctor-${index}`,
  date: '2026-04-28',
  time: '09:00',
  locationId: 'location-1',
  locationName: 'Clinic',
  note: '',
  timeexpected: 30,
  topStatus: 'scheduled',
  checkInStatus: null,
  color: '0',
  productId: null,
  arrivalTime: null,
  treatmentStartTime: null,
  assistantId: null,
  assistantName: null,
  dentalAideId: null,
  dentalAideName: null,
});

describe('TodayAppointments bounded layout', () => {
  it('keeps a long appointment list inside a scrollable panel', () => {
    render(
      <MemoryRouter>
        <AppointmentHoverProvider>
          <TodayAppointments
            appointments={Array.from({ length: 40 }, (_, index) => makeAppointment(index))}
            filter="all"
            onFilterChange={vi.fn()}
            counts={{ all: 40, arrived: 0, cancelled: 0 }}
            onMarkArrived={vi.fn()}
            onMarkCancelled={vi.fn()}
          />
        </AppointmentHoverProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('today-appointments-panel')).toHaveClass(
      'h-full',
      'min-h-0',
      'max-h-[calc(100vh-8rem)]',
      'overflow-hidden',
    );
    expect(screen.getByTestId('today-appointments-list')).toHaveClass(
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
      'overscroll-contain',
    );
  });
});
