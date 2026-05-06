'use strict';

const originalEnv = process.env;

function loadEngine(env = {}) {
  jest.resetModules();
  process.env = { ...originalEnv, ...env };
  const mockQuery = jest.fn();
  jest.doMock('../../db', () => ({ query: mockQuery }));
  const mod = require('../faceMatchEngine');
  return { ...mod, query: mockQuery };
}

afterEach(() => {
  process.env = originalEnv;
  jest.dontMock('../../db');
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical normalized vectors', () => {
    const { cosineSimilarity } = loadEngine();
    const a = [1, 0, 0, 0];
    expect(cosineSimilarity(a, a)).toBe(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    const { cosineSimilarity } = loadEngine();
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('returns 0 for empty arrays', () => {
    const { cosineSimilarity } = loadEngine();
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('computes dot product for general vectors', () => {
    const { cosineSimilarity } = loadEngine();
    const a = [0.5, 0.5, 0];
    const b = [0.5, 0.5, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.5, 5);
  });
});

describe('findMatches', () => {
  it('returns no-match when DB is empty', async () => {
    const { findMatches, query } = loadEngine();
    query.mockResolvedValueOnce([]);
    const result = await findMatches([0.1, 0.2, 0.3]);
    expect(result.match).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it('returns no-match when DB query returns null', async () => {
    const { findMatches, query } = loadEngine();
    query.mockResolvedValueOnce(null);
    const result = await findMatches([0.1, 0.2, 0.3]);
    expect(result.match).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it('auto-matches when top score exceeds threshold with margin', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.05',
    });
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [1, 0, 0], name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p2', embedding: [0, 1, 0], name: 'Bob', phone: '0902', ref: 'T002' },
    ]);
    const result = await findMatches([0.95, 0.05, 0]);
    expect(result.match).not.toBeNull();
    expect(result.match.partnerId).toBe('p1');
    expect(result.match.name).toBe('Alice');
    expect(result.candidates).toEqual([]);
  });

  it('returns candidates when top score is plausible but margin is too small', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.20',
      FACE_CANDIDATE_THRESHOLD: '0.30',
    });
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.7, 0.7, 0], name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p2', embedding: [0.6, 0.6, 0], name: 'Bob', phone: '0902', ref: 'T002' },
    ]);
    const result = await findMatches([0.7, 0.7, 0]);
    expect(result.match).toBeNull();
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0].partnerId).toBe('p1');
  });

  it('groups multiple samples per customer and uses best score', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.05',
    });
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.5, 0.5, 0], name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p1', embedding: [0.9, 0.1, 0], name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p2', embedding: [0, 1, 0], name: 'Bob', phone: '0902', ref: 'T002' },
    ]);
    const result = await findMatches([0.95, 0.05, 0]);
    expect(result.match.partnerId).toBe('p1');
  });

  it('returns no-match when all scores are below candidate threshold', async () => {
    const { findMatches, query } = loadEngine({
      FACE_CANDIDATE_THRESHOLD: '0.80',
    });
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.3, 0.3, 0], name: 'Alice', phone: '0901', ref: 'T001' },
    ]);
    const result = await findMatches([0.95, 0.05, 0]);
    expect(result.match).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it('auto-matches when only one customer exists (no margin check needed)', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.05',
    });
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [1, 0, 0], name: 'Alice', phone: '0901', ref: 'T001' },
    ]);
    const result = await findMatches([0.95, 0.05, 0]);
    expect(result.match).not.toBeNull();
    expect(result.match.partnerId).toBe('p1');
    expect(result.candidates).toEqual([]);
  });

  it('limits candidates to MAX_CANDIDATES', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.99',
      FACE_CANDIDATE_THRESHOLD: '0.10',
      FACE_MAX_CANDIDATES: '2',
    });
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.5, 0.5, 0], name: 'A', phone: '1', ref: 'T1' },
      { partner_id: 'p2', embedding: [0.4, 0.4, 0], name: 'B', phone: '2', ref: 'T2' },
      { partner_id: 'p3', embedding: [0.3, 0.3, 0], name: 'C', phone: '3', ref: 'T3' },
      { partner_id: 'p4', embedding: [0.2, 0.2, 0], name: 'D', phone: '4', ref: 'T4' },
    ]);
    const result = await findMatches([0.5, 0.5, 0]);
    expect(result.candidates.length).toBe(2);
  });

  it('auto-matches at exact threshold boundary', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.05',
    });
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.5, 0.5, 0], name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p2', embedding: [0, 0.4, 0], name: 'Bob', phone: '0902', ref: 'T002' },
    ]);
    const result = await findMatches([0.5, 0.5, 0]);
    expect(result.match).not.toBeNull();
    expect(result.match.partnerId).toBe('p1');
  });

  it('auto-matches at exact margin boundary', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.05',
    });
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.55, 0.55, 0], name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p2', embedding: [0.5, 0.5, 0], name: 'Bob', phone: '0902', ref: 'T002' },
    ]);
    const result = await findMatches([0.55, 0.55, 0]);
    expect(result.match).not.toBeNull();
    expect(result.match.partnerId).toBe('p1');
  });

  it('returns candidate at exact candidate threshold boundary', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.99',
      FACE_CANDIDATE_THRESHOLD: '0.363',
    });
    // For a vector [a, a, 0], dot product with itself is 2*a^2
    // We want 2*a^2 = 0.363, so a = sqrt(0.1815) ≈ 0.426
    const a = Math.sqrt(0.1815);
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [a, a, 0], name: 'Alice', phone: '0901', ref: 'T001' },
    ]);
    const result = await findMatches([a, a, 0]);
    expect(result.match).toBeNull();
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].partnerId).toBe('p1');
  });

  it('does not return candidates when top auto-matches', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.05',
      FACE_CANDIDATE_THRESHOLD: '0.30',
    });
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.6, 0.6, 0], name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p2', embedding: [0.3, 0.3, 0], name: 'Bob', phone: '0902', ref: 'T002' },
    ]);
    const result = await findMatches([0.6, 0.6, 0]);
    expect(result.match).not.toBeNull();
    expect(result.match.partnerId).toBe('p1');
    expect(result.candidates).toEqual([]);
  });

  it('handles null embeddings gracefully by treating them as no-match', async () => {
    const { findMatches, query } = loadEngine({
      FACE_CANDIDATE_THRESHOLD: '0.10',
    });
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: null, name: 'Alice', phone: '0901', ref: 'T001' },
    ]);
    const result = await findMatches([0.1, 0.2, 0.3]);
    // NaN scores should be treated as below threshold
    expect(result.match).toBeNull();
    expect(result.candidates).toEqual([]);
  });
});

