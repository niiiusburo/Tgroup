/**
 * TDD: public CTV discount routes must not fall through to admin Overview catch-all.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import App from '../App';

vi.mock('../contexts/BusinessUnitContext', () => ({
  BusinessUnitProvider: ({ children }: { children: ReactNode }) => children,
  useBusinessUnit: vi.fn(() => ({
    currentLOB: 'dental',
    setCurrentLOB: vi.fn(),
    availableLOBs: ['dental', 'cosmetic'],
    isMultiLOBUser: true,
    isCosmeticEnabled: true,
  })),
}));

const authState = vi.hoisted(() => ({
  isAuthenticated: true,
  isLoading: false,
  isCtv: false,
}));

vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: vi.fn(() => ({
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    hasPermission: () => true,
    user: {
      id: '1',
      email: authState.isCtv ? 'ctv@test.vn' : 't@clinic.vn',
      is_ctv: authState.isCtv,
      isCtv: authState.isCtv,
    },
    logout: vi.fn(),
  })),
}));

vi.mock('../contexts/LocationContext', () => ({
  LocationProvider: ({ children }: { children: ReactNode }) => children,
  useLocationFilter: vi.fn(() => ({
    selectedLocationId: 'all',
    setSelectedLocationId: vi.fn(),
    allowedLocations: [],
  })),
}));

vi.mock('../contexts/TimezoneContext', () => ({
  TimezoneProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('../pages/CtvDiscountLanding', () => ({
  default: () => <div data-testid="ctv-discount-landing">Fan discount landing</div>,
}));

vi.mock('../pages/VerifyDiscount', () => ({
  default: () => <div data-testid="verify-discount-page">Staff verify discount</div>,
}));

vi.mock('../pages/Overview', () => ({
  Overview: () => <div data-testid="admin-overview">Admin Overview</div>,
}));

vi.mock('../components/Layout', () => ({
  Layout: () => <div data-testid="admin-layout">Admin Layout</div>,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('App public discount routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isAuthenticated = true;
    authState.isLoading = false;
    authState.isCtv = false;
  });

  it('renders fan landing at /ctv/discount/:shortCode instead of admin Overview', async () => {
    renderAt('/ctv/discount/CTV-ABC123');
    await waitFor(() => {
      expect(screen.getByTestId('ctv-discount-landing')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('admin-overview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('admin-layout')).not.toBeInTheDocument();
  });

  it('renders staff verify at /verify-discount instead of admin Overview', async () => {
    renderAt('/verify-discount?code=TEST-ABC123');
    await waitFor(() => {
      expect(screen.getByTestId('verify-discount-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('admin-overview')).not.toBeInTheDocument();
  });

  it('still renders fan landing when a CTV session is active', async () => {
    authState.isCtv = true;
    renderAt('/ctv/discount/CTV-ABC123');
    await waitFor(() => {
      expect(screen.getByTestId('ctv-discount-landing')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('admin-overview')).not.toBeInTheDocument();
  });
});