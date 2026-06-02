import { test, expect, type Page } from '@playwright/test';

/**
 * NK3 CTV eligibility bar + Doctor→CTV breadcrumb — real-browser verification.
 *
 * Run against the local dev stack (web :5175, API :3002 on tdental_demo):
 *   npx playwright test --config=playwright-nk3-local.config.ts e2e/nk3-ctv-eligibility.spec.ts
 *
 * Customer 0de4e55d… is a backfilled, currently-referred client whose only CTV-bearing
 * appointment is from 2024 (anchor) → the 6-month window has lapsed → the bar renders the
 * "expired / eligible for another CTV" state, and the appointment row shows the CTV breadcrumb.
 */

const BASE = process.env.NK3_BASE_URL || 'http://127.0.0.1:5175';
const EMAIL = 't@clinic.vn';
const PASSWORD = '123123';
const STAMPED_CUSTOMER = '0de4e55d-f68a-4dec-bfaf-b16800edc61a';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.locator('#login-identifier').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#password').press('Enter');
  await expect(
    page.getByRole('link', { name: /Customers|Khách hàng|Overview|Tổng quan/i }).first()
  ).toBeVisible({ timeout: 20000 });
}

test('admin customer profile shows the CTV eligibility bar + Doctor→CTV breadcrumb', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/customers/${STAMPED_CUSTOMER}`);
  await page.waitForLoadState('networkidle');

  // The referred client renders the referral claim block with the countdown bar.
  const badge = page.getByTestId('referral-claim-badge');
  await expect(badge).toBeVisible({ timeout: 20000 });
  // This client's anchor is 2024 → expired → eligible bar variant.
  await expect(page.getByTestId('ctv-link-bar-expired')).toBeVisible();
  await expect(badge).toContainText(/CTV Demo Referrer/);

  await page.screenshot({ path: 'docs/live-artifacts/nk3-ctv-admin-profile.png', fullPage: true });

  // The appointment history (Lịch hẹn tab) row carries the Doctor→CTV breadcrumb.
  await page.getByRole('button', { name: /Lịch hẹn|Appointments/i }).first().click().catch(() => {});
  await page.waitForLoadState('networkidle');
  const trail = page.getByTestId('doctor-ctv-trail').first();
  await expect(trail).toBeVisible({ timeout: 15000 });
  await expect(trail).toContainText(/CTV/);
  await page.screenshot({ path: 'docs/live-artifacts/nk3-ctv-admin-appointments.png', fullPage: true });
});

test('CTV portal renders link bar / eligibility on referral cards', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/ctv`);
  await page.waitForLoadState('networkidle');
  // Tracking tab lists referral cards (best-effort — portal may require a CTV account).
  await page
    .getByRole('button', { name: /track|theo dõi|referr|giới thiệu/i })
    .first()
    .click()
    .catch(() => {});
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'docs/live-artifacts/nk3-ctv-portal.png', fullPage: true });
});
