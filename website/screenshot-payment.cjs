const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Go to app and wait for something to render
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/payment-step1-root.png', fullPage: false });

  // Try to find login form elements with various selectors
  const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"], #password').first();
  
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill('tg@clinic.vn');
    await passwordInput.fill('123456');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
  }

  // Navigate to payment
  await page.goto('http://localhost:5174/payment', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/payment-page.png', fullPage: false });

  // Try to click Plans tab
  const plansTab = page.locator('button:has-text("Plans"), [role="tab"]:has-text("Plans"), .tab:has-text("Plans")').first();
  if (await plansTab.isVisible().catch(() => false)) {
    await plansTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/payment-plans-tab.png', fullPage: false });
  }

  // Search Kim Thị Thảo Nhi
  try {
    const search = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
    await search.fill('Kim Thị Thảo Nhi');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/payment-kim.png', fullPage: false });
  } catch (e) {}

  await browser.close();
  console.log('Done');
})();
