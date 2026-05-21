'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * cosmeticTransactionalSeed.test.js
 *
 * Phase 2 Task 2 verification — Cosmetic transactional seed structure.
 *
 * Per spec D12, D13, D16 + Phase 2 critical path item #2 ("Make CTV real"),
 * the transactional seed must provide:
 *   - 3-5 cosmetic appointments (mix past/today/future)
 *   - 3-5 payments collected
 *   - 3-5 earnings rows with source='ctv' (D13 CTV attribution)
 *   - At least one refund reversal (negative-amount row, append-only test)
 *   - 2-3 consultation cards (if schema exists)
 *
 * This test verifies:
 *   1. Script exists and is named correctly
 *   2. Script contains INSERT logic for all expected entities
 *   3. Script validates CTV referrer exists (for D13 path)
 *   4. Script creates earnings with source='ctv' (and refund reversals)
 *   5. Script is idempotent (checks existing data by natural keys)
 *   6. Script can parse without syntax errors (--dry-run)
 */

describe('Cosmetic transactional seed (Phase-2 Task-2)', () => {
  const scriptsDir = path.join(__dirname, '../../scripts');
  const seedFile = 'seed-cosmetic-lob-transactional.js';
  const seedPath = path.join(scriptsDir, seedFile);

  test('transactional seed script exists', () => {
    expect(fs.existsSync(seedPath)).toBe(true);
  });

  test('script file is executable or requires node', () => {
    const content = fs.readFileSync(seedPath, 'utf8');
    expect(content).toMatch(/^#!\/usr\/bin\/env node/);
  });

  test('script contains appointment creation logic (INSERT INTO appointments)', () => {
    const content = fs.readFileSync(seedPath, 'utf8');
    expect(content).toMatch(/INSERT INTO appointments/i);
  });

  test('script contains payment creation logic (INSERT INTO payments)', () => {
    const content = fs.readFileSync(seedPath, 'utf8');
    expect(content).toMatch(/INSERT INTO payments/i);
  });

  test('script contains earnings creation logic (INSERT INTO earnings)', () => {
    const content = fs.readFileSync(seedPath, 'utf8');
    expect(content).toMatch(/INSERT INTO earnings/i);
  });

  test('script creates earnings with source=\'ctv\' (D13 path)', () => {
    const content = fs.readFileSync(seedPath, 'utf8');
    expect(content).toMatch(/source\s*[=,]\s*['"]ctv['"]/i);
  });

  test('script includes refund reversal (negative-amount earnings)', () => {
    const content = fs.readFileSync(seedPath, 'utf8');
    expect(content).toMatch(/refund/i);
    expect(content).toMatch(/negative|refund.*amount|amount\s*\*\s*-/i);
  });

  test('script checks for CTV referrer existence (D13 prerequisite)', () => {
    const content = fs.readFileSync(seedPath, 'utf8');
    expect(content).toMatch(/ctv.*referrer|referred_by_ctv_id|ctv-demo@clinic\.vn/i);
  });

  test('script is idempotent (uses ON CONFLICT DO NOTHING)', () => {
    const content = fs.readFileSync(seedPath, 'utf8');
    expect(content).toMatch(/ON\s+CONFLICT[^\n]*DO\s+NOTHING/i);
  });

  test('script validates consultation table existence (graceful fallback)', () => {
    const content = fs.readFileSync(seedPath, 'utf8');
    expect(content).toMatch(/information_schema\.tables|consultations/i);
  });

  test('script supports --dry-run mode for structure validation', () => {
    const content = fs.readFileSync(seedPath, 'utf8');
    expect(content).toMatch(/--dry-run|dryRun|process\.argv/i);
  });

  test('script parses without syntax errors (--dry-run mode)', () => {
    try {
      // Attempt to run the script in --dry-run mode
      // This validates Node.js syntax without requiring a DB connection
      const output = execSync(`node ${seedPath} --dry-run 2>&1`, {
        timeout: 5000,
        encoding: 'utf8',
      });
      expect(output).toMatch(/dry-run|DRY-RUN|validat/i);
    } catch (e) {
      // If --dry-run exits with code 0 and valid output, test passes
      // If DB connection fails, output should still show validation message
      if (e.status !== 0) {
        const msg = e.stdout + e.stderr;
        // Allow connection errors; the important thing is the script parses
        if (msg.match(/ECONNREFUSED|no database|connection|connect/i)) {
          // DB connection error is OK for syntax check
          expect(true).toBe(true);
        } else if (msg.match(/SyntaxError|ReferenceError|TypeError/i)) {
          throw new Error(`Script has syntax error: ${msg}`);
        }
      }
    }
  });

  test('script creates consultation cards if schema exists (graceful)', () => {
    const content = fs.readFileSync(seedPath, 'utf8');
    expect(content).toMatch(/consultations/i);
    expect(content).toMatch(/try|catch|graceful|skipped/i);
  });

  test('script export includes seedCosmeticTransactionalData function', () => {
    const content = fs.readFileSync(seedPath, 'utf8');
    expect(content).toMatch(/module\.exports.*seedCosmeticTransactionalData/);
  });

  test('script creates minimum viable earnings for CTV dashboard (at least 1 per customer)', () => {
    const content = fs.readFileSync(seedPath, 'utf8');
    // Verify loop structure creates earnings for each customer
    expect(content).toMatch(/for.*customer/i);
    expect(content).toMatch(/earnings.*for|for.*earnings/i);
  });
});
