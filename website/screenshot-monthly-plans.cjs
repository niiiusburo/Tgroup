const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Go to login
  await page.goto('http://localhost:5174');
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  await page.locator('#email').waitFor({ state: 'hidden', timeout: 15000 });

  // Navigate to payment page
  await page.goto('http://localhost:5174/payment');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: '/tmp/monthly-plans-list.png', fullPage: false });

  // Search for Kim Thị Thảo Nhi
  const search = page.locator('input[placeholder*="Tìm kiếm"], input[placeholder*="Search"]').first();
  if (await search.isVisible().catch(() => false)) {
    await search.fill('Kim Thị Thảo Nhi');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/monthly-plans-kim.png', fullPage: false });
    
    // Click first row to open detail
    const row = page.locator('tr').nth(1);
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/monthly-plans-kim-detail.png', fullPage: false });
    }
  }

  // Clear and search Lương Hồng Nhung
  if (await search.isVisible().catch(() => false)) {
    await search.fill('Lương Hồng Nhung');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/monthly-plans-luong.png', fullPage: false });
    
    const row = page.locator('tr').nth(1);
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/monthly-plans-luong-detail.png', fullPage: false });
    }
  }

  await browser.close();
  console.log('Screenshots saved');
})();
