import { test } from '@playwright/test';

test('debug login network', async ({ page }) => {
  page.on('request', req => console.log('REQUEST:', req.method(), req.url()));
  page.on('response', res => console.log('RESPONSE:', res.status(), res.url()));
  await page.goto('http://localhost:5174/login');
  await page.waitForTimeout(2000);
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
});
