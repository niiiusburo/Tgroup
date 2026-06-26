const { chromium } = require('playwright');

const baseUrl = 'https://nk.2checkin.com';

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.locator('input[type="email"]').fill('t@clinic.vn');
  await page.locator('input[type="password"]').fill('123123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);
  return !page.url().includes('/login');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const ok = await login(page);
  if (!ok) { console.log('Login failed'); await browser.close(); process.exit(1); }
  
  // Go to customer page
  await page.goto(`${baseUrl}/customers/6dec35e7-518a-4167-a787-b2f20024c278`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Look for the "Thanh toán" tab by finding all clickable elements and checking text
  const allLinks = await page.locator('a, button').all();
  for (const link of allLinks) {
    const text = await link.textContent().catch(() => '');
    if (text.includes('Thanh toán')) {
      console.log('Found tab with text:', text.trim());
      await link.click();
      await page.waitForTimeout(3000);
      break;
    }
  }
  
  // Take screenshot of payment area
  await page.screenshot({ path: '/tmp/nk-payment-tab-visible.png', fullPage: false });
  
  // Check text in payment area specifically
  const bodyText = await page.locator('body').innerText();
  console.log('Body text (first 3000 chars):', bodyText.slice(0, 3000));
  
  // Also check for "no payment" text
  const hasNoPayment = bodyText.includes('Không có thanh toán') || bodyText.includes('Chưa có thanh toán') || bodyText.includes('no payment');
  const hasPayment = bodyText.includes('1,500,000') || bodyText.includes('1.500.000') || bodyText.includes('1500000');
  console.log('Has no-payment text:', hasNoPayment);
  console.log('Has payment amount:', hasPayment);
  
  await browser.close();
})();
