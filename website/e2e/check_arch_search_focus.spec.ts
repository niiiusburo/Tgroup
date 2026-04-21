import { test, expect } from '@playwright/test';

test('screenshot permission board architecture view - focused', async ({ page }) => {
  await page.goto('http://76.13.16.68:5175/login');
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#email')).toBeHidden({ timeout: 20000 });
  await page.goto('http://76.13.16.68:5175/permissions');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  // Locate the Employees (WHO) heading and screenshot its container
  const heading = page.locator('text=Employees (WHO)');
  await expect(heading).toBeVisible({ timeout: 10000 });
  const box = await heading.boundingBox();
  if (box) {
    await page.screenshot({ path: '/tmp/permissions_arch_focus.png', clip: { x: box.x - 20, y: box.y - 20, width: 420, height: 200 } });
  }
});
