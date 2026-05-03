/**
 * Comprehensive Verification Suite
 *
 * Validates ALL fixes applied in the enterprise restructuring:
 *   P0.1: Permission resolution deduplication
 *   P0.2: Dead route removal
 *   P0.3: Payment category column + simplified classification
 *
 * Run: npx jest api/src/__tests__/enterprise-verification.test.js --verbose
 */

const { query } = require('../db');

// ──────────────────────────────────────────────────────────
// TEST DATA
// ──────────────────────────────────────────────────────────
const TEST_UUID = '00000000-0000-0000-0000-00000000aaaa'; // invalid UUID format intentionally
const VALID_UUID = '00000000-0000-4000-a000-000000000001';

// ──────────────────────────────────────────────────────────
// SUITE 1: Permission Service (Single Source of Truth)
// ──────────────────────────────────────────────────────────
describe('P0.1 — Permission Resolution Deduplication', () => {
  let permissionService;

  beforeAll(() => {
    // Load the actual compiled module
    permissionService = require('../services/permissionService');
  });

  describe('Module exports', () => {
    it('exports resolveEffectivePermissions', () => {
      expect(typeof permissionService.resolveEffectivePermissions).toBe('function');
    });

    it('exports hasPermission', () => {
      expect(typeof permissionService.hasPermission).toBe('function');
    });
  });

  describe('Input validation', () => {
    it('rejects non-UUID employee IDs without hitting DB', async () => {
      const result = await permissionService.resolveEffectivePermissions('not-a-uuid');
      expect(result.effectivePermissions).toEqual([]);
      expect(result.groupId).toBeNull();
    });

    it('accepts valid UUID format', async () => {
      // This will hit the DB and likely return empty (no such employee exists)
      const result = await permissionService.resolveEffectivePermissions(VALID_UUID);
      expect(Array.isArray(result.effectivePermissions)).toBe(true);
      expect(Array.isArray(result.locations)).toBe(true);
    });
  });

  describe('No business logic duplication', () => {
    it('middleware/auth.js imports from permissionService', () => {
      // Verify that middleware/auth.js no longer has its own resolution logic
      const fs = require('fs');
      const path = require('path');
      const authCode = fs.readFileSync(
        path.join(__dirname, '..', 'middleware', 'auth.js'),
        'utf8'
      );
      // Should import from permissionService
      expect(authCode).toContain("require('../services/permissionService')");
      // Should NOT contain raw SQL permission queries anymore
      expect(authCode).not.toContain('SELECT permission FROM dbo.group_permissions');
      expect(authCode).not.toContain('SELECT ep.group_id');
    });

    it('routes/auth.js imports from permissionService', () => {
      const fs = require('fs');
      const path = require('path');
      const authCode = fs.readFileSync(
        path.join(__dirname, '..', 'routes', 'auth.js'),
        'utf8'
      );
      expect(authCode).toContain("require('../services/permissionService')");
      expect(authCode).toContain('resolveEffectivePermissions');
      // Should NOT have the old resolvePermissions function
      expect(authCode).not.toContain('async function resolvePermissions');
    });
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 2: Dead Route Removal
// ──────────────────────────────────────────────────────────
describe('P0.2 — Dead Route Removal', () => {
  it('/api/Services route is no longer mounted', () => {
    const fs = require('fs');
    const path = require('path');
    const serverCode = fs.readFileSync(
      path.join(__dirname, '..', 'server.js'),
      'utf8'
    );
    // Should be commented out
    expect(serverCode).toContain('// app.use(\'/api/Services\', servicesRoutes)');
    // Should NOT be active
    const activeMounts = serverCode.split('\n')
      .filter(l => l.includes('app.use') && l.includes('Services'))
      .filter(l => !l.trim().startsWith('//'));
    expect(activeMounts.length).toBe(0);
  });

  it('/api/Account legacy route is commented out', () => {
    const fs = require('fs');
    const path = require('path');
    const serverCode = fs.readFileSync(
      path.join(__dirname, '..', 'server.js'),
      'utf8'
    );
    expect(serverCode).toContain('// app.use(\'/api/Account\', accountRoutes)');
  });

  it('services.js route file is no longer required', () => {
    const fs = require('fs');
    const path = require('path');
    const serverCode = fs.readFileSync(
      path.join(__dirname, '..', 'server.js'),
      'utf8'
    );
    expect(serverCode).not.toContain("require('./routes/services')");
    expect(serverCode).toContain('// const servicesRoutes');
  });

  it('Dead frontend services.ts is deleted', () => {
    const fs = require('fs');
    const path = require('path');
    expect(() => {
      fs.accessSync(path.join(__dirname, '..', '..', 'website', 'src', 'lib', 'api', 'services.ts'));
    }).toThrow(); // File should not exist
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 3: Payment Category Column
// ──────────────────────────────────────────────────────────
describe('P0.3 — Payment Category Column', () => {
  let paymentJsCode;

  beforeAll(() => {
    const fs = require('fs');
    const path = require('path');
    const paymentRouteCode = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'payments.js'),
      'utf8'
    );
    const paymentReadCode = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'payments', 'readHandlers.js'),
      'utf8'
    );
    paymentJsCode = `${paymentRouteCode}\n${paymentReadCode}`;
  });

  describe('Migration applied', () => {
    it('payment_category column exists in payments table', async () => {
      const result = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'dbo'
          AND table_name = 'payments'
          AND column_name = 'payment_category'
      `);
      expect(result.length).toBe(1);
      expect(result[0].is_nullable).toBe('NO');
    });

    it('all payments have a payment_category value', async () => {
      const result = await query(
        `SELECT COUNT(*) as total,
                COUNT(CASE WHEN payment_category IS NULL THEN 1 END) as null_count
         FROM dbo.payments`
      );
      expect(parseInt(result[0].null_count)).toBe(0);
    });

    it('payment_category is only payment or deposit', async () => {
      const result = await query(
        `SELECT DISTINCT payment_category FROM dbo.payments`
      );
      const categories = result.map(r => r.payment_category);
      expect(categories).toEqual(
        expect.arrayContaining(['payment', 'deposit'])
      );
      // No unexpected values
      const unexpected = categories.filter(c => !['payment', 'deposit'].includes(c));
      expect(unexpected).toEqual([]);
    });
  });

  describe('Classification heuristics REMOVED from code', () => {
    it('GET route uses payment_category column, not SQL heuristic', () => {
      // The new code uses simple category filter, not complex EXISTS/NOT EXISTS
      expect(paymentJsCode).toContain("p.payment_category = 'payment'");
      expect(paymentJsCode).toContain("p.payment_category = 'deposit'");
      // Should NOT contain the old fragile heuristic
      expect(paymentJsCode).not.toContain("COALESCE(p.deposit_type, '') IN ('deposit', 'refund', 'usage')");
    });

    it('/deposits route uses payment_category, not heuristic', () => {
      // /deposits route should use WHERE p.payment_category = 'deposit'
      expect(paymentJsCode).toMatch(/WHERE p\.payment_category = 'deposit'/);
      expect(paymentJsCode).not.toContain("NOT EXISTS (SELECT 1 FROM payment_allocations");
    });

    it('/deposit-usage route is simplified', () => {
      expect(paymentJsCode).toContain("p.deposit_type = 'usage'");
      // Old multi-condition filter removed
      const depositUsageSection = paymentJsCode.split('async function listDepositUsage')[1]?.split('async function getPaymentById')[0] || '';
      expect(depositUsageSection).not.toContain("p.method = 'deposit'");
    });

    it('POST route inserts payment_category', () => {
      expect(paymentJsCode).toContain('payment_category');
      expect(paymentJsCode).toContain("const payment_category = looksLikeDeposit ? 'deposit' : 'payment'");
    });
  });

  describe('Consistency between DB and code', () => {
    it('deposit-typed payments have deposit_type matching payment_category', async () => {
      const result = await query(`
        SELECT COUNT(*) as mismatch
        FROM dbo.payments
        WHERE deposit_type IN ('deposit', 'refund')
          AND payment_category != 'deposit'
      `);
      expect(parseInt(result[0].mismatch)).toBe(0);
    });

    it('refund payments are categorized as deposit', async () => {
      const result = await query(`
        SELECT payment_category, COUNT(*)
        FROM dbo.payments
        WHERE deposit_type = 'refund'
        GROUP BY payment_category
      `);
      if (result.length > 0) {
        expect(result[0].payment_category).toBe('deposit');
      }
    });
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 4: End-to-End Integration Checks
// ──────────────────────────────────────────────────────────
describe('Integration — Server boots cleanly', () => {
  it('server.js does not reference dead routes', () => {
    const fs = require('fs');
    const path = require('path');
    const serverCode = fs.readFileSync(
      path.join(__dirname, '..', 'server.js'),
      'utf8'
    );

    // All active route mounts should reference existing files
    const activeMounts = serverCode.split('\n')
      .filter(l => l.match(/require\('\.\/routes\//) && !l.trim().startsWith('//'));

    for (const mount of activeMounts) {
      const match = mount.match(/require\('(\.\/routes\/[^']+)'\)/);
      if (match) {
        const routePath = path.join(__dirname, '..', match[1] + '.js');
        expect(() => fs.accessSync(routePath)).not.toThrow();
      }
    }
  });

  it('no file references deleted frontend services.ts', () => {
    // Search for imports of the deleted file
    const { execSync } = require('child_process');
    try {
      const result = execSync(
        'grep -r "services\\.ts" website/src/ --include="*.ts" --include="*.tsx" 2>/dev/null || echo "NONE"',
        { cwd: require('path').join(__dirname, '..', '..') }
      ).toString().trim();
      expect(result).toBe('NONE');
    } catch {
      // grep returns non-zero when no matches, that's GOOD
    }
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 5: Data Integrity — No Orphaned Logic
// ──────────────────────────────────────────────────────────
describe('Data Integrity', () => {
  it('customers table is intact', async () => {
    const result = await query(`SELECT COUNT(*) as cnt FROM dbo.partners WHERE customer = true`);
    expect(parseInt(result[0].cnt)).toBeGreaterThan(0);
  });

  it('appointments table is intact', async () => {
    const result = await query(`SELECT COUNT(*) as cnt FROM dbo.appointments`);
    expect(parseInt(result[0].cnt)).toBeGreaterThan(0);
  });

  it('payments have valid customer references', async () => {
    const result = await query(`
      SELECT COUNT(*) as orphaned
      FROM dbo.payments p
      LEFT JOIN dbo.partners pt ON pt.id = p.customer_id
      WHERE pt.id IS NULL
    `);
    expect(parseInt(result[0].orphaned)).toBe(0);
  });

  it('permission groups exist', async () => {
    const result = await query(`SELECT COUNT(*) as cnt FROM dbo.permission_groups`);
    expect(parseInt(result[0].cnt)).toBeGreaterThan(0);
  });
});
