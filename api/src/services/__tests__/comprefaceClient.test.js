'use strict';

const originalEnv = process.env;

function loadClient(env = {}) {
  jest.resetModules();
  process.env = { ...originalEnv, ...env };
  return require('../comprefaceClient');
}

afterEach(() => {
  process.env = originalEnv;
  jest.dontMock('../../db');
});

describe('comprefaceClient', () => {
  let fetchSpy;
  let originalFetch;

  beforeEach(() => {
    // Node 18+ ships `fetch` as a non-configurable global; `jest.spyOn(global, 'fetch')`
    // silently fails there. Assign a jest.fn() onto globalThis instead so the source's
    // bare `fetch(...)` call resolves to our mock for the duration of the test.
    originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation(() => Promise.resolve({ ok: true }));
    fetchSpy = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('recognize', () => {
    it('returns sorted subjects from compreface response', async () => {
      const { recognize } = loadClient({
        COMPREFACE_URL: 'http://compreface-test',
        COMPREFACE_API_KEY: 'test-key',
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          result: [{
            subjects: [
              { subject: 'p2', similarity: '0.75' },
              { subject: 'p1', similarity: '0.92' },
            ],
          }],
        }),
      });

      const results = await recognize(Buffer.from('img'));
      expect(results).toHaveLength(2);
      expect(results[0].subject).toBe('p1');
      expect(results[0].similarity).toBe(0.92);
      expect(results[1].subject).toBe('p2');
      expect(results[1].similarity).toBe(0.75);
    });

    it('sends x-api-key header in requests', async () => {
      const { recognize } = loadClient({
        COMPREFACE_URL: 'http://compreface-test',
        COMPREFACE_API_KEY: 'secret-key',
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ result: [{ subjects: [] }] }),
      });

      await recognize(Buffer.from('img'));
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-api-key': 'secret-key' }),
        }),
      );
    });

    it('requests all detected faces and top two predictions for ambiguity gating', async () => {
      const { recognize } = loadClient({
        COMPREFACE_URL: 'http://compreface-test',
        COMPREFACE_API_KEY: 'secret-key',
        COMPREFACE_DET_PROB_THRESHOLD: '0.82',
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ result: [{ subjects: [] }] }),
      });

      await recognize(Buffer.from('img'));

      const requestUrl = new URL(fetchSpy.mock.calls[0][0]);
      expect(requestUrl.pathname).toBe('/api/v1/recognition/recognize');
      expect(requestUrl.searchParams.get('limit')).toBe('0');
      expect(requestUrl.searchParams.get('prediction_count')).toBe('2');
      expect(requestUrl.searchParams.get('det_prob_threshold')).toBe('0.82');
    });

    it('throws MULTIPLE_FACES when Compreface returns more than one detected face', async () => {
      const { recognize } = loadClient();
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          result: [
            { subjects: [{ subject: 'p1', similarity: '0.91' }] },
            { subjects: [{ subject: 'p2', similarity: '0.88' }] },
          ],
        }),
      });

      await expect(recognize(Buffer.from('img'))).rejects.toMatchObject({
        code: 'MULTIPLE_FACES',
        status: 422,
      });
    });

    it('uses native FormData so fetch sends the image file part', async () => {
      const { recognize } = loadClient({
        COMPREFACE_URL: 'http://compreface-test',
        COMPREFACE_API_KEY: 'secret-key',
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ result: [{ subjects: [] }] }),
      });

      await recognize(Buffer.from('img'), 'image/png');

      const request = fetchSpy.mock.calls[0][1];
      expect(request.body).toBeInstanceOf(FormData);
      expect(request.body.get('file')).toBeTruthy();
      expect(request.headers).not.toHaveProperty('content-type');
    });

    it('uses default compreface URL and empty API key when env vars are missing', async () => {
      const { recognize } = loadClient({});
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ result: [{ subjects: [] }] }),
      });

      await recognize(Buffer.from('img'));
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('http://compreface-api'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-api-key': '' }),
        }),
      );
    });

    it('strips trailing slash from compreface URL', async () => {
      const { recognize } = loadClient({
        COMPREFACE_URL: 'http://compreface-test/',
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ result: [{ subjects: [] }] }),
      });

      await recognize(Buffer.from('img'));
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('http://compreface-test/api/v1/recognition'),
        expect.any(Object),
      );
    });

    it('returns empty array when no subjects found', async () => {
      const { recognize } = loadClient();
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ result: [{ subjects: [] }] }),
      });

      const results = await recognize(Buffer.from('img'));
      expect(results).toEqual([]);
    });

    it('throws on compreface error', async () => {
      const { recognize } = loadClient();
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      });

      await expect(recognize(Buffer.from('img'))).rejects.toThrow('Bad request');
    });

    it('returns empty array when result field is missing', async () => {
      const { recognize } = loadClient();
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({}),
      });

      const results = await recognize(Buffer.from('img'));
      expect(results).toEqual([]);
    });

    it('returns empty array when result array is empty', async () => {
      const { recognize } = loadClient();
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ result: [] }),
      });

      const results = await recognize(Buffer.from('img'));
      expect(results).toEqual([]);
    });
  });

  describe('createSubject', () => {
    it('posts to /subjects with subject id', async () => {
      const { createSubject } = loadClient();
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ subject: 'p1' }),
      });

      const result = await createSubject('p1');
      expect(result.subject).toBe('p1');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/subjects'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('parses JSON response with additional fields', async () => {
      const { createSubject } = loadClient();
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ subject: 'p2', created: true }),
      });

      const result = await createSubject('p2');
      expect(result.subject).toBe('p2');
      expect(result.created).toBe(true);
    });
  });

  describe('addExample', () => {
    it('posts face example to /faces', async () => {
      const { addExample } = loadClient();
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ image_id: 'img-1' }),
      });

      const result = await addExample('p1', Buffer.from('img'));
      expect(result.image_id).toBe('img-1');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/faces'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('uses native FormData with subject and file parts when adding examples', async () => {
      const { addExample } = loadClient();
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ image_id: 'img-1' }),
      });

      await addExample('p1', Buffer.from('img'), 'image/png');

      const request = fetchSpy.mock.calls[0][1];
      expect(request.body).toBeInstanceOf(FormData);
      expect(request.body.get('file')).toBeTruthy();
      expect(request.body.get('subject')).toBe('p1');
      expect(request.headers).not.toHaveProperty('content-type');
    });

    it('throws when add example fails', async () => {
      const { addExample } = loadClient();
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      });

      await expect(addExample('p1', Buffer.from('img'))).rejects.toThrow('Bad request');
    });
  });

  describe('deleteSubject', () => {
    it('deletes subject by id', async () => {
      const { deleteSubject } = loadClient();
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ deleted: true }),
      });

      await deleteSubject('p1');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/subjects/p1'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('throws when delete fails', async () => {
      const { deleteSubject } = loadClient();
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Subject not found',
      });

      await expect(deleteSubject('p1')).rejects.toThrow('Subject not found');
    });
  });

  describe('createSubject', () => {
    it('throws when create subject fails', async () => {
      const { createSubject } = loadClient();
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 409,
        text: async () => 'Subject already exists',
      });

      await expect(createSubject('p1')).rejects.toThrow('Subject already exists');
    });
  });

  describe('healthCheck', () => {
    it('returns ok when subjects endpoint is reachable', async () => {
      const { healthCheck } = loadClient({
        COMPREFACE_URL: 'http://compreface-test',
        COMPREFACE_API_KEY: 'secret-key',
      });
      fetchSpy.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ subjects: [] }),
      });

      const result = await healthCheck();

      expect(result.ok).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/subjects'),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('returns not ok when API key is missing', async () => {
      const { healthCheck } = loadClient({ COMPREFACE_API_KEY: '' });

      const result = await healthCheck();

      expect(result.ok).toBe(false);
      expect(result.message).toContain('COMPREFACE_API_KEY');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
