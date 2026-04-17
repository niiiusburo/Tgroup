/**
 * IP Access Control Hook - API-backed
 * @crossref:used-in[IpAccessControl, AuthContext]
 * @crossref:uses[lib/api/ipAccess, types/ipAccessControl]
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type {
  IpEntry,
  IpAccessMode,
  IpValidationResult,
  IpAccessStats,
  IpAccessCheckResult,
  IpEntryType,
} from '@/types/ipAccessControl';
import {
  fetchIpAccessSettings,
  fetchIpAccessEntries,
  updateIpAccessSettings,
  createIpAccessEntry,
  updateIpAccessEntry,
  deleteIpAccessEntry,
} from '@/lib/api/ipAccess';

/** IPv4 validation regex */
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/** Result of add entry operation */
interface AddEntryResult {
  success: boolean;
  error?: string;
}

/**
 * Hook for managing IP access control via API
 * Provides CRUD operations for IP entries and access checking
 */
export function useIpAccessControl() {
  const [mode, setModeState] = useState<IpAccessMode>('allow_all');
  const [entries, setEntries] = useState<IpEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchIpAccessSettings(), fetchIpAccessEntries()])
      .then(([settings, entriesRes]) => {
        if (cancelled) return;
        setModeState(settings.mode);
        setEntries(entriesRes.entries);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load IP settings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Calculate statistics */
  const stats: IpAccessStats = useMemo(() => {
    const totalEntries = entries.length;
    const whitelistCount = entries.filter((e) => e.type === 'whitelist').length;
    const blacklistCount = entries.filter((e) => e.type === 'blacklist').length;
    const activeCount = entries.filter((e) => e.isActive).length;
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

    const octets = trimmed.split('.').map(Number);
    for (const octet of octets) {
      if (octet < 0 || octet > 255) {
        return { valid: false, error: 'IP octets must be between 0 and 255' };
      }
    }

    return { valid: true, normalized: trimmed };
  }, []);

  /** Check if an IP already exists in entries */
  const ipExists = useCallback(
    (ipAddress: string, type?: IpEntryType): boolean => {
      return entries.some(
        (e) => e.ipAddress === ipAddress.trim() && (type ? e.type === type : true)
      );
    },
    [entries]
  );

  /** Change access mode (persisted to API) */
  const setMode = useCallback(async (newMode: IpAccessMode) => {
    setModeState(newMode);
    try {
      await updateIpAccessSettings(newMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mode');
    }
  }, []);

  /** Add a new IP entry */
  const addEntry = useCallback(
    async (ipAddress: string, type: IpEntryType, description: string): Promise<AddEntryResult> => {
      const trimmedIp = ipAddress.trim();

      const validation = validateIp(trimmedIp);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      if (ipExists(trimmedIp, type)) {
        return { success: false, error: `IP address ${trimmedIp} already exists as ${type}` };
      }

      try {
        const newEntry = await createIpAccessEntry({
          ipAddress: trimmedIp,
          type,
          description: description.trim(),
        });
        setEntries((prev) => [...prev, newEntry]);
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to add entry';
        return { success: false, error: msg };
      }
    },
    [validateIp, ipExists]
  );

  /** Remove an entry by ID */
  const removeEntry = useCallback(async (id: string) => {
    try {
      await deleteIpAccessEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove entry');
    }
  }, []);

  /** Toggle entry active status */
  const toggleEntryActive = useCallback(async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    const next = !entry.isActive;
    // Optimistic update
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, isActive: next } : e)));

    try {
      await updateIpAccessEntry(id, { isActive: next });
    } catch (err) {
      // Rollback
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, isActive: entry.isActive } : e)));
      setError(err instanceof Error ? err.message : 'Failed to update entry');
    }
  }, [entries]);

  /** Update an entry */
  const updateEntry = useCallback(
    async (id: string, updates: { description?: string; type?: IpEntryType; isActive?: boolean }) => {
      try {
        const updated = await updateIpAccessEntry(id, updates);
        setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update entry');
      }
    },
    []
  );

  /** Check if an IP address is allowed based on current mode and entries */
  const isIpAllowed = useCallback(
    (ipAddress: string): IpAccessCheckResult => {
      const trimmedIp = ipAddress.trim();

      switch (mode) {
        case 'allow_all':
          return { allowed: true };

        case 'block_all':
          return { allowed: false, reason: 'Access denied: all IPs are blocked' };

        case 'whitelist_only': {
          const whitelistMatch = entries.find(
            (e) => e.ipAddress === trimmedIp && e.type === 'whitelist' && e.isActive
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
            (e) => e.ipAddress === trimmedIp && e.type === 'blacklist' && e.isActive
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
    },
    [mode, entries]
  );

  return {
    mode,
    setMode,
    entries,
    stats,
    loading,
    error,
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
