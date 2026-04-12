const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill('tg@clinic.vn');
  await page.locator('input[type="password"]').fill('123456');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);

  // Payment Plans
  await page.goto('http://localhost:5174/payment');
  await page.waitForTimeout(3000);
  
  // Click Installment Plans tab
  const tab = page.locator('text=Installment Plans').first();
  if (await tab.isVisible().catch(() => false)) await tab.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/two-customers-plans-list.png', fullPage: false });

  // Search Kim
  const search = page.locator('input[placeholder*="Search"]').first();
  await search.fill('Kim Thị Thảo Nhi');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/two-customers-kim.png', fullPage: false });

  // Click Kim card
  await page.locator('text=KIM THỊ THẢO NHI').first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/two-customers-kim-detail.png', fullPage: false });

  // Search Luong
  await search.fill('');
  await search.fill('Lương Hồng Nhung');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/two-customers-luong.png', fullPage: false });

  // Click Luong card
  await page.locator('text=LƯƠNG HỒNG NHUNG').first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/two-customers-luong-detail.png', fullPage: false });

  await browser.close();
  console.log('Screenshots saved');
})();
