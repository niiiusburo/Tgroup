import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppointmentForm } from './AppointmentForm';

// Mock hooks
vi.mock('@/hooks/useCustomers', () => ({
  useCustomers: () => ({
    customers: [{ id: 'c1', name: 'Nguyễn Văn A', phone: '0901111222', email: '', locationId: 'l1', status: 'active', lastVisit: '' }],
    loading: false,
    createCustomer: vi.fn().mockResolvedValue({ id: 'c2', name: 'Trần Văn B', phone: '0903333444' }),
  }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    employees: [{ id: 'e1', name: 'Bác sĩ A', phone: '', email: '', avatar: '', tierId: 'editor-id', tierName: 'Editor', roles: ['doctor'], status: 'active', locationId: 'l1', locationName: 'CN1', schedule: [], linkedEmployeeIds: [], hireDate: '' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({
    allLocations: [{ id: 'l1', name: 'Chi nhánh 1', address: '', phone: '', status: 'active' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useProducts', () => ({
  useProducts: () => ({
    products: [],
    isLoading: false,
  }),
}));

vi.mock('@/components/forms/AddCustomerForm/AddCustomerForm', () => ({
  AddCustomerForm: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="add-customer-form">
      <button onClick={onCancel}>Đóng form</button>
    </div>
  ),
}));

vi.mock('@/contexts/LocationContext', () => ({
  useLocationFilter: () => ({ selectedLocationId: 'all' }),
}));

describe('AppointmentForm [+] inline customer', () => {
  it('shows a [+] button next to the Khách hàng field', () => {
    render(<AppointmentForm onSubmit={() => {}} onClose={() => {}} />);

    // The [+] button should be visible with title/aria
    const addBtn = screen.getByTitle('Thêm khách hàng mới');
    expect(addBtn).toBeInTheDocument();
  });

  it('opens the inline AddCustomerForm modal when [+] is clicked', async () => {
    render(<AppointmentForm onSubmit={() => {}} onClose={() => {}} />);

    const addBtn = screen.getByTitle('Thêm khách hàng mới');
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByTestId('add-customer-form')).toBeInTheDocument();
    });
  });
});

describe('AppointmentForm defaults', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-13T10:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('populates today\'s date and current time when creating a new appointment', () => {
    render(<AppointmentForm onSubmit={() => {}} onClose={() => {}} />);

    // Date should be formatted as DD/MM/YYYY: 13/04/2026
    expect(screen.getByText('13/04/2026')).toBeInTheDocument();
    // Time should be exact current time: 10:30
    expect(screen.getByText('10:30')).toBeInTheDocument();
  });

  it('does not overwrite date/time when editing an existing appointment', () => {
    render(
      <AppointmentForm
        onSubmit={() => {}}
        onClose={() => {}}
        isEdit
        initialData={{
          date: '2025-12-25',
          startTime: '14:00',
          customerId: 'c1',
          customerName: 'Nguyễn Văn A',
          customerPhone: '0901111222',
        }}
      />,
    );

    expect(screen.getByText('25/12/2025')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
  });
});

describe('AppointmentForm location auto-populate', () => {
  it('auto-populates location from selected customer\'s profile', async () => {
    render(<AppointmentForm onSubmit={() => {}} onClose={() => {}} />);

    // Open customer selector
    const customerBtn = screen.getByText('Select customer...');
    fireEvent.click(customerBtn);

    // Select the mocked customer
    const customerOption = screen.getByText('Nguyễn Văn A');
    fireEvent.click(customerOption);

    // Location should auto-update to the customer's registered location
    await waitFor(() => {
      expect(screen.getByText('Chi nhánh 1')).toBeInTheDocument();
    });
  });
});
