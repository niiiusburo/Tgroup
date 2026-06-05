const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const migrationsDir = `${repoRoot}${path.sep}api${path.sep}migrations`;

const requiredGuard = /allow_destructive_tdental_import/;
const requiredProtectedGuard = /allow_live_destructive_tdental_import/;

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');
}

function hasDangerousStatement(sql) {
  const uncommented = stripSqlComments(sql);
  const statements = uncommented
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  return statements.some((statement) => {
    if (/\bTRUNCATE\s+TABLE\b/i.test(statement)) return true;
    if (/\bDROP\s+(TABLE|DATABASE)\b/i.test(statement)) return true;
    return /\bDELETE\s+FROM\b/i.test(statement) && !/\bWHERE\b/i.test(statement);
  });
}

function sqlFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => `${migrationsDir}${path.sep}${name}`);
}

describe('destructive migration guardrails', () => {
  it('requires break-glass guards on migrations with destructive SQL', () => {
    const unguarded = [];

    for (const file of sqlFiles()) {
      const content = fs.readFileSync(file, 'utf8');
      if (!hasDangerousStatement(content)) continue;

      if (!requiredGuard.test(content) || !requiredProtectedGuard.test(content)) {
        unguarded.push(path.relative(repoRoot, file));
      }
    }

    expect(unguarded).toEqual([]);
  });
});
