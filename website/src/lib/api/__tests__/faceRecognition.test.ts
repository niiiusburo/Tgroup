import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { recognizeFace, registerFace, getFaceStatus } from '../partners';

describe('Face Recognition API client', () => {
  const originalFetch = global.fetch;
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue('test-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
    vi.stubEnv('VITE_API_URL', 'http://localhost:3002/api');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe('recognizeFace', () => {
    it('posts image to /face/recognize and returns match result', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'auto_matched',
          match: { partnerId: 'p1', name: 'Test', confidence: 0.95, code: 'T001', phone: '0901' },
        }),
      });

      const blob = new Blob(['image'], { type: 'image/jpeg' });
      const result = await recognizeFace(blob);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/face/recognize',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        }),
      );
      expect(result.status).toBe('auto_matched');
      expect(result.match).toBeDefined();
    });

    it('returns candidates when no auto-match', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'candidates',
          candidates: [{ partnerId: 'p1', name: 'Test', confidence: 0.85, code: 'T001', phone: '0901' }],
        }),
      });

      const result = await recognizeFace(new Blob(['image']));
      expect(result.status).toBe('candidates');
      expect(result.candidates).toHaveLength(1);
    });

    it('returns no_match when no face matches', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'no_match', candidates: [] }),
      });

      const result = await recognizeFace(new Blob(['image']));
      expect(result.status).toBe('no_match');
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        clone: () => ({ json: async () => ({ error: 'Server error' }) }),
        text: async () => 'Server error',
      });

      await expect(recognizeFace(new Blob(['image']))).rejects.toThrow();
    });
  });

  describe('registerFace', () => {
    it('posts partnerId and image to /face/register', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, sampleCount: 3 }),
      });

      const result = await registerFace('p1', new Blob(['image']), 'no_match_rescue');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/face/register',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('includes source when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, sampleCount: 1 }),
      });

      await registerFace('p1', new Blob(['image']), 'manual');

      const callArgs = mockFetch.mock.calls[0];
      const formData = callArgs[1].body as FormData;
      expect(formData.get('source')).toBe('manual');
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        clone: () => ({ json: async () => ({ error: { code: 'NO_FACE', message: 'No face detected' } }) }),
        text: async () => 'Bad request',
      });

      await expect(registerFace('p1', new Blob(['image']))).rejects.toThrow();
    });
  });

  describe('getFaceStatus', () => {
    it('fetches status for a partner', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ registered: true, sampleCount: 2, lastRegisteredAt: '2026-05-01' }),
      });

      const result = await getFaceStatus('p1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/face/status/p1',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result.registered).toBe(true);
      expect(result.sampleCount).toBe(2);
    });

    it('returns unregistered status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ registered: false, sampleCount: 0, lastRegisteredAt: null }),
      });

      const result = await getFaceStatus('p2');
      expect(result.registered).toBe(false);
      expect(result.sampleCount).toBe(0);
    });

    it('encodes partner ID with special characters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ registered: true, sampleCount: 1, lastRegisteredAt: '2026-05-01' }),
      });

      await getFaceStatus('p1/abc');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/face/status/p1%2Fabc',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });
});
