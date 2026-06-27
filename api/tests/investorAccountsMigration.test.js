const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const migrationPath = path.join(repoRoot, 'api/migrations/049_investor_accounts_nk2_credentials.sql');

describe('Migration 049: investor_accounts NK2 credentials', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(migrationPath, 'utf8');
  });

  it('creates investor_accounts as an additive credential table', () => {
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS\s+dbo\.investor_accounts/i);
    expect(content).toContain('partner_id');
    expect(content).toContain('password_hash');
    expect(content).toContain('active');
  });

  it('maps credentials back to partners without deleting data', () => {
    expect(content).toMatch(/REFERENCES\s+dbo\.partners\s*\(\s*id\s*\)\s+ON DELETE CASCADE/i);
    expect(content.toLowerCase()).not.toMatch(/\bdrop\s+table\b|\btruncate\b|\bdelete\s+from\b/);
  });

  it('keeps email lookup case-insensitive and unique', () => {
    expect(content).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS\s+idx_investor_accounts_email_lower/i);
    expect(content).toMatch(/lower\s*\(\s*email\s*\)/i);
  });
});
