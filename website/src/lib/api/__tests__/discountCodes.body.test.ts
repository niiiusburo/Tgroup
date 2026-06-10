import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ensureCtvDiscountCode,
  generateCtvDiscountCode,
  verifyDiscountCode,
} from '../discountCodes';

/**
 * Regression lock — discount-code POSTs must send a SINGLE-encoded JSON body.
 *
 * Bug (2026-06): these callers passed `body: JSON.stringify(input)` to
 * apiFetch, which stringifies again (core.ts). The server received a
 * top-level JSON *string* ("{\"forceNew\":true}") and express.json (strict)
 * rejected it with 400 — so "Tạo mã & tải ảnh" in the CTV portal and the
 * staff /verify-discount flow silently failed.
 */
describe('discountCodes API client — request body encoding', () => {
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
      json: async () => ({ success: true, code: 'TEST-AAAAAA', isExisting: false, discountValue: 10, discountType: 'percent' }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function sentBody(): unknown {
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    return JSON.parse(String(init.body));
  }

  it('generateCtvDiscountCode sends a JSON object, not a double-encoded string', async () => {
    await generateCtvDiscountCode({ forceNew: true });
    const parsed = sentBody();
    expect(typeof parsed).toBe('object');
    expect(parsed).toEqual({ forceNew: true });
  });

  it('verifyDiscountCode sends a JSON object, not a double-encoded string', async () => {
    await verifyDiscountCode({
      code: 'TEST-AAAAAA',
      customerLob: 'dental',
      customerPhone: '0901234567',
      markAsUsed: true,
    });
    const parsed = sentBody();
    expect(typeof parsed).toBe('object');
    expect(parsed).toMatchObject({ code: 'TEST-AAAAAA', customerPhone: '0901234567' });
  });

  it('ensureCtvDiscountCode sends an empty JSON object', async () => {
    await ensureCtvDiscountCode();
    expect(sentBody()).toEqual({});
  });
});
