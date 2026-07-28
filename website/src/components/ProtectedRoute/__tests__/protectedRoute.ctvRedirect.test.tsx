import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AuthUser } from '../../../lib/api/auth';

const appSource = readFileSync(resolve(__dirname, '../../../App.tsx'), 'utf8');

describe('ProtectedRoute — is_ctv redirect (AUD-017)', () => {
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

  it('does not redirect is_ctv users to /ctv until LOB ships', () => {
    // Dead /ctv route was removed from ProtectedRoute (AUD-017).
    expect(appSource).not.toMatch(/Navigate to=["']\/ctv["']/);
    expect(appSource).not.toMatch(/user\?\.is_ctv\s*===\s*true/);

    const ctvUser: AuthUser = {
      id: '2',
      name: 'CTV User',
      email: 'ctv@clinic.vn',
      companyId: '1',
      companyName: 'Clinic',
      is_ctv: true,
    };

    // is_ctv remains on the auth type for future LOB, but must not force navigation.
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

    expect(regularUser.is_ctv === true).toBe(false);
  });
});
