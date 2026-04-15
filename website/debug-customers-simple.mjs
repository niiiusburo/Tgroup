import { chromium } from 'playwright';
import { execSync } from 'child_process';

(async () => {
  try {
    const loginRes = JSON.parse(execSync(`curl -s -X POST http://localhost:3002/api/Auth/login -H "Content-Type: application/json" -d '{"email":"tg@clinic.vn","password":"123456"}'`).toString());
    const token = loginRes.token;
    console.log('Token:', token ? 'OK' : 'MISSING');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const apiCalls = [];
    page.on('response', res => {
      if (res.url().includes('/api/')) apiCalls.push(`${res.status()}: ${res.url().split('?')[0]}`);
    });

    await page.goto('http://localhost:5175/login');
    await page.evaluate((t) => localStorage.setItem('tgclinic_token', t), token);
    await page.goto('http://localhost:5175/customers');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const rows = await page.locator('table tbody tr').count();
    const html = await page.content();
    console.log('Rows:', rows);
    console.log('API calls:', [...new Set(apiCalls)]);
    console.log('HTML snippet:', html.slice(0, 600));

    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();
