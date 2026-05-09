import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadExport } from './exports';

describe('downloadExport', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('xlsx-data', {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      })
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('sends a session token when downloading an Excel export', async () => {
    sessionStorage.setItem('tgclinic_token', 'session-token');

    const blob = await downloadExport('appointments', {
      dateFrom: '2026-05-09',
      dateTo: '2026-05-09',
    });

    expect(await blob.text()).toBe('xlsx-data');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/Exports/appointments/download'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer session-token',
        }),
      })
    );
  });
});
