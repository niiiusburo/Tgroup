import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import { AUTH_UNAUTHORIZED_EVENT } from '@/lib/api/core';

const apiMocks = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  login: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  fetchMe: apiMocks.fetchMe,
  login: apiMocks.login,
}));

function AuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="auth-status">
        {auth.isLoading ? 'loading' : auth.isAuthenticated ? 'authenticated' : 'guest'}
      </span>
      <span data-testid="user-name">{auth.user?.name ?? 'none'}</span>
    </div>
  );
}

const meResponse = {
  token: 'fresh-token',
  user: {
    id: 'emp-1',
    name: 'Clinic Admin',
    email: 'admin@example.com',
    companyId: 'company-1',
    companyName: 'Main Clinic',
  },
  permissions: {
    groupId: 'admin',
    groupName: 'Admin',
    effectivePermissions: ['settings.view'],
    locations: [{ id: 'company-1', name: 'Main Clinic' }],
  },
};

describe('AuthProvider session events', () => {
  beforeEach(() => {
    localStorage.clear();
    apiMocks.fetchMe.mockReset();
    apiMocks.login.mockReset();
  });

  it('returns to unauthenticated state when apiFetch reports a 401 session event', async () => {
    localStorage.setItem('tgclinic_token', 'stale-token');
    apiMocks.fetchMe.mockResolvedValue(meResponse);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    expect(await screen.findByTestId('auth-status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Clinic Admin');

    window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('guest');
    });
    expect(screen.getByTestId('user-name')).toHaveTextContent('none');
    expect(localStorage.getItem('tgclinic_token')).toBeNull();
  });
});
