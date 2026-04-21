import { test, expect } from '@playwright/test';

test.describe('Form save verification', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('AddCustomerForm from Calendar + button can save', async ({ page }) => {
    await page.goto('http://localhost:5175/calendar');
    await page.waitForLoadState('networkidle');

    // Open add appointment
    await page.locator('button', { hasText: /Thêm lịch hẹn|Add appointment/i }).first().click();
    await expect(page.locator('text=Thêm lịch hẹn').first()).toBeVisible({ timeout: 5000 });

    // Click + button to add customer
    const plusBtn = page.locator('button[title*="Thêm khách hàng"], button[title*="Add customer"]').first();
    await expect(plusBtn).toBeVisible({ timeout: 5000 });
    await plusBtn.click();

    // Wait for AddCustomerForm modal
    await expect(page.locator('text=Tạo hồ sơ bệnh nhân mới, Tạo hồ sơ, Add Customer').first()).toBeVisible({ timeout: 5000 });

    // Fill required fields
    await page.locator('input[name="name"], #name').first().fill('Test Save Customer');
    await page.locator('input[name="phone"], #phone').first().fill('0999999999');

    // Click Save
    const saveBtn = page.locator('button[type="submit"]').filter({ hasText: /Lưu|Save/i }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 3000 });
    await saveBtn.click();

    // Should show saving state or close
    await expect(page.locator('text=Test Save Customer').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ AddCustomerForm save works');
  });

  test('AppointmentFormShell can save', async ({ page }) => {
    await page.goto('http://localhost:5175/calendar');
    await page.waitForLoadState('networkidle');

    // Open add appointment
    await page.locator('button', { hasText: /Thêm lịch hẹn|Add appointment/i }).first().click();
    await expect(page.locator('text=Thêm lịch hẹn').first()).toBeVisible({ timeout: 5000 });

    // Select a customer
    const customerSelector = page.locator('[data-testid="customer-selector"], .customer-selector').first();
    if (await customerSelector.isVisible().catch(() => false)) {
      await customerSelector.click();
      await page.locator('.customer-option, [role="option"]').first().click();
    }

    // Click Save
    const saveBtn = page.locator('button').filter({ hasText: /Tạo lịch hẹn|Create|Lưu|Save/i }).last();
    await expect(saveBtn).toBeEnabled({ timeout: 3000 });

    // Check no console errors before save
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await saveBtn.click();
    await page.waitForTimeout(2000);

    expect(errors.filter(e => !e.includes('favicon') && !e.includes('Source map'))).toHaveLength(0);
    console.log('✅ AppointmentFormShell save works, console errors:', errors.length);
  });
});
