/**
 * Mock data for IP Access Control
 * @crossref:used-in[useIpAccessControl, IpAccessControl]
 */

import type { IpEntry, IpAccessSettings } from '@/types/ipAccessControl';

/** Sample IP entries for development and testing */
export const MOCK_IP_ENTRIES: readonly IpEntry[] = [
  // Whitelist entries - clinic locations
  {
    id: 'ip-1',
    ipAddress: '192.168.1.100',
    type: 'whitelist',
    description: 'Main office - Gò Vấp branch',
    isActive: true,
    createdAt: '2024-01-15T08:30:00Z',
    createdBy: 'admin',
  },
  {
    id: 'ip-2',
    ipAddress: '192.168.2.50',
    type: 'whitelist',
    description: 'Quận 10 branch reception',
    isActive: true,
    createdAt: '2024-01-15T08:35:00Z',
    createdBy: 'admin',
  },
  {
    id: 'ip-3',
    ipAddress: '192.168.3.25',
    type: 'whitelist',
    description: 'Quận 3 branch manager office',
    isActive: true,
    createdAt: '2024-01-20T09:00:00Z',
    createdBy: 'admin',
  },
  {
    id: 'ip-4',
    ipAddress: '10.0.0.15',
    type: 'whitelist',
    description: 'IT Department - Remote access',
    isActive: false,
    createdAt: '2024-02-01T10:00:00Z',
    createdBy: 'admin',
  },
  // Blacklist entries - known malicious/suspicious IPs
  {
    id: 'ip-5',
    ipAddress: '203.0.113.50',
    type: 'blacklist',
    description: 'Suspicious login attempts',
    isActive: true,
    createdAt: '2024-02-10T14:20:00Z',
    createdBy: 'admin',
  },
  {
    id: 'ip-6',
    ipAddress: '198.51.100.75',
    type: 'blacklist',
    description: 'Blocked by security team',
    isActive: true,
    createdAt: '2024-02-15T16:45:00Z',
    createdBy: 'admin',
  },
  {
    id: 'ip-7',
    ipAddress: '172.16.0.200',
    type: 'blacklist',
    description: 'Old staff member - former employee',
    isActive: false,
    createdAt: '2024-01-05T11:30:00Z',
    createdBy: 'admin',
  },
  {
    id: 'ip-8',
    ipAddress: '203.0.113.99',
    type: 'blacklist',
    description: 'Brute force attack source',
    isActive: true,
    createdAt: '2024-03-01T08:00:00Z',
    createdBy: 'security',
  },
] as const;

/** Default IP access control settings */
export const DEFAULT_IP_ACCESS_SETTINGS: IpAccessSettings = {
  mode: 'allow_all',
  entries: [...MOCK_IP_ENTRIES],
  lastUpdated: new Date().toISOString(),
} as const;

/** Empty settings for reset/testing */
export const EMPTY_IP_ACCESS_SETTINGS: IpAccessSettings = {
  mode: 'allow_all',
  entries: [],
  lastUpdated: new Date().toISOString(),
} as const;
