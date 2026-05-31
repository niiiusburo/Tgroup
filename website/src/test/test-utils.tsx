import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { BusinessUnitProvider } from '@/contexts/BusinessUnitContext';

/**
 * Full app provider tree for tests. AuthProvider MUST wrap BusinessUnitProvider
 * because BusinessUnitProvider calls useAuth() — without AuthProvider it throws
 * "useAuth must be used within an AuthProvider", which previously cascaded into
 * "must be used inside BusinessUnitProvider" failures across many suites.
 * (AuthProvider performs no network call when there is no token in localStorage.)
 */
export function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusinessUnitProvider>
          <TimezoneProvider>
            <LocationProvider>
              {children}
            </LocationProvider>
          </TimezoneProvider>
        </BusinessUnitProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: AllProviders });
}

/**
 * renderHook wrapped in the full provider tree — use for hooks that consume
 * BusinessUnit/Auth/Location/Timezone context (e.g. useReportData, useOverviewAppointments).
 */
export function renderHookWithProviders<TResult, TProps>(
  callback: (props: TProps) => TResult,
  options?: Parameters<typeof renderHook<TResult, TProps>>[1]
) {
  return renderHook(callback, { wrapper: AllProviders, ...(options ?? {}) });
}
