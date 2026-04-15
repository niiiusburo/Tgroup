import { chromium } from 'playwright';

(async () => {
  // Get token via curl first
  const { execSync } = await import('child_process');
  const loginRes = JSON.parse(execSync(`curl -s -X POST http://localhost:3002/api/Auth/login -H "Content-Type: application/json" -d '{"email":"tg@clinic.vn","password":"123456"}'`).toString());
  const token = loginRes.token;
  console.log('Token acquired:', token ? 'yes' : 'no');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`CONSOLE ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`PAGE ERROR: ${err.message}`));
  page.on('response', res => {
    if (res.url().includes('/api/')) {
      console.log(`API ${res.status()}: ${res.url()}`);
    }
  });

  await page.goto('http://localhost:5175/login');
  await page.evaluate((t) => localStorage.setItem('tgclinic_token', t), token);
  await page.goto('http://localhost:5175/customers');
  await page.waitForTimeout(6000);

  const rows = await page.locator('table tbody tr').count();
  console.log('CUSTOMER ROWS:', rows);

  const bodyText = await page.locator('body').innerText();
  console.log('BODY TEXT (first 500 chars):', bodyText.slice(0, 500));

  await browser.close();
})();
