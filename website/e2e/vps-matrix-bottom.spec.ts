import { test, expect } from '@playwright/test';

test('VPS matrix bottom rows', async ({ page }) => {
  await page.goto('http://76.13.16.68:5174/login');
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#email')).toBeHidden({ timeout: 20000 });
  await page.goto('http://76.13.16.68:5174/permissions');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("Permission Matrix")').click();
  await page.waitForTimeout(1000);

  const row = page.locator('table tbody tr', { hasText: 'External Checkups' }).first();
  await expect(row).toBeVisible();
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/vps_matrix_bottom.png', clip: { x: 0, y: await row.boundingBox().then(b => b!.y - 40), width: 800, height: 200 } });
});
