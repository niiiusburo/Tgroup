const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const scopeMigrationPath = path.join(repoRoot, 'api/migrations/048_investor_customer_scope.sql');
const migrationPath = path.join(repoRoot, 'api/migrations/049_investor_accounts_nk2_credentials.sql');

describe('Migration 048: investor customer scope', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(scopeMigrationPath, 'utf8');
  });

  it('seeds staff-shell permissions without wildcard access', () => {
    expect(content).toContain('customers.view');
    expect(content).toContain('customers.view_all');
    expect(content).toContain('overview.view');
    expect(content).toContain('appointments.view');
    expect(content).toContain('appointments.add');
    expect(content).toContain('appointments.edit');
    expect(content).toContain('payment.view');
    expect(content).toContain('payment.add');
    expect(content).toContain('payment.refund');
    expect(content).toContain('permissions.view');
    expect(content).toContain('permissions.edit');
    expect(content).not.toMatch(/'\*'/);
  });
});

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
