/**
 * Tests for IP Access Integration
 */

import { describe, it, expect } from 'vitest';
import { useIpAccessControl } from '@/hooks/useIpAccessControl';
import { checkIpAccess } from '@/lib/ipAccessMiddleware';
import type { IpAccessSettings, IpEntry } from '@/types/ipAccessControl';

describe('IP Access Integration', () => {
  describe('Settings Page Integration', () => {
    it('should export useIpAccessControl hook', () => {
      expect(useIpAccessControl).toBeDefined();
      expect(typeof useIpAccessControl).toBe('function');
    });

    it('should export checkIpAccess middleware function', () => {
      expect(checkIpAccess).toBeDefined();
      expect(typeof checkIpAccess).toBe('function');
    });
  });

  describe('checkIpAccess - allow_all mode', () => {
    const settings: IpAccessSettings = {
      mode: 'allow_all',
      entries: [],
      lastUpdated: '2024-01-01',
    };

    it('should allow any IP when mode is allow_all', () => {
      expect(checkIpAccess('192.168.1.1', settings)).toEqual({ allowed: true });
      expect(checkIpAccess('1.2.3.4', settings)).toEqual({ allowed: true });
      expect(checkIpAccess('10.0.0.1', settings)).toEqual({ allowed: true });
    });
  });

  describe('checkIpAccess - block_all mode', () => {
    const settings: IpAccessSettings = {
      mode: 'block_all',
      entries: [],
      lastUpdated: '2024-01-01',
    };

    it('should block any IP when mode is block_all', () => {
      expect(checkIpAccess('192.168.1.1', settings).allowed).toBe(false);
      expect(checkIpAccess('1.2.3.4', settings).allowed).toBe(false);
      expect(checkIpAccess('10.0.0.1', settings).allowed).toBe(false);
    });

    it('should return reason for block_all', () => {
      const result = checkIpAccess('192.168.1.1', settings);
      expect(result.reason).toContain('all IPs are blocked');
    });
  });

  describe('checkIpAccess - whitelist_only mode', () => {
    const entries: IpEntry[] = [
      { id: '1', ipAddress: '192.168.1.1', type: 'whitelist', description: '', isActive: true, createdAt: '', createdBy: '' },
      { id: '2', ipAddress: '10.0.0.1', type: 'whitelist', description: '', isActive: false, createdBy: '', createdAt: '' },
      { id: '3', ipAddress: '172.16.0.1', type: 'blacklist', description: '', isActive: true, createdBy: '', createdAt: '' },
    ];

    const settings: IpAccessSettings = {
      mode: 'whitelist_only',
      entries,
      lastUpdated: '2024-01-01',
    };

    it('should allow IP if in active whitelist', () => {
      const result = checkIpAccess('192.168.1.1', settings);
      expect(result.allowed).toBe(true);
    });

    it('should block IP if not in whitelist', () => {
      const result = checkIpAccess('1.2.3.4', settings);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in the whitelist');
    });

    it('should block IP if in inactive whitelist entry', () => {
      const result = checkIpAccess('10.0.0.1', settings);
      expect(result.allowed).toBe(false);
    });

    it('should block IP even if in blacklist (whitelist mode only checks whitelist)', () => {
      const result = checkIpAccess('172.16.0.1', settings);
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkIpAccess - blacklist_block mode', () => {
    const entries: IpEntry[] = [
      { id: '1', ipAddress: '192.168.1.1', type: 'blacklist', description: '', isActive: true, createdBy: '', createdAt: '' },
      { id: '2', ipAddress: '10.0.0.1', type: 'blacklist', description: '', isActive: false, createdBy: '', createdAt: '' },
      { id: '3', ipAddress: '172.16.0.1', type: 'whitelist', description: '', isActive: true, createdBy: '', createdAt: '' },
    ];

    const settings: IpAccessSettings = {
      mode: 'blacklist_block',
      entries,
      lastUpdated: '2024-01-01',
    };

    it('should block IP if in active blacklist', () => {
      const result = checkIpAccess('192.168.1.1', settings);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('blacklist');
    });

    it('should allow IP if not in blacklist', () => {
      const result = checkIpAccess('1.2.3.4', settings);
      expect(result.allowed).toBe(true);
    });

    it('should allow IP if in inactive blacklist entry', () => {
      const result = checkIpAccess('10.0.0.1', settings);
      expect(result.allowed).toBe(true);
    });

    it('should allow IP even if in whitelist (blacklist mode only checks blacklist)', () => {
      const result = checkIpAccess('172.16.0.1', settings);
      expect(result.allowed).toBe(true);
    });
  });

  describe('IP matching logic', () => {
    it('should match exact IP addresses', () => {
      const entries: IpEntry[] = [
        { id: '1', ipAddress: '192.168.1.1', type: 'blacklist', description: '', isActive: true, createdBy: '', createdAt: '' },
      ];

      const settings: IpAccessSettings = {
        mode: 'blacklist_block',
        entries,
        lastUpdated: '2024-01-01',
      };

      expect(checkIpAccess('192.168.1.1', settings).allowed).toBe(false);
      expect(checkIpAccess('192.168.1.2', settings).allowed).toBe(true);
      expect(checkIpAccess('192.168.1.10', settings).allowed).toBe(true);
    });

    it('should trim whitespace from input IP', () => {
      const entries: IpEntry[] = [
        { id: '1', ipAddress: '192.168.1.1', type: 'whitelist', description: '', isActive: true, createdBy: '', createdAt: '' },
      ];

      const settings: IpAccessSettings = {
        mode: 'whitelist_only',
        entries,
        lastUpdated: '2024-01-01',
      };

      expect(checkIpAccess('  192.168.1.1  ', settings).allowed).toBe(true);
    });
  });

  describe('useClientIp hook requirements', () => {
    it('should have useClientIp defined', async () => {
      const { useClientIp } = await import('@/hooks/useClientIp');
      expect(useClientIp).toBeDefined();
      expect(typeof useClientIp).toBe('function');
    });
  });
});
