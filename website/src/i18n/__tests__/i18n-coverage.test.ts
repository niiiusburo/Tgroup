import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('i18n coverage', () => {
  it('keeps production translation keys covered in English and Vietnamese', () => {
    const out = execSync('node scripts/audit-i18n.cjs', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(out).toContain('Found 0 missing translation keys');
  });
});
