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

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({ ok: true }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
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
  });
});
