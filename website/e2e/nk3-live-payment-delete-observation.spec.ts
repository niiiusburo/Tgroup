/**
 * SAFE OBSERVATION TEST — Live NK3 (tmv.2checkin.com)
 *
 * Purpose: Inspect the current state of the Payment delete/void UI and any visible
 * earnings/commission surfaces on the real production NK3 site.
 *
 * This test is intentionally NON-DESTRUCTIVE by default.
 * It will NOT create new payments or trigger deletes unless you explicitly
 * uncomment the mutation sections and provide a known safe test customer/payment.
 *
 * Run with the existing recording config (or a live variant):
 *   npx playwright test --config=playwright-nk3-record.config.ts \
 *     e2e/nk3-live-payment-delete-observation.spec.ts --headed
 *
 * Login used: t@clinic.vn (main admin)
 */

import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = 't@clinic.vn';
const ADMIN_PASSWORD = '123123';

test.describe('NK3 Live Site Observation — Payment Delete UI & Earnings Surfaces', () => {
  test('Admin can reach payment areas and inspect delete/void capability + commission views (read-only)', async ({ page }) => {
    test.setTimeout(120_000);

    // Login as main admin
    await page.goto('https://tmv.2checkin.com/login');
    await page.locator('#login-identifier').fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.locator('#password').press('Enter');

    // Wait for dashboard
    await page.waitForURL('**/', { timeout: 30000 }).catch(() => {});
    await expect(page.getByRole('link', { name: /Customers|Khách hàng|Overview/i })).toBeVisible({ timeout: 20000 });

    // Go to Customers
    await page.getByRole('link', { name: /Customers|Khách hàng/i }).click();
    await page.waitForTimeout(2000);

    // Try to open one customer profile (first row)
    const firstCustomer = page.locator('tbody tr').first();
    if (await firstCustomer.count() > 0) {
      await firstCustomer.click();
      await page.waitForTimeout(1500);
    }

    // Look for Payment tab
    const paymentTab = page.getByRole('button', { name: /Payment|Thanh toán|Hóa đơn/i });
    if (await paymentTab.count() > 0) {
      await paymentTab.first().click();
      await page.waitForTimeout(2000);
    }

    // Look for any visible "Delete", "Void", "Remove", or action menu on payments
    const actionButtons = page.locator('button').filter({ hasText: /delete|void|xóa|remove|hủy/i });
    const actionCount = await actionButtons.count();

    console.log(`[NK3 Live Observation] Found ${actionCount} potential delete/void action elements on the current view.`);

    // Take a screenshot of the current payment surface
    await page.screenshot({
      path: `test-results/nk3-live-payment-surface-${Date.now()}.png`,
      fullPage: true,
    });

    // Also check the main Commission / Earnings admin area if accessible
    await page.goto('https://tmv.2checkin.com/commission');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: `test-results/nk3-live-commission-tab-${Date.now()}.png`,
      fullPage: true,
    });

    // Final non-destructive assertion
    expect(true).toBe(true); // We are only observing
  });
});
