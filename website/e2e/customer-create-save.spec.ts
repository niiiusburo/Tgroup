/**
 * TDD: Customer Create — Save button must work
 *
 * Steps: Fill name + phone + branch, click "Lưu", verify modal closes and customer appears
 * Login: tg@clinic.vn / 123456
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5174';
const TEST_NAME = 'TDD Save Test ' + Date.now();
const TEST_PHONE = '09' + Math.floor(10000000 + Math.random() * 90000000);

async function login(page: Page) {
  await page.goto(BASE);
  const emailInput = page.locator('#email');
  const isLoginPage = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
  if (isLoginPage) {
    await emailInput.fill('tg@clinic.vn');
    await page.locator('#password').fill('123456');
    await page.locator('button[type="submit"]').click();
    await expect(emailInput).toBeHidden({ timeout: 15000 });
  }
  await page.getByRole('link', { name: 'Customers' }).waitFor({ timeout: 15000 });
}

test.describe('Customer Create — Save Button', () => {
  test('Save creates customer and closes modal', async ({ page }) => {
    await login(page);

    // Navigate to Customers
    await page.getByRole('link', { name: 'Customers' }).click();
    await expect(page.locator('main').getByRole('heading', { name: 'Customers' })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Click "+ Add Customer" button
    await page.getByText('Add Customer').first().click();
    await page.waitForTimeout(1000);

    // Wait for form modal
    await expect(page.getByText(/Thêm khách hàng/i)).toBeVisible({ timeout: 8000 });

    // Fill required fields
    const nameInput = page.getByPlaceholder('Nhập họ và tên');
    await nameInput.clear();
    await nameInput.fill(TEST_NAME);

    const phoneInput = page.getByPlaceholder('0901 111 222');
    await phoneInput.clear();
    await phoneInput.fill(TEST_PHONE);

    // Select branch — find select with "Chọn chi nhánh" option
    await page.locator('select').filter({ has: page.locator('option:has-text("Chọn chi nhánh")') }).selectOption({ index: 1 });

    await page.screenshot({ path: 'e2e/screenshots/create-customer-filled.png' });

    // Click Save ("Lưu")
    await page.getByRole('button', { name: /^Lưu$/ }).click();

    // Modal should close within 10 seconds (async API call)
    await expect(page.getByText(/Thêm khách hàng/i)).not.toBeVisible({ timeout: 15000 });

    // Verify customer appears in list
    await page.waitForTimeout(2000);

    // Search for the new customer
    const searchInput = page.getByPlaceholder(/search|tìm/i);
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(TEST_PHONE);
      await page.waitForTimeout(2000);
    }

    // Customer should be in the table
    await expect(page.getByText(TEST_NAME).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/screenshots/create-customer-verified.png' });
  });
});
