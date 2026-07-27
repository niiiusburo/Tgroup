const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const migrationsDir = path.join(repoRoot, 'api/migrations');
const retiredDir = path.join(migrationsDir, 'RETIRED-DESTRUCTIVE-DO-NOT-RUN');

const retiredBasenames = [
  '031_update_customer_sources.sql',
  '033_merge_customer_sources_to_sale_online.sql',
  '034_merge_original_sources_to_sale_online.sql',
  '035_restore_customer_sources.sql',
  '036_remove_original_customer_source_duplicates.sql',
];

/**
 * Strip SQL comments so a commented-out example cannot be mistaken for executable SQL, and
 * so a real statement cannot hide behind a comment marker. Block comments first, then line
 * comments, because `/* -- *\/` is a block, not a line.
 */
function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/**
 * Statements that would rewrite attribution on live rows. This is the June 2026 incident
 * mechanism: the corruption arrived through an active raw-SQL migration, which semgrep's
 * JS/TS rules and the application-layer audit in INV-027 both miss entirely.
 */
function findSourceidUpdates(sql) {
  return stripSqlComments(sql)
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => (
      /\bUPDATE\b/i.test(statement)
      && /\b(dbo\.)?(partners|saleorders)\b/i.test(statement)
      && /\bsourceid\s*=/i.test(statement)
    ));
}

describe('active migrations cannot rewrite source attribution', () => {
  const activeSql = fs.readdirSync(migrationsDir, { recursive: true })
    .filter((relativePath) => (
      relativePath.endsWith('.sql')
      && !relativePath.startsWith('RETIRED-DESTRUCTIVE-DO-NOT-RUN/')
    ));

  it('scans a non-trivial number of active migrations', () => {
    // Guards the guard: a broken glob returning [] would make the next test vacuously pass.
    expect(activeSql.length).toBeGreaterThan(40);
  });

  it('contains no executable UPDATE assigning partners.sourceid or saleorders.sourceid', () => {
    const offenders = [];
    for (const relativePath of activeSql) {
      const sql = fs.readFileSync(path.join(migrationsDir, relativePath), 'utf8');
      for (const statement of findSourceidUpdates(sql)) {
        offenders.push(`${relativePath}: ${statement.replace(/\s+/g, ' ').slice(0, 120)}`);
      }
    }
    // Reviewed production repairs belong in scripts/data-repairs behind a manifest, backup and
    // explicit confirmation -- never in the directory the deploy loop globs and auto-applies.
    expect(offenders).toEqual([]);
  });

  it('accepts the intentional no-op manifest whose example UPDATE is commented out', () => {
    const manifest = path.join(migrationsDir, '074_order_source_backfill_manifest.sql');
    const raw = fs.readFileSync(manifest, 'utf8');
    // The template does mention an UPDATE, but only inside comments.
    expect(raw).toMatch(/sourceid/i);
    expect(findSourceidUpdates(raw)).toEqual([]);
  });

  it('detects a real offender, including one hidden after a comment (mutation check)', () => {
    // Without this, the passing scan above could be a detector that never fires.
    expect(findSourceidUpdates(
      'UPDATE dbo.saleorders SET sourceid = NULL WHERE id = $1;',
    )).toHaveLength(1);
    expect(findSourceidUpdates(
      "-- backfill\nUPDATE dbo.partners SET sourceid = 'x' WHERE sourceid IS NULL;",
    )).toHaveLength(1);
    expect(findSourceidUpdates(
      '/* block */ UPDATE partners SET name = $1, sourceid = $2;',
    )).toHaveLength(1);
    // And does not fire on unrelated updates or on fully commented SQL.
    expect(findSourceidUpdates('UPDATE dbo.partners SET name = $1;')).toEqual([]);
    expect(findSourceidUpdates('-- UPDATE dbo.partners SET sourceid = $1;')).toEqual([]);
    expect(findSourceidUpdates('UPDATE dbo.customersources SET name = $1;')).toEqual([]);
  });
});

describe('customer-source migration incident quarantine', () => {
  it('keeps every destructive source rewrite out of the active migration directory', () => {
    const activeSql = fs.readdirSync(migrationsDir)
      .filter((name) => name.endsWith('.sql'));

    for (const retiredName of retiredBasenames) {
      expect(activeSql).not.toContain(retiredName);
    }
  });

  it('preserves each retired artifact with a non-executable extension and warning', () => {
    for (const retiredName of retiredBasenames) {
      const retiredPath = path.join(retiredDir, `${retiredName}.retired`);
      expect(fs.existsSync(retiredPath)).toBe(true);
      expect(fs.readFileSync(retiredPath, 'utf8')).toMatch(/^-- RETIRED:/);
    }
  });

  it('cannot select a retired artifact through a recursive *.sql scan', () => {
    const recursivelyRunnableSql = fs.readdirSync(migrationsDir, { recursive: true })
      .filter((relativePath) => relativePath.endsWith('.sql'));

    expect(recursivelyRunnableSql.filter((relativePath) => (
      relativePath.startsWith('RETIRED-DESTRUCTIVE-DO-NOT-RUN/')
    )))
      .toEqual([]);
  });
});
