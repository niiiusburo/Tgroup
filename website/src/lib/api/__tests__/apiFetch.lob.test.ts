import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, API_URL } from '../core';

/**
 * Phase-1 gap B regression lock — apiFetch must route /api/cosmetic/* when
 * the caller passes `lob: 'cosmetic'`, otherwise leave the URL alone. The
 * implementation lives in `website/src/lib/api/core.ts` (~line 57).
 *
 * If someone removes the `lobPrefix` prepend, every cosmetic data hook will
 * silently fall back to dental endpoints and leak cross-LOB data.
 */
describe('apiFetch — LOB-aware routing (Phase-1 gap B)', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof global.fetch;
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue('test-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [], totalItems: 0, offset: 0, limit: 50 }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function urlOf(call: typeof mockFetch.mock.calls[number]): string {
    return String(call[0]);
  }

  it('prepends /cosmetic when lob === "cosmetic"', async () => {
    await apiFetch('/Partners', { lob: 'cosmetic' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(urlOf(mockFetch.mock.calls[0])).toBe(`${API_URL}/cosmetic/Partners`);
  });

  it('does NOT prepend /cosmetic when lob === "dental"', async () => {
    await apiFetch('/Partners', { lob: 'dental' });
    expect(urlOf(mockFetch.mock.calls[0])).toBe(`${API_URL}/Partners`);
  });

  it('does NOT prepend /cosmetic when lob is omitted (legacy callers)', async () => {
    await apiFetch('/Partners');
    expect(urlOf(mockFetch.mock.calls[0])).toBe(`${API_URL}/Partners`);
  });

  it('threads query params after the LOB prefix', async () => {
    await apiFetch('/Partners', { lob: 'cosmetic', params: { offset: 0, limit: 20 } });
    expect(urlOf(mockFetch.mock.calls[0])).toBe(
      `${API_URL}/cosmetic/Partners?offset=0&limit=20`
    );
  });

  it('leaves /Appointments/:id-style paths intact under cosmetic prefix', async () => {
    await apiFetch('/Appointments/abc-123', { lob: 'cosmetic' });
    expect(urlOf(mockFetch.mock.calls[0])).toBe(
      `${API_URL}/cosmetic/Appointments/abc-123`
    );
  });
});
