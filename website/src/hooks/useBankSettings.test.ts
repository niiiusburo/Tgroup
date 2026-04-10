import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBankSettings } from './useBankSettings';

describe('useBankSettings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem('tgclinic_token');
  });

  it('fetches settings on mount and exposes them', async () => {
    const mockSettings = {
      bankBin: '970415',
      bankNumber: '8815251137',
      bankAccountName: 'NGUYEN VAN A',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockSettings,
    } as Response);

    const { result } = renderHook(() => useBankSettings());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.settings).toEqual(mockSettings);
    expect(result.current.error).toBeNull();
  });

  it('updateSettings calls PUT and refreshes state', async () => {
    const initialSettings = {
      bankBin: '970415',
      bankNumber: '8815251137',
      bankAccountName: 'NGUYEN VAN A',
    };
    const updatedSettings = {
      bankBin: '970436',
      bankNumber: '123456789',
      bankAccountName: 'TRAN THI B',
    };

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => initialSettings,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedSettings,
      } as Response);

    const { result } = renderHook(() => useBankSettings());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.updateSettings(updatedSettings);

    const calls = fetchSpy.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);

    const putCall = calls.find((call) => (call[1] as RequestInit)?.method === 'PUT');
    expect(putCall).toBeDefined();
    expect(putCall![0]).toContain('/api/settings/bank');
    expect(putCall![1]).toMatchObject({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSettings),
    });
  });

  it('refresh re-fetches settings', async () => {
    const mockSettings = {
      bankBin: '970415',
      bankNumber: '8815251137',
      bankAccountName: 'NGUYEN VAN A',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockSettings,
    } as Response);

    const { result } = renderHook(() => useBankSettings());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.refresh();

    expect(result.current.settings).toEqual(mockSettings);
  });
});
