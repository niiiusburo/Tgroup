import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PatientCheckIn } from './PatientCheckIn';
import { AppointmentHoverProvider } from '@/contexts/AppointmentHoverContext';
import { MemoryRouter } from 'react-router-dom';

const scrollIntoViewMock = vi.fn();

// jsdom doesn't implement scrollIntoView on Element
Element.prototype.scrollIntoView = scrollIntoViewMock;

describe('PatientCheckIn auto-scroll on done', () => {
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
    fireEvent.click(screen.getByText('Chờ khám'));
    fireEvent.click(screen.getByText('Hoàn thành'));

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
