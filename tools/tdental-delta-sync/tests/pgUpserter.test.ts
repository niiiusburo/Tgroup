import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import 'dotenv/config';
import { PgUpserter } from '../src/pgUpserter.js';

const PG = {
  host: process.env.PG_HOST ?? '127.0.0.1',
  port: Number(process.env.PG_PORT ?? '55433'),
  user: process.env.PG_USER ?? 'postgres',
  password: process.env.PG_PASSWORD ?? 'postgres',
  database: process.env.PG_DATABASE ?? 'tdental_real',
};
const TEST_SCHEMA = 'sync_test';

let pool: pg.Pool;

// Probe before tests so skipIf sees a definite value.
async function probeAvailable(): Promise<boolean> {
  const p = new pg.Pool({ ...PG, max: 1, connectionTimeoutMillis: 2000 });
  try {
    await p.query('SELECT 1');
    await p.end();
    return true;
  } catch {
    try { await p.end(); } catch {}
    return false;
  }
}
const available = await probeAvailable();

async function setup(): Promise<void> {
  pool = new pg.Pool({ ...PG, max: 2 });
  await pool.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
  await pool.query(`CREATE SCHEMA ${TEST_SCHEMA}`);
  await pool.query(`
    CREATE TABLE ${TEST_SCHEMA}.widgets (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      qty integer,
      active boolean
    )
  `);
  await pool.query(`
    CREATE TABLE ${TEST_SCHEMA}.parents (
      id uuid PRIMARY KEY,
      name text NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE ${TEST_SCHEMA}.children (
      id uuid PRIMARY KEY,
      parent_id uuid NOT NULL REFERENCES ${TEST_SCHEMA}.parents(id),
      label text
    )
  `);
}

beforeAll(async () => {
  if (!available) return;
  await setup();
});

afterAll(async () => {
  if (pool) {
    try {
      await pool.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
    } catch {}
    await pool.end();
  }
});

function u(): PgUpserter {
  return new PgUpserter({ ...PG, schema: TEST_SCHEMA });
}

describe.skipIf(!available)('PgUpserter integration', () => {
  it('inserts new rows and counts them', async () => {
    const upserter = u();
    try {
      const result = await upserter.upsert(
        'widgets',
        [
          { id: '11111111-1111-1111-1111-111111111111', name: 'a', qty: 1, active: true },
          { id: '22222222-2222-2222-2222-222222222222', name: 'b', qty: 2, active: false },
        ],
        'id',
      );
      expect(result.inserted).toBe(2);
      expect(result.updated).toBe(0);
      expect(await upserter.rowCount('widgets')).toBe(2);
    } finally {
      await upserter.close();
    }
  });

  it('updates existing rows', async () => {
    const upserter = u();
    try {
      const result = await upserter.upsert(
        'widgets',
        [
          { id: '11111111-1111-1111-1111-111111111111', name: 'a-changed', qty: 99, active: true },
          { id: '22222222-2222-2222-2222-222222222222', name: 'b', qty: 2, active: false },
          { id: '33333333-3333-3333-3333-333333333333', name: 'new', qty: 3, active: true },
        ],
        'id',
      );
      expect(result.inserted).toBe(1);
      expect(result.updated).toBe(2);
      const { rows } = await pool.query(
        `SELECT name, qty FROM ${TEST_SCHEMA}.widgets WHERE id = '11111111-1111-1111-1111-111111111111'`,
      );
      expect(rows[0].name).toBe('a-changed');
      expect(Number(rows[0].qty)).toBe(99);
    } finally {
      await upserter.close();
    }
  });

  it('returns zero counts for empty input', async () => {
    const upserter = u();
    try {
      const r = await upserter.upsert('widgets', [], 'id');
      expect(r).toEqual({ inserted: 0, updated: 0, skipped: 0 });
    } finally {
      await upserter.close();
    }
  });

  it('dry-run makes no DB writes', async () => {
    const upserter = u();
    try {
      const before = await upserter.rowCount('widgets');
      const r = await upserter.upsert(
        'widgets',
        [{ id: '44444444-4444-4444-4444-444444444444', name: 'dry', qty: 0, active: true }],
        'id',
        { dryRun: true },
      );
      expect(r.inserted).toBe(0);
      expect(r.updated).toBe(0);
      expect(r.skipped).toBe(1);
      expect(await upserter.rowCount('widgets')).toBe(before);
    } finally {
      await upserter.close();
    }
  });

  it('FK violation surfaces clear error (tx rolls back)', async () => {
    const upserter = u();
    try {
      await expect(
        upserter.upsert(
          'children',
          [
            {
              id: '55555555-5555-5555-5555-555555555555',
              parent_id: 'deadbeef-0000-0000-0000-000000000000',
              label: 'orphan',
            },
          ],
          'id',
        ),
      ).rejects.toThrow();
      expect(await upserter.rowCount('children')).toBe(0);
    } finally {
      await upserter.close();
    }
  });

  it('describeColumns reports columns', async () => {
    const upserter = u();
    try {
      const cols = await upserter.describeColumns('widgets');
      expect(cols.has('id')).toBe(true);
      expect(cols.has('name')).toBe(true);
      expect(cols.has('qty')).toBe(true);
    } finally {
      await upserter.close();
    }
  });
});
