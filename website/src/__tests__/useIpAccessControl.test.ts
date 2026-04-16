/**
 * TDD Tests for useIpAccessControl Hook
 * Agent 2: Hook & Business Logic
 * RED phase - tests will fail until hook is implemented
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIpAccessControl } from '@/hooks/useIpAccessControl';

describe('useIpAccessControl Hook', () => {
  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useIpAccessControl());

      expect(result.current.mode).toBe('allow_all');
      expect(result.current.entries).toBeInstanceOf(Array);
      expect(result.current.entries.length).toBeGreaterThan(0);
      expect(result.current.stats.totalEntries).toBeGreaterThan(0);
    });

    it('should calculate stats correctly', () => {
      const { result } = renderHook(() => useIpAccessControl());

      const stats = result.current.stats;
      expect(stats.totalEntries).toBe(result.current.entries.length);
      expect(stats.whitelistCount + stats.blacklistCount).toBe(stats.totalEntries);
      expect(stats.activeCount + stats.inactiveCount).toBe(stats.totalEntries);
    });
  });

  describe('IP Validation', () => {
    it('should validate correct IPv4 addresses', () => {
      const { result } = renderHook(() => useIpAccessControl());

      const validIps = ['192.168.1.1', '10.0.0.1', '255.255.255.255', '127.0.0.1'];
      
      for (const ip of validIps) {
        const validation = result.current.validateIp(ip);
        expect(validation.valid).toBe(true);
        expect(validation.error).toBeUndefined();
      }
    });

    it('should reject invalid IPv4 addresses', () => {
      const { result } = renderHook(() => useIpAccessControl());

      const invalidIps = [
        { ip: '256.1.1.1', error: 'out of range' },
        { ip: '192.168.1', error: 'incomplete' },
        { ip: '192.168.1.1.1', error: 'too many octets' },
        { ip: 'abc.def.ghi.jkl', error: 'invalid format' },
        { ip: '', error: 'empty' },
        { ip: '192.168.1.', error: 'trailing dot' },
      ];

      for (const { ip } of invalidIps) {
        const validation = result.current.validateIp(ip);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBeTruthy();
      }
    });

    it('should trim whitespace from IP addresses', () => {
      const { result } = renderHook(() => useIpAccessControl());

      const validation = result.current.validateIp('  192.168.1.1  ');
      expect(validation.valid).toBe(true);
      expect(validation.normalized).toBe('192.168.1.1');
    });
  });

  describe('Adding Entries', () => {
    it('should add a valid IP entry', () => {
      const { result } = renderHook(() => useIpAccessControl());
      const initialCount = result.current.entries.length;

      act(() => {
        result.current.addEntry('172.16.0.1', 'whitelist', 'Test entry');
      });

      expect(result.current.entries.length).toBe(initialCount + 1);
      const added = result.current.entries.find(e => e.ipAddress === '172.16.0.1');
      expect(added).toBeTruthy();
      expect(added?.type).toBe('whitelist');
      expect(added?.description).toBe('Test entry');
    });

    it('should reject duplicate IPs', () => {
      const { result } = renderHook(() => useIpAccessControl());
      const existingIp = result.current.entries[0].ipAddress;

      let addResult;
      act(() => {
        addResult = result.current.addEntry(existingIp, 'whitelist', 'Duplicate');
      });

      expect(addResult).toEqual({ success: false, error: expect.stringContaining('already exists') });
    });

    it('should reject invalid IP format', () => {
      const { result } = renderHook(() => useIpAccessControl());

      let addResult;
      act(() => {
        addResult = result.current.addEntry('invalid', 'whitelist', 'Bad IP');
      });

      expect(addResult).toEqual({ success: false, error: expect.stringContaining('valid') });
    });
  });

  describe('Removing Entries', () => {
    it('should remove an entry by ID', () => {
      const { result } = renderHook(() => useIpAccessControl());
      const idToRemove = result.current.entries[0].id;
      const initialCount = result.current.entries.length;

      act(() => {
        result.current.removeEntry(idToRemove);
      });

      expect(result.current.entries.length).toBe(initialCount - 1);
      expect(result.current.entries.find(e => e.id === idToRemove)).toBeUndefined();
    });
  });

  describe('Toggling Entry Status', () => {
    it('should toggle entry active status', () => {
      const { result } = renderHook(() => useIpAccessControl());
      const entry = result.current.entries[0];
      const originalStatus = entry.isActive;

      act(() => {
        result.current.toggleEntryActive(entry.id);
      });

      const updated = result.current.entries.find(e => e.id === entry.id);
      expect(updated?.isActive).toBe(!originalStatus);
    });
  });

  describe('Updating Entries', () => {
    it('should update entry description', () => {
      const { result } = renderHook(() => useIpAccessControl());
      const entry = result.current.entries[0];

      act(() => {
        result.current.updateEntry(entry.id, { description: 'Updated description' });
      });

      const updated = result.current.entries.find(e => e.id === entry.id);
      expect(updated?.description).toBe('Updated description');
    });

    it('should update entry type', () => {
      const { result } = renderHook(() => useIpAccessControl());
      const entry = result.current.entries.find(e => e.type === 'whitelist');
      if (!entry) return;

      act(() => {
        result.current.updateEntry(entry.id, { type: 'blacklist' });
      });

      const updated = result.current.entries.find(e => e.id === entry.id);
      expect(updated?.type).toBe('blacklist');
    });
  });

  describe('Access Mode', () => {
    it('should change access mode', () => {
      const { result } = renderHook(() => useIpAccessControl());

      act(() => {
        result.current.setMode('whitelist_only');
      });

      expect(result.current.mode).toBe('whitelist_only');
    });
  });

  describe('isIpAllowed - allow_all mode', () => {
    it('should allow any IP when mode is allow_all', () => {
      const { result } = renderHook(() => useIpAccessControl());

      // Ensure mode is allow_all
      act(() => {
        result.current.setMode('allow_all');
      });

      expect(result.current.isIpAllowed('192.168.1.1')).toEqual({ allowed: true });
      expect(result.current.isIpAllowed('1.2.3.4')).toEqual({ allowed: true });
      expect(result.current.isIpAllowed('10.0.0.1')).toEqual({ allowed: true });
    });
  });

  describe('isIpAllowed - whitelist_only mode', () => {
    it('should allow IP if in active whitelist', () => {
      const { result } = renderHook(() => useIpAccessControl());
      const whitelistIp = result.current.entries.find(e => e.type === 'whitelist' && e.isActive)?.ipAddress;
      if (!whitelistIp) return;

      act(() => {
        result.current.setMode('whitelist_only');
      });

      const check = result.current.isIpAllowed(whitelistIp);
      expect(check.allowed).toBe(true);
    });

    it('should block IP if not in whitelist', () => {
      const { result } = renderHook(() => useIpAccessControl());

      act(() => {
        result.current.setMode('whitelist_only');
      });

      const check = result.current.isIpAllowed('1.2.3.4');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('not in the whitelist');
    });

    it('should block IP if in inactive whitelist entry', () => {
      const { result } = renderHook(() => useIpAccessControl());
      const inactiveEntry = result.current.entries.find(e => e.type === 'whitelist' && !e.isActive);
      if (!inactiveEntry) return;

      act(() => {
        result.current.setMode('whitelist_only');
      });

      const check = result.current.isIpAllowed(inactiveEntry.ipAddress);
      expect(check.allowed).toBe(false);
    });
  });

  describe('isIpAllowed - blacklist_block mode', () => {
    it('should block IP if in active blacklist', () => {
      const { result } = renderHook(() => useIpAccessControl());
      const blacklistIp = result.current.entries.find(e => e.type === 'blacklist' && e.isActive)?.ipAddress;
      if (!blacklistIp) return;

      act(() => {
        result.current.setMode('blacklist_block');
      });

      const check = result.current.isIpAllowed(blacklistIp);
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('blacklist');
    });

    it('should allow IP if not in blacklist', () => {
      const { result } = renderHook(() => useIpAccessControl());

      act(() => {
        result.current.setMode('blacklist_block');
      });

      const check = result.current.isIpAllowed('1.2.3.4');
      expect(check.allowed).toBe(true);
    });

    it('should allow IP if in inactive blacklist entry', () => {
      const { result } = renderHook(() => useIpAccessControl());
      const inactiveEntry = result.current.entries.find(e => e.type === 'blacklist' && !e.isActive);
      if (!inactiveEntry) return;

      act(() => {
        result.current.setMode('blacklist_block');
      });

      const check = result.current.isIpAllowed(inactiveEntry.ipAddress);
      expect(check.allowed).toBe(true);
    });
  });
});
