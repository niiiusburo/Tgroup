/**
 * IP Validation Utilities
 * @crossref:used-in[useIpAccessControl, ipAccessMiddleware]
 */

import type { IpValidationResult } from '@/types/ipAccessControl';

/** IPv4 validation regex */
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/** Private IP ranges */
const PRIVATE_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' }, // Loopback
];

/**
 * Validate IPv4 address format
 */
export function isValidIpv4(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  return IPV4_REGEX.test(ip.trim());
}

/**
 * Normalize IP address (trim whitespace, lowercase)
 */
export function normalizeIp(ip: string): string {
  if (!ip || typeof ip !== 'string') return '';
  return ip.trim().toLowerCase();
}

/**
 * Sanitize user input for IP addresses
 * Removes dangerous characters that could be used for injection
 */
export function sanitizeIpInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Remove SQL injection characters but keep alphanumeric and spaces for descriptions
  // This allows "DROP TABLE" to remain but removes quotes, semicolons, etc.
  return input.replace(/['";\-\/\*\(\)\{\}\[\]<>\\]/g, '');
}

/**
 * Convert IP address to numeric representation for range checking
 */
export function ipToLong(ip: string): number {
  const trimmed = ip.trim();
  if (!isValidIpv4(trimmed)) return 0;

  const octets = trimmed.split('.').map(Number);
  return ((octets[0] << 24) >>> 0) + ((octets[1] << 16) >>> 0) + ((octets[2] << 8) >>> 0) + octets[3];
}

/**
 * Check if IP is in a private/LAN range
 */
export function isPrivateIp(ip: string): boolean {
  const trimmed = ip.trim();
  if (!isValidIpv4(trimmed)) return false;

  const ipLong = ipToLong(trimmed);

  for (const range of PRIVATE_RANGES) {
    const startLong = ipToLong(range.start);
    const endLong = ipToLong(range.end);
    if (ipLong >= startLong && ipLong <= endLong) {
      return true;
    }
  }

  return false;
}

/**
 * Check if IP is in a CIDR range
 * e.g., isIpInCidr('192.168.1.100', '192.168.1.0/24') => true
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
  const trimmedIp = ip.trim();
  if (!isValidIpv4(trimmedIp)) return false;

  const [rangeIp, prefixStr] = cidr.split('/');
  if (!rangeIp || !prefixStr) return false;

  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const ipLong = ipToLong(trimmedIp);
  const rangeLong = ipToLong(rangeIp);

  const mask = 0xFFFFFFFF << (32 - prefix);
  return (ipLong & mask) === (rangeLong & mask);
}

/**
 * Comprehensive IP validation with detailed error messages
 */
export function validateIpDetailed(ip: string): IpValidationResult {
  const trimmed = normalizeIp(ip);

  // Check empty
  if (!trimmed) {
    return { valid: false, error: 'IP address is required' };
  }

  // Check length (prevent DoS with very long strings)
  if (trimmed.length > 45) {
    return { valid: false, error: 'IP address is too long' };
  }

  // Check for SQL injection patterns
  const sqlPatterns = ["'", ';', '--', '/*', '*/', 'xp_', 'sp_', 'union', 'select', 'insert', 'delete', 'drop'];
  const lowerTrimmed = trimmed.toLowerCase();
  for (const pattern of sqlPatterns) {
    if (lowerTrimmed.includes(pattern)) {
      return { valid: false, error: 'Invalid characters in IP address' };
    }
  }

  // Check octet count
  const octets = trimmed.split('.');
  if (octets.length !== 4) {
    return { valid: false, error: 'IP address must have 4 octets (e.g., 192.168.1.1)' };
  }

  // Check for non-numeric characters
  if (/[^0-9.]/.test(trimmed)) {
    return { valid: false, error: 'IP address can only contain numbers and dots' };
  }

  // Check octet ranges before regex (to provide specific error)
  for (let i = 0; i < octets.length; i++) {
    const octet = parseInt(octets[i], 10);
    if (isNaN(octet) || octet < 0 || octet > 255) {
      return { valid: false, error: `Octet ${i + 1} must be between 0 and 255` };
    }
  }

  // Final format check
  if (!IPV4_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid IP address format. Use format: xxx.xxx.xxx.xxx' };
  }

  // Validation already done above

  return { valid: true, normalized: trimmed };
}

/**
 * Validate description field for IP entries
 * Prevents XSS and injection attacks
 */
export function validateIpDescription(description: string): { valid: boolean; error?: string } {
  if (!description) return { valid: true };

  // Check length
  if (description.length > 500) {
    return { valid: false, error: 'Description is too long (max 500 characters)' };
  }

  // Check for script tags (XSS prevention)
  const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  if (xssPattern.test(description)) {
    return { valid: false, error: 'Description contains invalid content' };
  }

  // Check for event handlers (XSS prevention)
  const eventHandlerPattern = /\bon\w+\s*=/i;
  if (eventHandlerPattern.test(description)) {
    return { valid: false, error: 'Description contains invalid content' };
  }

  return { valid: true };
}

/**
 * Check if IP is reserved/special
 */
export function isReservedIp(ip: string): boolean {
  const trimmed = ip.trim();
  if (!isValidIpv4(trimmed)) return false;

  const octets = trimmed.split('.').map(Number);

  // 0.0.0.0/8 - Current network
  if (octets[0] === 0) return true;

  // 127.0.0.0/8 - Loopback
  if (octets[0] === 127) return true;

  // 169.254.0.0/16 - Link-local
  if (octets[0] === 169 && octets[1] === 254) return true;

  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 - TEST-NET
  if (octets[0] === 192 && octets[1] === 0 && octets[2] === 2) return true;
  if (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) return true;
  if (octets[0] === 203 && octets[1] === 0 && octets[2] === 113) return true;

  // 255.255.255.255 - Broadcast
  if (octets.every(o => o === 255)) return true;

  return false;
}
