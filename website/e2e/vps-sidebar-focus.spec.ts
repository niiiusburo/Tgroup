import { test, expect } from '@playwright/test';

test('sidebar without kilo', async ({ page }) => {
  await page.goto('http://76.13.16.68:5175/login');
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#email')).toBeHidden({ timeout: 20000 });
  await page.goto('http://76.13.16.68:5175/permissions');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const sidebar = page.locator('nav').first();
  await sidebar.scrollIntoViewIfNeeded();
  const box = await sidebar.boundingBox();
  if (box) {
    await page.screenshot({ path: '/tmp/vps_sidebar_focus.png', clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  }
});
