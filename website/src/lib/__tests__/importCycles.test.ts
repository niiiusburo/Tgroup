import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Regression lock: website/src/lib/api/core.ts must not form a static
 * import cycle with website/src/lib/silentFailureReporter.ts.
 *
 * core.ts dynamically imports silentFailureReporter at runtime (inside the
 * business-error branch), which is safe. A static import in either direction
 * couples the universal fetch wrapper to telemetry and breaks tree-shaking /
 * bundler ordering.
 */
describe('import cycle prevention', () => {
  const readSource = (relativePath: string) =>
    readFileSync(resolve(__dirname, relativePath), 'utf-8');

  it('silentFailureReporter.ts does not statically import api/core', () => {
    const src = readSource('../silentFailureReporter.ts');
    const coreImportPattern = /from\s+['"]\.\/api\/core['"]|from\s+['"]@\/lib\/api\/core['"]/;
    expect(coreImportPattern.test(src)).toBe(false);
  });

  it('api/core.ts does not statically import silentFailureReporter', () => {
    const src = readSource('../api/core.ts');
    const reporterImportPattern = /from\s+['"]\.\.\/silentFailureReporter['"]|from\s+['"]@\/lib\/silentFailureReporter['"]/;
    expect(reporterImportPattern.test(src)).toBe(false);
  });
});
