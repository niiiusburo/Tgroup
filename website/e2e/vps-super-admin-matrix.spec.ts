import { test, expect } from '@playwright/test';

test('VPS super admin has all permissions and External Checkups visible', async ({ page }) => {
  await page.goto('http://76.13.16.68:5175/login');
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#email')).toBeHidden({ timeout: 20000 });
  await page.goto('http://76.13.16.68:5175/permissions');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Switch to Matrix tab
  await page.locator('button:has-text("Permission Matrix")').click();
  await page.waitForTimeout(1000);

  // External Checkups row should exist
  await expect(page.locator('text=External Checkups').first()).toBeVisible();

  // Super admin column should have all checks (scroll and count)
  const adminChecks = page.locator('table tbody tr td:nth-child(2) button');
  const count = await adminChecks.count();
  let checked = 0;
  for (let i = 0; i < count; i++) {
    const text = await adminChecks.nth(i).textContent();
    if (text?.includes('✓')) checked++;
  }

  // We expect at least 35 checked permissions for super admin
  expect(checked).toBeGreaterThanOrEqual(35);

  // Disabled buttons for system group
  const disabledButtons = page.locator('table tbody tr td:nth-child(2) button[disabled]');
  expect(await disabledButtons.count()).toBe(count);

  await page.screenshot({ path: '/tmp/vps_matrix_super_admin.png', fullPage: true });
});
