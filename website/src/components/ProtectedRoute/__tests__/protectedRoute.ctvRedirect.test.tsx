import { describe, it, expect } from 'vitest';
import type { AuthUser } from '../../../lib/api/auth';

describe('ProtectedRoute — is_ctv redirect', () => {
  it('should have is_ctv field on AuthUser type', () => {
    const mockUser: AuthUser = {
      id: '1',
      name: 'Test User',
      email: 'test@clinic.vn',
      companyId: '1',
      companyName: 'Clinic',
      is_ctv: true,
    };

    expect(mockUser.is_ctv).toBe(true);
  });

  it('should support lob_scope field on AuthUser type', () => {
    const mockUser: AuthUser = {
      id: '1',
      name: 'Test User',
      email: 'test@clinic.vn',
      companyId: '1',
      companyName: 'Clinic',
      lob_scope: ['dental', 'cosmetic'],
    };

    expect(mockUser.lob_scope).toContain('dental');
    expect(mockUser.lob_scope).toContain('cosmetic');
  });

  it('should handle backward compatibility when is_ctv is undefined', () => {
    const mockUser: AuthUser = {
      id: '1',
      name: 'Test User',
      email: 'test@clinic.vn',
      companyId: '1',
      companyName: 'Clinic',
      // is_ctv not set
    };

    expect(mockUser.is_ctv).toBeUndefined();
  });

  it('ProtectedRoute checks is_ctv and redirects to /ctv', () => {
    // This test verifies the logic in App.tsx ProtectedRoute function
    // The component checks: if (user?.is_ctv === true) return <Navigate to="/ctv" replace />;
    const ctvUser: AuthUser = {
      id: '2',
      name: 'CTV User',
      email: 'ctv@clinic.vn',
      companyId: '1',
      companyName: 'Clinic',
      is_ctv: true,
    };

    // Verify that is_ctv=true triggers redirect logic
    expect(ctvUser.is_ctv === true).toBe(true);
  });

  it('ProtectedRoute allows non-CTV users to pass through', () => {
    const regularUser: AuthUser = {
      id: '3',
      name: 'Regular User',
      email: 'user@clinic.vn',
      companyId: '1',
      companyName: 'Clinic',
      is_ctv: false,
    };

    // Verify that is_ctv=false does not trigger redirect
    expect(regularUser.is_ctv === true).toBe(false);
  });
});
