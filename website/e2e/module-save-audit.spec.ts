/**
 * E2E: Module Save/Edit Audit
 *
 * Systematically verifies that every major module can create and edit records.
 * Catches: API errors, validation failures, mapper bugs, permission issues.
 *
 * Hard-coded port: 5175
 */

import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5175';

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
  await page.locator('a[href="/customers"]').first().waitFor({ timeout: 15000 });
}

async function assertNoApiError(page: Page) {
  const errorPanel = page.locator('.bg-red-50').filter({ hasText: /Lỗi lưu dữ liệu|Error|API|lỗi|failed/i });
  const hasError = await errorPanel.isVisible({ timeout: 1000 }).catch(() => false);
  if (hasError) {
    const errorText = await errorPanel.textContent().catch(() => 'unknown');
    throw new Error(`API error panel visible: ${errorText}`);
  }
}

// ─── 1. CUSTOMERS ───────────────────────────────────────────────────────────

test.describe('1. Customers', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1.1: Create customer and verify save', async ({ page }) => {
    await page.locator('a[href="/customers"]').first().click();
    await expect(page.locator('main').getByRole('heading', { name: /Customers|Khách hàng/i })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: /Add Customer|Thêm khách hàng/i }).first().click();
    await expect(page.getByText(/Thêm khách hàng|Sửa khách hàng/i).first()).toBeVisible({ timeout: 8000 });

    // Fill basic info
    const testPhone = '09' + Date.now().toString().slice(-8);
    await page.getByPlaceholder(/Họ và tên|Full name/i).fill('E2E Test Customer');
    await page.getByPlaceholder(/Số điện thoại|Phone/i).fill(testPhone);
    await page.waitForTimeout(500);

    await assertNoApiError(page);
    await page.getByRole('button', { name: /^Lưu$|Save$/i }).click();
    await page.waitForTimeout(2000);

    // Should close modal or show success
    const modalStillOpen = await page.getByText(/Thêm khách hàng|Sửa khách hàng/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    if (modalStillOpen) {
      await assertNoApiError(page);
      await page.screenshot({ path: 'e2e/screenshots/audit-1.1-customer-save-bug.png' });
      throw new Error('Customer create modal still open — save likely failed');
    }

    // Verify customer appears in list
    await page.reload();
    await page.waitForTimeout(2000);
    const customerCell = page.getByRole('cell', { name: 'E2E Test Customer' });
    await expect(customerCell.first()).toBeVisible({ timeout: 10000 });
  });

  test('1.2: Edit existing customer', async ({ page }) => {
    await page.locator('a[href="/customers"]').first().click();
    await expect(page.locator('main').getByRole('heading', { name: /Customers|Khách hàng/i })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // Click first customer
    await page.getByRole('row').nth(1).click();
    await expect(page.getByRole('heading', { name: /Customer Profile|Hồ sơ khách hàng/i })).toBeVisible({ timeout: 10000 });

    // Click edit
    await page.getByRole('button', { name: /Edit|Sửa/i }).first().click();
    await expect(page.getByText(/Sửa khách hàng|Edit Customer/i).first()).toBeVisible({ timeout: 5000 });

    // Modify name
    const nameInput = page.getByPlaceholder(/Họ và tên|Full name/i);
    await nameInput.fill('E2E Edited Customer');

    await page.getByRole('button', { name: /^Lưu$|Save$/i }).click();
    await page.waitForTimeout(2000);

    const modalStillOpen = await page.getByText(/Sửa khách hàng|Edit Customer/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    if (modalStillOpen) {
      await assertNoApiError(page);
      throw new Error('Customer edit modal still open — save likely failed');
    }
  });
});

// ─── 2. APPOINTMENTS ────────────────────────────────────────────────────────

