'use strict';

const fs = require('fs');
const path = require('path');

/**
 * adminLobPermissions.test.js
 *
 * Phase 2 Task 1 verification — Admin permission seeding for cosmetic LOB v2.
 *
 * Per spec D5 + Permissions Model, the Admin group must have:
 *   - cosmetic.access (enables /api/cosmetic/* routes for admins)
 *   - dental.access (mirror, for completeness)
 *   - lob.crossview (enables "also a {other LOB} client" badge)
 *
 * This test verifies:
 *   1. Migration 048_grant_lob_permissions_to_admin.sql exists and is named correctly
 *   2. The migration SQL contains INSERTs for all three permission keys
 *   3. The migration is idempotent (uses ON CONFLICT DO NOTHING)
 *
 * (The actual DB execution of the migration is NOT performed here; that happens
 * during seed/deployment. This test validates the migration structure only.)
 */

describe('Admin LOB permissions seeding (Phase-2 Task-1)', () => {
  const migrationDir = path.join(__dirname, '../../migrations');
  const migrationFile = '048_grant_lob_permissions_to_admin.sql';
  const migrationPath = path.join(migrationDir, migrationFile);

  test('migration file 048_grant_lob_permissions_to_admin.sql exists', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  test('migration file has correct naming pattern (04X_grant_lob_permissions_to_admin.sql)', () => {
    const files = fs.readdirSync(migrationDir);
    const match = files.find((f) => /^04[0-9]_grant_lob_permissions_to_admin\.sql$/.test(f));
    expect(match).toBeDefined();
  });

  test('migration SQL contains INSERT for cosmetic.access', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toMatch(/['\"]cosmetic\.access['\"]|cosmetic\.access/i);
  });

  test('migration SQL contains INSERT for dental.access', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toMatch(/['\"]dental\.access['\"]|dental\.access/i);
  });

  test('migration SQL contains INSERT for lob.crossview', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toMatch(/['\"]lob\.crossview['\"]|lob\.crossview/i);
  });

  test('migration SQL is idempotent (contains ON CONFLICT DO NOTHING)', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toMatch(/ON\s+CONFLICT\s+DO\s+NOTHING/i);
  });

  test('migration SQL targets the admin group (UUID 11111111-0000-0000-0000-000000000001)', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toMatch(/11111111-0000-0000-0000-000000000001/);
  });

  test('migration SQL includes rollback instructions in comments', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    expect(content).toMatch(/ROLLBACK|rollback/i);
  });

  test('migration references all three permission keys in a single VALUES clause for atomicity', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    // Check that all three perms are grouped in the same VALUES statement (with FROM wrapper)
    const valuesMatch = content.match(/VALUES\s*\(([\s\S]*?)\)\s*AS\s+perms/i);
    expect(valuesMatch).toBeTruthy();
    const valuesContent = valuesMatch[1];
    expect(valuesContent).toMatch(/cosmetic\.access/i);
    expect(valuesContent).toMatch(/dental\.access/i);
    expect(valuesContent).toMatch(/lob\.crossview/i);
  });
});
