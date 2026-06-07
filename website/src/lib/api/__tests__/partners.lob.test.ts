import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { API_URL } from '../core';
import { hardDeletePartner, softDeletePartner } from '../partners';

describe('partners API LOB routing', () => {
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
      json: async () => ({ id: 'partner-1', name: 'Cosmetic Customer' }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('soft-deletes cosmetic partners through /api/cosmetic/Partners/:id/soft-delete', async () => {
    await softDeletePartner('partner-1', 'cosmetic');

    expect(String(mockFetch.mock.calls[0][0])).toBe(
      `${API_URL}/cosmetic/Partners/partner-1/soft-delete`,
    );
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'PATCH' });
  });

  it('hard-deletes cosmetic partners through /api/cosmetic/Partners/:id/hard-delete', async () => {
    await hardDeletePartner('partner-1', 'cosmetic');

    expect(String(mockFetch.mock.calls[0][0])).toBe(
      `${API_URL}/cosmetic/Partners/partner-1/hard-delete`,
    );
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });
});

describe('Customers page delete regression lock', () => {
  const customersSource = readFileSync(
    resolve(process.cwd(), 'src/pages/Customers.tsx'),
    'utf8',
  );

  it('passes currentLOB into softDeletePartner and hardDeletePartner', () => {
    expect(customersSource).toMatch(/softDeletePartner\([^,]+,\s*currentLOB\)/);
    expect(customersSource).toMatch(/hardDeletePartner\([^,]+,\s*currentLOB\)/);
  });
});