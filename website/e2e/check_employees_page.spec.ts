import { test, expect } from '@playwright/test';

test('screenshot employees page', async ({ page }) => {
  await page.goto('http://76.13.16.68:5175/login');
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#email')).toBeHidden({ timeout: 20000 });
  await page.goto('http://76.13.16.68:5175/employees');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/employees_page.png', fullPage: false });
});
