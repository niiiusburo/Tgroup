/**
 * Regression test for migration 051: payment_proofs.payment_id type.
 *
 * Reads the migration SQL directly and asserts:
 *   - It declares payment_id as uuid (NOT integer).
 *   - It adds a FK constraint to dbo.payments(id) ON DELETE CASCADE.
 *   - It's idempotent (re-runnable without error).
 *
 * Why this exists: the original 002_payment_proofs migration shipped with
 * payment_id as integer while dbo.payments.id is uuid, breaking every upload
 * attempt at the DB driver. Migration 051 fixes it. This test prevents the
 * SQL from being reverted or weakened in future refactors.
 */

const fs = require('fs');
const path = require('path');

const migrationPath = path.resolve(
  __dirname,
  '../src/db/migrations/051_payment_proofs_payment_id_uuid.sql'
);

describe('migration 051: payment_proofs.payment_id INT→UUID', () => {
  let sql;

  beforeAll(() => {
    sql = fs.readFileSync(migrationPath, 'utf8');
  });

  it('declares payment_id as uuid (not integer)', () => {
    expect(sql).toMatch(/ADD COLUMN payment_id uuid/i);
    // The reverse case must be the "drop the broken int column" path, not a re-add.
    const intAdds = sql.match(/ADD COLUMN payment_id integer/i);
    expect(intAdds).toBeNull();
  });

  it('adds a FK constraint to dbo.payments(id) ON DELETE CASCADE', () => {
    expect(sql).toMatch(/CONSTRAINT fk_payment_proofs_payment/i);
    expect(sql).toMatch(/REFERENCES dbo\.payments\s*\(\s*id\s*\)\s+ON DELETE CASCADE/i);
  });

  it('is idempotent — guards each mutation with EXISTS / IF NOT EXISTS', () => {
    // The column swap must be gated behind a current-type check.
    expect(sql).toMatch(/IF EXISTS[\s\S]+data_type\s*=\s*'integer'/i);
    // The FK add must be gated on absence of the constraint.
    expect(sql).toMatch(/IF NOT EXISTS[\s\S]+fk_payment_proofs_payment/i);
    // The index recreation must use DROP IF EXISTS so re-runs don't fail.
    expect(sql).toMatch(/DROP INDEX IF EXISTS dbo\.idx_payment_proofs_payment_confirmed/i);
  });

  it('wraps everything in a single transaction', () => {
    expect(sql).toMatch(/^BEGIN;$/m);
    expect(sql).toMatch(/^COMMIT;$/m);
  });
});
