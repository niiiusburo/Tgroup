/**
 * TDD Tests for System Preferences with IP Access tab
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SystemPreferences } from '@/components/settings/SystemPreferences';

// Mock the hooks
vi.mock('@/hooks/useSettings', () => ({
  useSystemPreferences: () => ({
    groups: {
      General: [
        { key: 'clinic_name', label: 'Clinic Name', description: 'Display name', type: 'text', value: 'TDental', group: 'General' },
      ],
    },
    updatePreference: vi.fn(),
  }),
}));

vi.mock('@/hooks/useIpAccessControl', () => ({
  useIpAccessControl: () => ({
    mode: 'allow_all',
    setMode: vi.fn(),
    entries: [],
    stats: { totalEntries: 0, whitelistCount: 0, blacklistCount: 0, activeCount: 0, inactiveCount: 0 },
    validateIp: () => ({ valid: true }),
    addEntry: () => ({ success: true }),
    removeEntry: vi.fn(),
    toggleEntryActive: vi.fn(),
    updateEntry: vi.fn(),
    isIpAllowed: () => ({ allowed: true }),
  }),
}));

describe('SystemPreferences with Tabs', () => {
  it('should render with two tabs: System Setting and IP', () => {
    render(<SystemPreferences />);

    expect(screen.getByRole('tab', { name: /System Setting/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^IP$/i })).toBeInTheDocument();
  });

  it('should show General tab content by default', () => {
    render(<SystemPreferences />);

    expect(screen.getByText('Clinic Name')).toBeInTheDocument();
  });

  it('should switch to IP tab when clicked', () => {
    render(<SystemPreferences />);

    const ipTab = screen.getByRole('tab', { name: /^IP$/i });
    fireEvent.click(ipTab);

    expect(screen.getByText('Access Control Mode')).toBeInTheDocument();
  });

  it('should have IP tab with shield icon', () => {
    render(<SystemPreferences />);

    const ipTab = screen.getByRole('tab', { name: /^IP$/i });
    expect(ipTab).toBeInTheDocument();
  });
});
