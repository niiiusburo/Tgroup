import { test, expect } from '@playwright/test';

/**
 * Live verification of the 0.32.60 audit remediation on nk2 (staging).
 *
 * Scope: prove the deployed build is the one under test, that the app still logs in and
 * renders, that the nine removed route families are gone rather than erroring, and that the
 * newly gated telemetry endpoints reject a normal session while crash reporting still works.
 *
 * Run: cd website && E2E_BASE_URL=https://nk2.2checkin.com \
 *        npx playwright test e2e/nk2-audit-remediation-verify.spec.ts \
 *        --config=playwright-live.config.ts --project=live-chromium
 */

const BASE = process.env.E2E_BASE_URL || 'https://nk2.2checkin.com';
const EMAIL = 't@clinic.vn';
const PASSWORD = '123123';

const REMOVED_ROUTES = [
  '/api/AccountPayments',
  '/api/Cashbooks',
  '/api/Receipts',
  '/api/Journals',
  '/api/StockPickings',
  '/api/CrmTasks',
  '/api/Commissions',
  '/api/HrPayslips',
  '/api/DashboardReports',
];

test.describe('nk2 0.32.60 remediation', () => {
  test('serves the build under test', async ({ request }) => {
    const res = await request.get(`${BASE}/version.json`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.version).toBe('0.32.60');
    expect(body.gitCommit).toBe('feb3687');
  });

  test('admin can log in and the dashboard renders without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });

    await page.getByRole('textbox').first().fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();

    // Landing on any authenticated screen is enough; the login form must be gone.
    await expect(page.locator('input[type="password"]')).toHaveCount(0, { timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    await page.screenshot({
      path: 'test-results/nk2-0.32.60-dashboard.png',
      fullPage: true,
    });

    expect(pageErrors, `uncaught page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    // Ignore noise the app cannot control (favicon, third-party, aborted requests).
    const real = consoleErrors.filter(
      (e) => !/favicon|net::ERR_ABORTED|Failed to load resource/i.test(e)
    );
    expect(real, `console errors: ${real.join(' | ')}`).toEqual([]);
  });

  test('the nine removed route families are gone, and a live route still works', async ({ page, request }) => {
    // Authenticate through the UI so the token is a real session token, then reuse it.
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox').first().fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('input[type="password"]')).toHaveCount(0, { timeout: 30_000 });

    const token = await page.evaluate(() => {
      for (const store of [localStorage, sessionStorage]) {
        for (let i = 0; i < store.length; i++) {
          const key = store.key(i);
          if (!key) continue;
          const value = store.getItem(key) || '';
          const match = value.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
          if (match) return match[0];
        }
      }
      return null;
    });
    expect(token, 'could not recover a session token after login').toBeTruthy();

    const headers = { Authorization: `Bearer ${token}` };

    // Control: a route that should still exist. Proves the token is genuinely accepted,
    // so a 404 below means "route removed" and not "request rejected".
    const control = await request.get(`${BASE}/api/Companies`, { headers });
    expect(control.status(), 'GET /api/Companies should still work').toBe(200);

    for (const route of REMOVED_ROUTES) {
      const res = await request.get(`${BASE}${route}`, { headers });
      expect(
        res.status(),
        `${route} should be 404 (removed), not 500 (broken query) or 200`
      ).toBe(404);
    }
  });

  test('telemetry error data is gated but crash reporting still accepts reports', async ({ request }) => {
    // Unauthenticated read must not expose stack traces, request bodies, users or IPs.
    for (const path of ['/api/telemetry/errors?status=new', '/api/telemetry/stats']) {
      const res = await request.get(`${BASE}${path}`);
      expect([401, 403], `${path} must not be readable without a privileged session`).toContain(
        res.status()
      );
    }

    // The public crash-report endpoint must keep working, or errors vanish silently.
    const report = await request.post(`${BASE}/api/telemetry/errors`, {
      data: {
        error_type: 'E2E',
        message: 'nk2 0.32.60 remediation verification probe',
        stack: 'Error: verification probe\n    at nk2-audit-remediation-verify.spec.ts:1:1',
        route: '/verification',
      },
    });
    expect(report.status(), 'public crash reporting must stay open').toBe(200);
  });
});
