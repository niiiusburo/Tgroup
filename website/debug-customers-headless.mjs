import { chromium } from 'playwright';
import { execSync } from 'child_process';

(async () => {
  const loginRes = JSON.parse(execSync(`curl -s -X POST http://localhost:3002/api/Auth/login -H "Content-Type: application/json" -d '{"email":"tg@clinic.vn","password":"123456"}'`).toString());
  const token = loginRes.token;
  console.log('Token acquired:', token ? 'yes' : 'no');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const apiCalls = [];
  page.on('response', res => {
    if (res.url().includes('/api/')) {
      apiCalls.push(`${res.status()}: ${res.url()}`);
    }
  });

  await page.goto('http://localhost:5175/login');
  await page.evaluate((t) => localStorage.setItem('tgclinic_token', t), token);
  await page.goto('http://localhost:5175/customers');
  
  // Wait for either table rows or the "Add Customer" button (indicates page rendered)
  await page.locator('button:has-text("Add Customer")').waitFor({ timeout: 10000 });
  await page.waitForTimeout(2000);

  const rows = await page.locator('table tbody tr').count();
  console.log('CUSTOMER ROWS:', rows);
  console.log('API CALLS:', apiCalls);

  const hasZeroPatients = await page.locator('text=0 patients').count() > 0;
  console.log('Has "0 patients":', hasZeroPatients);

  await browser.close();
})();
