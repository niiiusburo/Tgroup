import { test, expect } from '@playwright/test';

test('kilo menu is removed from sidebar', async ({ page }) => {
  await page.goto('http://76.13.16.68:5174/login');
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#email')).toBeHidden({ timeout: 20000 });

  await page.goto('http://76.13.16.68:5174/permissions');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await expect(page.locator('text=kilo').first()).not.toBeVisible();
  await expect(page.locator('text=agent').first()).not.toBeVisible();
  await expect(page.locator('text=migration').first()).not.toBeVisible();

  await page.screenshot({ path: '/tmp/vps_sidebar_no_kilo.png', fullPage: true });
});
