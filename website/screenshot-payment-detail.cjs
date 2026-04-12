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

  // Payment page - Installment Plans
  await page.goto('http://localhost:5174/payment');
  await page.waitForTimeout(3000);
  const plansTab = page.getByRole('tab', { name: /Installment|Plans/i }).or(page.locator('text=Installment Plans')).first();
  if (await plansTab.isVisible().catch(() => false)) await plansTab.click();
  await page.waitForTimeout(2000);

  // Search Kim Thị Thảo Nhi
  const search = page.locator('input[placeholder*="Search"]').first();
  await search.fill('Kim Thị Thảo Nhi');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/payment-kim-search2.png', fullPage: false });

  // Click first plan card
  const card = page.locator('div').filter({ hasText: /KIM THỊ THẢO NHI/ }).first();
  await card.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/payment-kim-detail.png', fullPage: false });

  // Search Lương Hồng Nhung
  await search.fill('');
  await search.fill('Lương Hồng Nhung');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/payment-luong-search2.png', fullPage: false });

  const card2 = page.locator('div').filter({ hasText: /LƯƠNG HỒNG NHUNG/ }).first();
  await card2.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/payment-luong-detail.png', fullPage: false });

  await browser.close();
  console.log('Done');
})();
