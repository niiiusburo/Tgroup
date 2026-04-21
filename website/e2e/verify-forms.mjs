import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: '.auth/admin.json' });
  const page = await context.newPage();

  const errors = [];
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

  // Test 1: Customers page → Add Customer → Save
  console.log('=== Test 1: Add Customer from Customers page ===');
  await page.goto('http://localhost:5175/customers');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const addCustomerBtn = page.locator('button').filter({ hasText: /Thêm khách hàng/i }).first();
  if (await addCustomerBtn.isVisible().catch(() => false)) {
    await addCustomerBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/verify-add-customer-open.png' });

    // Fill form
    await page.locator('input[name="name"]').fill('TestSaveCustomer');
    await page.locator('input[name="phone"]').fill('0900000001');

    // Click Save
    const saveBtn = page.locator('button[type="submit"]').filter({ hasText: /Lưu/i }).first();
    await saveBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/verify-add-customer-after-save.png' });
    console.log('AddCustomerForm save attempted');
  } else {
    console.log('Add Customer button not found');
  }

  // Test 2: Calendar → Add Appointment modal
  console.log('=== Test 2: Appointment form from Calendar ===');
  await page.goto('http://localhost:5175/calendar');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const quickAddBtn = page.locator('button').filter({ hasText: /Hẹn mới|Thêm lịch hẹn/i }).first();
  if (await quickAddBtn.isVisible().catch(() => false)) {
    await quickAddBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/verify-appointment-open.png' });

    // Check if FormFooter save button exists and is clickable
    const aptSaveBtn = page.locator('button').filter({ hasText: /Tạo lịch hẹn/i }).first();
    console.log(`Appointment save button visible: ${await aptSaveBtn.isVisible().catch(() => false)}`);
    console.log(`Appointment save button enabled: ${await aptSaveBtn.isEnabled().catch(() => false)}`);
  } else {
    console.log('Quick add button not found');
    await page.screenshot({ path: 'e2e/verify-calendar-no-button.png' });
  }

  // Test 3: Service form from Customers page
  console.log('=== Test 3: Service form from Customers page ===');
  await page.goto('http://localhost:5175/customers');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click first customer to open profile
  const firstCustomer = page.locator('tr[data-row]').first();
  if (await firstCustomer.isVisible().catch(() => false)) {
    await firstCustomer.click();
    await page.waitForTimeout(1500);

    // Look for add service button
    const addServiceBtn = page.locator('button').filter({ hasText: /Thêm dịch vụ/i }).first();
    if (await addServiceBtn.isVisible().catch(() => false)) {
      await addServiceBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e2e/verify-service-open.png' });

      const serviceSaveBtn = page.locator('button').filter({ hasText: /Thêm dịch vụ/i }).last();
      console.log(`Service save button visible: ${await serviceSaveBtn.isVisible().catch(() => false)}`);
      console.log(`Service save button enabled: ${await serviceSaveBtn.isEnabled().catch(() => false)}`);
    } else {
      console.log('Add service button not found');
    }
  } else {
    console.log('No customer rows found');
  }

  console.log(`\nTotal JS errors: ${errors.length}`);
  errors.forEach(e => console.log(`  - ${e}`));

  await browser.close();
})();
