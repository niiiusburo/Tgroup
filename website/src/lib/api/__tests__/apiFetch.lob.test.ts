/**
 * Gap B: LOB-Aware API Routing Tests
 * Verify apiFetch rewrites /api/* → /api/cosmetic/* based on current LOB + VITE_COSMETIC_LOB_ENABLED flag
 * @author Phase-1-executor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('apiFetch LOB-aware routing (Gap B)', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...import.meta.env };
  const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  beforeEach(() => {
    vi.resetModules();
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => store.set(key, String(value)),
      },
    });
    // Mock fetch to capture the URL without making real requests
    global.fetch = vi.fn(async (url: string | Request) => {
      const requestUrl = typeof url === 'string' ? url : url.url;
      return new Response(JSON.stringify({ success: true, requestUrl }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.assign(import.meta.env, originalEnv);
    if (originalLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
    } else {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });

  it('should route to /api/Partners when LOB is dental or flag is disabled', async () => {
    // Dynamically import apiFetch to use current import.meta.env state
    const { apiFetch } = await import('../core');

    localStorage.setItem('tgclinic_lob', 'dental');

    await apiFetch('/Partners');

    const calledUrl = (global.fetch as any).mock.calls[0][0];
    expect(calledUrl).toContain('/api/Partners');
    expect(calledUrl).not.toContain('/api/cosmetic');
  });

  it('should route to /api/cosmetic/Partners when LOB is cosmetic AND flag is true', async () => {
    // Set flag to true in env (simulating VITE_COSMETIC_LOB_ENABLED=true)
    (import.meta.env as any).VITE_COSMETIC_LOB_ENABLED = 'true';

    const { apiFetch: apiFetchV2 } = await import('../core');

    localStorage.setItem('tgclinic_lob', 'cosmetic');

    await apiFetchV2('/Partners');

    const calledUrl = (global.fetch as any).mock.calls[0][0];
    expect(calledUrl).toContain('/api/cosmetic/Partners');
  });

  it('should honor explicit cosmetic LOB options used by data hooks', async () => {
    const { apiFetch: apiFetchV2 } = await import('../core');

    localStorage.setItem('tgclinic_lob', 'dental');

    await apiFetchV2('/Partners', { lob: 'cosmetic' });

    const calledUrl = (global.fetch as any).mock.calls[0][0];
    expect(calledUrl).toContain('/api/cosmetic/Partners');
  });

  it('should NOT rewrite whitelisted routes (/Auth, /me, /version, /Places)', async () => {
    (import.meta.env as any).VITE_COSMETIC_LOB_ENABLED = 'true';
    const { apiFetch: apiFetchV2 } = await import('../core');

    localStorage.setItem('tgclinic_lob', 'cosmetic');

    // These should bypass the rewrite
    await apiFetchV2('/Auth/login', { method: 'POST', body: { email: 'test@test.com' } });
    const authUrl = (global.fetch as any).mock.calls[0][0];
    expect(authUrl).toContain('/api/Auth/login');
    expect(authUrl).not.toContain('/api/cosmetic/Auth');

    (global.fetch as any).mockClear();
    await apiFetchV2('/me');
    const meUrl = (global.fetch as any).mock.calls[0][0];
    expect(meUrl).toContain('/api/me');
    expect(meUrl).not.toContain('/api/cosmetic/me');

    (global.fetch as any).mockClear();
    await apiFetchV2('/version');
    const versionUrl = (global.fetch as any).mock.calls[0][0];
    expect(versionUrl).toContain('/api/version');
    expect(versionUrl).not.toContain('/api/cosmetic/version');

    (global.fetch as any).mockClear();
    await apiFetchV2('/Places/autocomplete', { params: { input: '123 Nguyen Hue' } });
    const placesUrl = (global.fetch as any).mock.calls[0][0];
    expect(placesUrl).toContain('/api/Places/autocomplete');
    expect(placesUrl).not.toContain('/api/cosmetic/Places');
  });

  it('should fallback to dental when LOB not in localStorage', async () => {
    const { apiFetch } = await import('../core');

    // No localStorage entry
    localStorage.removeItem('tgclinic_lob');

    await apiFetch('/Partners');

    const calledUrl = (global.fetch as any).mock.calls[0][0];
    expect(calledUrl).toContain('/api/Partners');
    expect(calledUrl).not.toContain('/api/cosmetic');
  });
});
