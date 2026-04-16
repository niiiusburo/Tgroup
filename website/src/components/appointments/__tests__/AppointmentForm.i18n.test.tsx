import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppointmentForm } from '../AppointmentForm';
import { BrowserRouter } from 'react-router-dom';
import { LocationProvider } from '@/contexts/LocationContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Use the real react-i18next so translations resolve
vi.unmock('react-i18next');

vi.mock('@/hooks/useCustomers', () => ({
  useCustomers: () => ({ customers: [], loading: false, createCustomer: vi.fn() }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({ employees: [], isLoading: false }),
}));

vi.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({ allLocations: [], isLoading: false }),
}));

vi.mock('@/hooks/useProducts', () => ({
  useProducts: () => ({ products: [], isLoading: false }),
}));

describe('AppointmentForm i18n', () => {
  beforeAll(async () => {
    // Ensure i18n is initialized before rendering
    const { default: i18n } = await import('@/i18n');
    if (!i18n.isInitialized) {
      await new Promise<void>((resolve) => {
        i18n.on('initialized', resolve);
      });
    }
  });

  it('renders translated labels instead of raw keys', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <LocationProvider>
            <AppointmentForm onSubmit={() => {}} onClose={() => {}} />
          </LocationProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // These keys should be translated and NOT appear as raw text
    expect(document.body.textContent).not.toMatch(/customer\.type\.new/);
    expect(document.body.textContent).not.toMatch(/label\.cardColor/);
    expect(document.body.textContent).not.toMatch(/label\.reminder/);
    expect(document.body.textContent).not.toMatch(/common\.minutes/);
    expect(document.body.textContent).not.toMatch(/reminder\.15/);
  });
});
