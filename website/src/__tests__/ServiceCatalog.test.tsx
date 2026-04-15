/**
 * ServiceCatalog Tests - TDD for inline editing feature
 * @crossref:tests[ServiceCatalog inline editing]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ServiceCatalog } from '@/pages/ServiceCatalog';
import { LocationProvider } from '@/contexts/LocationContext';
import { TimezoneProvider } from '@/contexts/TimezoneContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <TimezoneProvider>
      <LocationProvider>{ui}</LocationProvider>
    </TimezoneProvider>
  );
}

// Mock the API
vi.mock('@/lib/api', () => ({
  fetchProducts: vi.fn().mockResolvedValue({
    items: [
      {
        id: '1',
        name: 'Teeth Cleaning',
        defaultcode: 'CLEAN001',
        categname: 'Preventive',
        listprice: '150000',
        purchaseprice: '50000',
        uomname: 'session',
        active: true,
        canorderlab: false,
      },
      {
        id: '2',
        name: 'Dental X-Ray',
        defaultcode: 'XRAY001',
        categname: 'Diagnostic',
        listprice: '200000',
        purchaseprice: '80000',
        uomname: 'session',
        active: true,
        canorderlab: false,
      },
    ],
    total: 2,
  }),
  fetchProductCategories: vi.fn().mockResolvedValue({
    items: [
      { id: 'c1', name: 'Preventive' },
      { id: 'c2', name: 'Diagnostic' },
    ],
    total: 2,
  }),
  fetchCompanies: vi.fn().mockResolvedValue({
    items: [
      { id: 'loc-1', name: 'TG Clinic' },
    ],
    total: 1,
  }),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  createProductCategory: vi.fn(),
}));

describe.skip('ServiceCatalog inline editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Price editing', () => {
    it('should display service catalog page', async () => {
      renderWithProviders(<ServiceCatalog />);
      
      // Wait for data to load — use translation key returned by mock
      await waitFor(() => {
        expect(screen.getByText('serviceCatalog')).toBeTruthy();
      });
      
      // Stats should show total services label
      expect(screen.getByText(/totalServices|Total Services/)).toBeTruthy();
    });

    it('should show edit button on price cell', async () => {
      renderWithProviders(<ServiceCatalog />);
      await waitFor(() => screen.getByText('serviceCatalog'));
      
      // Find edit buttons
      const editButtons = screen.getAllByTitle('Edit price');
      expect(editButtons.length).toBeGreaterThan(0);
    });

    it('should open inline edit mode when clicking edit button', async () => {
      renderWithProviders(<ServiceCatalog />);
      await waitFor(() => screen.getByText('serviceCatalog'));
      
      // Click on the first price edit button
      const editButton = screen.getAllByTitle('Edit price')[0];
      fireEvent.click(editButton);
      
      // Should show input field
      await waitFor(() => {
        expect(screen.getByRole('spinbutton')).toBeTruthy();
      });
    });

    it('should show save and cancel buttons when editing', async () => {
      renderWithProviders(<ServiceCatalog />);
      await waitFor(() => screen.getByText('serviceCatalog'));
      
      // Click edit
      const editButton = screen.getAllByTitle('Edit price')[0];
      fireEvent.click(editButton);
      
      // Should show save and cancel buttons
      await waitFor(() => {
        expect(screen.getByTitle('Save')).toBeTruthy();
        expect(screen.getByTitle('Cancel')).toBeTruthy();
      });
    });

    it('should save price when clicking checkmark', async () => {
      renderWithProviders(<ServiceCatalog />);
      await waitFor(() => screen.getByText('serviceCatalog'));
      
      // Click edit on first price
      const editButton = screen.getAllByTitle('Edit price')[0];
      fireEvent.click(editButton);
      
      // Change the value
      const input = screen.getByRole('spinbutton');
      await act(async () => {
        fireEvent.change(input, { target: { value: '180000' } });
      });
      
      // Click save (checkmark)
      const saveButton = screen.getByTitle('Save');
      fireEvent.click(saveButton);
      
      // Should show updated price
      await waitFor(() => {
        expect(screen.getByText(/180\.000/)).toBeTruthy();
      });
    });

    it('should cancel edit when clicking X button', async () => {
      renderWithProviders(<ServiceCatalog />);
      await waitFor(() => screen.getByText('serviceCatalog'));
      
      // Click edit on first price (prices are inside expandable category)
      const editButtons = screen.getAllByTitle('Edit price');
      expect(editButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(editButtons[0]);
      
      // Change the value
      const input = screen.getByRole('spinbutton');
      await act(async () => {
        fireEvent.change(input, { target: { value: '999999' } });
      });
      
      // Click cancel (X)
      const cancelButton = screen.getByTitle('Cancel');
      fireEvent.click(cancelButton);
      
      // Price should be unchanged - verify the edit mode is closed
      const editModeClosed = !document.querySelector('input[type="number"]');
      expect(editModeClosed).toBeTruthy();
    });
  });

  describe('Dirty state tracking', () => {
    it('should enable save button after editing', async () => {
      renderWithProviders(<ServiceCatalog />);
      await waitFor(() => screen.getByText('serviceCatalog'));
      
      // Save button should be disabled initially
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
      
      // Edit a price
      const editButton = screen.getAllByTitle('Edit price')[0];
      fireEvent.click(editButton);
      
      // Change and save
      const input = screen.getByRole('spinbutton');
      await act(async () => {
        fireEvent.change(input, { target: { value: '180000' } });
      });
      
      const saveIconButton = screen.getByTitle('Save');
      fireEvent.click(saveIconButton);
      
      // Save Changes button should now be enabled
      await waitFor(() => {
        const saveAllButton = screen.getByRole('button', { name: /save changes/i });
        expect(saveAllButton).toBeEnabled();
      });
    });

    it('should enable reset button after editing', async () => {
      renderWithProviders(<ServiceCatalog />);
      await waitFor(() => screen.getByText('serviceCatalog'));
      
      // Reset button should be disabled initially
      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).toBeDisabled();
      
      // Edit a price
      const editButton = screen.getAllByTitle('Edit price')[0];
      fireEvent.click(editButton);
      
      // Change and save
      const input = screen.getByRole('spinbutton');
      await act(async () => {
        fireEvent.change(input, { target: { value: '180000' } });
      });
      
      const saveIconButton = screen.getByTitle('Save');
      fireEvent.click(saveIconButton);
      
      // Reset button should now be enabled
      await waitFor(() => {
        const resetBtn = screen.getByRole('button', { name: /reset/i });
        expect(resetBtn).toBeEnabled();
      });
    });
  });
});

describe.skip('Settings page - Service Catalog tab removal', () => {
  it('should NOT have Service Catalog tab in Settings', async () => {
    vi.doMock('@/contexts/AuthContext', () => ({
      useAuth: () => ({ hasPermission: () => true }),
    }));
    const { Settings } = await import('@/pages/Settings');
    
    renderWithProviders(<Settings />);
    
    // Should NOT find Service Catalog tab button
    const serviceCatalogTab = screen.queryByRole('button', { name: /service catalog/i });
    expect(serviceCatalogTab).toBeNull();
  });

  it('should show System Preferences in Settings', async () => {
    vi.doMock('@/contexts/AuthContext', () => ({
      useAuth: () => ({ hasPermission: () => true }),
    }));
    const { Settings } = await import('@/pages/Settings');
    
    renderWithProviders(<Settings />);
    
    // Should show Settings page title
    expect(screen.getByText('settings.title')).toBeTruthy();
  });
});
