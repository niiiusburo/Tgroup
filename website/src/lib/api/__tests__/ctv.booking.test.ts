import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createBooking,
  createPublicBooking,
  CreateBookingInput,
  CreatePublicBookingInput,
  fetchPublicCtvServices,
  joinCtv,
  lookupPublicCtvByPhone,
  lookupPublicClientByPhone,
} from '../ctv';
import { changeCtvSelfPassword, updateCtvSelfProfile } from '../ctvSelf';
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

  it('calls the public no-login booking endpoint with the CTV phone', async () => {
    const input: CreatePublicBookingInput = {
      name: 'Public Client',
      phone: '0123456789',
      ctvPhone: '0909000000',
      lob: 'cosmetic',
      date: '2026-06-15',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ clientId: 'c-public', appointmentId: 'a-public' }),
    });

    const result = await createPublicBooking(input);

    const call = callOf(mockFetch.mock.calls[0]);
    expect(call.url).toBe(`${API_URL}/ctv-public/bookings`);
    expect(call.method).toBe('POST');
    expect(JSON.parse(call.body as string)).toEqual(input);
    expect(result).toEqual({ clientId: 'c-public', appointmentId: 'a-public' });
  });

  it('calls the public service catalog endpoint for landing mode', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ services: [] }),
    });

    await fetchPublicCtvServices('cosmetic');

    const call = callOf(mockFetch.mock.calls[0]);
    expect(call.url).toBe(`${API_URL}/ctv-public/services?lob=cosmetic`);
    expect(call.method).toBe('GET');
  });

  it('calls the public phone lookup endpoint with optional CTV phone context', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ exists: false, lob: 'dental' }),
    });

    await lookupPublicClientByPhone('0123123123', 'dental', '0909000000');

    const call = callOf(mockFetch.mock.calls[0]);
    expect(call.url).toBe(`${API_URL}/ctv-public/client-lookup?phone=0123123123&lob=dental&ctvPhone=0909000000`);
    expect(call.method).toBe('GET');
  });

  it('calls the public CTV phone lookup endpoint for live attribution verification', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ exists: true, name: 'Parent CTV' }),
    });

    const result = await lookupPublicCtvByPhone('0909000000');

    const call = callOf(mockFetch.mock.calls[0]);
    expect(call.url).toBe(`${API_URL}/ctv-public/ctv-lookup?phone=0909000000`);
    expect(call.method).toBe('GET');
    expect(result).toEqual({ exists: true, name: 'Parent CTV' });
  });

  it('calls the public CTV signup endpoint with uplinePhone for no-link signup', async () => {
    const input = {
      name: 'New CTV',
      phone: '0123456789',
      email: 'new@example.com',
      password: 'secret1',
      uplinePhone: '0909000000',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ ok: true, id: 'new-ctv', name: 'New CTV', uplineName: 'Parent CTV' }),
    });

    const result = await joinCtv(input);

    const call = callOf(mockFetch.mock.calls[0]);
    expect(call.url).toBe(`${API_URL}/ctv-public/join`);
    expect(call.method).toBe('POST');
    expect(JSON.parse(call.body as string)).toEqual(input);
    expect(result).toEqual({ ok: true, id: 'new-ctv', name: 'New CTV', uplineName: 'Parent CTV' });
  });

  it('calls the CTV self profile update endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'ctv-1',
        name: 'CTV Updated',
        email: 'ctv@example.com',
        phone: '0909000000',
        role: 'CTV',
      }),
    });

    const result = await updateCtvSelfProfile({ name: 'CTV Updated' });

    const call = callOf(mockFetch.mock.calls[0]);
    expect(call.url).toBe(`${API_URL}/ctv/me`);
    expect(call.method).toBe('PATCH');
    expect(JSON.parse(call.body as string)).toEqual({ name: 'CTV Updated' });
    expect(result.name).toBe('CTV Updated');
  });

  it('calls the CTV self password endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    const result = await changeCtvSelfPassword({
      currentPassword: 'old-secret',
      newPassword: 'new-secret',
    });

    const call = callOf(mockFetch.mock.calls[0]);
    expect(call.url).toBe(`${API_URL}/ctv/me/password`);
    expect(call.method).toBe('POST');
    expect(JSON.parse(call.body as string)).toEqual({
      currentPassword: 'old-secret',
      newPassword: 'new-secret',
    });
    expect(result).toEqual({ success: true });
  });
});
