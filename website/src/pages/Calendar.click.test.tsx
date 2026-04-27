import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { Calendar } from './Calendar';

// Mock API
vi.mock('@/lib/api', () => ({
  fetchAppointments: vi.fn().mockResolvedValue({
    items: [{
      id: 'apt-1',
      partnerid: 'cust-1',
      partnername: 'Nguyen Van A',
      partnerphone: '0901234567',
      doctorid: 'doc-1',
      doctorname: 'Dr. Le',
      companyid: 'loc-1',
      companyname: 'Main Clinic',
      name: 'Cleaning',
      date: '2026-04-27',
      time: '09:00',
      note: '',
      timeexpected: 30,
      color: '1',
      state: 'scheduled',
      productid: 'svc-1',
    }]
  }),
  updateAppointment: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/hooks/useSmartFilter', () => ({
  useSmartFilter: () => ({
    selected: [],
    setSelected: vi.fn(),
    toggle: vi.fn(),
    clear: vi.fn(),
  }),
}));
vi.mock('@/hooks/useDragReschedule', () => ({
  useDragReschedule: () => ({
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDrop: vi.fn(),
    handleDragEnd: vi.fn(),
  }),
}));
vi.mock('@/lib/exportAppointmentsXlsx', () => ({
  exportAppointmentsXlsx: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/components/appointments/unified/AppointmentFormShell', () => ({
  AppointmentFormShell: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="appointment-form-shell">Edit Form Open</div> : null,
}));

describe('Calendar — appointment click', () => {
  it('opens edit form when clicking an appointment card', async () => {
    renderWithProviders(<Calendar />);

    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
    
    // Wait for calendar data to load
    await waitFor(() => {
      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    });
    
    // Find and click an appointment card
    const cards = document.querySelectorAll('.cursor-pointer');
    expect(cards.length).toBeGreaterThan(0);
    fireEvent.click(cards[0]);
    
    // Edit form should appear
    await waitFor(() => {
      expect(screen.getByTestId('appointment-form-shell')).toBeInTheDocument();
    });
  });
});
