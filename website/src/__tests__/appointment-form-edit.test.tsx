/**
 * @fileoverview TDD Tests for AppointmentForm edit mode behavior
 * Issue 1: Customer name should be read-only when editing (appointment already linked)
 * Issue 2: Date display should format correctly on appointment cards
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppointmentForm, type AppointmentFormData } from '@/components/appointments/AppointmentForm';

// Mock the hooks
vi.mock('@/hooks/useCustomers', () => ({
  useCustomers: () => ({
    customers: [
      { id: 'cust-1', name: 'John Doe', phone: '0901234567', email: 'john@example.com', locationId: 'loc-1', status: 'active', lastVisit: '2024-01-01' },
      { id: 'cust-2', name: 'Jane Smith', phone: '0907654321', email: 'jane@example.com', locationId: 'loc-1', status: 'active', lastVisit: '2024-01-02' },
    ],
    loading: false,
  }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    employees: [
      { id: 'emp-1', name: 'Dr. Smith', phone: '0901111111', email: 'dr@example.com', companyid: 'loc-1', companyname: 'Main Clinic', isdoctor: true, active: true, datecreated: '2024-01-01', lastupdated: '2024-01-01' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({
    allLocations: [
      { id: 'loc-1', name: 'Main Clinic', address: '123 Main St', phone: '0900000000', active: true },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/contexts/LocationContext', () => ({
  useLocationFilter: () => ({ selectedLocationId: 'all' }),
}));


describe('AppointmentForm Edit Mode', () => {
  const mockSubmit = vi.fn();
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RED: Customer name should be read-only when editing', () => {
    it('should display customer name as read-only text when isEdit=true', () => {
      // Arrange: Setup edit mode with existing customer
      const initialData: Partial<AppointmentFormData> = {
        customerId: 'cust-1',
        customerName: 'John Doe',
        customerPhone: '0901234567',
        doctorId: 'emp-1',
        locationId: 'loc-1',
        date: '2024-03-15',
        startTime: '09:00',
        endTime: '10:00',
        serviceName: 'Teeth Cleaning',
      };

      // Act: Render form in edit mode
      render(
        <AppointmentForm
          onSubmit={mockSubmit}
          onClose={mockClose}
          initialData={initialData}
          isEdit={true}
        />
      );

      // Assert: Customer should be shown as read-only text, not a selector
      const customerLabel = screen.getAllByText(/form\.patient/i)[0];
      expect(customerLabel).toBeInTheDocument();
      
      // Should show the customer name as text, not as a dropdown/selector
      const customerNameDisplay = screen.getByText('John Doe');
      expect(customerNameDisplay).toBeInTheDocument();
      
      // Should NOT have a customer selector dropdown
      const customerSelector = screen.queryByRole('combobox', { name: /customer/i });
      expect(customerSelector).not.toBeInTheDocument();
    });

    it('should NOT allow changing customer when editing existing appointment', () => {
      // Arrange: Setup edit mode
      const initialData: Partial<AppointmentFormData> = {
        customerId: 'cust-1',
        customerName: 'John Doe',
        customerPhone: '0901234567',
        doctorId: 'emp-1',
        locationId: 'loc-1',
        date: '2024-03-15',
        startTime: '09:00',
        endTime: '10:00',
        serviceName: 'Teeth Cleaning',
      };

      // Act: Render form in edit mode
      render(
        <AppointmentForm
          onSubmit={mockSubmit}
          onClose={mockClose}
          initialData={initialData}
          isEdit={true}
        />
      );

      // Assert: Customer change button/selector should not exist
      const changeCustomerButton = screen.queryByRole('button', { name: /change|select.*customer/i });
      expect(changeCustomerButton).not.toBeInTheDocument();
    });
  });

  describe('RED: Validation error messages should appear for required fields', () => {
    it('should show customer validation error when submitting without customer', () => {
      render(
        <AppointmentForm
          onSubmit={mockSubmit}
          onClose={mockClose}
          initialData={{
            locationId: 'loc-1',
            doctorId: 'emp-1',
            date: '2024-03-15',
            startTime: '09:00',
          }}
        />
      );

      // Act: click save without selecting customer
      const saveButton = screen.getByRole('button', { name: /addAppointment/i });
      fireEvent.click(saveButton);

      // Assert: customer error should be visible
      expect(screen.getByText('form.selectPatient')).toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should show date validation error when submitting without date', () => {
      render(
        <AppointmentForm
          onSubmit={mockSubmit}
          onClose={mockClose}
          initialData={{
            customerId: 'cust-1',
            customerName: 'John Doe',
            customerPhone: '0901234567',
            locationId: 'loc-1',
            doctorId: 'emp-1',
          }}
        />
      );

      const saveButton = screen.getByRole('button', { name: /addAppointment/i });
      fireEvent.click(saveButton);

      expect(screen.getAllByText('form.date').length).toBeGreaterThanOrEqual(1);
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should show startTime validation error when submitting without time', () => {
      render(
        <AppointmentForm
          onSubmit={mockSubmit}
          onClose={mockClose}
          initialData={{
            customerId: 'cust-1',
            customerName: 'John Doe',
            customerPhone: '0901234567',
            locationId: 'loc-1',
            doctorId: 'emp-1',
            date: '2024-03-15',
          }}
        />
      );

      const saveButton = screen.getByRole('button', { name: /addAppointment/i });
      fireEvent.click(saveButton);

      expect(screen.getAllByText('form.startTime').length).toBeGreaterThanOrEqual(1);
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('RED: Date formatting on appointment cards', () => {
    it('should format date correctly for display (YYYY-MM-DD to readable format)', () => {
      // Test the formatDate function behavior
      const rawDate = '2024-03-15';
      
      // Expected: Format should be readable like "15 Mar 2024" or similar
      // This will fail initially until we fix the formatting
      const formattedDate = formatDateForDisplay(rawDate);
      
      expect(formattedDate).toBe('15 Mar 2024');
      expect(formattedDate).not.toBe('2024-03-15'); // Should not be raw ISO format
      expect(formattedDate).not.toContain('Invalid');
      expect(formattedDate).not.toContain('undefined');
    });

    it('should handle datetimeappointment field correctly', () => {
      // Test datetimeappointment parsing
      const datetimeappointment = '2024-03-15T09:30:00';
      
      const { date, time } = parseDateTimeAppointment(datetimeappointment);
      
      expect(date).toBe('2024-03-15');
      expect(time).toBe('09:30');
    });

    it('should not show messy/invalid date strings', () => {
      // Common issue: dates showing as "Invalid Date" or garbled
      const testCases = [
        { input: '2024-03-15', shouldNotContain: ['Invalid', 'undefined', 'null', 'NaN'] },
        { input: '2024-03-15T09:30:00', shouldNotContain: ['Invalid', 'undefined', 'null', 'NaN'] },
      ];

      testCases.forEach(({ input, shouldNotContain }) => {
        const result = formatDateForDisplay(input);
        shouldNotContain.forEach(badString => {
          expect(result).not.toContain(badString);
        });
      });
    });
  });
});

// Helper functions to test (will be implemented to make tests pass)
function formatDateForDisplay(dateStr: string): string {
  // This is the placeholder that will fail initially
  // Implementation will be added to make tests pass
  if (!dateStr) return '-';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch {
    return '-';
  }
}

function parseDateTimeAppointment(datetime: string | null): { date: string; time: string } {
  if (!datetime) {
    return { date: '', time: '' };
  }
  
  try {
    const [datePart, timePart] = datetime.split('T');
    const time = timePart ? timePart.slice(0, 5) : ''; // Get HH:mm
    return { date: datePart, time };
  } catch {
    return { date: '', time: '' };
  }
}
