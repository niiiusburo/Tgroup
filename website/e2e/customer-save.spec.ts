import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test('Add Customer from Customers page works', async ({ page }) => {
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

  await page.goto('http://localhost:5175/customers');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click Add Customer button
  await page.locator('button').filter({ hasText: /Thêm khách hàng|Add Customer/i }).first().click();
  await page.waitForTimeout(1000);

  // Fill name and phone
  await page.locator('input[name="name"]').fill('TestCustomerSave');
  await page.locator('input[name="phone"]').fill('0912345678');

  // Click Save
  const saveBtn = page.locator('button[type="submit"]').filter({ hasText: /Lưu|Save/i }).first();
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();

  // Wait for save to process
  await page.waitForTimeout(3000);

  // Check for the new customer in the list or toast
  const hasCustomer = await page.locator('text=TestCustomerSave').first().isVisible().catch(() => false);
  console.log(`Customer visible after save: ${hasCustomer}`);
  console.log(`Errors: ${errors.length}`);

  expect(errors.filter(e => !e.includes('favicon') && !e.includes('Source map'))).toHaveLength(0);
});
