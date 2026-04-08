/**
 * Hook to detect client's IP address
 * @crossref:used-in[AuthContext, IpAccessControl]
 */

import { useState, useEffect, useCallback } from 'react';

interface UseClientIpResult {
  ip: string | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Fetch client IP from a public IP API
 * Uses ipapi.co with fallback to ipify
 */
async function fetchClientIp(): Promise<string> {
  try {
    // Primary: ipapi.co
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      if (data.ip) return data.ip;
    }
  } catch {
    // Fallback: ipify
  }

  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (response.ok) {
      const data = await response.json();
      if (data.ip) return data.ip;
    }
  } catch {
    // Both failed
  }

  throw new Error('Unable to determine client IP address');
}

/**
 * Hook to get the client's public IP address
 */
export function useClientIp(): UseClientIpResult {
  const [ip, setIp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchIp = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const clientIp = await fetchClientIp();
      setIp(clientIp);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIp(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIp();
  }, [fetchIp]);

  return {
    ip,
    loading,
    error,
    refresh: fetchIp,
  };
}