describe('registerSample', () => {
  it('inserts embedding and updates partner status', async () => {
    const { registerSample, query } = loadEngine();
    query
      .mockResolvedValueOnce([{ id: 'sample-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ cnt: 3 }]);

    const result = await registerSample(
      'p1',
      [0.1, 0.2],
      { detectionScore: 0.95, box: { x: 10, y: 20, width: 100, height: 120 } },
      { recognizer: 'sface', version: 'v1' },
      'abc123',
      'profile_register',
      'user-1'
    );

    expect(result.sampleId).toBe('sample-1');
    expect(result.sampleCount).toBe(3);
    expect(query).toHaveBeenCalledTimes(3);
    // First call = INSERT
    expect(query.mock.calls[0][1]).toEqual([
      'p1', [0.1, 0.2], 0.95, JSON.stringify({ x: 10, y: 20, width: 100, height: 120 }),
      'abc123', 'profile_register', 'sface', 'v1', 'user-1',
    ]);
    // Second call = UPDATE partner
    expect(query.mock.calls[1][0]).toContain('UPDATE dbo.partners');
    expect(query.mock.calls[1][1]).toEqual(['p1']);
    // Third call = COUNT
    expect(query.mock.calls[2][0]).toContain('COUNT');
    expect(query.mock.calls[2][1]).toEqual(['p1']);
  });

  it('uses defaults when optional fields are missing', async () => {
    const { registerSample, query } = loadEngine();
    query
      .mockResolvedValueOnce([{ id: 'sample-2' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ cnt: 1 }]);

    await registerSample('p1', [0.1], null, null, null, null, null);

    expect(query.mock.calls[0][1]).toEqual([
      'p1', [0.1], null, null, null, 'manual_capture', 'sface', 'opencv-sface-2021', null,
    ]);
  });

  it('handles quality with detectionScore but no box', async () => {
    const { registerSample, query } = loadEngine();
    query
      .mockResolvedValueOnce([{ id: 'sample-3' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ cnt: 1 }]);

    await registerSample('p1', [0.1], { detectionScore: 0.88 }, null, null, null, null);

    expect(query.mock.calls[0][1]).toEqual([
      'p1', [0.1], 0.88, null, null, 'manual_capture', 'sface', 'opencv-sface-2021', null,
    ]);
  });
});

describe('getFaceStatus', () => {
  it('returns registered=true with sample count and last date', async () => {
    const { getFaceStatus, query } = loadEngine();
    query
      .mockResolvedValueOnce([{ cnt: 2, last_at: '2026-05-07T10:00:00' }])
      .mockResolvedValueOnce([{ face_registered_at: '2026-05-06T09:00:00' }]);

    const result = await getFaceStatus('p1');
    expect(result.registered).toBe(true);
    expect(result.sampleCount).toBe(2);
    expect(result.lastRegisteredAt).toBe('2026-05-07T10:00:00');
  });

  it('returns registered=false when no samples exist', async () => {
    const { getFaceStatus, query } = loadEngine();
    query
      .mockResolvedValueOnce([{ cnt: 0, last_at: null }])
      .mockResolvedValueOnce([{ face_registered_at: null }]);

    const result = await getFaceStatus('p1');
    expect(result.registered).toBe(false);
    expect(result.sampleCount).toBe(0);
    expect(result.lastRegisteredAt).toBeNull();
  });

  it('falls back to partner face_registered_at when no embedding rows', async () => {
    const { getFaceStatus, query } = loadEngine();
    query
      .mockResolvedValueOnce([{ cnt: 0, last_at: null }])
      .mockResolvedValueOnce([{ face_registered_at: '2026-05-01T08:00:00' }]);

    const result = await getFaceStatus('p1');
    expect(result.lastRegisteredAt).toBe('2026-05-01T08:00:00');
  });
});
