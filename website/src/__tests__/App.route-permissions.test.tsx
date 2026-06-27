import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Outlet } from 'react-router-dom';
import App from '@/App';

const authState = vi.hoisted(() => ({
  value: {
    isAuthenticated: true,
    isLoading: false,
    user: { id: 'investor-1', name: 'Investor', email: 'investor@example.com' },
    permissions: {
      groupId: 'investor',
      groupName: 'investor',
      effectivePermissions: [] as string[],
      locations: [],
    },
    login: vi.fn(),
    logout: vi.fn(),
    hasPermission(permission: string) {
      return authState.value.permissions.effectivePermissions.includes(permission);
    },
    hasLocationAccess: vi.fn(() => true),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => authState.value,
}));

vi.mock('@/contexts/TimezoneContext', () => ({
  TimezoneProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LocationContext', () => ({
  LocationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/Layout', () => ({
  Layout: () => <Outlet />,
}));

vi.mock('@/pages', () => ({
  Login: () => <div>Login Page</div>,
}));

vi.mock('@/pages/Overview', () => ({
  Overview: () => <div>Overview Page</div>,
}));

vi.mock('@/pages/Customers', () => ({
  Customers: () => <div>Customers Page</div>,
}));

vi.mock('@/pages/Calendar', () => ({ Calendar: () => <div>Calendar Page</div> }));
vi.mock('@/pages/Employees', () => ({ Employees: () => <div>Employees Page</div> }));
vi.mock('@/pages/Locations', () => ({ Locations: () => <div>Locations Page</div> }));
vi.mock('@/pages/Website', () => ({ Website: () => <div>Website Page</div> }));
vi.mock('@/pages/Settings', () => ({ Settings: () => <div>Settings Page</div> }));
vi.mock('@/pages/Relationships', () => ({ Relationships: () => <div>Relationships Page</div> }));
vi.mock('@/pages/Commission', () => ({ Commission: () => <div>Commission Page</div> }));
vi.mock('@/pages/Reports', () => ({
  default: () => <div>Reports Page</div>,
  Dashboard: () => <div>Reports Dashboard</div>,
  Revenue: () => <div>Reports Revenue</div>,
  Appointments: () => <div>Reports Appointments</div>,
  Doctors: () => <div>Reports Doctors</div>,
  Customers: () => <div>Reports Customers</div>,
  Locations: () => <div>Reports Locations</div>,
  Services: () => <div>Reports Services</div>,
  Employees: () => <div>Reports Employees</div>,
}));
vi.mock('@/pages/Notifications', () => ({ Notifications: () => <div>Notifications Page</div> }));
vi.mock('@/pages/PermissionBoard', () => ({ PermissionBoard: () => <div>Permission Board</div> }));
vi.mock('@/pages/Payment', () => ({ Payment: () => <div>Payment Page</div> }));
vi.mock('@/pages/Feedback', () => ({ Feedback: () => <div>Feedback Page</div> }));
vi.mock('@/pages/Services', () => ({ Services: () => <div>Services Page</div> }));
vi.mock('@/pages/ServiceCatalog', () => ({ ServiceCatalog: () => <div>Service Catalog</div> }));
vi.mock('@/pages/CheckIn/CheckIn', () => ({ CheckIn: () => <div>Check In Page</div> }));
vi.mock('@/components/shared/AddressAutocompleteTest', () => ({
  AddressAutocompleteTest: () => <div>Address Test</div>,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('App route permissions', () => {
  it('lets a customers.view user open /customers without overview.view', async () => {
    authState.value.permissions.effectivePermissions = ['customers.view'];

    renderAt('/customers');

    expect(await screen.findByText('Customers Page')).toBeInTheDocument();
  });

  it('still requires overview.view on the / index route', async () => {
    authState.value.permissions.effectivePermissions = ['customers.view'];

    renderAt('/');

    expect(await screen.findByText('accessDenied.title')).toBeInTheDocument();
    expect(screen.queryByText('Overview Page')).not.toBeInTheDocument();
  });
});
