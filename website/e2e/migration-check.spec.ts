import { test, expect } from '@playwright/test';

test('check migrated customer phone and ref are visible', async ({ page }) => {
  // Use saved auth state
  await page.context().addCookies([]);
  
  // Go to login and authenticate quickly
  await page.goto('http://localhost:5174');
  
  // If already logged in (token exists), skip login
  const token = await page.evaluate(() => localStorage.getItem('tgclinic_token'));
  if (!token) {
    await page.locator('#email').fill('tg@clinic.vn');
    await page.locator('#password').fill('123456');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#email')).toBeHidden({ timeout: 15_000 });
    await page.waitForLoadState('networkidle');
  }

  // Navigate to customer profile for T6725 Trung kien
  await page.goto('http://localhost:5174/customers/d5630c06-5433-46dc-b8ab-b41700f50270');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Take screenshot of full page
  await page.screenshot({ path: 'e2e/screenshots/migration-check-t161988.png', fullPage: false });

  // Check phone is visible
  await expect(page.locator('text=0961863813').first()).toBeVisible({ timeout: 10_000 });

  // Check ref code is visible
  await expect(page.locator('text=T161988').first()).toBeVisible({ timeout: 10_000 });

  // Also check T6725
  await page.goto('http://localhost:5174/customers/9aa0b5c4-ac80-4851-9c0b-b14c0088ad79');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e/screenshots/migration-check-t6725.png', fullPage: false });
  await expect(page.locator('text=0972020908').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('text=T6725').first()).toBeVisible({ timeout: 10_000 });

  console.log('✅ Phone and ref codes are visible on customer profiles');
});
