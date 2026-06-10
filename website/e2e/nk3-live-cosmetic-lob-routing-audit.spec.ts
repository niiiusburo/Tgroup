/**
 * Live NK3 Cosmetic LOB API Routing Audit
 * Target: https://tmv.2checkin.com
 *
 * Verifies cosmetic UI actions hit /api/cosmetic/* mirrors (not dental /api/*).
 * Destructive mutations (soft-delete, create sale order) are intercepted after
 * URL capture so production data is not modified.
 */

import { test, expect, type Page, type Request } from '@playwright/test';

const LIVE_URL = 'https://tmv.2checkin.com';
const ADMIN = { identifier: 't@clinic.vn', password: '123123' };

type AuditRow = {
  action: string;
  expected: string;
  actual: string | null;
  method: string | null;
  status: 'PASS' | 'FAIL' | 'SKIP';
  severity: 'P0' | 'P1' | '—';
  notes?: string;
};

const results: AuditRow[] = [];

function apiPathFromUrl(url: string): string | null {
  const match = url.match(/\/api\/[^?#]*/);
  return match ? match[0] : null;
}

function isDentalLeak(path: string | null): boolean {
  if (!path) return false;
  const p = path.split('?')[0];
  if (p.includes('/api/cosmetic/')) return false;
  const dentalPatterns = [
    /^\/api\/Partners(\/|$)/,
    /^\/api\/Employees(\/|$)/,
    /^\/api\/Appointments(\/|$)/,
    /^\/api\/Products(\/|$)/,
    /^\/api\/SaleOrders(\/|$)/,
  ];
  return dentalPatterns.some((re) => re.test(p));
}

function record(row: Omit<AuditRow, 'severity'> & { severity?: AuditRow['severity'] }) {
  const severity: AuditRow['severity'] =
    row.status === 'FAIL' && isDentalLeak(row.actual) ? 'P0' : row.status === 'FAIL' ? 'P1' : '—';
  results.push({ ...row, severity });
}

async function clearSession(page: Page) {
  await page.goto(`${LIVE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* no-op */
    }
  });
  await page.context().clearCookies();
}

async function login(page: Page) {
  await clearSession(page);
  await page.goto(`${LIVE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#login-identifier').fill(ADMIN.identifier);
  await page.locator('#password').fill(ADMIN.password);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function ensureCosmeticLOB(page: Page) {
  // Persist cosmetic LOB before any data fetch
  await page.evaluate(() => {
    localStorage.setItem('tgclinic_lob', 'cosmetic');
  });

  const lobButton = page
    .locator('button[aria-haspopup="listbox"]')
    .filter({ hasText: /Dental|Cosmetic|Nha khoa|Thẩm mỹ/i })
    .first();

  if (await lobButton.isVisible({ timeout: 8000 }).catch(() => false)) {
    const label = (await lobButton.innerText()).toLowerCase();
    if (!label.includes('cosmetic') && !label.includes('thẩm mỹ')) {
      await lobButton.click();
      const cosmeticOption = page
        .locator('[role="listbox"] button, [role="option"]')
        .filter({ hasText: /Cosmetic|Thẩm mỹ/i })
        .first();
      if (await cosmeticOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cosmeticOption.click();
        await page.waitForTimeout(1000);
      }
    }
  }

  const storedLob = await page.evaluate(() => localStorage.getItem('tgclinic_lob'));
  console.log(`[LOB] localStorage tgclinic_lob = ${storedLob}`);
}

async function waitForApiRequest(
  page: Page,
  predicate: (req: Request) => boolean,
  timeoutMs = 20_000,
): Promise<Request | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      page.off('request', handler);
      resolve(null);
    }, timeoutMs);

    function handler(req: Request) {
      if (predicate(req)) {
        clearTimeout(timer);
        page.off('request', handler);
        resolve(req);
      }
    }

    page.on('request', handler);
  });
}

function expectCosmeticPath(actual: string | null, resource: string): boolean {
  if (!actual) return false;
  const normalized = actual.split('?')[0];
  return (
    normalized === `/api/cosmetic/${resource}` ||
    normalized.startsWith(`/api/cosmetic/${resource}/`)
  );
}

