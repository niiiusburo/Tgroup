/**
 * Integration test for the Face ID pipeline.
 *
 * Unlike faceRecognition.test.js (which mocks faceEngineClient + faceMatchEngine + db),
 * this test exercises the *real* stack:
 *   - HTTP -> Express -> faceRecognition route
 *   - faceMatchEngine -> live Postgres at DATABASE_URL
 *   - faceEngineClient -> live face-service at FACE_SERVICE_URL
 *
 * It is the test that would have caught all three bugs fixed in 0.29.0:
 *   1. Unnormalized SFace embeddings (cosine similarity returned magnitudes ~6.7)
 *   2. Single threshold rejecting genuine portraits
 *   3. COALESCE text/uuid mismatch on dbo.partners.face_subject_id
 *
 * Skips itself (rather than failing) if face-service or Postgres is unreachable,
 * so it stays usable in environments without the full stack.
 */

jest.setTimeout(30_000);

// Auth is the only thing we mock — the bugs we want to catch live below this line.
jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

// uuid v9+ ships as ESM; some sibling routes (e.g. products.js) `require('uuid')`,
// which Jest can't load. Stub it — the face-id pipeline doesn't call uuid.v4 directly,
// so this only affects unrelated routes pulled in when server.js mounts them all.
jest.mock('uuid', () => ({ v4: () => 'integration-test-uuid' }));

const fs = require('fs');
const path = require('path');
const request = require('supertest');

const FIXTURE_A = path.join(__dirname, 'fixtures', 'test-face-a.jpg');
const FIXTURE_B = path.join(__dirname, 'fixtures', 'test-face-b.jpg');

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://127.0.0.1:8001';

let app;
let query;
let partnerA;
let partnerB;
let live = false;
let skipReason = '';

beforeAll(async () => {
  // Skip-guard: face-service must be healthy.
  try {
    const res = await fetch(`${FACE_SERVICE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) {
      skipReason = `face-service /health returned ${res.status}`;
      return;
    }
  } catch (err) {
    skipReason = `face-service unreachable at ${FACE_SERVICE_URL} (${err.message})`;
    return;
  }

  // Skip-guard: DB must be reachable.
  try {
    ({ query } = require('../src/db'));
    const ping = await query('SELECT 1 AS ok');
    if (!ping || ping[0]?.ok !== 1) {
      skipReason = 'DB ping returned unexpected result';
      return;
    }
  } catch (err) {
    skipReason = `DB unreachable (${err.message})`;
    return;
  }

  // Need two distinct active partners to register against.
  const partners = await query(
    `SELECT id FROM dbo.partners
     WHERE isdeleted = false
     ORDER BY id
     LIMIT 2`
  );
  if (!partners || partners.length < 2) {
    skipReason = 'need at least 2 active partners in dbo.partners';
    return;
  }
  partnerA = partners[0].id;
  partnerB = partners[1].id;

  // Clean slate for these two partners.
  await query(`DELETE FROM dbo.customer_face_embeddings WHERE partner_id = ANY($1::uuid[])`, [[partnerA, partnerB]]);
  await query(
    `UPDATE dbo.partners SET face_subject_id = NULL, face_registered_at = NULL
     WHERE id = ANY($1::uuid[])`,
    [[partnerA, partnerB]]
  );

  // Now load the Express app (routes hold a require to db; safe to require after env is set).
  app = require('../src/server');
  live = true;
});

afterAll(async () => {
  if (live && query && partnerA && partnerB) {
    await query(`DELETE FROM dbo.customer_face_embeddings WHERE partner_id = ANY($1::uuid[])`, [[partnerA, partnerB]]);
    await query(
      `UPDATE dbo.partners SET face_subject_id = NULL, face_registered_at = NULL
       WHERE id = ANY($1::uuid[])`,
      [[partnerA, partnerB]]
    );
  }
});

describe('Face ID — live integration (face-service + Postgres)', () => {
  test('register + recognize round-trip routes each face to its own partner', async () => {
    if (!live) {
      console.warn(`[face-id integration] skipped: ${skipReason}`);
      return;
    }

    const faceA = fs.readFileSync(FIXTURE_A);
    const faceB = fs.readFileSync(FIXTURE_B);

    // Step 1: register face-A against partnerA.
    const regA = await request(app)
      .post('/api/face/register')
      .field('partnerId', partnerA)
      .field('source', 'manual_capture')
      .attach('image', faceA, 'face-a.jpg');
    expect(regA.status).toBe(201);
    expect(regA.body.success).toBe(true);
    expect(regA.body.partnerId).toBe(partnerA);
    expect(regA.body.sampleCount).toBe(1);

    // Step 2: register face-B against partnerB.
    const regB = await request(app)
      .post('/api/face/register')
      .field('partnerId', partnerB)
      .field('source', 'manual_capture')
      .attach('image', faceB, 'face-b.jpg');
    expect(regB.status).toBe(201);
    expect(regB.body.success).toBe(true);
    expect(regB.body.partnerId).toBe(partnerB);

    // Step 3: stored embeddings must be L2-normalized — guards bug #1.
    const stored = await query(
      `SELECT partner_id, embedding FROM dbo.customer_face_embeddings
       WHERE partner_id = ANY($1::uuid[])`,
      [[partnerA, partnerB]]
    );
    expect(stored).toHaveLength(2);
    for (const row of stored) {
      const norm = Math.sqrt(row.embedding.reduce((s, v) => s + v * v, 0));
      expect(norm).toBeGreaterThan(0.99);
      expect(norm).toBeLessThan(1.01);
    }

    // Step 4: partners.face_registered_at populated — guards bug #3 (COALESCE crash).
    const partnerRows = await query(
      `SELECT id, face_subject_id, face_registered_at FROM dbo.partners
       WHERE id = ANY($1::uuid[])`,
      [[partnerA, partnerB]]
    );
    for (const p of partnerRows) {
      expect(p.face_subject_id).not.toBeNull();
      expect(p.face_registered_at).not.toBeNull();
    }

    // Step 5: recognize face-A — must auto-match partnerA, not partnerB.
    const recA = await request(app)
      .post('/api/face/recognize')
      .attach('image', faceA, 'face-a.jpg');
    expect(recA.status).toBe(200);
    expect(recA.body.match).not.toBeNull();
    expect(recA.body.match.partnerId).toBe(partnerA);
    // With proper normalization, self-match confidence should be ≈ 1.
    // With bug #1 (raw vectors) it would be ~6.7 and break the [0,1] contract.
    expect(recA.body.match.confidence).toBeGreaterThanOrEqual(0.9);
    expect(recA.body.match.confidence).toBeLessThanOrEqual(1.0);

    // Step 6: recognize face-B — must auto-match partnerB, not partnerA.
    const recB = await request(app)
      .post('/api/face/recognize')
      .attach('image', faceB, 'face-b.jpg');
    expect(recB.status).toBe(200);
    expect(recB.body.match).not.toBeNull();
    expect(recB.body.match.partnerId).toBe(partnerB);
    expect(recB.body.match.confidence).toBeGreaterThanOrEqual(0.9);
    expect(recB.body.match.confidence).toBeLessThanOrEqual(1.0);
  });
});
