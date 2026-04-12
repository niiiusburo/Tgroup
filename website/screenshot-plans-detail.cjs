const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill('tg@clinic.vn');
  await page.locator('input[type="password"]').fill('123456');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);

  await page.goto('http://localhost:5174/payment');
  await page.waitForTimeout(3000);

  // Force click Installment Plans tab specifically
  const plansTab = page.locator('button').filter({ hasText: /Installment Plans/ }).first();
  if (await plansTab.isVisible().catch(() => false)) {
    await plansTab.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: '/tmp/plans-tab-only.png', fullPage: false });

  // Search Kim
  const search = page.locator('input[placeholder*="Search"]').first();
  await search.fill('Kim Thị Thảo Nhi');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/plans-kim-search.png', fullPage: false });

  // Click the first white card
  const card = page.locator('div[class*="bg-white"]').filter({ hasText: /KIM THỊ THẢO NHI/ }).first();
  if (await card.isVisible().catch(() => false)) {
    await card.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/plans-kim-detail.png', fullPage: false });
  }

  // Search Luong
  await search.fill('');
  await search.fill('Lương Hồng Nhung');
  await page.waitForTimeout(2000);

  const card2 = page.locator('div[class*="bg-white"]').filter({ hasText: /LƯƠNG HỒNG NHUNG/ }).first();
  if (await card2.isVisible().catch(() => false)) {
    await card2.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/plans-luong-detail.png', fullPage: false });
  }

  await browser.close();
  console.log('Done');
})();