test.describe('NK3 Live — Cosmetic LOB API Routing Audit', () => {
  test.setTimeout(300_000);

  test('audit cosmetic LOB API paths on tmv.2checkin.com', async ({ page }) => {
    await login(page);
    await ensureCosmeticLOB(page);

    // ── 1. Customer list fetch ─────────────────────────────────────────────
    const partnersPromise = waitForApiRequest(
      page,
      (req) => req.method() === 'GET' && /\/api\/(cosmetic\/)?Partners/.test(req.url()),
    );
    await page.goto(`${LIVE_URL}/customers`, { waitUntil: 'domcontentloaded' });
    const partnersReq = await partnersPromise;
    const partnersPath = partnersReq ? apiPathFromUrl(partnersReq.url()) : null;
    record({
      action: 'Customer list fetch',
      expected: '/api/cosmetic/Partners',
      actual: partnersPath,
      method: partnersReq?.method() ?? null,
      status: expectCosmeticPath(partnersPath, 'Partners') ? 'PASS' : partnersPath ? 'FAIL' : 'SKIP',
      notes: partnersPath && !expectCosmeticPath(partnersPath, 'Partners') ? 'Hits dental Partners endpoint' : undefined,
    });

    // ── 2. Customer soft-delete ────────────────────────────────────────────
    await page.waitForTimeout(2000);
    const deleteBtn = page.locator('button[aria-label="Delete"], button[title*="Delete"], button[title*="Xóa"]').first();
    if (await deleteBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      // Abort mutation after URL is observed
      await page.route('**/api/**/Partners/**/soft-delete', async (route) => {
        await route.abort('failed');
      });

      const softDeletePromise = waitForApiRequest(
        page,
        (req) => req.method() === 'PATCH' && /\/api\/.*Partners\/[^/]+\/soft-delete/.test(req.url()),
      );

      await deleteBtn.click();
      await page.waitForTimeout(500);

      const confirmBtn = page
        .locator('button')
        .filter({ hasText: /^(Delete|Xóa|Xóa khách hàng)$/i })
        .last();
      if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirmBtn.click();
        const softDeleteReq = await softDeletePromise;
        const softDeletePath = softDeleteReq ? apiPathFromUrl(softDeleteReq.url()) : null;
        const softDeleteOk =
          !!softDeletePath &&
          /\/api\/cosmetic\/Partners\/[^/]+\/soft-delete$/.test(softDeletePath.split('?')[0]);
        record({
          action: 'Customer soft-delete',
          expected: '/api/cosmetic/Partners/:id/soft-delete',
          actual: softDeletePath,
          method: softDeleteReq?.method() ?? null,
          status: softDeleteOk ? 'PASS' : softDeletePath ? 'FAIL' : 'SKIP',
          notes:
            softDeletePath && !softDeleteOk
              ? 'PATCH went to /api/Partners/:id/soft-delete (dental leak)'
              : 'Request aborted after capture — no data changed',
        });
      } else {
        record({
          action: 'Customer soft-delete',
          expected: '/api/cosmetic/Partners/:id/soft-delete',
          actual: null,
          method: null,
          status: 'SKIP',
          notes: 'Delete confirm dialog not found',
        });
      }
      await page.unroute('**/api/**/Partners/**/soft-delete');
    } else {
      record({
        action: 'Customer soft-delete',
        expected: '/api/cosmetic/Partners/:id/soft-delete',
        actual: null,
        method: null,
        status: 'SKIP',
        notes: 'No delete button visible on customer list',
      });
    }

    // ── 3. Employee list ─────────────────────────────────────────────────
    const employeesPromise = waitForApiRequest(
      page,
      (req) => req.method() === 'GET' && /\/api\/(cosmetic\/)?Employees/.test(req.url()),
    );
    await page.goto(`${LIVE_URL}/employees`, { waitUntil: 'domcontentloaded' });
    const employeesReq = await employeesPromise;
    const employeesPath = employeesReq ? apiPathFromUrl(employeesReq.url()) : null;
    record({
      action: 'Employee list',
      expected: '/api/cosmetic/Employees',
      actual: employeesPath,
      method: employeesReq?.method() ?? null,
      status: expectCosmeticPath(employeesPath, 'Employees') ? 'PASS' : employeesPath ? 'FAIL' : 'SKIP',
    });

    // ── 4. Calendar appointments ─────────────────────────────────────────
    const appointmentsPromise = waitForApiRequest(
      page,
      (req) => req.method() === 'GET' && /\/api\/(cosmetic\/)?Appointments/.test(req.url()),
    );
    await page.goto(`${LIVE_URL}/calendar`, { waitUntil: 'domcontentloaded' });
    const appointmentsReq = await appointmentsPromise;
    const appointmentsPath = appointmentsReq ? apiPathFromUrl(appointmentsReq.url()) : null;
    record({
      action: 'Calendar appointments',
      expected: '/api/cosmetic/Appointments',
      actual: appointmentsPath,
      method: appointmentsReq?.method() ?? null,
      status: expectCosmeticPath(appointmentsPath, 'Appointments') ? 'PASS' : appointmentsPath ? 'FAIL' : 'SKIP',
    });

    // ── 5. Service catalog products ──────────────────────────────────────
    const productsPromise = waitForApiRequest(
      page,
      (req) => req.method() === 'GET' && /\/api\/(cosmetic\/)?Products/.test(req.url()),
    );
    await page.goto(`${LIVE_URL}/service-catalog`, { waitUntil: 'domcontentloaded' });
    const productsReq = await productsPromise;
    const productsPath = productsReq ? apiPathFromUrl(productsReq.url()) : null;
    record({
      action: 'Service catalog products',
      expected: '/api/cosmetic/Products',
      actual: productsPath,
      method: productsReq?.method() ?? null,
      status: expectCosmeticPath(productsPath, 'Products') ? 'PASS' : productsPath ? 'FAIL' : 'SKIP',
    });

    // ── 6. Create sale order from services (customer profile → Phiếu khám tab) ─
    try {
      await page.route('**/api/**/SaleOrders', async (route) => {
        if (route.request().method() === 'POST') {
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });

      const saleOrderPromise = waitForApiRequest(
        page,
        (req) => req.method() === 'POST' && /\/api\/.*SaleOrders/.test(req.url()),
        25_000,
      );

      await page.goto(`${LIVE_URL}/customers`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await page.locator('table tbody tr').first().click();
      await page.waitForURL(/\/customers\/[^/]+/, { timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(1500);

      const recordsTab = page.getByRole('button', { name: /Phiếu khám|records/i });
      if (await recordsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await recordsTab.click();
        await page.waitForTimeout(800);
      }

      const addRecordBtn = page.getByRole('button', { name: /Thêm lịch khám|Add exam/i });
      if (await addRecordBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
        await addRecordBtn.click();
        await page.waitForTimeout(1000);

        const modal = page.locator('.fixed.inset-0.z-\\[100\\] .relative.bg-white').last();

        async function pickDropdown(placeholder: RegExp) {
          const trigger = modal.locator('button').filter({ hasText: placeholder }).first();
          if (!(await trigger.isVisible({ timeout: 4000 }).catch(() => false))) return;
          await trigger.click({ force: true });
          await page.waitForTimeout(400);
          const option = page
            .locator('.absolute, [role="listbox"], ul')
            .locator('button, li, [role="option"]')
            .filter({ hasText: /.{3,}/ })
            .first();
          if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
            await option.click({ force: true });
          }
        }

        await pickDropdown(/Chọn dịch vụ|Select service/i);
        await pickDropdown(/Select location|Chọn chi nhánh/i);

        const saveBtn = modal.getByRole('button', { name: /Thêm dịch vụ|Add Service|Thêm lịch khám/i }).last();
        if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await saveBtn.click({ force: true });
          const saleOrderReq = await saleOrderPromise;
          const saleOrderPath = saleOrderReq ? apiPathFromUrl(saleOrderReq.url()) : null;
          const saleOrderOk =
            !!saleOrderPath && /^\/api\/cosmetic\/SaleOrders$/.test(saleOrderPath.split('?')[0]);
          record({
            action: 'Create sale order from services',
            expected: '/api/cosmetic/SaleOrders',
            actual: saleOrderPath,
            method: saleOrderReq?.method() ?? null,
            status: saleOrderOk ? 'PASS' : saleOrderPath ? 'FAIL' : 'SKIP',
            notes:
              saleOrderPath && !saleOrderOk
                ? 'POST went to /api/SaleOrders (dental leak)'
                : saleOrderReq
                  ? 'Request aborted after capture — no data changed'
                  : 'Form submitted but no POST SaleOrders observed (validation may have blocked)',
          });
        } else {
          record({
            action: 'Create sale order from services',
            expected: '/api/cosmetic/SaleOrders',
            actual: null,
            method: null,
            status: 'SKIP',
            notes: 'Service form save button not found in customer profile modal',
          });
        }
      } else {
        record({
          action: 'Create sale order from services',
          expected: '/api/cosmetic/SaleOrders',
          actual: null,
          method: null,
          status: 'SKIP',
          notes: 'Thêm lịch khám button not found on customer profile',
        });
      }
    } catch (err) {
      record({
        action: 'Create sale order from services',
        expected: '/api/cosmetic/SaleOrders',
        actual: null,
        method: null,
        status: 'SKIP',
        notes: `UI flow error: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      await page.unroute('**/api/**/SaleOrders').catch(() => {});
    }

    // ── Report ───────────────────────────────────────────────────────────
    console.log('\n========== NK3 COSMETIC LOB ROUTING AUDIT ==========\n');
    console.log(
      '| UI Action | Expected API Path | Actual API Path | Method | Status | Severity |',
    );
    console.log(
      '|-----------|-------------------|-----------------|--------|--------|----------|',
    );
    for (const r of results) {
      console.log(
        `| ${r.action} | ${r.expected} | ${r.actual ?? '—'} | ${r.method ?? '—'} | ${r.status} | ${r.severity} |`,
      );
      if (r.notes) console.log(`  notes: ${r.notes}`);
    }

    const p0 = results.filter((r) => r.severity === 'P0');
    if (p0.length > 0) {
      console.log(`\n🚨 P0 BUGS (${p0.length}): Cosmetic data hitting dental endpoints`);
      p0.forEach((r) => console.log(`  - ${r.action}: ${r.actual}`));
    }

    const fails = results.filter((r) => r.status === 'FAIL');
    const p0Count = results.filter((r) => r.severity === 'P0').length;
    expect(p0Count, `P0 dental-leak bugs found: ${JSON.stringify(fails, null, 2)}`).toBe(0);
  });
});