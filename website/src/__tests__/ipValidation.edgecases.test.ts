/**
 * Edge Case Tests for IP Validation
 * Agent 5: Security & Edge Cases
 */

import { describe, it, expect } from 'vitest';
import type { IpEntry, IpAccessSettings } from '@/types/ipAccessControl';
import { checkIpAccess } from '@/lib/ipAccessMiddleware';
import {
  isValidIpv4,
  normalizeIp,
  sanitizeIpInput,
  ipToLong,
  isPrivateIp,
  isIpInCidr,
  validateIpDetailed,
  validateIpDescription,
  isReservedIp,
} from '@/lib/ipValidation';

describe('IP Validation Edge Cases', () => {
  describe('isValidIpv4', () => {
    describe('Valid IPs', () => {
      it('should validate standard IPv4 addresses', () => {
        expect(isValidIpv4('192.168.1.1')).toBe(true);
        expect(isValidIpv4('10.0.0.1')).toBe(true);
        expect(isValidIpv4('172.16.0.1')).toBe(true);
      });

      it('should validate boundary values', () => {
        expect(isValidIpv4('0.0.0.0')).toBe(true);
        expect(isValidIpv4('255.255.255.255')).toBe(true);
        expect(isValidIpv4('1.1.1.1')).toBe(true);
      });

      it('should validate loopback', () => {
        expect(isValidIpv4('127.0.0.1')).toBe(true);
        expect(isValidIpv4('127.255.255.255')).toBe(true);
      });
    });

    describe('Invalid IPs - Out of Range', () => {
      it('should reject octets > 255', () => {
        expect(isValidIpv4('256.1.1.1')).toBe(false);
        expect(isValidIpv4('192.168.1.256')).toBe(false);
        expect(isValidIpv4('300.400.500.600')).toBe(false);
        expect(isValidIpv4('192.168.256.1')).toBe(false);
      });

      it('should reject negative numbers', () => {
        expect(isValidIpv4('-1.1.1.1')).toBe(false);
        expect(isValidIpv4('192.168.-1.1')).toBe(false);
      });
    });

    describe('Invalid IPs - Wrong Format', () => {
      it('should reject incomplete IPs', () => {
        expect(isValidIpv4('192.168.1')).toBe(false);
        expect(isValidIpv4('192.168')).toBe(false);
        expect(isValidIpv4('192')).toBe(false);
      });

      it('should reject IPs with extra octets', () => {
        expect(isValidIpv4('192.168.1.1.1')).toBe(false);
        expect(isValidIpv4('1.2.3.4.5.6')).toBe(false);
      });

      it('should reject trailing/leading dots', () => {
        expect(isValidIpv4('192.168.1.')).toBe(false);
        expect(isValidIpv4('.192.168.1.1')).toBe(false);
        expect(isValidIpv4('192.168..1')).toBe(false);
      });

      it('should reject non-numeric characters', () => {
        expect(isValidIpv4('abc.def.ghi.jkl')).toBe(false);
        expect(isValidIpv4('192.168.1.a')).toBe(false);
        expect(isValidIpv4('192.168.a.1')).toBe(false);
      });

      it('should reject empty and whitespace', () => {
        expect(isValidIpv4('')).toBe(false);
        expect(isValidIpv4('   ')).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle leading zeros', () => {
        expect(isValidIpv4('192.168.01.1')).toBe(true);
        expect(isValidIpv4('001.002.003.004')).toBe(true);
      });

      it('should handle whitespace', () => {
        expect(isValidIpv4(' 192.168.1.1 ')).toBe(true);
        expect(isValidIpv4('  192.168.1.1  ')).toBe(true);
      });

      it('should reject null and undefined', () => {
        expect(isValidIpv4(null as unknown as string)).toBe(false);
        expect(isValidIpv4(undefined as unknown as string)).toBe(false);
      });

      it('should reject non-string types', () => {
        expect(isValidIpv4(123 as unknown as string)).toBe(false);
        expect(isValidIpv4({} as unknown as string)).toBe(false);
        expect(isValidIpv4([] as unknown as string)).toBe(false);
      });
    });
  });

  describe('normalizeIp', () => {
    it('should trim whitespace', () => {
      expect(normalizeIp('  192.168.1.1  ')).toBe('192.168.1.1');
    });

    it('should lowercase', () => {
      expect(normalizeIp('192.168.1.1')).toBe('192.168.1.1');
    });

    it('should handle empty input', () => {
      expect(normalizeIp('')).toBe('');
      expect(normalizeIp('   ')).toBe('');
    });
  });

  describe('sanitizeIpInput', () => {
    it('should remove SQL injection characters', () => {
      expect(sanitizeIpInput("192.168.1.1' OR '1'='1")).toBe('192.168.1.1 OR 1=1');
      expect(sanitizeIpInput('192.168.1.1; DROP TABLE')).toBe('192.168.1.1 DROP TABLE');
    });

    it('should preserve valid characters', () => {
      expect(sanitizeIpInput('192.168.1.1')).toBe('192.168.1.1');
      expect(sanitizeIpInput('  192.168.1.1  ')).toBe('  192.168.1.1  ');
    });

    it('should handle SQL injection attempts', () => {
      expect(sanitizeIpInput("'; DELETE FROM users; --")).toBe(' DELETE FROM users ');
      expect(sanitizeIpInput('1 OR 1=1')).toBe('1 OR 1=1');
    });
  });

  describe('ipToLong', () => {
    it('should convert valid IPs to numbers', () => {
      expect(ipToLong('0.0.0.0')).toBe(0);
      expect(ipToLong('0.0.0.1')).toBe(1);
      expect(ipToLong('192.168.1.1')).toBe(3232235777);
      expect(ipToLong('255.255.255.255')).toBe(4294967295);
    });

    it('should return 0 for invalid IPs', () => {
      expect(ipToLong('invalid')).toBe(0);
      expect(ipToLong('')).toBe(0);
    });
  });

  describe('isPrivateIp', () => {
    it('should identify private range IPs', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.255.255.255')).toBe(true);
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      expect(isPrivateIp('192.168.0.1')).toBe(true);
      expect(isPrivateIp('192.168.255.255')).toBe(true);
      expect(isPrivateIp('127.0.0.1')).toBe(true);
    });

    it('should identify public IPs', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('203.0.113.1')).toBe(false);
    });

    it('should reject invalid IPs', () => {
      expect(isPrivateIp('invalid')).toBe(false);
    });
  });

  describe('isIpInCidr', () => {
    it('should match IPs in CIDR range', () => {
      expect(isIpInCidr('192.168.1.100', '192.168.1.0/24')).toBe(true);
      expect(isIpInCidr('192.168.1.1', '192.168.1.0/24')).toBe(true);
      expect(isIpInCidr('10.0.5.5', '10.0.0.0/8')).toBe(true);
    });

    it('should not match IPs outside CIDR range', () => {
      expect(isIpInCidr('192.168.2.1', '192.168.1.0/24')).toBe(false);
      expect(isIpInCidr('10.1.0.1', '10.0.0.0/16')).toBe(false);
    });

    it('should handle /32 exact match', () => {
      expect(isIpInCidr('192.168.1.1', '192.168.1.1/32')).toBe(true);
      expect(isIpInCidr('192.168.1.2', '192.168.1.1/32')).toBe(false);
    });

    it('should reject invalid inputs', () => {
      expect(isIpInCidr('invalid', '192.168.1.0/24')).toBe(false);
      expect(isIpInCidr('192.168.1.1', 'invalid')).toBe(false);
    });
  });

  describe('validateIpDetailed', () => {
    it('should provide specific error for empty input', () => {
      const result = validateIpDetailed('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should provide specific error for wrong octet count', () => {
      const result = validateIpDetailed('192.168.1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('4 octets');
    });

    it('should provide specific error for non-numeric characters', () => {
      const result = validateIpDetailed('192.168.1.a');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('numbers and dots');
    });

    it('should provide specific error for out of range octet', () => {
      const result = validateIpDetailed('192.168.256.1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Octet 3');
    });

    it('should reject very long inputs (DoS prevention)', () => {
      const longIp = '192.168.1.1' + '0'.repeat(100);
      const result = validateIpDetailed(longIp);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should detect SQL injection patterns', () => {
      const sqlAttempts = [
        "192.168.1.1'; DROP TABLE users; --",
        "192.168.1.1'; DELETE FROM",
        "192.168.1.1' UNION SELECT",
      ];

      for (const attempt of sqlAttempts) {
        const result = validateIpDetailed(attempt);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid characters');
      }
    });

    it('should return normalized IP on success', () => {
      const result = validateIpDetailed('  192.168.1.1  ');
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('192.168.1.1');
    });
  });

  describe('validateIpDescription', () => {
    it('should allow valid descriptions', () => {
      expect(validateIpDescription('Office network').valid).toBe(true);
      expect(validateIpDescription('Branch location #1').valid).toBe(true);
    });

    it('should allow empty descriptions', () => {
      expect(validateIpDescription('').valid).toBe(true);
    });

    it('should reject very long descriptions', () => {
      const longDesc = 'A'.repeat(501);
      const result = validateIpDescription(longDesc);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should reject script tags (XSS)', () => {
      const result = validateIpDescription('<script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid content');
    });

    it('should reject event handlers (XSS)', () => {
      const result = validateIpDescription('" onclick="alert(1)');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid content');
    });
  });

  describe('isReservedIp', () => {
    it('should identify 0.0.0.0/8 as reserved', () => {
      expect(isReservedIp('0.0.0.0')).toBe(true);
      expect(isReservedIp('0.255.255.255')).toBe(true);
    });

    it('should identify loopback as reserved', () => {
      expect(isReservedIp('127.0.0.1')).toBe(true);
      expect(isReservedIp('127.255.255.255')).toBe(true);
    });

    it('should identify link-local as reserved', () => {
      expect(isReservedIp('169.254.0.1')).toBe(true);
      expect(isReservedIp('169.254.255.255')).toBe(true);
    });

    it('should identify TEST-NET as reserved', () => {
      expect(isReservedIp('192.0.2.1')).toBe(true);
      expect(isReservedIp('198.51.100.1')).toBe(true);
      expect(isReservedIp('203.0.113.1')).toBe(true);
    });

    it('should identify broadcast as reserved', () => {
      expect(isReservedIp('255.255.255.255')).toBe(true);
    });

    it('should not identify normal IPs as reserved', () => {
      expect(isReservedIp('192.168.1.1')).toBe(false);
      expect(isReservedIp('10.0.0.1')).toBe(false);
      expect(isReservedIp('8.8.8.8')).toBe(false);
    });
  });
});

describe('Performance Tests', () => {
  it('should handle 1000 IP validations efficiently', () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      isValidIpv4(`192.168.${i % 256}.${Math.floor(i / 256) % 256}`);
    }

    const end = performance.now();
    expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
  });

  it('should handle large entry lists in access checks', () => {
    const entries: IpEntry[] = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i),
      ipAddress: `192.168.${Math.floor(i / 256) % 256}.${i % 256}`,
      type: i % 2 === 0 ? 'whitelist' : 'blacklist' as const,
      description: '',
      isActive: true,
      createdAt: '',
      createdBy: '',
    }));

    const settings: IpAccessSettings = {
      mode: 'whitelist_only',
      entries,
      lastUpdated: '',
    };

    const start = performance.now();
    checkIpAccess('192.168.0.500', settings);
    const end = performance.now();

    expect(end - start).toBeLessThan(50); // Should complete in less than 50ms
  });
});