test.describe('2. Appointments', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('2.1: Create appointment with full fields', async ({ page }) => {
    await page.locator('a[href="/customers"]').first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('cell', { name: /Phạm Ngọc Huy/i }).first().click();
    await expect(page.getByRole('heading', { name: /Customer Profile/i })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    await page.getByRole('button', { name: /^Appointments|Lịch hẹn/i }).click();
    await page.waitForTimeout(600);

    await page.locator('button').filter({ hasText: /Add Appointment|Thêm lịch hẹn/i }).first().click();
    await expect(page.getByRole('heading', { name: /Thêm lịch hẹn|Sửa lịch hẹn/i })).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500);

    // Select doctor
    const doctorBtn = page.locator('button').filter({ hasText: /Chọn bác sĩ|Select doctor/i }).first();
    await doctorBtn.click();
    await page.waitForTimeout(400);
    const firstDoctor = page.locator('.max-h-48.overflow-y-auto button').first();
    await expect(firstDoctor).toBeVisible({ timeout: 3000 });
    await firstDoctor.click();
    await page.waitForTimeout(200);

    // Set date
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Chọn ngày');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const day = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '25' && !b.disabled);
      if (day) day.click();
    });
    await page.waitForTimeout(200);

    // Submit
    await page.getByRole('button', { name: /Tạo lịch hẹn|Create Appointment/i }).click();
    await page.waitForTimeout(3000);

    const modalStillOpen = await page.getByRole('heading', { name: /Thêm lịch hẹn/i }).isVisible({ timeout: 3000 }).catch(() => false);
    if (modalStillOpen) {
      await assertNoApiError(page);
      await page.screenshot({ path: 'e2e/screenshots/audit-2.1-appointment-save-bug.png' });
      throw new Error('Appointment create modal still open — save likely failed');
    }
  });
});

// ─── 3. SERVICES (ServiceCatalog) ───────────────────────────────────────────

test.describe('3. Services', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('3.1: Create service catalog item', async ({ page }) => {
    await page.goto(BASE + '/services/catalog');
    await expect(page.locator('main').getByRole('heading', { name: /Service Catalog|Dịch vụ/i })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: /Add Service|Thêm dịch vụ/i }).first().click();
    await expect(page.getByRole('heading', { name: /New Service|Thêm dịch vụ/i })).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder(/Tên dịch vụ|Service name/i).fill('E2E Test Service');
    await page.getByPlaceholder(/Giá|Price/i).fill('1000000');
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /^Lưu$|Save$/i }).click();
    await page.waitForTimeout(2000);

    const modalStillOpen = await page.getByRole('heading', { name: /New Service|Thêm dịch vụ/i }).isVisible({ timeout: 2000 }).catch(() => false);
    if (modalStillOpen) {
      await assertNoApiError(page);
      throw new Error('Service create modal still open — save likely failed');
    }
  });
});

// ─── 4. LOCATIONS ───────────────────────────────────────────────────────────

test.describe('4. Locations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('4.1: Create location', async ({ page }) => {
    await page.goto(BASE + '/locations');
    await expect(page.locator('main').getByRole('heading', { name: /Locations|Chi nhánh/i })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: /Add Location|Thêm chi nhánh/i }).first().click();
    await expect(page.getByRole('heading', { name: /New Location|Thêm chi nhánh/i })).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder(/Tên chi nhánh|Location name/i).fill('E2E Test Location');
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /^Lưu$|Save$/i }).click();
    await page.waitForTimeout(2000);

    const modalStillOpen = await page.getByRole('heading', { name: /New Location|Thêm chi nhánh/i }).isVisible({ timeout: 2000 }).catch(() => false);
    if (modalStillOpen) {
      await assertNoApiError(page);
      throw new Error('Location create modal still open — save likely failed');
    }
  });
});

// ─── 5. EMPLOYEES ───────────────────────────────────────────────────────────

test.describe('5. Employees', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('5.1: Create employee', async ({ page }) => {
    await page.goto(BASE + '/employees');
    await expect(page.locator('main').getByRole('heading', { name: /Employees|Nhân viên/i })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: /Add Employee|Thêm nhân viên/i }).first().click();
    await expect(page.getByRole('heading', { name: /New Employee|Thêm nhân viên/i })).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder(/Họ và tên|Full name/i).fill('E2E Test Employee');
    await page.getByPlaceholder(/Số điện thoại|Phone/i).fill('09' + Date.now().toString().slice(-8));
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /^Lưu$|Save$/i }).click();
    await page.waitForTimeout(2000);

    const modalStillOpen = await page.getByRole('heading', { name: /New Employee|Thêm nhân viên/i }).isVisible({ timeout: 2000 }).catch(() => false);
    if (modalStillOpen) {
      await assertNoApiError(page);
      throw new Error('Employee create modal still open — save likely failed');
    }
  });
});
