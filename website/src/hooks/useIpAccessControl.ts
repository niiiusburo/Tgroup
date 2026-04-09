/**
 * IP Access Control Hook
 * @crossref:used-in[IpAccessControl, AuthContext]
 * @crossref:uses[mockIpAccessControl, ipAccessControl]
 */

import { useState, useMemo, useCallback } from 'react';
import type {
  IpEntry,
  IpAccessMode,
  IpAccessSettings,
  IpValidationResult,
  IpAccessStats,
  IpAccessCheckResult,
  IpEntryType,
} from '@/types/ipAccessControl';
import { DEFAULT_IP_ACCESS_SETTINGS } from '@/types/ipAccessControl';

/** IPv4 validation regex - matches xxx.xxx.xxx.xxx where xxx is 0-255 */
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/** Result of add entry operation */
interface AddEntryResult {
  success: boolean;
  error?: string;
}

/**
 * Hook for managing IP access control
 * Provides CRUD operations for IP entries and access checking
 */
export function useIpAccessControl(initialSettings: IpAccessSettings = DEFAULT_IP_ACCESS_SETTINGS) {
  const [mode, setMode] = useState<IpAccessMode>(initialSettings.mode);
  const [entries, setEntries] = useState<IpEntry[]>([...initialSettings.entries]);

  /** Calculate statistics */
  const stats: IpAccessStats = useMemo(() => {
    const totalEntries = entries.length;
    const whitelistCount = entries.filter(e => e.type === 'whitelist').length;
    const blacklistCount = entries.filter(e => e.type === 'blacklist').length;
    const activeCount = entries.filter(e => e.isActive).length;
    const inactiveCount = totalEntries - activeCount;

    return {
      totalEntries,
      whitelistCount,
      blacklistCount,
      activeCount,
      inactiveCount,
    };
  }, [entries]);

  /** Validate an IP address */
  const validateIp = useCallback((ipAddress: string): IpValidationResult => {
    const trimmed = ipAddress.trim();

    if (!trimmed) {
      return { valid: false, error: 'IP address is required' };
    }

    if (!IPV4_REGEX.test(trimmed)) {
      return { valid: false, error: 'Please enter a valid IPv4 address (e.g., 192.168.1.1)' };
    }

    // Check if IP is within valid range
    const octets = trimmed.split('.').map(Number);
    for (const octet of octets) {
      if (octet < 0 || octet > 255) {
        return { valid: false, error: 'IP octets must be between 0 and 255' };
      }
    }

    return { valid: true, normalized: trimmed };
  }, []);

  /** Check if an IP already exists in entries */
  const ipExists = useCallback((ipAddress: string): boolean => {
    return entries.some(e => e.ipAddress === ipAddress.trim());
  }, [entries]);

  /** Add a new IP entry */
  const addEntry = useCallback((
    ipAddress: string,
    type: IpEntryType,
    description: string
  ): AddEntryResult => {
    const trimmedIp = ipAddress.trim();

    // Validate IP format
    const validation = validateIp(trimmedIp);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check for duplicates
    if (ipExists(trimmedIp)) {
      return { success: false, error: `IP address ${trimmedIp} already exists` };
    }

    const newEntry: IpEntry = {
      id: `ip-${Date.now()}`,
      ipAddress: trimmedIp,
      type,
      description: description.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: 'admin', // TODO: Get from auth context
    };

    setEntries(prev => [...prev, newEntry]);
    return { success: true };
  }, [validateIp, ipExists]);

  /** Remove an entry by ID */
  const removeEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  /** Toggle entry active status */
  const toggleEntryActive = useCallback((id: string) => {
    setEntries(prev =>
      prev.map(e =>
        e.id === id ? { ...e, isActive: !e.isActive } : e
      )
    );
  }, []);

  /** Update an entry */
  const updateEntry = useCallback((
    id: string,
    updates: { description?: string; type?: IpEntryType; isActive?: boolean }
  ) => {
    setEntries(prev =>
      prev.map(e =>
        e.id === id
          ? { ...e, ...updates }
          : e
      )
    );
  }, []);

  /** Check if an IP address is allowed based on current mode and entries */
  const isIpAllowed = useCallback((ipAddress: string): IpAccessCheckResult => {
    const trimmedIp = ipAddress.trim();

    switch (mode) {
      case 'allow_all':
        return { allowed: true };

      case 'whitelist_only': {
        const whitelistMatch = entries.find(
          e => e.ipAddress === trimmedIp && e.type === 'whitelist' && e.isActive
        );
        if (whitelistMatch) {
          return { allowed: true, matchedEntry: whitelistMatch };
        }
        return {
          allowed: false,
          reason: 'Access denied: IP address is not in the whitelist',
        };
      }

      case 'blacklist_block': {
        const blacklistMatch = entries.find(
          e => e.ipAddress === trimmedIp && e.type === 'blacklist' && e.isActive
        );
        if (blacklistMatch) {
          return {
            allowed: false,
            reason: 'Access denied: IP address is in the blacklist',
            matchedEntry: blacklistMatch,
          };
        }
        return { allowed: true };
      }

      default:
        return { allowed: true };
    }
  }, [mode, entries]);

  return {
    mode,
    setMode,
    entries,
    stats,
    validateIp,
    addEntry,
    removeEntry,
    toggleEntryActive,
    updateEntry,
    isIpAllowed,
  };
}

/** Hook result type for external use */
export type UseIpAccessControlReturn = ReturnType<typeof useIpAccessControl>;
