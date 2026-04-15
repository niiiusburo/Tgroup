import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { EditAppointmentModal } from '../EditAppointmentModal';

const mockOnClose = vi.fn();
const mockOnSaved = vi.fn();

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    employees: [
      { id: 'doc-1', name: 'Dr. A', phone: '', email: '', avatar: '', tierId: 'editor-id', tierName: 'Editor', roles: ['doctor'], status: 'active', locationId: 'loc-1', locationName: 'Clinic 1', schedule: [], linkedEmployeeIds: [], hireDate: '' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({
    allLocations: [
      { id: 'loc-1', name: 'Clinic 1', address: '123 St', phone: '', status: 'active' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/lib/api', () => ({
  updateAppointment: vi.fn().mockResolvedValue(undefined),
  fetchProducts: vi.fn().mockResolvedValue({ items: [
    { id: 'svc-1', name: 'Facial', saleprice: '100000', active: true },
  ] }),
}));

function makeAppointment(overrides = {}) {
  return {
    id: 'appt-1',
    customerId: 'cust-1',
    customerName: 'Alice',
    customerPhone: '0900000000',
    doctorId: 'doc-1',
    doctorName: 'Dr. A',
    locationId: 'loc-1',
    locationName: 'Clinic 1',
    date: '2026-04-13',
    time: '10:00',
    topStatus: 'scheduled',
    checkInStatus: null,
    color: '0',
    note: '',
    ...overrides,
  };
}

describe('EditAppointmentModal notes behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should NOT show structured metadata inside the notes textarea', async () => {
    // RED: notes textarea currently contains the full raw note including Duration/Type lines
    const note = 'Service: Facial\nDuration: 30 min\nType: Khách mới\nwdawdadW';
    render(
      <EditAppointmentModal
        appointment={makeAppointment({ note })}
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />
    );

    const textarea = await screen.findByPlaceholderText('form.notes') as HTMLTextAreaElement;

    // The textarea should only contain the free-text part
    expect(textarea.value).toBe('wdawdadW');
    expect(textarea.value).not.toContain('Duration:');
    expect(textarea.value).not.toContain('Type:');
    expect(textarea.value).not.toContain('Service:');
  });

  it('should preserve free-text notes when there is no structured metadata', async () => {
    const note = 'Just some free text';
    render(
      <EditAppointmentModal
        appointment={makeAppointment({ note })}
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />
    );

    const textarea = await screen.findByPlaceholderText('form.notes') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Just some free text');
  });

  it('should rebuild the full note with metadata on save', async () => {
    const { updateAppointment } = await import('@/lib/api');
    const note = 'Service: Facial\nDuration: 30 min\nType: Khách mới\nwdawdadW';
    render(
      <EditAppointmentModal
        appointment={makeAppointment({ note })}
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />
    );

    // Wait for form to load and service catalog to resolve
    await screen.findByPlaceholderText('form.notes');
    await waitFor(() => expect(screen.getByText('Lưu thay đổi')).not.toBeDisabled());

    fireEvent.click(screen.getByText('Lưu thay đổi'));

    await waitFor(() => {
      expect(updateAppointment).toHaveBeenCalledWith(
        'appt-1',
        expect.objectContaining({
          note: 'Service: Facial\nDuration: 30 min\nType: Khách mới\nwdawdadW',
        })
      );
    });
  });
});
