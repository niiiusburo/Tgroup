import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5174';

test.describe('Payment page title verification', () => {
  test('login and verify payment page titles are visible', async ({ page }) => {
    // Step 1: Login
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Screenshot login page to see what we're working with
    await page.screenshot({ path: 'e2e/screenshots/01-login-page.png', fullPage: true });

    // Find and fill email/password
    const emailInput = page.locator('input[type="email"], input[id="email"], input[placeholder*="email" i], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await emailInput.fill('tg@clinic.vn');
    await passwordInput.fill('123456');

    // Click submit
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Wait for app to load
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');

    // Screenshot after login
    await page.screenshot({ path: 'e2e/screenshots/02-after-login.png', fullPage: true });
    console.log('Current URL after login:', page.url());

    // Step 2: Navigate to Payment page
    await page.goto(`${BASE}/payment`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Screenshot the payment page
    await page.screenshot({ path: 'e2e/screenshots/03-payment-page.png', fullPage: true });
    console.log('Current URL:', page.url());

    // Step 3: Check for visible text content
    const pageText = await page.textContent('body');
    
    // Check h1
    const h1Elements = page.locator('h1');
    const h1Count = await h1Elements.count();
    console.log(`\n=== H1 Elements (${h1Count}) ===`);
    for (let i = 0; i < h1Count; i++) {
      const text = await h1Elements.nth(i).textContent();
      console.log(`  H1[${i}]: "${text?.trim()}"`);
    }

    // Check h3 elements
    const h3Elements = page.locator('h3');
    const h3Count = await h3Elements.count();
    console.log(`\n=== H3 Elements (${h3Count}) ===`);
    for (let i = 0; i < h3Count; i++) {
      const text = await h3Elements.nth(i).textContent();
      const visible = await h3Elements.nth(i).isVisible();
      console.log(`  H3[${i}]: "${text?.trim()}" (visible: ${visible})`);
    }

    // Check all elements with font-semibold or font-medium class (stat labels, card titles)
    const labelElements = page.locator('.font-semibold, .font-medium');
    const labelCount = await labelElements.count();
    console.log(`\n=== Font Semibold/Medium Elements (${labelCount}) ===`);
    const emptyLabels: string[] = [];
    for (let i = 0; i < Math.min(labelCount, 50); i++) {
      const text = await labelElements.nth(i).textContent();
      const visible = await labelElements.nth(i).isVisible();
      if (visible && text && text.trim().length > 0) {
        console.log(`  [${i}]: "${text.trim().substring(0, 60)}"`);
      } else if (visible && (!text || text.trim().length === 0)) {
        const tagName = await labelElements.nth(i).evaluate(el => el.tagName);
        const className = await labelElements.nth(i).evaluate(el => el.className);
        console.log(`  [${i}]: EMPTY! <${tagName}> class="${className.substring(0, 80)}"`);
        emptyLabels.push(`[${i}] <${tagName}>`);
      }
    }

    // Check specifically for Vietnamese payment terms
    const expectedTexts = ['Thanh toán', 'Ví tiền gửi', 'Số dư khả dụng'];
    console.log(`\n=== Expected Vietnamese text checks ===`);
    for (const expected of expectedTexts) {
      const found = pageText?.includes(expected);
      console.log(`  "${expected}": ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
    }

    // Check for unresolved i18n keys (stripped Vietnamese keys showing as raw text)
    const suspiciousPatterns = ['iMtKhu', 'chnBcS', 'chnDchV', 'angXL', 'bLc'];
    console.log(`\n=== Suspicious broken i18n keys ===`);
    for (const pat of suspiciousPatterns) {
      if (pageText?.includes(pat)) {
        console.log(`  ⚠️ Found broken key: "${pat}"`);
      }
    }

    // Final assertions
    expect(h1Count).toBeGreaterThan(0);
    
    const firstH1Text = await h1Elements.first().textContent();
    expect(firstH1Text?.trim().length).toBeGreaterThan(0);
    
    console.log(`\n📸 Screenshots saved to e2e/screenshots/`);
    console.log(`  01-login-page.png`);
    console.log(`  02-after-login.png`);
    console.log(`  03-payment-page.png`);
  });
});
