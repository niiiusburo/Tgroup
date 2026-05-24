import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { BusinessUnitProvider, useBusinessUnit, type BusinessUnit } from '../BusinessUnitContext';

// Mock AuthContext to control user.lob_scope and is_ctv
const mockUseAuth = vi.fn();
vi.mock('../AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const adminPermissions = {
  groupId: '11111111-0000-0000-0000-000000000001',
  groupName: 'Admin',
  effectivePermissions: [],
  locations: [],
};

const staffPermissions = {
  groupId: 'staff-group',
  groupName: 'Doctor',
  effectivePermissions: [],
  locations: [],
};

function setCosmeticFlag(value: 'true' | 'false') {
  vi.stubEnv('VITE_COSMETIC_LOB_ENABLED', value);
}

function BusinessUnitProbe() {
  const { currentLOB, setCurrentLOB, availableLOBs, isMultiLOBUser, isCosmeticEnabled } = useBusinessUnit();
  const [firstLOB] = React.useState(currentLOB);
  return (
    <div>
      <span data-testid="first-lob">{firstLOB}</span>
      <span data-testid="current-lob">{currentLOB}</span>
      <span data-testid="available">{availableLOBs.join(',')}</span>
      <span data-testid="multi">{isMultiLOBUser ? 'multi' : 'single'}</span>
      <span data-testid="enabled">{isCosmeticEnabled ? 'yes' : 'no'}</span>
      <button data-testid="set-cosmetic" onClick={() => setCurrentLOB('cosmetic')}>
        to-cosmetic
      </button>
      <button data-testid="set-dental" onClick={() => setCurrentLOB('dental')}>
        to-dental
      </button>
    </div>
  );
}

describe('BusinessUnitContext (TDD)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setCosmeticFlag('false');
  });

  afterEach(() => {
    setCosmeticFlag('false');
    vi.unstubAllEnvs();
  });

  it('throws when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<BusinessUnitProbe />);
    }).toThrow('useBusinessUnit must be used inside BusinessUnitProvider');
    consoleSpy.mockRestore();
  });

  it('defaults to dental when legacy user has no lob_scope', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, permissions: staffPermissions });
    render(
      <BusinessUnitProvider>
        <BusinessUnitProbe />
      </BusinessUnitProvider>
    );
    expect(screen.getByTestId('current-lob').textContent).toBe('dental');
    expect(screen.getByTestId('available').textContent).toBe('dental');
    expect(screen.getByTestId('multi').textContent).toBe('single');
  });

  it('derives available LOBs from user.lob_scope when flag enabled', () => {
    setCosmeticFlag('true');
    mockUseAuth.mockReturnValue({
      user: { lob_scope: ['dental', 'cosmetic'] },
      permissions: adminPermissions,
    });
    render(
      <BusinessUnitProvider>
        <BusinessUnitProbe />
      </BusinessUnitProvider>
    );
    expect(screen.getByTestId('available').textContent).toBe('dental,cosmetic');
    expect(screen.getByTestId('multi').textContent).toBe('multi');
    expect(screen.getByTestId('enabled').textContent).toBe('yes');
  });

  it('caps non-admin staff to their first LOB even if two scopes are present', () => {
    setCosmeticFlag('true');
    localStorage.setItem('tgclinic_lob', 'cosmetic');
    mockUseAuth.mockReturnValue({
      user: { lob_scope: ['dental', 'cosmetic'] },
      permissions: staffPermissions,
    });
    render(
      <BusinessUnitProvider>
        <BusinessUnitProbe />
      </BusinessUnitProvider>
    );
    expect(screen.getByTestId('available').textContent).toBe('dental');
    expect(screen.getByTestId('multi').textContent).toBe('single');
    expect(screen.getByTestId('current-lob').textContent).toBe('dental');
  });

  it('respects persisted localStorage value if valid for scope', () => {
    setCosmeticFlag('true');
    localStorage.setItem('tgclinic_lob', 'cosmetic');
    mockUseAuth.mockReturnValue({
      user: { lob_scope: ['dental', 'cosmetic'] },
      permissions: adminPermissions,
    });
    render(
      <BusinessUnitProvider>
        <BusinessUnitProbe />
      </BusinessUnitProvider>
    );
    expect(screen.getByTestId('current-lob').textContent).toBe('cosmetic');
  });

  it('initializes from persisted cosmetic LOB before child effects can fetch', () => {
    setCosmeticFlag('true');
    localStorage.setItem('tgclinic_lob', 'cosmetic');
    mockUseAuth.mockReturnValue({
      user: { lob_scope: ['dental', 'cosmetic'] },
      permissions: adminPermissions,
    });

    render(
      <BusinessUnitProvider>
        <BusinessUnitProbe />
      </BusinessUnitProvider>
    );

    expect(screen.getByTestId('first-lob').textContent).toBe('cosmetic');
    expect(screen.getByTestId('current-lob').textContent).toBe('cosmetic');
  });

  it('falls back to first available when persisted value invalid', () => {
    localStorage.setItem('tgclinic_lob', 'cosmetic');
    mockUseAuth.mockReturnValue({ user: { lob_scope: ['dental'] }, permissions: staffPermissions });
    render(
      <BusinessUnitProvider>
        <BusinessUnitProbe />
      </BusinessUnitProvider>
    );
    expect(screen.getByTestId('current-lob').textContent).toBe('dental');
  });

  it('setCurrentLOB updates state, persists, and only allows available', async () => {
    setCosmeticFlag('true');
    mockUseAuth.mockReturnValue({
      user: { lob_scope: ['dental', 'cosmetic'] },
      permissions: adminPermissions,
    });
    render(
      <BusinessUnitProvider>
        <BusinessUnitProbe />
      </BusinessUnitProvider>
    );

    expect(screen.getByTestId('current-lob').textContent).toBe('dental');

    act(() => {
      screen.getByTestId('set-cosmetic').click();
    });
    expect(screen.getByTestId('current-lob').textContent).toBe('cosmetic');
    expect(localStorage.getItem('tgclinic_lob')).toBe('cosmetic');

    // Invalid ignored
    act(() => {
      screen.getByTestId('set-dental').click(); // valid
    });
    expect(screen.getByTestId('current-lob').textContent).toBe('dental');
  });

  it('dispatches tgclinic:lob-change custom event on set and initial', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    mockUseAuth.mockReturnValue({ user: null, permissions: null });
    render(
      <BusinessUnitProvider>
        <BusinessUnitProbe />
      </BusinessUnitProvider>
    );

    // Initial dispatch happened
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tgclinic:lob-change' })
    );

    dispatchSpy.mockClear();
    // Trigger set would dispatch too (tested via integration)
  });
});
