const { chromium } = require('playwright');

const baseUrl = 'https://nk.2checkin.com';

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.locator('input[type="email"]').fill('t@clinic.vn');
  await page.locator('input[type="password"]').fill('123123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);
  const url = page.url();
  console.log('Login url:', url);
  return !url.includes('/login');
}

async function checkCustomer(page, customerId, ref, name) {
  console.log(`\n=== Checking: ${name} (${ref}) ===`);
  await page.goto(`${baseUrl}/customers/${customerId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Press Escape to close any modals
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // Click on the tab list area first, then find "Thanh toán" tab specifically within the customer page
  const tabButtons = await page.locator('[role="tablist"] button, [role="tablist"] a, .tabs button, .tabs a').all();
  console.log(`Found ${tabButtons.length} tab elements`);
  
  let clicked = false;
  for (const tab of tabButtons) {
    const text = await tab.textContent().catch(() => '');
    if (text.includes('Thanh toán')) {
      console.log(`Clicking tab: ${text}`);
      await tab.click({ force: true });
      clicked = true;
      break;
    }
  }
  
  if (!clicked) {
    // Try clicking by role tab with exact text
    const thanhToanTabs = await page.getByRole('tab', { name: /Thanh toán/i }).all();
    console.log(`Found ${thanhToanTabs.length} tabs by role`);
    if (thanhToanTabs.length > 0) {
      await thanhToanTabs[0].click({ force: true });
      clicked = true;
    }
  }
  
  await page.waitForTimeout(3000);
  
  // Get the visible text
  const text = await page.locator('body').innerText();
  console.log('Page text snippet (first 2000 chars):', text.slice(0, 2000));
  
  // Save screenshot
  const path = `/tmp/nk-${ref}-payments.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`Screenshot: ${path}`);
  
  // Check for indicators
  const has1_5M = text.includes('1,500,000') || text.includes('1.500.000') || text.includes('1500000');
  const hasNoPayment = text.includes('Không có thanh toán') || text.includes('No payments') || text.includes('Chưa có thanh toán');
  console.log(`Has 1.5M indicator: ${has1_5M}, Has 'no payment' indicator: ${hasNoPayment}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const ok = await login(page);
  if (!ok) { console.log('Login failed'); await browser.close(); process.exit(1); }
  
  const customers = [
    { id: '6dec35e7-518a-4167-a787-b2f20024c278', ref: 'T049843', name: 'VÕ NGỌC PHƯƠNG NGÂN' },
    { id: 'a0ab02db-1c4b-4b11-94d5-b30000bdb55b', ref: 'T050355', name: 'CAO THỊ TUYẾT MAI' },
    { id: '6758fbf0-a5b6-456f-af7b-b28d00355c5d', ref: 'T045937', name: 'ĐỖ NGỌC BÍCH' },
    { id: '34364319-9ae7-45ad-8d52-b29000640d8a', ref: 'T046059', name: 'NGUYỄN THỊ DUNG' },
    { id: '1b5048c4-80e9-47e3-b4f6-b2f6009db59b', ref: '11252', name: 'VÕ THỊ HỒNG HẠNH' },
  ];
  
  for (const c of customers) {
    await checkCustomer(page, c.id, c.ref, c.name);
  }
  
  await browser.close();
  console.log('\n=== Done ===');
})();
