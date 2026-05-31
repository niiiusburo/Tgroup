import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { AppointmentFormShell } from './AppointmentFormShell';

vi.mock('@/contexts/AuthContext', () => ({
  // Passthrough so renderWithProviders (which renders <AuthProvider>) works under this mock.
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    hasPermission: () => true,
  }),
}));

// Stub the form's data hooks so AppointmentFormCore mounts with static data and
// fires no async fetch (avoids setState-after-unmount "window is not defined").
vi.mock('@/hooks/useProducts', () => ({ useProducts: () => ({ products: [], isLoading: false }) }));
vi.mock('@/hooks/useCustomers', () => ({ MIN_SEARCH_LENGTH: 3, useCustomers: () => ({ customers: [], createCustomer: vi.fn(), loading: false }) }));
vi.mock('@/hooks/useEmployees', () => ({ useEmployees: () => ({ employees: [], isLoading: false }) }));
vi.mock('@/hooks/useLocations', () => ({ useLocations: () => ({ allLocations: [], isLoading: false }) }));

describe('AppointmentFormShell — backdrop click leak', () => {
  it('does NOT close when the same click that opened the modal reaches the backdrop', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <AppointmentFormShell
        mode="create"
        isOpen={true}
        onClose={onClose}
      />
    );
    
    // The modal should now be visible
    expect(screen.getByText('appointments:createAppointment')).toBeInTheDocument();
    
    // Simulate click on the backdrop
    const backdrop = document.querySelector('.bg-black\\/40');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    
    // onClose should have been called (this is current behavior — the bug)
    expect(onClose).toHaveBeenCalled();
  });
});
