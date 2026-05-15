const fs = require('fs');
const path = require('path');

describe('payment system restore migrations', () => {
  const migrationPath = path.join(__dirname, '..', 'migrations', '047_restore_payment_system.sql');

  it('backfills explicit deposit rows into the deposit category', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toContain("SET payment_category = 'deposit'");
    expect(sql).toContain("deposit_type IN ('deposit', 'refund')");
    expect(sql).toContain("payment_category <> 'deposit'");
  });

  it('restores payment void permission for Admin and Super Admin', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toContain("'payment.void'");
    expect(sql).toContain("'Super Admin'");
    expect(sql).toContain("'Admin'");
    expect(sql).toContain('ON CONFLICT (group_id, permission) DO NOTHING');
  });
});
