/**
 * TDD Tests for Timezone Core Infrastructure
 * Agent 1: Core Timezone Infrastructure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTodayInTimezone, formatInTimezone, TIMEZONES } from '@/lib/dateUtils';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Timezone Core Infrastructure', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('dateUtils', () => {
    describe('getTodayInTimezone', () => {
      it('should return date in Vietnam timezone format', () => {
        const date = getTodayInTimezone('Asia/Ho_Chi_Minh');
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it('should return today date for Vietnam timezone', () => {
        const date = getTodayInTimezone('Asia/Ho_Chi_Minh');
        // Should be valid date string
        expect(new Date(date).toString()).not.toBe('Invalid Date');
      });

      it('should return different dates for different timezones when near midnight', () => {
        // Mock a specific time near midnight UTC
        const mockDate = new Date('2026-04-08T23:30:00Z'); // 11:30 PM UTC
        vi.setSystemTime(mockDate);

        const vietnamDate = getTodayInTimezone('Asia/Ho_Chi_Minh');
        const utcDate = getTodayInTimezone('UTC');

        // Vietnam is UTC+7, so it should be next day
        expect(vietnamDate).toBe('2026-04-09');
        expect(utcDate).toBe('2026-04-08');

        vi.useRealTimers();
      });
    });

    describe('formatInTimezone', () => {
      it('should format date in specified timezone', () => {
        const date = new Date('2026-04-08T03:00:00Z');
        const formatted = formatInTimezone(date, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm');
        expect(formatted).toContain('2026-04-08');
      });

      it('should format date in UTC timezone', () => {
        const date = new Date('2026-04-08T03:00:00Z');
        const formatted = formatInTimezone(date, 'UTC', 'yyyy-MM-dd');
        expect(formatted).toBe('2026-04-08');
      });
    });

    describe('TIMEZONES', () => {
      it('should contain Vietnam timezone as default', () => {
        const vietnam = TIMEZONES.find(tz => tz.value === 'Asia/Ho_Chi_Minh');
        expect(vietnam).toBeDefined();
        expect(vietnam?.label).toContain('Vietnam');
      });

      it('should contain common timezones', () => {
        expect(TIMEZONES.some(tz => tz.value === 'UTC')).toBe(true);
        expect(TIMEZONES.some(tz => tz.value === 'America/New_York')).toBe(true);
        expect(TIMEZONES.some(tz => tz.value === 'Europe/London')).toBe(true);
        expect(TIMEZONES.some(tz => tz.value === 'Asia/Tokyo')).toBe(true);
      });

      it('should have Vietnam timezone first in the list', () => {
        expect(TIMEZONES[0].value).toBe('Asia/Ho_Chi_Minh');
      });
    });
  });
});
