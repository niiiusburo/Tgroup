/**
 * TDD Tests for useVersionCheck
 * Bug: getBuildTimeVersion reads window.__APP_VERSION__ which Vite define
 * does NOT replace at runtime, causing infinite update loop.
 * Fix: read globalThis.__APP_VERSION__ instead.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getBuildTimeVersion } from '@/hooks/useVersionCheck';

describe('useVersionCheck', () => {
  describe('getBuildTimeVersion', () => {
    beforeEach(() => {
      // Clean up globals between tests
      (globalThis as Record<string, unknown>).__APP_VERSION__ = undefined;
      (window as Record<string, unknown>).__APP_VERSION__ = undefined;
      (globalThis as Record<string, unknown>).__APP_BUILD_TIME__ = undefined;
      (window as Record<string, unknown>).__APP_BUILD_TIME__ = undefined;
      (globalThis as Record<string, unknown>).__APP_GIT_COMMIT__ = undefined;
      (window as Record<string, unknown>).__APP_GIT_COMMIT__ = undefined;
      (globalThis as Record<string, unknown>).__APP_GIT_BRANCH__ = undefined;
      (window as Record<string, unknown>).__APP_GIT_BRANCH__ = undefined;
    });

    it('should read version from globalThis.__APP_VERSION__ (Vite define path)', () => {
      (globalThis as Record<string, unknown>).__APP_VERSION__ = '0.4.9';
      const result = getBuildTimeVersion();
      expect(result.version).toBe('0.4.9');
    });

    it('should fallback to 0.0.0 when globalThis.__APP_VERSION__ is undefined', () => {
      const result = getBuildTimeVersion();
      expect(result.version).toBe('0.0.0');
    });

    it('should read all build metadata from globalThis', () => {
      (globalThis as Record<string, unknown>).__APP_VERSION__ = '1.2.3';
      (globalThis as Record<string, unknown>).__APP_BUILD_TIME__ = '2026-04-10T12:00:00Z';
      (globalThis as Record<string, unknown>).__APP_GIT_COMMIT__ = 'abc1234';
      (globalThis as Record<string, unknown>).__APP_GIT_BRANCH__ = 'main';

      const result = getBuildTimeVersion();
      expect(result).toEqual({
        version: '1.2.3',
        buildTime: '2026-04-10T12:00:00Z',
        gitCommit: 'abc1234',
        gitBranch: 'main',
      });
    });
  });
});
