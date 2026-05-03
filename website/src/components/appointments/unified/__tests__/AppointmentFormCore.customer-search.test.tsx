import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { AppointmentFormCore } from '../AppointmentFormCore';
import type { UnifiedAppointmentFormData } from '../appointmentForm.types';

const mockFetchPartners = vi.fn();
const mockCreateCustomer = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchPartners: (...args: unknown[]) => mockFetchPartners(...args),
}));

vi.mock('@/hooks/useCustomers', () => ({
  MIN_SEARCH_LENGTH: 3,
  useCustomers: () => ({
    customers: [{
      id: 'local-customer',
      name: 'Local Customer',
      phone: '0901000000',
      email: '',
      locationId: 'branch-id',
      status: 'active',
      lastVisit: '2026-04-29',
    }],
    createCustomer: mockCreateCustomer,
    loading: false,
  }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({ employees: [], isLoading: false }),
}));

vi.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({
    allLocations: [{ id: 'branch-id', name: 'Tâm Dentist Quận 3' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useProducts', () => ({
  useProducts: () => ({ products: [], isLoading: false }),
}));

vi.mock('@/contexts/LocationContext', () => ({
  useLocationFilter: () => ({ selectedLocationId: 'branch-id' }),
}));

function makeData(): UnifiedAppointmentFormData {
  return {
    customerId: '',
    customerName: '',
    customerPhone: '',
    locationId: 'branch-id',
    locationName: 'Tâm Dentist Quận 3',
    appointmentType: 'consultation',
    serviceName: '',
    date: '2026-04-29',
    startTime: '09:00',
    notes: '',
    estimatedDuration: 30,
  };
}

function renderForm() {
  return render(
    <TimezoneProvider>
      <AppointmentFormCore
        mode="create"
        data={makeData()}
        onChange={vi.fn()}
        errors={{}}
      />
    </TimezoneProvider>,
  );
}

describe('AppointmentFormCore customer search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finds customers outside the initial preload when typing a 5 digit phone search', async () => {
    mockFetchPartners.mockResolvedValue({
      items: [{
        id: 'remote-customer',
        name: 'Remote Calendar Customer',
        phone: '0984896556',
        email: null,
        companyid: 'branch-id',
        status: true,
        lastupdated: '2026-04-29',
      }],
      totalItems: 1,
    });

    renderForm();

    fireEvent.click(screen.getByText('appointments:form.selectCustomer'));
    fireEvent.change(screen.getByPlaceholderText('Tìm theo tên, SĐT, email...'), {
      target: { value: '09848' },
    });

    await waitFor(() => {
      expect(mockFetchPartners).toHaveBeenCalledWith(
        expect.objectContaining({ search: '09848', limit: 20 }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Remote Calendar Customer')).toBeInTheDocument();
    });
  });
});
