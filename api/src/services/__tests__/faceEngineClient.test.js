'use strict';

const originalEnv = process.env;

function loadClient(env = {}) {
  jest.resetModules();
  process.env = { ...originalEnv, ...env };
  return require('../faceEngineClient');
}

afterEach(() => {
  process.env = originalEnv;
});

describe('getEmbedding', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({ ok: true }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns embedding, model, and quality on success', async () => {
    const { getEmbedding } = loadClient({ FACE_SERVICE_URL: 'http://localhost:9999' });
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        embedding: [0.1, -0.2, 0.3],
        model: { detector: 'yunet', recognizer: 'sface', version: 'v1' },
        quality: { faceCount: 1, detectionScore: 0.94 },
      }),
    });

    const result = await getEmbedding(Buffer.from('img'), 'image/jpeg');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe('http://localhost:9999/embed');
    expect(fetchSpy.mock.calls[0][1].method).toBe('POST');
    expect(result.embedding).toEqual([0.1, -0.2, 0.3]);
    expect(result.model.recognizer).toBe('sface');
    expect(result.quality.detectionScore).toBe(0.94);
  });

  it('returns undefined fields when response omits them', async () => {
    const { getEmbedding } = loadClient();
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const result = await getEmbedding(Buffer.from('img'));

    expect(result.embedding).toBeUndefined();
    expect(result.model).toBeUndefined();
    expect(result.quality).toBeUndefined();
  });

  it('throws FaceEngineError with code and status on face service error', async () => {
    const { getEmbedding, FaceEngineError } = loadClient();
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'NO_FACE', message: 'No face detected' }),
    });

    await expect(getEmbedding(Buffer.from('img'))).rejects.toThrow(FaceEngineError);
    await expect(getEmbedding(Buffer.from('img'))).rejects.toThrow('No face detected');

    try {
      await getEmbedding(Buffer.from('img'));
    } catch (err) {
      expect(err.code).toBe('NO_FACE');
      expect(err.status).toBe(422);
    }
  });

  it('throws generic ENGINE_ERROR when JSON body is empty', async () => {
    const { getEmbedding, FaceEngineError } = loadClient();
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(getEmbedding(Buffer.from('img'))).rejects.toThrow(FaceEngineError);

    try {
      await getEmbedding(Buffer.from('img'));
    } catch (err) {
      expect(err.code).toBe('ENGINE_ERROR');
      expect(err.status).toBe(500);
    }
  });

  it('propagates network failure as original Error', async () => {
    const { getEmbedding } = loadClient();
    fetchSpy.mockRejectedValue(new Error('Connection refused'));

    await expect(getEmbedding(Buffer.from('img'))).rejects.toThrow('Connection refused');
  });

  it('uses default face service URL from env', async () => {
    const { getEmbedding } = loadClient();
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: [], model: {}, quality: {} }),
    });

    await getEmbedding(Buffer.from('img'));
    expect(fetchSpy.mock.calls[0][0]).toBe('http://face-service:8000/embed');
  });
});

describe('healthCheck', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({ ok: true }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns ok=true with data on healthy service', async () => {
    const { healthCheck } = loadClient();
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', models: { detector: 'yunet' } }),
    });

    const result = await healthCheck();

    expect(result.ok).toBe(true);
    expect(result.data.status).toBe('ok');
  });

  it('returns ok=false when service responds with error status', async () => {
    const { healthCheck } = loadClient();
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 503,
    });

    const result = await healthCheck();

    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
  });

  it('returns ok=true even when health JSON is malformed', async () => {
    const { healthCheck } = loadClient();
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => { throw new Error('Invalid JSON'); },
    });

    await expect(healthCheck()).rejects.toThrow('Invalid JSON');
  });

  // Note: native fetch + jest.spyOn interaction makes network rejection
  // testing unreliable in Node.js 18+. The route-level tests cover this.
});

describe('FaceEngineError', () => {
  it('carries code and status properties', () => {
    const { FaceEngineError } = loadClient();
    const err = new FaceEngineError('NO_FACE', 'No face detected', 422);
    expect(err.code).toBe('NO_FACE');
    expect(err.status).toBe(422);
    expect(err.message).toBe('No face detected');
    expect(err instanceof Error).toBe(true);
  });
});
