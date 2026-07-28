const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const migrationsDir = path.join(repoRoot, 'api/migrations');
const retiredDir = path.join(migrationsDir, 'RETIRED-DESTRUCTIVE-DO-NOT-RUN');

/** One-shot TDental bulk imports that TRUNCATE core tables — must never sit in the default glob. */
const retiredTruncateBasenames = [
  '008_data_migration_from_tdental.sql',
  '008_data_migration_from_tdental_v2.sql',
  '008_data_migration_from_tdental_v3.sql',
];

const TRUNCATE_RE = /\bTRUNCATE\b/i;

function listDefaultGlobSql() {
  // Mirrors the runbook/deploy discovery boundary: api/migrations/*.sql (top-level only).
  return fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'));
}

function listRecursiveRunnableSql() {
  return fs.readdirSync(migrationsDir, { recursive: true })
    .filter((relativePath) => relativePath.endsWith('.sql'));
}

describe('destructive TRUNCATE migration quarantine (AUD-001 / 008)', () => {
  it('keeps every 008 TRUNCATE bulk-import out of the default migration glob', () => {
    const activeSql = listDefaultGlobSql();

    for (const retiredName of retiredTruncateBasenames) {
      expect(activeSql).not.toContain(retiredName);
    }
  });

  it('preserves each retired 008 artifact with a non-executable extension and warning', () => {
    for (const retiredName of retiredTruncateBasenames) {
      const retiredPath = path.join(retiredDir, `${retiredName}.retired`);
      expect(fs.existsSync(retiredPath)).toBe(true);
      expect(fs.readFileSync(retiredPath, 'utf8')).toMatch(/^-- RETIRED:/);
      expect(fs.readFileSync(retiredPath, 'utf8')).toMatch(/\bTRUNCATE\b/i);
    }
  });

  it('cannot select a retired 008 artifact through a recursive *.sql scan', () => {
    const recursivelyRunnableSql = listRecursiveRunnableSql();

    expect(recursivelyRunnableSql.filter((relativePath) => (
      relativePath.startsWith('RETIRED-DESTRUCTIVE-DO-NOT-RUN/')
      && relativePath.includes('008_data_migration_from_tdental')
    )))
      .toEqual([]);
  });

  it('default migration path has no TRUNCATE statements', () => {
    const activeSql = listDefaultGlobSql();
    const offenders = [];

    for (const name of activeSql) {
      const body = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
      if (TRUNCATE_RE.test(body)) {
        offenders.push(name);
      }
    }

    expect(offenders).toEqual([]);
  });
});
