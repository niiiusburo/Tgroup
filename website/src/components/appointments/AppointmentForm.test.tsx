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
    employees: [{ id: 'e1', name: 'Bác sĩ A', phone: '', email: '', avatar: '', tier: 'mid', roles: ['doctor'], status: 'active', locationId: 'l1', locationName: 'CN1', schedule: [], linkedEmployeeIds: [], hireDate: '' }],
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
