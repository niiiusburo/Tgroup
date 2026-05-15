'use strict';

const originalEnv = process.env;
const faceEnvKeys = [
  'FACE_AUTO_MATCH_THRESHOLD',
  'FACE_CANDIDATE_THRESHOLD',
  'FACE_AUTO_MATCH_MARGIN',
  'FACE_MAX_CANDIDATES',
  'FACE_EMBEDDING_DIM',
];

function loadEngine(env = {}) {
  jest.resetModules();
  process.env = { ...originalEnv };
  for (const key of faceEnvKeys) {
    if (!(key in env)) {
      delete process.env[key];
    }
  }
  // Default to 3-dim embeddings for tests (unless overridden)
  if (!('FACE_EMBEDDING_DIM' in env)) {
    process.env.FACE_EMBEDDING_DIM = '3';
  }
  Object.assign(process.env, env);
  const mockQuery = jest.fn();
  jest.doMock('../../db', () => ({ query: mockQuery }));
  const mod = require('../faceMatchEngine');
  return { ...mod, query: mockQuery };
}

afterEach(() => {
  process.env = originalEnv;
  jest.dontMock('../../db');
});

describe('computeCentroid', () => {
  it('returns normalized centroid of two identical vectors', () => {
    const { computeCentroid } = loadEngine();
    const centroid = computeCentroid([[1, 0, 0], [1, 0, 0]]);
    expect(centroid).toEqual([1, 0, 0]);
  });

  it('returns normalized centroid of two different vectors', () => {
    const { computeCentroid } = loadEngine();
    const centroid = computeCentroid([[1, 0, 0], [0, 1, 0]]);
    // Average = [0.5, 0.5, 0], normalized = [0.7071..., 0.7071..., 0]
    expect(centroid[0]).toBeCloseTo(0.7071, 3);
    expect(centroid[1]).toBeCloseTo(0.7071, 3);
    expect(centroid[2]).toBe(0);
  });

  it('returns null for empty array', () => {
    const { computeCentroid } = loadEngine();
    expect(computeCentroid([])).toBeNull();
  });

  it('returns null for undefined input', () => {
    const { computeCentroid } = loadEngine();
    expect(computeCentroid(undefined)).toBeNull();
  });
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

  it('uses tuned defaults so 55% confidence does not pass', async () => {
    const { findMatches, query } = loadEngine();
    // Use unit vectors. [0.5, 0.866, 0] dot [1, 0, 0] = 0.5 (below candidate threshold 0.58)
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.5, 0.8660254, 0], name: 'Alice', phone: '0901', ref: 'T001' },
    ]);

    const result = await findMatches([1, 0, 0]);

    expect(result.match).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it('uses default candidate review at 65% confidence', async () => {
    const { findMatches, query } = loadEngine();
    // [0.65, 0.7599, 0] is a unit vector (0.65^2 + 0.7599^2 ≈ 1).
    // Dot with [1, 0, 0] = 0.65. Above candidate 0.58, below auto-match 0.72.
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.65, 0.7599342, 0], name: 'Alice', phone: '0901', ref: 'T001' },
    ]);

    const result = await findMatches([1, 0, 0]);

    expect(result.match).toBeNull();
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].confidence).toBeCloseTo(0.65, 2);
  });

  it('uses default auto-match at 80% confidence with margin', async () => {
    const { findMatches, query } = loadEngine();
    // [0.8, 0.6, 0] is a unit vector (0.64 + 0.36 = 1). Dot with [1,0,0] = 0.8.
    // [0.6, 0.8, 0] is a unit vector. Dot with [1,0,0] = 0.6. Margin = 0.2 >= 0.08.
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.8, 0.6, 0], name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p2', embedding: [0.6, 0.8, 0], name: 'Bob', phone: '0902', ref: 'T002' },
    ]);

    const result = await findMatches([1, 0, 0]);

    expect(result.match).not.toBeNull();
    expect(result.match.confidence).toBeCloseTo(0.8, 2);
    expect(result.candidates).toEqual([]);
  });

  it('auto-matches when top score exceeds threshold with margin', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.05',
    });
    // Both embeddings are unit vectors; query [0.95,0.05,0] is nearly [1,0,0]
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [1, 0, 0], name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p2', embedding: [0, 1, 0], name: 'Bob', phone: '0902', ref: 'T002' },
    ]);
    // Normalize query to unit vector
    const q = [0.95, 0.05, 0];
    const qNorm = Math.sqrt(q[0]**2 + q[1]**2 + q[2]**2);
    const qUnit = q.map(v => v / qNorm);
    const result = await findMatches(qUnit);
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
    // Use unit vectors: [0.707,0.707,0] is normalized [0.7,0.7,0]
    const emb1 = [0.70710678, 0.70710678, 0];
    const emb2 = [0.6, 0.8, 0]; // also unit vector (0.36+0.64=1)
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: emb1, name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p2', embedding: emb2, name: 'Bob', phone: '0902', ref: 'T002' },
    ]);
    const result = await findMatches(emb1);
    expect(result.match).toBeNull();
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0].partnerId).toBe('p1');
  });

  it('averages multiple samples per customer (centroid matching)', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.05',
    });
    // Use unit vectors for meaningful similarity
    const emb1 = [0.70710678, 0.70710678, 0]; // normalized [0.5,0.5,0]
    const emb2 = [0.99388373, 0.11043152, 0]; // normalized [0.9,0.1,0]
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: emb1, name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p1', embedding: emb2, name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p2', embedding: [0, 1, 0], name: 'Bob', phone: '0902', ref: 'T002' },
    ]);
    // Query nearly aligned with emb2
    const q = [0.95, 0.05, 0];
    const qNorm = Math.sqrt(q[0]**2 + q[1]**2 + q[2]**2);
    const qUnit = q.map(v => v / qNorm);
    const result = await findMatches(qUnit);
    expect(result.match.partnerId).toBe('p1');
    expect(result.match.confidence).toBeGreaterThan(0.70);
  });

  it('returns no-match when all scores are below candidate threshold', async () => {
    const { findMatches, query } = loadEngine({
      FACE_CANDIDATE_THRESHOLD: '0.80',
    });
    // [0.7, 0.714, 0] is unit vector. Dot with [1,0,0] = 0.7 (below candidate 0.80)
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.7, 0.714142, 0], name: 'Alice', phone: '0901', ref: 'T001' },
    ]);
    const result = await findMatches([1, 0, 0]);
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
    const q = [0.95, 0.05, 0];
    const qNorm = Math.sqrt(q[0]**2 + q[1]**2 + q[2]**2);
    const qUnit = q.map(v => v / qNorm);
    const result = await findMatches(qUnit);
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
    const emb = [0.70710678, 0.70710678, 0];
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: emb, name: 'A', phone: '1', ref: 'T1' },
      { partner_id: 'p2', embedding: [0.6, 0.8, 0], name: 'B', phone: '2', ref: 'T2' },
      { partner_id: 'p3', embedding: [0.8, 0.6, 0], name: 'C', phone: '3', ref: 'T3' },
      { partner_id: 'p4', embedding: [0, 1, 0], name: 'D', phone: '4', ref: 'T4' },
    ]);
    const result = await findMatches(emb);
    expect(result.candidates.length).toBe(2);
  });

  it('excludes candidates below candidate threshold', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.99',
      FACE_CANDIDATE_THRESHOLD: '0.30',
    });
    // All unit vectors. Use query [0.9, 0.43589, 0] so no auto-match at 0.99 threshold.
    // p1: [1,0,0] dot query = 0.90. p2: [0.6,0.8,0] dot query = 0.889. p3: [0.2,0.9798,0] dot query = 0.607.
    // All >= 0.30 candidate threshold, but p3 score is lowest.
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [1, 0, 0], name: 'A', phone: '1', ref: 'T1' },
      { partner_id: 'p2', embedding: [0.6, 0.8, 0], name: 'B', phone: '2', ref: 'T2' },
      { partner_id: 'p3', embedding: [0.2, 0.9797959, 0], name: 'C', phone: '3', ref: 'T3' },
    ]);
    const queryVec = [0.9, 0.435889894, 0]; // unit vector
    const result = await findMatches(queryVec);
    expect(result.match).toBeNull();
    expect(result.candidates).toHaveLength(3);
    // p3 should be last (lowest score)
    expect(result.candidates[2].partnerId).toBe('p3');
  });

  it('returns no-match for opposite-facing embeddings (centroid near zero)', async () => {
    const { findMatches, query } = loadEngine({
      FACE_CANDIDATE_THRESHOLD: '0.10',
    });
    // Two opposite unit vectors average to [0,0,0] → normalized = undefined
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [1, 0, 0], name: 'A', phone: '1', ref: 'T1' },
      { partner_id: 'p1', embedding: [-1, 0, 0], name: 'A', phone: '1', ref: 'T1' },
    ]);
    const result = await findMatches([0.5, 0, 0]);
    // Centroid is [0,0,0] after normalization → similarity = 0
    expect(result.match).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it('uses centroid when multiple identical samples exist', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.05',
    });
    const emb = [0.70710678, 0.70710678, 0];
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: emb, name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p1', embedding: emb, name: 'Alice2', phone: '0902', ref: 'T002' },
    ]);
    const result = await findMatches(emb);
    expect(result.match).not.toBeNull();
    expect(result.match.partnerId).toBe('p1');
    expect(result.match.name).toBe('Alice');
  });

  it('auto-matches at exact threshold boundary', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.05',
    });
    const emb = [0.70710678, 0.70710678, 0];
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: emb, name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p2', embedding: [0, 1, 0], name: 'Bob', phone: '0902', ref: 'T002' },
    ]);
    const result = await findMatches(emb);
    expect(result.match).not.toBeNull();
    expect(result.match.partnerId).toBe('p1');
  });

  it('auto-matches at exact margin boundary', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.05',
    });
    // emb1 = [0.707, 0.707, 0] (unit). emb2 = [0, 1, 0] (unit).
    // dot(emb1, emb1) = 1.0. dot(emb2, emb1) = 0.707. margin = 0.293 >= 0.05.
    const emb1 = [0.70710678, 0.70710678, 0];
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: emb1, name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p2', embedding: [0, 1, 0], name: 'Bob', phone: '0902', ref: 'T002' },
    ]);
    const result = await findMatches(emb1);
    expect(result.match).not.toBeNull();
    expect(result.match.partnerId).toBe('p1');
  });

  it('returns candidate at exact candidate threshold boundary', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.99',
      FACE_CANDIDATE_THRESHOLD: '0.58',
    });
    // Need a unit vector with dot product = 0.58 with [1,0,0].
    // [0.58, sqrt(1-0.58^2), 0] = [0.58, 0.8146, 0]
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.58, 0.814575, 0], name: 'Alice', phone: '0901', ref: 'T001' },
    ]);
    const result = await findMatches([1, 0, 0]);
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
    const emb1 = [0.70710678, 0.70710678, 0];
    const emb2 = [0.4472136, 0.89442719, 0]; // [0.3,0.6] normalized
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: emb1, name: 'Alice', phone: '0901', ref: 'T001' },
      { partner_id: 'p2', embedding: emb2, name: 'Bob', phone: '0902', ref: 'T002' },
    ]);
    const result = await findMatches(emb1);
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
    const q = [0.1, 0.2, 0.3];
    const qNorm = Math.sqrt(q[0]**2 + q[1]**2 + q[2]**2);
    const qUnit = q.map(v => v / qNorm);
    const result = await findMatches(qUnit);
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

  it('includes imageSha256 when provided', async () => {
    const { registerSample, query } = loadEngine();
    query.mockResolvedValueOnce([{ id: 's-1' }]);
    query.mockResolvedValueOnce([]);
    query.mockResolvedValueOnce([{ cnt: 1 }]);

    await registerSample(
      'p1',
      [0.1, 0.2],
      { detectionScore: 0.9, box: { x: 1 } },
      { recognizer: 'sface', version: 'v1' },
      'abc123hash',
      'test',
      'u1'
    );

    expect(query.mock.calls[0][1][4]).toBe('abc123hash');
  });

  it('computes cosine similarity for simple embeddings', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
    });
    // [0.8, 0.6, 0] is a unit vector. Dot with [1, 0, 0] = 0.8.
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.8, 0.6, 0], name: 'Alice', phone: '0901', ref: 'T001' },
    ]);
    const result = await findMatches([1, 0, 0]);
    expect(result.match).not.toBeNull();
    expect(result.match.partnerId).toBe('p1');
    expect(result.match.confidence).toBeCloseTo(0.8, 2);
  });

  it('returns no-match when query embedding is null', async () => {
    const { findMatches, query } = loadEngine({
      FACE_CANDIDATE_THRESHOLD: '0.10',
    });
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: [0.1, 0.2, 0.3], name: 'Alice', phone: '0901', ref: 'T001' },
    ]);
    const result = await findMatches(null);
    expect(result.match).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it('returns 0 for cosineSimilarity with different length arrays', () => {
    const { cosineSimilarity } = loadEngine();
    expect(cosineSimilarity([0.1, 0.2], [0.1, 0.2, 0.3])).toBe(0);
  });

  it('returns 0 for cosineSimilarity with undefined embeddings', () => {
    const { cosineSimilarity } = loadEngine();
    expect(cosineSimilarity([0.1, 0.2], undefined)).toBe(0);
    expect(cosineSimilarity(undefined, [0.1, 0.2])).toBe(0);
  });

  it('preserves null phone in match result', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.05',
    });
    const emb = [0.70710678, 0.70710678, 0];
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: emb, name: 'Alice', phone: null, ref: 'T001' },
    ]);
    const result = await findMatches(emb);
    expect(result.match).not.toBeNull();
    expect(result.match.phone).toBeNull();
    expect(result.match.name).toBe('Alice');
  });

  it('falls back to empty string when code is null', async () => {
    const { findMatches, query } = loadEngine({
      FACE_AUTO_MATCH_THRESHOLD: '0.50',
      FACE_AUTO_MATCH_MARGIN: '0.05',
    });
    const emb = [0.70710678, 0.70710678, 0];
    query.mockResolvedValueOnce([
      { partner_id: 'p1', embedding: emb, name: 'Alice', phone: '0901', ref: null },
    ]);
    const result = await findMatches(emb);
    expect(result.match).not.toBeNull();
    expect(result.match.code).toBe('');
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

  it('stringifies empty box object as empty JSON object', async () => {
    const { registerSample, query } = loadEngine();
    query
      .mockResolvedValueOnce([{ id: 'sample-4' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ cnt: 1 }]);

    await registerSample('p1', [0.1], { detectionScore: 0.9, box: {} }, { recognizer: 'sface', version: 'v1' }, null, 'test', 'u1');

    expect(query.mock.calls[0][1][3]).toBe('{}');
  });

  it('stringifies complex box object with nested properties', async () => {
    const { registerSample, query } = loadEngine();
    query
      .mockResolvedValueOnce([{ id: 'sample-5' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ cnt: 1 }]);

    const box = { x: 10, y: 20, width: 100, height: 120, landmarks: { leftEye: [30, 40] } };
    await registerSample('p1', [0.1], { detectionScore: 0.9, box }, { recognizer: 'sface', version: 'v1' }, null, 'test', 'u1');

    expect(query.mock.calls[0][1][3]).toBe(JSON.stringify(box));
  });
});

