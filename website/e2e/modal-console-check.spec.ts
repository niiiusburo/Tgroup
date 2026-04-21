import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test('check console when opening appointment modal and add customer modal', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`[ERROR] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  await page.goto('http://localhost:5175/calendar');
  await page.waitForLoadState('networkidle');

  // Find and click the add appointment button - try different selectors
  const btn = page.locator('button').filter({ hasText: /Thêm|Add/i }).first();
  await btn.click();
  await page.waitForTimeout(1000);

  // Screenshot after opening modal
  await page.screenshot({ path: 'e2e/modal-open.png' });

  // Look for + button to add customer
  const plusBtns = page.locator('button').filter({ has: page.locator('svg') });
  const count = await plusBtns.count();
  console.log(`Found ${count} buttons with SVG`);

  // Try clicking the + button near customer selector
  const customerLabel = page.locator('text=/Khách hàng|Customer/i').first();
  if (await customerLabel.isVisible().catch(() => false)) {
    console.log('Customer label visible');
    // Click the + button in the same row/area
    const addCustomerBtn = page.locator('button[title*="Thêm"], button[title*="Add"]').first();
    if (await addCustomerBtn.isVisible().catch(() => false)) {
      await addCustomerBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e2e/add-customer-modal.png' });
    }
  }

  console.log(`Total errors: ${errors.length}`);
  expect(errors.filter(e => !e.includes('favicon') && !e.includes('Source map'))).toHaveLength(0);
});
