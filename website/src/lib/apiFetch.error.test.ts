import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, ApiError } from './api/core';

describe('apiFetch error handling', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
    localStorage.setItem('tgclinic_token', 'test-token');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    localStorage.removeItem('tgclinic_token');
  });

  it('should parse backend { errorCode, message } format and expose code + message', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      clone: () => ({
        json: () => Promise.resolve({ errorCode: 'PARTNER_NOT_FOUND', message: 'Partner does not exist' }),
      }),
      text: () => Promise.resolve(''),
    } as any);

    await expect(apiFetch('/Appointments', { method: 'POST', body: {} })).rejects.toSatisfy((err: any) => {
      return err instanceof ApiError && err.code === 'PARTNER_NOT_FOUND' && err.message === 'Partner does not exist';
    });
  });

  it('should parse backend Zod { errors: [...] } format and expose first error message', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      clone: () => ({
        json: () => Promise.resolve({
          errors: [
            { message: 'Invalid uuid', path: ['partnerid'] },
            { message: 'Required', path: ['date'] },
          ],
        }),
      }),
      text: () => Promise.resolve(''),
    } as any);

    await expect(apiFetch('/Appointments', { method: 'POST', body: {} })).rejects.toSatisfy((err: any) => {
      return err instanceof ApiError && err.message.includes('Invalid uuid');
    });
  });

  it('should still parse legacy { error: "string" } format', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 403,
      clone: () => ({
        json: () => Promise.resolve({ error: 'Permission denied: appointments.add' }),
      }),
      text: () => Promise.resolve(''),
    } as any);

    await expect(apiFetch('/Appointments', { method: 'POST', body: {} })).rejects.toSatisfy((err: any) => {
      return err instanceof ApiError && err.message === 'Permission denied: appointments.add';
    });
  });

  it('should parse structured { error: { code, message } } format', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      clone: () => ({
        json: () => Promise.resolve({ error: { code: 'INVALID_DATE', message: 'Bad date' } }),
      }),
      text: () => Promise.resolve(''),
    } as any);

    await expect(apiFetch('/Appointments', { method: 'POST', body: {} })).rejects.toSatisfy((err: any) => {
      return err instanceof ApiError && err.code === 'INVALID_DATE' && err.message === 'Bad date';
    });
  });
});
