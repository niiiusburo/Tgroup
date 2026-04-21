/**
 * E2E: Employee Add & Edit — Post-Refactoring Verification
 */
import { test, expect, type Page } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

const BASE = 'http://localhost:5175';
const TEST_ID = Date.now().toString().slice(-6);
const EMPLOYEE_NAME = `E2E Employee ${TEST_ID}`;
const EMPLOYEE_PHONE = `0977${TEST_ID}`;
const EMPLOYEE_EMAIL = `e2e_emp_${TEST_ID}@test.vn`;

async function gotoEmployees(page: Page) {
  await page.goto(`${BASE}/employees`);
  await expect(page.getByRole('heading', { name: /Nhân viên|Employees/i }).first()).toBeVisible({ timeout: 15000 });
}

test('Add employee and verify persistence', async ({ page }) => {
  await gotoEmployees(page);

  // Click add button
  await page.getByRole('button', { name: /Add Employee|Thêm nhân viên/i }).first().click();
  await expect(page.locator('input[placeholder="Nhập họ và tên"]')).toBeVisible({ timeout: 8000 });

  // Fill form
  await page.locator('input[placeholder="Nhập họ và tên"]').fill(EMPLOYEE_NAME);
  await page.locator('input[placeholder="Nhập số điện thoại"]').fill(EMPLOYEE_PHONE);
  await page.locator('input[placeholder="Nhập email"]').fill(EMPLOYEE_EMAIL);
  await page.locator('input[placeholder="Nhập mật khẩu"]').fill('Test123!');

  // Save via JS click to bypass modal nesting issues
  await page.locator('button[type="submit"]').evaluate((el: HTMLElement) => el.click());

  // Modal should unmount
  await expect(page.locator('button[type="submit"]')).not.toBeAttached({ timeout: 15000 });

  // Verify in list
  await gotoEmployees(page);
  const search = page.locator('input[placeholder*="Tìm kiếm"], input[placeholder*="Search"]').first();
  await search.fill(EMPLOYEE_NAME);
  await page.waitForTimeout(1500);
  await expect(page.getByText(EMPLOYEE_NAME).first()).toBeVisible({ timeout: 10000 });
});

test('Edit employee and verify persistence', async ({ page }) => {
  await gotoEmployees(page);

  // Search
  const search = page.locator('input[placeholder*="Tìm kiếm"], input[placeholder*="Search"]').first();
  await search.fill(EMPLOYEE_NAME);
  await page.waitForTimeout(1500);
  await page.getByText(EMPLOYEE_NAME).first().click();
  await page.waitForTimeout(800);

  // Open edit
  const editBtn = page.locator('button[title="Edit employee"]').first();
  await editBtn.evaluate((el: HTMLElement) => el.click());

  // Wait for modal
  await expect(page.locator('input[placeholder="Nhập họ và tên"]')).toBeVisible({ timeout: 8000 });

  // Update name
  const updatedName = EMPLOYEE_NAME + ' Updated';
  await page.locator('input[placeholder="Nhập họ và tên"]').fill(updatedName);

  // Save via JS click
  await page.locator('button[type="submit"]').evaluate((el: HTMLElement) => el.click());

  // Modal should unmount
  await expect(page.locator('button[type="submit"]')).not.toBeAttached({ timeout: 15000 });

  // Verify
  await expect(page.getByText(updatedName).first()).toBeVisible({ timeout: 10000 });
});
