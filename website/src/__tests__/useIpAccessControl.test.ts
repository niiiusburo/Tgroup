/**
 * Tests for useIpAccessControl Hook (API-backed)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIpAccessControl } from '@/hooks/useIpAccessControl';

const mockEntries = [
  { id: 'ip-1', ipAddress: '192.168.1.1', type: 'whitelist' as const, description: 'Office', isActive: true, createdAt: '2024-01-01', createdBy: 'admin' },
  { id: 'ip-2', ipAddress: '10.0.0.1', type: 'blacklist' as const, description: 'Blocked', isActive: true, createdAt: '2024-01-01', createdBy: 'admin' },
  { id: 'ip-3', ipAddress: '172.16.0.1', type: 'whitelist' as const, description: 'Inactive', isActive: false, createdAt: '2024-01-01', createdBy: 'admin' },
];

vi.mock('@/lib/api/ipAccess', () => ({
  fetchIpAccessSettings: vi.fn(() => Promise.resolve({ id: 's1', mode: 'allow_all', lastUpdated: '2024-01-01' })),
  fetchIpAccessEntries: vi.fn(() => Promise.resolve({ entries: [...mockEntries] })),
  updateIpAccessSettings: vi.fn((mode) => Promise.resolve({ id: 's1', mode, lastUpdated: new Date().toISOString() })),
  createIpAccessEntry: vi.fn((data) => Promise.resolve({ id: 'ip-new', ...data, isActive: true, createdAt: new Date().toISOString(), createdBy: 'admin' })),
  updateIpAccessEntry: vi.fn((id, updates) => {
    const entry = mockEntries.find((e) => e.id === id);
    return Promise.resolve({ ...entry, ...updates } as typeof entry & typeof updates);
  }),
  deleteIpAccessEntry: vi.fn(() => Promise.resolve()),
}));

describe('useIpAccessControl Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with API data', async () => {
      const { result } = renderHook(() => useIpAccessControl());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.mode).toBe('allow_all');
      expect(result.current.entries.length).toBe(mockEntries.length);
      expect(result.current.stats.totalEntries).toBe(mockEntries.length);
    });

    it('should calculate stats correctly', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const stats = result.current.stats;
      expect(stats.totalEntries).toBe(result.current.entries.length);
      expect(stats.whitelistCount + stats.blacklistCount).toBe(stats.totalEntries);
      expect(stats.activeCount + stats.inactiveCount).toBe(stats.totalEntries);
    });
  });

  describe('IP Validation', () => {
    it('should validate correct IPv4 addresses', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const validIps = ['192.168.1.1', '10.0.0.1', '255.255.255.255', '127.0.0.1'];
      for (const ip of validIps) {
        const validation = result.current.validateIp(ip);
        expect(validation.valid).toBe(true);
        expect(validation.error).toBeUndefined();
      }
    });

    it('should reject invalid IPv4 addresses', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const invalidIps = ['256.1.1.1', '192.168.1', '192.168.1.1.1', 'abc.def.ghi.jkl', '', '192.168.1.'];
      for (const ip of invalidIps) {
        const validation = result.current.validateIp(ip);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBeTruthy();
      }
    });

    it('should trim whitespace from IP addresses', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const validation = result.current.validateIp('  192.168.1.1  ');
      expect(validation.valid).toBe(true);
      expect(validation.normalized).toBe('192.168.1.1');
    });
  });

  describe('Adding Entries', () => {
    it('should add a valid IP entry', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const initialCount = result.current.entries.length;

      await act(async () => {
        const res = await result.current.addEntry('1.2.3.4', 'whitelist', 'Test entry');
        expect(res.success).toBe(true);
      });

      expect(result.current.entries.length).toBe(initialCount + 1);
      const added = result.current.entries.find((e) => e.ipAddress === '1.2.3.4');
      expect(added).toBeTruthy();
      expect(added?.type).toBe('whitelist');
    });

    it('should reject duplicate IPs', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const existingIp = result.current.entries[0].ipAddress;
      const existingType = result.current.entries[0].type;

      const addResult = await act(async () =>
        result.current.addEntry(existingIp, existingType, 'Duplicate')
      );

      expect(addResult).toEqual({ success: false, error: expect.stringContaining('already exists') });
    });

    it('should reject invalid IP format', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const addResult = await act(async () =>
        result.current.addEntry('invalid', 'whitelist', 'Bad IP')
      );

      expect(addResult).toEqual({ success: false, error: expect.stringContaining('valid') });
    });
  });

  describe('Removing Entries', () => {
    it('should remove an entry by ID', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const idToRemove = result.current.entries[0].id;
      const initialCount = result.current.entries.length;

      await act(async () => {
        await result.current.removeEntry(idToRemove);
      });

      expect(result.current.entries.length).toBe(initialCount - 1);
      expect(result.current.entries.find((e) => e.id === idToRemove)).toBeUndefined();
    });
  });

  describe('Toggling Entry Status', () => {
    it('should toggle entry active status', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const entry = result.current.entries[0];
      const originalStatus = entry.isActive;

      await act(async () => {
        await result.current.toggleEntryActive(entry.id);
      });

      const updated = result.current.entries.find((e) => e.id === entry.id);
      expect(updated?.isActive).toBe(!originalStatus);
    });
  });

  describe('Updating Entries', () => {
    it('should update entry description', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const entry = result.current.entries[0];

      await act(async () => {
        await result.current.updateEntry(entry.id, { description: 'Updated description' });
      });

      const updated = result.current.entries.find((e) => e.id === entry.id);
      expect(updated?.description).toBe('Updated description');
    });

    it('should update entry type', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const entry = result.current.entries.find((e) => e.type === 'whitelist');
      if (!entry) return;

      await act(async () => {
        await result.current.updateEntry(entry.id, { type: 'blacklist' });
      });

      const updated = result.current.entries.find((e) => e.id === entry.id);
      expect(updated?.type).toBe('blacklist');
    });
  });

  describe('Access Mode', () => {
    it('should change access mode', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.setMode('whitelist_only');
      });

      expect(result.current.mode).toBe('whitelist_only');
    });
  });

  describe('isIpAllowed - allow_all mode', () => {
    it('should allow any IP when mode is allow_all', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setMode('allow_all');
      });

      expect(result.current.isIpAllowed('192.168.1.1')).toEqual({ allowed: true });
      expect(result.current.isIpAllowed('1.2.3.4')).toEqual({ allowed: true });
      expect(result.current.isIpAllowed('10.0.0.1')).toEqual({ allowed: true });
    });
  });

  describe('isIpAllowed - block_all mode', () => {
    it('should block any IP when mode is block_all', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.setMode('block_all');
      });

      const check = result.current.isIpAllowed('192.168.1.1');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('all IPs are blocked');
    });
  });

  describe('isIpAllowed - whitelist_only mode', () => {
    it('should allow IP if in active whitelist', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const whitelistIp = result.current.entries.find((e) => e.type === 'whitelist' && e.isActive)?.ipAddress;
      if (!whitelistIp) return;

      await act(async () => {
        await result.current.setMode('whitelist_only');
      });

      const check = result.current.isIpAllowed(whitelistIp);
      expect(check.allowed).toBe(true);
    });

    it('should block IP if not in whitelist', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.setMode('whitelist_only');
      });

      const check = result.current.isIpAllowed('1.2.3.4');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('not in the whitelist');
    });

    it('should block IP if in inactive whitelist entry', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const inactiveEntry = result.current.entries.find((e) => e.type === 'whitelist' && !e.isActive);
      if (!inactiveEntry) return;

      await act(async () => {
        await result.current.setMode('whitelist_only');
      });

      const check = result.current.isIpAllowed(inactiveEntry.ipAddress);
      expect(check.allowed).toBe(false);
    });
  });

  describe('isIpAllowed - blacklist_block mode', () => {
    it('should block IP if in active blacklist', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const blacklistIp = result.current.entries.find((e) => e.type === 'blacklist' && e.isActive)?.ipAddress;
      if (!blacklistIp) return;

      await act(async () => {
        await result.current.setMode('blacklist_block');
      });

      const check = result.current.isIpAllowed(blacklistIp);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('blacklist');
    });

    it('should allow IP if not in blacklist', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.setMode('blacklist_block');
      });

      const check = result.current.isIpAllowed('1.2.3.4');
      expect(check.allowed).toBe(true);
    });

    it('should allow IP if in inactive blacklist entry', async () => {
      const { result } = renderHook(() => useIpAccessControl());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const inactiveEntry = result.current.entries.find((e) => e.type === 'blacklist' && !e.isActive);
      if (!inactiveEntry) return;

      await act(async () => {
        await result.current.setMode('blacklist_block');
      });

      const check = result.current.isIpAllowed(inactiveEntry.ipAddress);
      expect(check.allowed).toBe(true);
    });
  });
});
