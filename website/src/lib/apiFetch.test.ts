import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, deleteFeedbackThread } from './api';

describe('apiFetch', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
    localStorage.setItem('tgclinic_token', 'test-token');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    localStorage.removeItem('tgclinic_token');
  });

  it('should return undefined for 204 No Content responses', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    } as Response);

    const result = await apiFetch<void>('/Feedback/all/thread-123', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });

  it('should parse JSON for normal 200 responses', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'thread-123', status: 'pending' }),
    } as Response);

    const result = await apiFetch('/Feedback/all/thread-123');
    expect(result).toEqual({ id: 'thread-123', status: 'pending' });
  });

  it('deleteFeedbackThread should call DELETE and return undefined on 204', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    } as Response);

    const result = await deleteFeedbackThread('thread-456');
    expect(result).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/Feedback/all/thread-456'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
