import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React, { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import App from '../App';

/**
 * Phase-1 gap C regression lock — `ProtectedRoute` in `website/src/App.tsx`
 * (~lines 97-115) MUST send any authenticated user with `is_ctv === true`
 * (or legacy camelCase `isCtv === true`) straight to `/ctv` instead of
 * letting them touch the admin UI. Spec D14 says CTV-flagged users never
 * enter the admin tree.
 *
 * These tests render the real `<App>` inside a `<MemoryRouter>`, mock
 * `useAuth()` to return different `is_ctv` values, and assert the redirect.
 */

// useAuth mock — overridable per test via setAuthMock()
const authState = {
  isAuthenticated: true,
  isLoading: false,
  hasPermission: () => true,
  user: { id: '1', email: 'test@test.com', is_ctv: false as boolean, isCtv: undefined as boolean | undefined },
  logout: vi.fn(),
};

vi.mock('../contexts/AuthContext', () => {
  return {
    AuthProvider: ({ children }: { children: ReactNode }) => children,
    useAuth: vi.fn(() => authState),
  };
});

vi.mock('../contexts/BusinessUnitContext', () => {
  return {
    BusinessUnitProvider: ({ children }: { children: ReactNode }) => children,
    useBusinessUnit: vi.fn(() => ({
      currentLOB: 'dental',
      setCurrentLOB: vi.fn(),
      availableLOBs: ['dental'],
      isMultiLOBUser: false,
      isCosmeticEnabled: true,
    })),
  };
});

vi.mock('../contexts/LocationContext', () => {
  return {
    LocationProvider: ({ children }: { children: ReactNode }) => children,
    useLocationFilter: vi.fn(() => ({
      selectedLocationId: 'all',
      setSelectedLocationId: vi.fn(),
      allowedLocations: [],
    })),
  };
});

vi.mock('../contexts/TimezoneContext', () => {
  return {
    TimezoneProvider: ({ children }: { children: ReactNode }) => children,
    useTimezone: vi.fn(() => ({
      getToday: vi.fn(() => new Date()),
      getEndOfDay: vi.fn((date: Date) => date),
      timezone: 'Asia/Ho_Chi_Minh',
      formatDate: vi.fn((date: Date) => date.toISOString()),
    })),
  };
});

// Stub the CTV dashboard so we can detect when the redirect lands there.
vi.mock('../pages/CTV/CtvDashboard', () => ({
  default: () => <div data-testid="ctv-dashboard-stub">CTV dashboard rendered</div>,
}));

describe('ProtectedRoute — hard redirect for is_ctv users (Phase-1 gap C)', () => {
  beforeEach(() => {
    authState.user = { id: '1', email: 'test@test.com', is_ctv: false, isCtv: undefined };
  });

  it('redirects a user with `is_ctv: true` away from an admin route to /ctv', async () => {
    authState.user = { id: '1', email: 'test@test.com', is_ctv: true, isCtv: undefined };
    render(
      <MemoryRouter initialEntries={['/customers']}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId('ctv-dashboard-stub')).toBeInTheDocument();
    });
  });

  it('redirects a user with legacy camelCase `isCtv: true` away from an admin route to /ctv', async () => {
    authState.user = { id: '1', email: 'test@test.com', is_ctv: false, isCtv: true };
    render(
      <MemoryRouter initialEntries={['/calendar']}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId('ctv-dashboard-stub')).toBeInTheDocument();
    });
  });

  it('does NOT redirect a non-CTV authenticated user', async () => {
    authState.user = { id: '1', email: 'test@test.com', is_ctv: false, isCtv: undefined };
    render(
      <MemoryRouter initialEntries={['/customers']}>
        <App />
      </MemoryRouter>
    );
    // The CTV stub must not appear; the admin route renders something else
    // (Suspense fallback at minimum). We tolerate the lazy fallback here —
    // the point is that the CTV redirect did NOT fire.
    expect(screen.queryByTestId('ctv-dashboard-stub')).not.toBeInTheDocument();
  });

  it('App.tsx source still contains the is_ctv gate (regression lock)', () => {
    const appSource = readFileSync(resolve(__dirname, '..', 'App.tsx'), 'utf8');
    expect(appSource).toMatch(/user\?\.is_ctv\s*\|\|\s*user\?\.isCtv/);
    expect(appSource).toMatch(/<Navigate to="\/ctv" replace \/>/);
  });
});
