import { test, expect } from '@playwright/test';
test('Login debug', async ({ page }) => {
  page.on('request', req => {
    if (req.url().includes('api') || req.url().includes('Auth') || req.url().includes('login') || req.url().includes('3002'))
      console.log('REQ:', req.method(), req.url());
  });
  page.on('response', resp => {
    if (resp.url().includes('api') || resp.url().includes('Auth') || resp.url().includes('login') || resp.url().includes('3002'))
      console.log('RES:', resp.status(), resp.url());
  });
  
  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');
  
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  
  await page.waitForTimeout(8000);
  console.log('FINAL URL:', page.url());
  
  const bodyText = await page.locator('body').textContent().catch(() => 'N/A');
  console.log('Body text (first 300):', bodyText?.substring(0, 300));
  
  await page.screenshot({ path: 'e2e/screenshots/debug-login.png' }).catch(() => {});
});
