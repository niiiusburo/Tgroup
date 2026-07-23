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
