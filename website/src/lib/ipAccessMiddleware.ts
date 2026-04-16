/**
 * IP Access Control Middleware
 * @crossref:used-in[AuthContext, App]
 * @crossref:uses[ipAccessControl]
 */

import type {
  IpAccessSettings,
  IpAccessCheckResult,
} from '@/types/ipAccessControl';

/**
 * Check if an IP address is allowed based on access settings
 * Pure function - can be used on both client and server
 */
export function checkIpAccess(
  ipAddress: string,
  settings: IpAccessSettings
): IpAccessCheckResult {
  const trimmedIp = ipAddress.trim();

  switch (settings.mode) {
    case 'allow_all':
      return { allowed: true };

    case 'whitelist_only': {
      const whitelistMatch = settings.entries.find(
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
      const blacklistMatch = settings.entries.find(
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
}

/**
 * Log a blocked access attempt
 * In production, this should send to a security monitoring service
 */
export function logBlockedAccess(
  ipAddress: string,
  reason: string,
  userAgent?: string
): void {
  const timestamp = new Date().toISOString();
  console.warn(`[IP ACCESS BLOCKED] ${timestamp} - IP: ${ipAddress} - Reason: ${reason}`, {
    userAgent,
    ipAddress,
    reason,
    timestamp,
  });
}

/**
 * Middleware function for runtime IP checking
 * Returns true if access should be allowed, false otherwise
 */
export function middlewareIpCheck(
  clientIp: string,
  settings: IpAccessSettings,
  options?: { logBlocks?: boolean }
): boolean {
  const result = checkIpAccess(clientIp, settings);

  if (!result.allowed && options?.logBlocks) {
    logBlockedAccess(clientIp, result.reason || 'Unknown');
  }

  return result.allowed;
}

/**
 * Get client IP from various sources
 * Order of priority:
 * 1. X-Forwarded-For header (for proxied requests)
 * 2. X-Real-IP header
 * 3. Remote address
 */
export function getClientIpFromHeaders(
  headers: Record<string, string | string[] | undefined>
): string | null {
  // X-Forwarded-For can contain multiple IPs, take the first one
  const forwardedFor = headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;
    const firstIp = ips.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return null;
}
