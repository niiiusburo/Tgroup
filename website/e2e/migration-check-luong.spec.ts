import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test('check LƯƠNG HỒNG NHUNG phone and ref are visible', async ({ page }) => {
  await page.goto('http://localhost:5174/customers/cd985f43-2f12-4d6d-b1b8-b23000efbac3');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'e2e/screenshots/migration-check-t043063.png', fullPage: false });

  await expect(page.locator('text=0337273016').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('text=T043063').first()).toBeVisible({ timeout: 10_000 });

  console.log('✅ Phone and ref code fixed for LƯƠNG HỒNG NHUNG');
});
