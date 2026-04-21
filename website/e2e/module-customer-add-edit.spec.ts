/**
 * E2E: Customer Add & Edit — Post-Refactoring Verification
 * Focused, robust test using current Vietnamese UI labels.
 */
import { test, expect, type Page } from '@playwright/test';

// eslint-disable-next-line
const { describe } = test;

test.use({ storageState: '.auth/admin.json' });

const BASE = 'http://localhost:5175';
const TEST_ID = Date.now().toString().slice(-6);
const CUSTOMER_NAME = `E2E Customer ${TEST_ID}`;
const CUSTOMER_PHONE = `0988${TEST_ID}`;
const CUSTOMER_EMAIL = `e2e_${TEST_ID}@test.vn`;

async function dismissVersionToast(page: Page) {
  const dismiss = page.locator('button', { hasText: /Dismiss|Đóng thông báo/i }).first();
  if (await dismiss.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismiss.click();
    await page.waitForTimeout(300);
  }
}

async function gotoCustomers(page: Page) {
  await page.goto(`${BASE}/customers`);
  await expect(page.getByRole('heading', { name: /Khách hàng/i }).first()).toBeVisible({ timeout: 15000 });
  await dismissVersionToast(page);
}

describe('Customer Add & Edit', () => {
  test('Add customer with basic info', async ({ page }) => {
    await gotoCustomers(page);

    // Open add modal
    await page.getByRole('button', { name: /Add Customer|Thêm khách hàng/i }).first().click();
    await expect(page.locator('input[placeholder="Họ và tên"]')).toBeVisible({ timeout: 8000 });

    // Fill basic fields
    await page.locator('input[placeholder="Họ và tên"]').fill(CUSTOMER_NAME);
    await page.locator('input[placeholder="0901 111 222"]').fill(CUSTOMER_PHONE);
    await page.locator('input[type="email"]').fill(CUSTOMER_EMAIL);

    // Select branch (first real option)
    const branchSelect = page.locator('select').filter({ has: page.locator('option:has-text("Chọn chi nhánh")') });
    await branchSelect.selectOption({ index: 1 });

    // Wait for uniqueness check
    await page.waitForTimeout(2000);

    // Save via JS click to bypass modal nesting pointer issues
    await page.locator('button[type="submit"]').filter({ hasText: /^Lưu$/ }).evaluate((el: HTMLElement) => el.click());

    // Modal should unmount
    await expect(page.locator('button[type="submit"]').filter({ hasText: /^Lưu$/ })).not.toBeAttached({ timeout: 15000 });

    // Search and verify
    await gotoCustomers(page);
    const search = page.locator('input[placeholder*="Tìm kiếm"], input[placeholder*="Search"]').first();
    await search.fill(CUSTOMER_NAME);
    await page.waitForTimeout(1500);
    await expect(page.getByText(CUSTOMER_NAME).first()).toBeVisible({ timeout: 10000 });
  });

  test('Edit customer basic info', async ({ page }) => {
    await gotoCustomers(page);

    // Search for created customer
    const search = page.locator('input[placeholder*="Tìm kiếm"], input[placeholder*="Search"]').first();
    await search.fill(CUSTOMER_NAME);
    await page.waitForTimeout(1500);
    await page.getByText(CUSTOMER_NAME).first().click();
    await page.waitForTimeout(800);

    // Open edit via JS click to bypass any overlay
    const editBtn = page.locator('button', { hasText: /^Edit$/i }).first();
    await editBtn.evaluate((el: HTMLElement) => el.click());

    // Wait for edit modal to open
    await expect(page.locator('input[placeholder="Họ và tên"]')).toBeVisible({ timeout: 8000 });

    // Update name
    const updatedName = CUSTOMER_NAME + ' Updated';
    await page.locator('input[placeholder="Họ và tên"]').fill(updatedName);

    // Wait for uniqueness check
    await page.waitForTimeout(1500);

    // Save via JS click
    await page.locator('button[type="submit"]').filter({ hasText: /^Cập nhật$/ }).evaluate((el: HTMLElement) => el.click());

    // Modal should unmount
    await expect(page.locator('button[type="submit"]').filter({ hasText: /^Cập nhật$/ })).not.toBeAttached({ timeout: 15000 });

    // Verify updated name on profile
    await expect(page.getByText(updatedName).first()).toBeVisible({ timeout: 10000 });
  });
});
