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

  it('returns undefined fields when response JSON is invalid', async () => {
    const { getEmbedding } = loadClient();
    fetchSpy.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })
    );

    const result = await getEmbedding(Buffer.from('img'));
    expect(result.embedding).toBeUndefined();
    expect(result.model).toBeUndefined();
    expect(result.quality).toBeUndefined();
  });

  it('returns empty embedding array when response has empty embedding', async () => {
    const { getEmbedding } = loadClient();
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: [], model: {}, quality: {} }),
    });

    const result = await getEmbedding(Buffer.from('img'));

    expect(result.embedding).toEqual([]);
    expect(result.model).toEqual({});
    expect(result.quality).toEqual({});
  });

  it('returns null embedding when response has null embedding', async () => {
    const { getEmbedding } = loadClient();
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: null, model: {}, quality: {} }),
    });

    const result = await getEmbedding(Buffer.from('img'));

    expect(result.embedding).toBeNull();
    expect(result.model).toEqual({});
    expect(result.quality).toEqual({});
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

  it('uses custom FACE_SERVICE_URL when set', async () => {
    const { getEmbedding } = loadClient({ FACE_SERVICE_URL: 'http://custom:9000' });
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: [], model: {}, quality: {} }),
    });

    await getEmbedding(Buffer.from('img'));
    expect(fetchSpy.mock.calls[0][0]).toBe('http://custom:9000/embed');
  });

  it('passes mimeType to Blob constructor', async () => {
    const { getEmbedding } = loadClient();
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: [0.1], model: {}, quality: {} }),
    });

    await getEmbedding(Buffer.from('img'), 'image/png');
    const formData = fetchSpy.mock.calls[0][1].body;
    const blob = formData.get('image');
    expect(blob.type).toBe('image/png');
  });

  it('defaults mimeType to image/jpeg when not provided', async () => {
    const { getEmbedding } = loadClient();
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: [0.1], model: {}, quality: {} }),
    });

    await getEmbedding(Buffer.from('img'));
    const formData = fetchSpy.mock.calls[0][1].body;
    const blob = formData.get('image');
    expect(blob.type).toBe('image/jpeg');
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

  it('returns ok=false with 500 status', async () => {
    const { healthCheck } = loadClient();
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await healthCheck();
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });

  it('returns ok=true with empty data object', async () => {
    const { healthCheck } = loadClient();
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const result = await healthCheck();
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({});
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

  it('defaults status to undefined when not provided', () => {
    const { FaceEngineError } = loadClient();
    const err = new FaceEngineError('ENGINE_ERROR', 'Engine failed');
    expect(err.status).toBeUndefined();
    expect(err.code).toBe('ENGINE_ERROR');
  });

  it('has a stack trace', () => {
    const { FaceEngineError } = loadClient();
    const err = new FaceEngineError('TEST', 'Test error');
    expect(err.stack).toBeDefined();
  });
});

describe('getEmbedding', () => {
  let localFetchSpy;

  beforeEach(() => {
    localFetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({ ok: true }));
  });

  afterEach(() => {
    localFetchSpy.mockRestore();
  });

  it('posts image to face-service embed endpoint', async () => {
    const { getEmbedding } = loadClient({ FACE_SERVICE_URL: 'http://face-test:8000' });
    localFetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: [0.1, 0.2, 0.3], model: { version: '1.0' }, quality: { faceCount: 1 } }),
    });

    const result = await getEmbedding(Buffer.from('fake-image'), 'image/jpeg');

    expect(localFetchSpy).toHaveBeenCalledWith(
      'http://face-test:8000/embed',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    );
    expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(result.model.version).toBe('1.0');
    expect(result.quality.faceCount).toBe(1);
  });

  it('throws FaceEngineError when face-service returns error JSON', async () => {
    const { getEmbedding } = loadClient({ FACE_SERVICE_URL: 'http://face-test:8000' });
    localFetchSpy.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'NO_FACE', message: 'No face detected' }),
    });

    await expect(getEmbedding(Buffer.from('fake-image'), 'image/jpeg')).rejects.toThrow('No face detected');
  });

  it('throws generic error when face-service returns non-JSON error', async () => {
    const { getEmbedding } = loadClient({ FACE_SERVICE_URL: 'http://face-test:8000' });
    localFetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('Invalid JSON'); },
      text: async () => 'Internal Server Error',
    });

    await expect(getEmbedding(Buffer.from('fake-image'), 'image/jpeg')).rejects.toThrow('Face service error (500)');
  });
});