describe('getFaceStatus', () => {
  it('returns registered=true with sample count and last date', async () => {
    const { getFaceStatus, query } = loadEngine();
    query
      .mockResolvedValueOnce([{ cnt: 2, last_at: '2026-05-07T10:00:00' }])
      .mockResolvedValueOnce([{ face_registered_at: '2026-05-06T09:00:00' }]);

    const result = await getFaceStatus('p1');
    expect(result.partnerId).toBe('p1');
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

  it('returns registered=true with single sample', async () => {
    const { getFaceStatus, query } = loadEngine();
    query
      .mockResolvedValueOnce([{ cnt: 1, last_at: '2026-05-07T10:00:00' }])
      .mockResolvedValueOnce([{ face_registered_at: '2026-05-07T10:00:00' }]);

    const result = await getFaceStatus('p1');
    expect(result.registered).toBe(true);
    expect(result.sampleCount).toBe(1);
  });

  it('handles null last_at by using face_registered_at fallback', async () => {
    const { getFaceStatus, query } = loadEngine();
    query
      .mockResolvedValueOnce([{ cnt: 2, last_at: null }])
      .mockResolvedValueOnce([{ face_registered_at: '2026-05-05T08:00:00' }]);

    const result = await getFaceStatus('p1');
    expect(result.registered).toBe(true);
    expect(result.sampleCount).toBe(2);
    expect(result.lastRegisteredAt).toBe('2026-05-05T08:00:00');
  });

  it('returns registered=false when both queries return empty', async () => {
    const { getFaceStatus, query } = loadEngine();
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getFaceStatus('p1');
    expect(result.registered).toBe(false);
    expect(result.sampleCount).toBe(0);
    expect(result.lastRegisteredAt).toBeNull();
  });

  it('handles database returning empty array for partner', async () => {
    const { getFaceStatus, query } = loadEngine();
    query
      .mockResolvedValueOnce([{ cnt: 0, last_at: null }])
      .mockResolvedValueOnce([]);

    const result = await getFaceStatus('p1');
    expect(result.registered).toBe(false);
    expect(result.lastRegisteredAt).toBeNull();
  });
});
