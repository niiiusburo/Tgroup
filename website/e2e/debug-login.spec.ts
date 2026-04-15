import { test, expect } from '@playwright/test';

test('debug login', async ({ page }) => {
  page.on('console', (msg) => console.log(`CONSOLE ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', (err) => console.log(`PAGE ERROR: ${err.message}`));
  page.on('response', (res) => {
    if (res.url().includes('/api/')) {
      console.log(`API ${res.status()}: ${res.url()}`);
    }
  });

  await page.goto('http://localhost:5175/login');
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);

  const body = await page.locator('body').innerHTML();
  console.log('BODY LENGTH:', body.length);
  console.log('BODY:', body.slice(0, 500));

  const token = await page.evaluate(() => localStorage.getItem('tgclinic_token'));
  console.log('TOKEN:', token ? 'present' : 'missing');
});
