/**
 * Tests for IpAccessControl Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IpAccessControl } from '@/components/settings/IpAccessControl';

// Mock the hook
vi.mock('@/hooks/useIpAccessControl', () => ({
  useIpAccessControl: () => ({
    mode: 'allow_all',
    setMode: vi.fn(),
    entries: [
      { id: 'ip-1', ipAddress: '192.168.1.1', type: 'whitelist', description: 'Office', isActive: true, createdAt: '2024-01-01', createdBy: 'admin' },
      { id: 'ip-2', ipAddress: '10.0.0.1', type: 'blacklist', description: 'Blocked', isActive: true, createdAt: '2024-01-01', createdBy: 'admin' },
      { id: 'ip-3', ipAddress: '172.16.0.1', type: 'whitelist', description: 'Inactive', isActive: false, createdAt: '2024-01-01', createdBy: 'admin' },
    ],
    stats: { totalEntries: 3, whitelistCount: 2, blacklistCount: 1, activeCount: 2, inactiveCount: 1 },
    loading: false,
    error: null,
    validateIp: (ip: string) => ({ valid: ip === '192.168.1.100', normalized: ip.trim() }),
    addEntry: vi.fn(() => Promise.resolve({ success: true })),
    removeEntry: vi.fn(() => Promise.resolve()),
    toggleEntryActive: vi.fn(() => Promise.resolve()),
    updateEntry: vi.fn(() => Promise.resolve()),
    isIpAllowed: () => ({ allowed: true }),
  }),
}));

describe('IpAccessControl Component', () => {
  it('should render with mode selector', () => {
    render(<IpAccessControl />);

    expect(screen.getByText('Access Control Mode')).toBeInTheDocument();
    expect(screen.getByLabelText(/Allow All/i)).toBeInTheDocument();
  });

  it('should display mode selector with four options', () => {
    render(<IpAccessControl />);

    expect(screen.getByLabelText(/Allow All/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Block All/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Whitelist Only/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Blacklist Block/i)).toBeInTheDocument();
  });

  it('should display IP entries table', () => {
    render(<IpAccessControl />);

    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
    expect(screen.getByText('Office')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('should display stats cards', () => {
    render(<IpAccessControl />);

    expect(screen.getByText('3')).toBeInTheDocument(); // Total entries
    expect(screen.getByText(/Total Entries/)).toBeInTheDocument();
  });

  it('should have add entry form with IP input', () => {
    render(<IpAccessControl />);

    expect(screen.getByRole('textbox', { name: /IP Address/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add IP/i })).toBeInTheDocument();
  });

  it('should show filter tabs', () => {
    render(<IpAccessControl />);

    expect(screen.getByRole('tab', { name: /All/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Whitelist/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Blacklist/i })).toBeInTheDocument();
  });

  it('should show type selector in add form', () => {
    render(<IpAccessControl />);

    const select = screen.getByLabelText(/Type/i);
    expect(select).toBeInTheDocument();
  });
});
