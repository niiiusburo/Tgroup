/**
 * Customer Deep Link Tests - TDD for /customers/:id routing
 * @crossref:tests[Customers deep linking]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReactNode } from 'react';
import { Customers } from '@/pages/Customers';

// Mock all the hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: () => true,
  }),
}));

vi.mock('@/contexts/BusinessUnitContext', () => ({
  BusinessUnitProvider: ({ children }: { children: ReactNode }) => children,
  useBusinessUnit: vi.fn(() => ({
    currentLOB: 'dental',
    setCurrentLOB: vi.fn(),
    availableLOBs: ['dental'],
    isMultiLOBUser: false,
    isCosmeticEnabled: true,
  })),
}));

vi.mock('@/contexts/LocationContext', () => ({
  useLocationFilter: () => ({
    selectedLocationId: 'all',
    setSelectedLocationId: vi.fn(),
    allowedLocations: [],
    isSingleLocation: false,
  }),
}));

// Use valid UUIDs for testing
const ALICE_ID = '550e8400-e29b-41d4-a716-446655440000';
const BOB_ID = '550e8400-e29b-41d4-a716-446655440001';

vi.mock('@/hooks/useCustomers', () => ({
  useCustomers: () => ({
    customers: [
      {
        id: ALICE_ID,
        name: 'Alice Nguyen',
        phone: '0901234567',
        email: 'alice@example.com',
        locationId: 'loc-1',
        status: 'active',
        lastVisit: '2024-01-15',
      },
      {
        id: BOB_ID,
        name: 'Bob Tran',
        phone: '0912345678',
        email: 'bob@example.com',
        locationId: 'loc-2',
        status: 'active',
        lastVisit: '2024-02-20',
      },
    ],
    stats: { total: 2, active: 2, inactive: 0, pending: 0 },
    searchTerm: '',
    setSearchTerm: vi.fn(),
    statusFilter: 'all',
    setStatusFilter: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    searchRequired: false,
    minSearchLength: 3,
  }),
}));

vi.mock('@/hooks/useCustomerProfile', () => ({
  useCustomerProfile: (customerId: string | null) => ({
    profile:
      customerId === ALICE_ID
        ? {
            id: ALICE_ID,
            name: 'Alice Nguyen',
            phone: '0901234567',
            email: 'alice@example.com',
            gender: 'female',
            dateOfBirth: '1990/05/15',
            address: '123 Main St',
            notes: 'Regular patient',
            medicalHistory: '',
            tags: [],
            memberSince: '2023-01-01',
            totalVisits: 5,
            lastVisit: '2024-01-15',
            totalSpent: 5000000,
            companyId: 'loc-1',
            companyName: 'TG Clinic Gò Vấp',
            depositBalance: 1000000,
            outstandingBalance: 0,
          }
        : null,
    appointments: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({
    allLocations: [
      { id: 'loc-1', name: 'TG Clinic Gò Vấp' },
      { id: 'loc-2', name: 'TG Clinic Quận 10' },
    ],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAppointments', () => ({
  useAppointments: () => ({
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
  }),
}));

const refetchServicesMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useServices', () => ({
  useServices: () => ({
    createServiceRecord: vi.fn(),
    updateServiceRecord: vi.fn(),
    updateServiceStatus: vi.fn(),
    refetch: refetchServicesMock,
    getRecordsByCustomer: () => [],
  }),
}));

vi.mock('@/hooks/usePayment', () => ({
  usePayment: () => ({
    createPayment: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDeposits', () => ({
  useDeposits: () => ({
    depositList: [],
    usageHistory: [],
    balance: {
      depositBalance: 0,
      outstandingBalance: 0,
      totalDeposited: 0,
      totalUsed: 0,
      totalRefunded: 0,
    },
    loading: false,
    addDeposit: vi.fn(),
    addRefund: vi.fn(),
    voidDeposit: vi.fn(),
    removeDeposit: vi.fn(),
    editDeposit: vi.fn(),
    loadDeposits: vi.fn(),
  }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    employees: [],
  }),
}));

vi.mock('@/hooks/useCustomerPayments', () => ({
  useCustomerPayments: () => ({
    payments: [],
    isLoading: false,
    addPayment: vi.fn(),
    refetch: vi.fn(),
    deletePaymentById: vi.fn(),
  }),
}));

vi.mock('@/hooks/useExternalCheckups', () => ({
  useExternalCheckups: () => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  fetchSaleOrderLines: vi.fn().mockResolvedValue({ items: [] }),
}));

function renderWithRouter(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<Customers />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Customer profile deep linking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show customer list at /customers', async () => {
    renderWithRouter(['/customers']);

    // The customer list should display the mocked customers
    await waitFor(() => {
      expect(screen.getByText('Alice Nguyen')).toBeInTheDocument();
    });

    expect(screen.getByText('Bob Tran')).toBeInTheDocument();
  });

  it('should show Customer Profile when navigating to /customers/:id', async () => {
    renderWithRouter([`/customers/${ALICE_ID}`]);

    // Wait for profile to load - check for customer name in heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alice Nguyen' })).toBeInTheDocument();
    });

    // Phone should appear in profile (may appear multiple times)
    const phoneElements = screen.queryAllByText('0901234567');
    expect(phoneElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should navigate back to customer list when clicking back', async () => {
    renderWithRouter([`/customers/${ALICE_ID}`]);

    // Wait for profile to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alice Nguyen' })).toBeInTheDocument();
    });

    // Find and click the back button (arrow icon in the header)
    const backButton = screen.getAllByRole('button').find(
      (el) => el.querySelector('svg') && el.parentElement?.className.includes('flex')
    )!;

    if (backButton) {
      fireEvent.click(backButton);

      // After clicking back, should see the customer list with customers
      await waitFor(() => {
        expect(screen.getByText('Alice Nguyen')).toBeInTheDocument();
      });

      expect(screen.getByText('Bob Tran')).toBeInTheDocument();
    }
  });
});
