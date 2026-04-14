import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('i18n coverage', () => {
  it('has zero orphan t() calls (static scan)', () => {
    const out = execSync('node /tmp/i18n-scan.js', { encoding: 'utf8' });
    const orphanLine = out.split('\n').find(l => l.startsWith('Orphans:'));
    expect(orphanLine).toBeDefined();
    const count = parseInt(orphanLine!.split(':')[1].trim(), 10);
    if (count > 0) {
      console.error(out);
    }
    expect(count, 'Static scan found i18n orphans — see /tmp/i18n-scan.js output').toBe(0);
  });
});
