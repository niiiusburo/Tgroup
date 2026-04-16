/**
 * TDD Tests for IP Access Control Types
 * Agent 1: Types & Mock Data
 * RED phase - these tests will fail until types are implemented
 */

import { describe, it, expect } from 'vitest';
import type { IpEntry, IpEntryType, IpAccessMode, IpAccessSettings } from '@/types/ipAccessControl';
import { MOCK_IP_ENTRIES, DEFAULT_IP_ACCESS_SETTINGS } from '@/data/mockIpAccessControl';

describe('IP Access Control Types', () => {
  describe('Type Definitions', () => {
    it('should have valid IpEntryType union', () => {
      const whitelist: IpEntryType = 'whitelist';
      const blacklist: IpEntryType = 'blacklist';
      expect(whitelist).toBe('whitelist');
      expect(blacklist).toBe('blacklist');
    });

    it('should have valid IpAccessMode union', () => {
      const allowAll: IpAccessMode = 'allow_all';
      const whitelistOnly: IpAccessMode = 'whitelist_only';
      const blacklistBlock: IpAccessMode = 'blacklist_block';
      expect(allowAll).toBe('allow_all');
      expect(whitelistOnly).toBe('whitelist_only');
      expect(blacklistBlock).toBe('blacklist_block');
    });

    it('should define IpEntry with required fields', () => {
      const entry: IpEntry = {
        id: 'test-1',
        ipAddress: '192.168.1.1',
        type: 'whitelist',
        description: 'Office network',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'admin',
      };

      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('ipAddress');
      expect(entry).toHaveProperty('type');
      expect(entry).toHaveProperty('description');
      expect(entry).toHaveProperty('isActive');
      expect(entry).toHaveProperty('createdAt');
      expect(entry).toHaveProperty('createdBy');
    });

    it('should define IpAccessSettings with required fields', () => {
      const settings: IpAccessSettings = {
        mode: 'whitelist_only',
        entries: [],
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      expect(settings).toHaveProperty('mode');
      expect(settings).toHaveProperty('entries');
      expect(settings).toHaveProperty('lastUpdated');
    });
  });

  describe('Mock Data', () => {
    it('should have MOCK_IP_ENTRIES with at least 6 entries', () => {
      expect(MOCK_IP_ENTRIES.length).toBeGreaterThanOrEqual(6);
    });

    it('should have entries with valid IP addresses', () => {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      
      for (const entry of MOCK_IP_ENTRIES) {
        expect(entry.ipAddress).toMatch(ipRegex);
      }
    });

    it('should have mix of whitelist and blacklist entries', () => {
      const whitelistCount = MOCK_IP_ENTRIES.filter(e => e.type === 'whitelist').length;
      const blacklistCount = MOCK_IP_ENTRIES.filter(e => e.type === 'blacklist').length;
      
      expect(whitelistCount).toBeGreaterThan(0);
      expect(blacklistCount).toBeGreaterThan(0);
    });

    it('should have all entries with required fields', () => {
      for (const entry of MOCK_IP_ENTRIES) {
        expect(entry.id).toBeTruthy();
        expect(entry.ipAddress).toBeTruthy();
        expect(['whitelist', 'blacklist']).toContain(entry.type);
        expect(typeof entry.isActive).toBe('boolean');
        expect(entry.createdAt).toBeTruthy();
        expect(entry.createdBy).toBeTruthy();
      }
    });

    it('should have DEFAULT_IP_ACCESS_SETTINGS with valid defaults', () => {
      expect(DEFAULT_IP_ACCESS_SETTINGS.mode).toBe('allow_all');
      expect(Array.isArray(DEFAULT_IP_ACCESS_SETTINGS.entries)).toBe(true);
      expect(DEFAULT_IP_ACCESS_SETTINGS.lastUpdated).toBeTruthy();
    });

    it('should include clinic-specific IPs in mock data', () => {
      const hasLocalIp = MOCK_IP_ENTRIES.some(e => e.ipAddress.startsWith('192.168.'));
      expect(hasLocalIp).toBe(true);
    });
  });

  describe('IP Validation Regex', () => {
    it('should validate correct IPv4 addresses', () => {
      const validIps = [
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1',
        '255.255.255.255',
        '0.0.0.0',
        '127.0.0.1',
      ];

      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

      for (const ip of validIps) {
        expect(ip).toMatch(ipRegex);
      }
    });

    it('should reject invalid IPv4 addresses', () => {
      const invalidIps = [
        '256.1.1.1',
        '192.168.1',
        '192.168.1.1.1',
        'abc.def.ghi.jkl',
        '',
        '192.168.1.',
      ];

      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

      for (const ip of invalidIps) {
        expect(ip).not.toMatch(ipRegex);
      }
    });
  });
});
