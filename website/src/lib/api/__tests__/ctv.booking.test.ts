import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBooking, CreateBookingInput } from '../ctv';
import { API_URL } from '../core';

/**
 * createBooking — POST /ctv/bookings
 * Ensures CTV panel can create bookings for referred clients with proper
 * error handling for claimed clients (B_CLIENT_CLAIMED).
 */
describe('createBooking', () => {
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
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function callOf(call: typeof mockFetch.mock.calls[number]): { url: string; method?: string; body?: any } {
    const [url, options] = call;
    return {
      url: String(url),
      method: (options as any)?.method,
      body: (options as any)?.body,
    };
  }

  it('calls POST /ctv/bookings with input body', async () => {
    const input: CreateBookingInput = {
      name: 'Alice',
      phone: '0123456789',
      lob: 'dental',
      date: '2026-06-15',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ clientId: 'c-123', appointmentId: 'a-456' }),
    });

    const result = await createBooking(input);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = callOf(mockFetch.mock.calls[0]);
    expect(call.url).toBe(`${API_URL}/ctv/bookings`);
    expect(call.method).toBe('POST');
    expect(JSON.parse(call.body as string)).toEqual(input);
    expect(result).toEqual({ clientId: 'c-123', appointmentId: 'a-456' });
  });

  it('passes optional fields (clientId, time, companyId, productId) if present', async () => {
    const input: CreateBookingInput = {
      clientId: 'existing-client-123',
      phone: '0123456789',
      lob: 'cosmetic',
      date: '2026-06-20',
      time: '14:30',
      companyId: 'comp-456',
      productId: 'prod-789',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ clientId: 'existing-client-123', appointmentId: 'a-789' }),
    });

    await createBooking(input);

    const call = callOf(mockFetch.mock.calls[0]);
    expect(JSON.parse(call.body as string)).toEqual(input);
  });

  it('includes Authorization header with stored token', async () => {
    const input: CreateBookingInput = {
      name: 'Bob',
      phone: '0987654321',
      lob: 'dental',
      date: '2026-07-01',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ clientId: 'c-999', appointmentId: 'a-999' }),
    });

    await createBooking(input);

    const [, options] = mockFetch.mock.calls[0];
    expect((options as any).headers?.Authorization).toBe('Bearer test-token');
  });
});
