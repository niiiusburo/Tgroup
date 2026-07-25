'use strict';

const fs = require('fs');
const path = require('path');

const migrationPath = path.join(
  __dirname,
  '../migrations/053_source_change_audit.sql',
);

describe('migration 053 source_change_audit', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(migrationPath, 'utf8');
  });

  it('creates append-only ledger table', () => {
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS\s+dbo\.source_change_audit/i);
  });

  it('includes required attribution columns', () => {
    for (const col of [
      'entity_type',
      'entity_id',
      'old_sourceid',
      'new_sourceid',
      'actor_employee_id',
      'reason',
      'request_id',
      'transaction_id',
      'correction_manifest_ref',
      'change_channel',
      'is_unexpected',
      'created_at',
    ]) {
      expect(content).toContain(col);
    }
  });

  it('blocks UPDATE and DELETE via triggers', () => {
    expect(content).toMatch(/prevent_source_change_audit_mutation/i);
    expect(content).toMatch(/BEFORE UPDATE ON dbo\.source_change_audit/i);
    expect(content).toMatch(/BEFORE DELETE ON dbo\.source_change_audit/i);
  });

  it('seeds correction permissions', () => {
    expect(content).toContain('services.source_correct');
    expect(content).toContain('customers.source_correct');
  });
});
