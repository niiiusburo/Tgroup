import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadExport } from './exports';

describe('downloadExport', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['xlsx-bytes']), { status: 200 })
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('uses sessionStorage auth tokens for normal browser sessions', async () => {
    sessionStorage.setItem('tgclinic_token', 'session-token');

    await downloadExport('appointments', { dateFrom: '2026-05-09' });

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
