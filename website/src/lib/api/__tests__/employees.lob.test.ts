import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_URL } from '../core';
import { createEmployee, updateEmployee } from '../employees';

describe('employees API LOB routing', () => {
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
      json: async () => ({ id: 'emp-1', name: 'Cosmetic Employee' }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('creates cosmetic employees through /api/cosmetic/Employees', async () => {
    await createEmployee({ name: 'Cosmetic Employee', password: 'secret123' }, 'cosmetic');

    expect(String(mockFetch.mock.calls[0][0])).toBe(`${API_URL}/cosmetic/Employees`);
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('updates cosmetic employees through /api/cosmetic/Employees/:id', async () => {
    await updateEmployee('emp-1', { name: 'Updated Cosmetic Employee' }, 'cosmetic');

    expect(String(mockFetch.mock.calls[0][0])).toBe(`${API_URL}/cosmetic/Employees/emp-1`);
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
  });
});
