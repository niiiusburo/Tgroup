import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { recognizeFace, registerFace, getFaceStatus, publicFaceCheckIn } from '../partners';

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
          recognitionVersion: 'face-recognition-0.32.51',
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
      expect(result.recognitionVersion).toBe('face-recognition-0.32.51');
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

    it('returns no_match with empty candidates array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'no_match', candidates: [] }),
      });

      const result = await recognizeFace(new Blob(['image']));
      expect(result.candidates).toEqual([]);
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

    it('uses backend message for legacy face errors with error and message fields', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        clone: () => ({ json: async () => ({ error: 'NO_FACE', message: 'No face detected' }) }),
        text: async () => 'No face detected',
      });

      await expect(recognizeFace(new Blob(['image']))).rejects.toMatchObject({
        status: 422,
        code: 'NO_FACE',
        message: 'No face detected',
      });
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

    it('omits source when not provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, sampleCount: 1 }),
      });

      await registerFace('p1', new Blob(['image']));

      const callArgs = mockFetch.mock.calls[0];
      const formData = callArgs[1].body as FormData;
      expect(formData.get('source')).toBeNull();
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

    it('throws when face status endpoint returns 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        clone: () => ({ json: async () => ({ error: 'PARTNER_NOT_FOUND' }) }),
        text: async () => 'Not found',
      });

      await expect(getFaceStatus('unknown')).rejects.toThrow();
    });
  });

  describe('publicFaceCheckIn', () => {
    it('posts to the public endpoint without an Authorization header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: 'match', greeting: 'Kevin P.' }),
      });

      const result = await publicFaceCheckIn(new Blob(['image']));

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/public/face/checkin',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        }),
      );
      expect(mockFetch.mock.calls[0][1]).not.toHaveProperty('headers');
      expect(result).toEqual({ ok: true, result: 'match', greeting: 'Kevin P.' });
    });

    it('throws ApiError with backend reason for public check-in errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ ok: false, reason: 'rate_limited', message: 'Too fast' }),
      });

      await expect(publicFaceCheckIn(new Blob(['image']))).rejects.toMatchObject({
        status: 429,
        code: 'rate_limited',
        message: 'Too fast',
      });
    });

    it('rejects malformed success payloads', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: 'unexpected' }),
      });

      await expect(publicFaceCheckIn(new Blob(['image']))).rejects.toMatchObject({
        code: 'INVALID_FACE_CHECKIN_RESPONSE',
      });
    });

    it('rejects malformed multiple-match success payloads', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: 'multiple' }),
      });

      await expect(publicFaceCheckIn(new Blob(['image']))).rejects.toMatchObject({
        code: 'INVALID_FACE_CHECKIN_RESPONSE',
      });
    });
  });

  describe('network error handling', () => {
    it('recognizeFace propagates network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(recognizeFace(new Blob(['image']))).rejects.toThrow('Failed to fetch');
    });

    it('registerFace propagates network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network error'));

      await expect(registerFace('p1', new Blob(['image']))).rejects.toThrow('Network error');
    });

    it('getFaceStatus propagates network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Connection refused'));

      await expect(getFaceStatus('p1')).rejects.toThrow('Connection refused');
    });
  });
});
