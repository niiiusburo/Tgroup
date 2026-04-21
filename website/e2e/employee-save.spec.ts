/**
 * Employee Create & Update — Playwright E2E test
 *
 * Test 1: Create a new employee via the form modal
 * Test 2: Update that employee's name
 * Test 3: Cleanup via API delete
 *
 * Login: tg@clinic.vn / 123456
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5175';
const EMPLOYEE_NAME = 'Test Playwright Employee';
const UPDATED_NAME = 'Test Updated Employee';
const EMPLOYEE_PHONE = '0999777888';
const EMPLOYEE_EMAIL = 'playwright@test.vn';
const EMPLOYEE_PASSWORD = 'test123';

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
  await page.waitForTimeout(2000);
}

async function navigateToEmployees(page: Page) {
  await page.goto(`${BASE}/employees`);
  await expect(page.locator('main').getByRole('heading', { name: /Employees|Nhân viên/i })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500);
}

/** Hide the fixed VersionDisplay widget that intercepts pointer events */
async function hideVersionOverlay(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector('div.fixed.bottom-4.right-4') as HTMLElement
      ?? document.querySelector('[class*="fixed"][class*="bottom-4"][class*="right-4"]') as HTMLElement;
    if (el) el.style.display = 'none';
  });
}

test.describe.serial('Employee Create & Update', () => {
  test('TC1: Create new employee', async ({ page }) => {
    await login(page);
    await navigateToEmployees(page);
    await hideVersionOverlay(page);

    // Click "Add Employee" / "Thêm nhân viên" button
    await page.getByRole('button', { name: /Add Employee|Thêm nhân viên/i }).click();
    await page.waitForTimeout(500);

    // Wait for form modal to appear
    await expect(page.getByText('Thêm nhân viên').first()).toBeVisible({ timeout: 8000 });

    // Fill name
    const nameInput = page.getByPlaceholder('Nhập họ và tên');
    await nameInput.clear();
    await nameInput.fill(EMPLOYEE_NAME);

    // Fill phone
    const phoneInput = page.getByPlaceholder('Nhập số điện thoại');
    await phoneInput.clear();
    await phoneInput.fill(EMPLOYEE_PHONE);

    // Fill email
    const emailInput = page.getByPlaceholder('Nhập email');
    await emailInput.clear();
    await emailInput.fill(EMPLOYEE_EMAIL);

    // Fill password
    const passwordInput = page.getByPlaceholder('Nhập mật khẩu');
    await passwordInput.clear();
    await passwordInput.fill(EMPLOYEE_PASSWORD);

    await page.screenshot({ path: 'e2e/screenshots/employee-create-form.png' });

    // Click submit button "Thêm nhân viên" — use force to bypass any remaining overlay
    await page.getByRole('button', { name: /^Thêm nhân viên$/ }).click({ force: true });

    // Modal should close
    await expect(page.getByText('Tạo nhân viên mới')).not.toBeVisible({ timeout: 15000 });

    // Wait for list to refresh
    await page.waitForTimeout(2000);

    // Search for the new employee
    const searchInput = page.getByPlaceholder(/Search by name|Tìm kiếm nhân viên/i);
    await searchInput.clear();
    await searchInput.fill(EMPLOYEE_NAME);
    await page.waitForTimeout(2000);

    // Verify the new employee appears in the list
    await expect(page.getByText(EMPLOYEE_NAME).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/screenshots/employee-create-verified.png' });
  });

  test('TC2: Update employee name', async ({ page }) => {
    await login(page);
    await navigateToEmployees(page);
    await hideVersionOverlay(page);

    // Search for the employee we just created
    const searchInput = page.getByPlaceholder(/Search by name|Tìm kiếm nhân viên/i);
    await searchInput.clear();
    await searchInput.fill(EMPLOYEE_NAME);
    await page.waitForTimeout(2000);

    // Click the employee row to select it and open the profile panel
    await page.getByText(EMPLOYEE_NAME).first().click();
    await page.waitForTimeout(1000);

    // Click the edit (Pencil) button in the profile panel
    const editButton = page.locator('button[title="Edit employee"]');
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();
    await page.waitForTimeout(500);

    // Wait for edit form modal
    await expect(page.getByText('Sửa nhân viên').first()).toBeVisible({ timeout: 8000 });

    // Change the name
    const nameInput = page.getByPlaceholder('Nhập họ và tên');
    await nameInput.clear();
    await nameInput.fill(UPDATED_NAME);

    await page.screenshot({ path: 'e2e/screenshots/employee-update-form.png' });

    // Click "Cập nhật" button
    await page.getByRole('button', { name: /^Cập nhật$/ }).click({ force: true });

    // Modal should close
    await expect(page.getByText('Sửa nhân viên')).not.toBeVisible({ timeout: 15000 });

    // Wait for list to refresh
    await page.waitForTimeout(2000);

    // Search for the updated name
    await searchInput.clear();
    await searchInput.fill(UPDATED_NAME);
    await page.waitForTimeout(2000);

    // Verify the updated name appears in the list
    await expect(page.getByText(UPDATED_NAME).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/screenshots/employee-update-verified.png' });
  });

  test('TC3: Cleanup — delete test employee via API', async ({ request }) => {
    const searchRes = await request.get('http://localhost:3002/api/Employees', {
      params: { search: 'Test Updated' },
    });
    expect(searchRes.ok()).toBeTruthy();

    const data = await searchRes.json();
    const items = data.items || data;
    const testEmployee = (Array.isArray(items) ? items : []).find(
      (e: any) => e.name?.includes('Test Updated') || e.name?.includes('Test Playwright')
    );

    if (testEmployee) {
      const deleteRes = await request.delete(
        `http://localhost:3002/api/Employees/${testEmployee.id}`
      );
      expect(deleteRes.ok()).toBeTruthy();
    }
  });
});
