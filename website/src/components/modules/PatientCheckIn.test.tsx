import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PatientCheckIn, parseAppointmentNote } from './PatientCheckIn';
import { AppointmentHoverProvider } from '@/contexts/AppointmentHoverContext';
import { MemoryRouter } from 'react-router-dom';

const scrollIntoViewMock = vi.fn();

// jsdom doesn't implement scrollIntoView on Element
Element.prototype.scrollIntoView = scrollIntoViewMock;

describe('PatientCheckIn auto-scroll on done', () => {
  it('caps the visible patient grid to two rows and scrolls the remaining cards', () => {
    const appointments = Array.from({ length: 12 }, (_, index) => ({
      id: `apt-${index}`,
      customerId: `c${index}`,
      customerName: `Patient ${index}`,
      customerPhone: '0901111222',
      doctorName: 'Bác sĩ X',
      doctorId: 'd1',
      time: '09:00',
      locationId: 'l1',
      locationName: 'CN1',
      note: 'Khám răng',
      topStatus: 'arrived' as const,
      checkInStatus: 'waiting' as const,
      color: null,
      arrivalTime: '09:00',
      treatmentStartTime: null,
    }));

    render(
      <MemoryRouter>
        <AppointmentHoverProvider>
          <PatientCheckIn
            appointments={appointments}
            filter="all"
            onFilterChange={() => {}}
            counts={{ all: 12, waiting: 12, 'in-treatment': 0, done: 0 }}
            onUpdateStatus={vi.fn()}
          />
        </AppointmentHoverProvider>
      </MemoryRouter>
    );

    const scrollRegion = screen.getByTestId('patient-checkin-scroll-region');
    expect(scrollRegion).toHaveClass('max-h-[24rem]', 'overflow-y-auto');
  });

  it('scrolls the completed card into view when status changes to done', async () => {
    const onUpdateStatus = vi.fn((_id, _status, onSuccess) => {
      onSuccess?.();
    });

    const appointments = [
      {
        id: 'apt-1',
        customerId: 'c1',
        customerName: 'Nguyễn Văn A',
        customerPhone: '0901111222',
        doctorName: 'Bác sĩ X',
        doctorId: 'd1',
        time: '09:00',
        locationId: 'l1',
        locationName: 'CN1',
        note: 'Khám răng',
        topStatus: 'arrived' as const,
        checkInStatus: 'waiting' as const,
        color: null,
        arrivalTime: '09:00',
        treatmentStartTime: null,
      },
    ];

    const { rerender } = render(
      <MemoryRouter>
        <AppointmentHoverProvider>
          <PatientCheckIn
            appointments={appointments}
            filter="all"
            onFilterChange={() => {}}
            counts={{ all: 1, waiting: 1, 'in-treatment': 0, done: 0 }}
            onUpdateStatus={onUpdateStatus}
          />
        </AppointmentHoverProvider>
      </MemoryRouter>
    );

    scrollIntoViewMock.mockClear();

    // Open the status dropdown on the card
    fireEvent.click(screen.getByText('overview:zone1.filterWaiting'));
    fireEvent.click(screen.getByText('overview:zone1.filterCompleted'));

    // Simulate the parent re-rendering with the updated appointment status
    rerender(
      <MemoryRouter>
        <AppointmentHoverProvider>
          <PatientCheckIn
            appointments={[
              { ...appointments[0], checkInStatus: 'done' as const },
            ]}
            filter="all"
            onFilterChange={() => {}}
            counts={{ all: 1, waiting: 0, 'in-treatment': 0, done: 1 }}
            onUpdateStatus={onUpdateStatus}
          />
        </AppointmentHoverProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: 'smooth', block: 'center' })
      );
    });
  });
});

describe('PatientCheckIn note parsing', () => {
  it('extracts duration, type, and free text from structured note', () => {
    const note = 'Service: Facial\nDuration: 30 min\nType: Khách tái khám\nwdawdadW';
    const parsed = parseAppointmentNote(note);
    expect(parsed.duration).toBe('30 min');
    expect(parsed.type).toBe('Khách tái khám');
    expect(parsed.freeText).toBe('wdawdadW');
  });

  it('returns all free text when there is no structured metadata', () => {
    const note = 'Just some free text';
    const parsed = parseAppointmentNote(note);
    expect(parsed.duration).toBe('');
    expect(parsed.type).toBe('');
    expect(parsed.freeText).toBe('Just some free text');
  });

  it('renders duration and type as pills and free text in a notes box', () => {
    const appointments = [
      {
        id: 'apt-1',
        customerId: 'c1',
        customerName: 'Nguyễn Văn A',
        customerPhone: '0901111222',
        doctorName: 'Bác sĩ X',
        doctorId: 'd1',
        time: '09:00',
        locationId: 'l1',
        locationName: 'CN1',
        note: 'Duration: 45 min\nType: Khách mới\nUống thuốc trước khi đến',
        topStatus: 'arrived' as const,
        checkInStatus: 'waiting' as const,
        color: null,
        arrivalTime: '09:00',
        treatmentStartTime: null,
      },
    ];

    render(
      <MemoryRouter>
        <AppointmentHoverProvider>
          <PatientCheckIn
            appointments={appointments}
            filter="all"
            onFilterChange={() => {}}
            counts={{ all: 1, waiting: 1, 'in-treatment': 0, done: 0 }}
            onUpdateStatus={vi.fn()}
          />
        </AppointmentHoverProvider>
      </MemoryRouter>
    );

    // Pills should be visible
    expect(screen.getByText('45 min')).toBeInTheDocument();
    expect(screen.getByText('Khách mới')).toBeInTheDocument();

    // Raw metadata lines should NOT appear in the document
    expect(screen.queryByText(/Duration: 45 min/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Type: Khách mới/)).not.toBeInTheDocument();

    // Free text should appear inside the notes box
    expect(screen.getByText('Uống thuốc trước khi đến')).toBeInTheDocument();
  });
});
