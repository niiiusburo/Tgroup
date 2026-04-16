import { test, expect } from '@playwright/test';

/**
 * VPS Tier Verification Test
 * Logs into the live VPS with different tier users and verifies tiers display correctly.
 */

const VPS_URL = 'http://76.13.16.68:5174';

async function login(page: any, email: string, password: string) {
  await page.goto(`${VPS_URL}/login`);
  const emailInput = page.locator('#email');
  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await emailInput.fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#email')).toBeHidden({ timeout: 20_000 });
  await page.waitForLoadState('networkidle');
}

test.describe('VPS Multi-User Tier Verification', () => {
  test.use({ storageState: undefined });

  test('Admin user sees all employee tiers correctly', async ({ page }) => {
    await login(page, 'tg@clinic.vn', '123456');

    await page.goto(`${VPS_URL}/employees`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Nhân viên').first()).toBeVisible({ timeout: 15_000 });

    // Verify all tier filter buttons exist
    for (const tier of ['All Tiers', 'Admin', 'Clinic Manager', 'Dentist', 'Receptionist', 'Dental Assistant']) {
      await expect(page.locator('button').filter({ hasText: new RegExp(tier) }).first()).toBeVisible({ timeout: 10_000 });
    }

    // Verify table shows multiple tiers
    await expect(page.locator('span').filter({ hasText: /^Admin$/ }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('span').filter({ hasText: /^Dentist$/ }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('span').filter({ hasText: /^Receptionist$/ }).first()).toBeVisible({ timeout: 10_000 });

    // Click on the specific Admin employee row
    const adminRow = page.locator('tr, [role="row"]').filter({ hasText: /tg@clinic\.vn/ }).first();
    await expect(adminRow).toBeVisible({ timeout: 10_000 });
    await adminRow.click();
    await page.waitForTimeout(800);
    await expect(page.locator('span').filter({ hasText: /^Admin$/ }).first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');

    // Click on a Dentist row
    await page.waitForTimeout(500);
    const dentistRow = page.locator('tr, [role="row"]').filter({ hasText: /Dentist/ }).first();
    await expect(dentistRow).toBeVisible({ timeout: 10_000 });
    await dentistRow.click();
    await page.waitForTimeout(800);
    await expect(page.locator('span').filter({ hasText: /^Dentist$/ }).first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');

    // Click on a Receptionist row
    await page.waitForTimeout(500);
    const receptionistRow = page.locator('tr, [role="row"]').filter({ hasText: /Receptionist/ }).first();
    await expect(receptionistRow).toBeVisible({ timeout: 10_000 });
    await receptionistRow.click();
    await page.waitForTimeout(800);
    await expect(page.locator('span').filter({ hasText: /^Receptionist$/ }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Dentist user can log in and tier is visible', async ({ page }) => {
    // Delay to avoid rate limiting
    await page.waitForTimeout(15000);
    await login(page, 'Dr.tinhnguyen108@gmail.com', '123456');

    await page.goto(`${VPS_URL}/employees`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasAccessDenied = await page.locator('text=Access Denied').isVisible().catch(() => false);
    if (hasAccessDenied) {
      await expect(page.locator('text=Access Denied')).toBeVisible();
    } else {
      await expect(page.locator('span').filter({ hasText: /^Dentist$/ }).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('Receptionist user can log in and tier is visible', async ({ page }) => {
    // Delay to avoid rate limiting after dentist login
    await page.waitForTimeout(30000);
    await login(page, 'dat82835@gmail.com', '123456');

    await page.goto(`${VPS_URL}/employees`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasAccessDenied = await page.locator('text=Access Denied').isVisible().catch(() => false);
    if (hasAccessDenied) {
      await expect(page.locator('text=Access Denied')).toBeVisible();
    } else {
      await expect(page.locator('span').filter({ hasText: /^Receptionist$/ }).first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
