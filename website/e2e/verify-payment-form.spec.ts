import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5174';

test('verify PaymentForm modal titles in customer profile', async ({ page }) => {
  // Collect console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(`PAGE ERROR: ${err.message}`));

  // Login
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const emailInput = page.locator('input[type="email"], input[id="email"], input[placeholder*="email" i], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await emailInput.fill('tg@clinic.vn');
  await passwordInput.fill('123456');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);

  // Go to customers page
  await page.goto(`${BASE}/customers`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Click on first customer row to open profile
  const firstCustomer = page.locator('table tbody tr').first();
  if (await firstCustomer.isVisible()) {
    await firstCustomer.click();
    await page.waitForTimeout(2000);
  }

  // Look for "Dịch vụ" or "Services" tab and click it
  const servicesTab = page.locator('button, [role="tab"]').filter({ hasText: /Dịch vụ|Services|dịch vụ/i }).first();
  if (await servicesTab.isVisible()) {
    await servicesTab.click();
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: 'e2e/screenshots/04-customer-services-tab.png', fullPage: true });

  // Find and click a payment/checkout button on a service row
  // Look for buttons with payment-related icons or text
  const payButtons = page.locator('button').filter({ hasText: /Thanh toán|Payment|payment|💳|💰/ });
  const payCount = await payButtons.count();
  console.log(`Found ${payCount} payment buttons`);

  if (payCount > 0) {
    await payButtons.first().click();
    await page.waitForTimeout(2000);

    // Screenshot the payment modal
    await page.screenshot({ path: 'e2e/screenshots/05-payment-form-modal.png', fullPage: true });

    // Check for empty text elements inside the modal
    const modalText = await page.locator('.modal-container, [class*="modal"]').first().textContent();
    console.log('\n=== Payment Modal Text ===');
    console.log(modalText?.substring(0, 500));

    // Check for Vietnamese labels
    const expectedInModal = ['Nguồn thanh toán', 'Từ ví', 'Tiền mặt', 'Chuyển khoản', 'Tổng thanh toán', 'Còn lại'];
    console.log('\n=== Expected labels in modal ===');
    for (const label of expectedInModal) {
      const found = modalText?.includes(label);
      console.log(`  "${label}": ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
    }

    // Check for empty spans/labels in modal
    const emptyElements = await page.locator('.modal-container span:empty, .modal-container label:empty, .modal-container p:empty').count();
    console.log(`\nEmpty elements in modal: ${emptyElements}`);
  } else {
    console.log('No payment buttons found - trying alternative approach');

    // Try clicking any button that looks like it opens a payment form
    const allButtons = page.locator('button');
    const btnCount = await allButtons.count();
    for (let i = 0; i < Math.min(btnCount, 30); i++) {
      const text = await allButtons.nth(i).textContent();
      const visible = await allButtons.nth(i).isVisible();
      if (visible && text) {
        console.log(`  Button ${i}: "${text.trim().substring(0, 40)}"`);
      }
    }
  }

  if (errors.length > 0) {
    console.log('\n=== Console Errors ===');
    for (const e of errors) console.log(`  ${e}`);
  }
});
