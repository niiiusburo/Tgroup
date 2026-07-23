const fs = require('fs');
const path = require('path');

const migration = fs.readFileSync(
  path.resolve(__dirname, '../migrations/050_add_customer_source_foreign_keys.sql'),
  'utf8',
);

describe('customer-source reference foreign keys', () => {
  it.each([
    ['partners', 'partners_sourceid_customersources_fk'],
    ['saleorders', 'saleorders_sourceid_customersources_fk'],
  ])('retains %s source history with an idempotent validated FK', (table, constraint) => {
    expect(migration).toContain(`conrelid = 'dbo.${table}'::regclass`);
    expect(migration).toContain(`CONSTRAINT ${constraint}`);
    expect(migration).toContain('REFERENCES dbo.customersources(id)');
    expect(migration).toContain(`VALIDATE CONSTRAINT ${constraint}`);
  });

  it('restricts lookup deletion and never cascades into customer or order data', () => {
    expect(migration.match(/ON DELETE RESTRICT/g)).toHaveLength(2);
    expect(migration).not.toMatch(/ON DELETE CASCADE/i);
  });
});
