const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const migrationPath = path.join(repoRoot, 'api/src/db/migrations/046_customer_face_embeddings.sql');

describe('Migration 046 safety checks', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(migrationPath, 'utf8').toLowerCase();
  });

  it('does not contain DROP TABLE for existing tables', () => {
    const dangerous = content.match(/drop\s+table\s+(?!if\s+exists\s+dbo\.customer_face_embeddings)/i);
    expect(dangerous).toBeNull();
  });

  it('does not contain DELETE without WHERE', () => {
    // Simple heuristic: any DELETE must have WHERE
    const deletes = content.match(/delete\s+from[^;]+;/gi) || [];
    for (const stmt of deletes) {
      expect(stmt).toMatch(/where/i);
    }
  });

  it('does not contain TRUNCATE', () => {
    expect(content).not.toMatch(/truncate/i);
  });

  it('uses IF NOT EXISTS for CREATE TABLE', () => {
    expect(content).toMatch(/create\s+table\s+if\s+not\s+exists/i);
  });

  it('uses safe conditional column addition (DO \$\$ block)', () => {
    expect(content).toMatch(/do\s*\$\$/i);
  });
});
