const { chromium } = require('playwright');

const baseUrl = 'https://nk.2checkin.com';
const customers = [
  { id: '6dec35e7-518a-4167-a787-b2f20024c278', ref: 'T049843', name: 'VÕ NGỌC PHƯƠNG NGÂN', braces: 'SO50374', other: ['SO59564'] },
];

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.locator('input[type="email"]').fill('t@clinic.vn');
  await page.locator('input[type="password"]').fill('123123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);
  const url = page.url();
  if (url.includes('/login')) {
    console.log('Login failed!');
    await page.screenshot({ path: '/tmp/nk-login-failed.png', fullPage: true });
    return false;
  }
  console.log('Login success, url:', url);
  return true;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const ok = await login(page);
  if (!ok) {
    await browser.close();
    process.exit(1);
  }
  
  // Check first customer
  const customer = customers[0];
  console.log(`Checking: ${customer.name}`);
  await page.goto(`${baseUrl}/customers/${customer.id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Find and click Payments tab
  const paymentsTab = await page.locator('button, a, div').filter({ hasText: /Thanh toán|Payment/i }).first();
  if (await paymentsTab.isVisible().catch(() => false)) {
    await paymentsTab.click();
    await page.waitForTimeout(2000);
  }
  
  await page.screenshot({ path: '/tmp/nk-customer-payments.png', fullPage: false });
  console.log('Screenshot saved: /tmp/nk-customer-payments.png');
  
  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log('Body text:', bodyText.slice(0, 1000));
  
  await browser.close();
})();
