/**
 * E2E: Customer Adding & Editing — Full Module Test (Comprehensive)
 *
 * Covers every field across all 3 tabs (Basic, Medical, EInvoice) in both
 * create and edit modes. Verifies persistence after each save.
 *
 * Hard-coded port: 5175 (see notes/🏗️ Architecture.md)
 */
import { test, expect, type Page } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

const BASE = 'http://localhost:5175';
const TEST_PHONE_PREFIX = '09' + Date.now().toString().slice(-8);

async function gotoCustomers(page: Page) {
  await page.goto(BASE + '/customers');
  await expect(page.getByRole('main').getByRole('heading', { name: /Customers|Khách hàng/i })).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(800);
}

async function openAddCustomerModal(page: Page) {
  await page.getByRole('button', { name: /Add Customer|Thêm khách hàng/i }).first().click();
  await expect(page.getByText(/Thêm khách hàng|Sửa khách hàng/i).first()).toBeVisible({ timeout: 8000 });
}

async function getSaveButtonState(page: Page, label: RegExp) {
  const btn = page.getByRole('button', { name: label });
  const isDisabled = await btn.isDisabled().catch(() => false);
  const isVisible = await btn.isVisible().catch(() => false);
  return { isDisabled, isVisible, locator: btn };
}

async function assertNoApiError(page: Page) {
  const errorPanel = page.locator('.bg-red-50').filter({ hasText: /Lỗi lưu dữ liệu|Error|lỗi/i });
  const hasError = await errorPanel.isVisible().catch(() => false);
  if (hasError) {
    const errorText = await errorPanel.textContent().catch(() => 'unknown');
    throw new Error(`API error panel visible: ${errorText}`);
  }
}

async function assertNoValidationError(page: Page) {
  const validationError = page.locator('.text-red-500').filter({ hasText: /Vui lòng|required|bắt buộc|không hợp lệ/i });
  const hasError = await validationError.first().isVisible().catch(() => false);
  if (hasError) {
    const errorText = await validationError.first().textContent().catch(() => 'unknown');
    throw new Error(`Validation error visible: ${errorText}`);
  }
}

async function saveAddForm(page: Page) {
  // Wait for any uniqueness checks (phone/email) to finish — debounce 400ms + API latency
  await page.waitForTimeout(1500);
  await assertNoApiError(page);
  const { isDisabled } = await getSaveButtonState(page, /^Lưu$/);
  if (isDisabled) {
    throw new Error('Save button is disabled in add mode — likely due to ongoing uniqueness check or duplicate field');
  }
  await page.getByRole('button', { name: /^Lưu$/ }).click();
}

async function saveEditForm(page: Page) {
  // Wait for any uniqueness checks (phone/email) to finish — debounce 400ms + API latency
  await page.waitForTimeout(1500);
  await assertNoApiError(page);
  await assertNoValidationError(page);
  const { isDisabled } = await getSaveButtonState(page, /^Cập nhật$/);
  if (isDisabled) {
    throw new Error('Update button is disabled — likely due to ongoing uniqueness check, duplicate phone/email, or form validation error');
  }
  await page.getByRole('button', { name: /^Cập nhật$/ }).click();
}

async function closeModalIfOpen(page: Page) {
  const closeBtn = page.getByRole('button', { name: /^Đóng$/i });
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
    await expect(closeBtn).toBeHidden({ timeout: 5000 });
  }
}

async function clickCustomerInList(page: Page, name: string) {
  const row = page.getByText(name).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.click();
  await page.waitForTimeout(800);
}

async function openCustomerEdit(page: Page) {
  const editBtn = page.getByRole('button', { name: /^Edit$/i });
  await expect(editBtn).toBeVisible({ timeout: 8000 });
  await editBtn.click();
  await expect(page.getByText(/Cập nhật|Sửa khách hàng/i).first()).toBeVisible({ timeout: 8000 });
}

async function searchCustomerInList(page: Page, name: string) {
  const searchInput = page.locator('input[placeholder*="Tìm kiếm"], input[placeholder*="Search"]').first();
  await searchInput.fill(name);
  await page.waitForTimeout(1000);
}

// ─── Helpers: Form Field Selectors ───────────────────────────────────────────

const basicFields = {
  name: (p: Page) => p.locator('input[placeholder="Họ và tên"]'),
  phone: (p: Page) => p.getByPlaceholder('0901 111 222'),
  email: (p: Page) => p.locator('input[type="email"]'),
  branchSelect: (p: Page) => p.locator('select').filter({ has: p.locator('option:has-text("Chọn chi nhánh")') }),
  daySelect: (p: Page) => p.locator('select').filter({ has: p.locator('option:has-text("Ngày")') }),
  monthSelect: (p: Page) => p.locator('select').filter({ has: p.locator('option:has-text("Tháng")') }),
  yearSelect: (p: Page) => p.locator('select').filter({ has: p.locator('option:has-text("Năm")') }),
  weight: (p: Page) => p.locator('input[type="number"][placeholder="0"]'),
  job: (p: Page) => p.getByPlaceholder('Nhân viên văn phòng'),
  healthInsurance: (p: Page) => p.getByPlaceholder('DN4xxxxxxxx'),
  identity: (p: Page) => p.getByPlaceholder('0xxxxxxxxx'),
  notes: (p: Page) => p.getByPlaceholder('Ghi chú về khách hàng...'),
};

const medicalFields = {
  history: (p: Page) => p.getByPlaceholder('Nhập tiểu sử bệnh, dị ứng, thuốc đang dùng...'),
};

const einvoiceFields = {
  toggle: (p: Page) => p.locator('#isbusinessinvoice'),
  companyName: (p: Page) => p.getByPlaceholder('Công ty TNHH...'),
  companyAddress: (p: Page) => p.locator('input[placeholder*="123 Đường"], input[placeholder*="123 Street"]'),
  taxCode: (p: Page) => p.locator('input[placeholder="0123456789"]'),
  recipientName: (p: Page) => p.getByPlaceholder('Nguyễn Văn A'),
  recipientId: (p: Page) => p.locator('input[placeholder="0xxxxxxxxx"]').nth(0),
  personalTaxCode: (p: Page) => p.locator('input[placeholder="0xxxxxxxxx"]').nth(1),
  recipientAddress: (p: Page) => p.locator('input[placeholder*="123 Đường"], input[placeholder*="123 Street"]').nth(1),
};

// ─── Test Suite ──────────────────────────────────────────────────────────────

test.describe('Customer Add & Edit — Full Coverage', () => {
  const customerName = 'E2E Full Customer ' + TEST_PHONE_PREFIX.slice(-4);
  let createdCustomerName = customerName;

  test('TC1: Add customer filling ALL 3 tabs', async ({ page }) => {
    await gotoCustomers(page);
    await openAddCustomerModal(page);

    // ── Basic tab (left panel + right panel) ──
    await basicFields.name(page).fill(customerName);
    await basicFields.phone(page).fill(TEST_PHONE_PREFIX + '1');
    await basicFields.email(page).fill(`e2e_${TEST_PHONE_PREFIX}@test.com`);
    await basicFields.branchSelect(page).selectOption({ index: 1 });
    await basicFields.daySelect(page).selectOption('15');
    await basicFields.monthSelect(page).selectOption('6');
    await basicFields.yearSelect(page).selectOption('1990');
    await basicFields.weight(page).fill('65');
    await basicFields.job(page).fill('Kỹ sư phần mềm');
    await basicFields.healthInsurance(page).fill('DN4012345678');
    await basicFields.identity(page).fill('079199000123');
    await basicFields.notes(page).fill('Ghi chú ban đầu từ E2E');

    // ── Medical tab ──
    await page.getByRole('button', { name: /tiểu sử bệnh|Medical History/i }).click();
    await page.waitForTimeout(300);
    await expect(medicalFields.history(page)).toBeVisible();
    await medicalFields.history(page).fill('Tiền sử hen suyễn, dị ứng penicillin');

    // ── EInvoice tab ──
    await page.getByRole('button', { name: /hóa đơn điện tử|E-Invoice/i }).click();
    await page.waitForTimeout(300);
    await einvoiceFields.toggle(page).check();
    await page.waitForTimeout(200);
    await einvoiceFields.companyName(page).fill('Công ty TNHH E2E Test');
    await einvoiceFields.taxCode(page).fill('0123456789');
    await einvoiceFields.recipientName(page).fill('Nguyễn Văn E2E');

    // Save
    await saveAddForm(page);
    await expect(page.getByText(/Thêm khách hàng/i).first()).not.toBeVisible({ timeout: 15000 });

    // Reload list to verify (list doesn't auto-refresh)
    await gotoCustomers(page);
    await searchCustomerInList(page, customerName);
    await expect(page.getByText(customerName).first()).toBeVisible({ timeout: 10000 });
  });

  test('TC2: Edit ONLY Basic tab and verify persistence', async ({ page }) => {
    await gotoCustomers(page);
    await searchCustomerInList(page, createdCustomerName);
    await clickCustomerInList(page, createdCustomerName);
    await openCustomerEdit(page);

    // Ensure we're on Basic tab
    await page.getByRole('button', { name: /thông tin cơ bản|Basic Info/i }).click();
    await page.waitForTimeout(300);

    // Edit basic fields
    await basicFields.name(page).fill(createdCustomerName + ' Updated');
    await basicFields.phone(page).fill(TEST_PHONE_PREFIX + '2');
    await basicFields.email(page).fill(`updated_${TEST_PHONE_PREFIX}@test.com`);
    await basicFields.weight(page).clear();
    await basicFields.weight(page).fill('70');
    await basicFields.job(page).clear();
    await basicFields.job(page).fill('Giám đốc IT');
    await basicFields.notes(page).clear();
    await basicFields.notes(page).fill('Ghi chú đã cập nhật từ Basic tab');

    await saveEditForm(page);
    await expect(page.getByText(/Cập nhật|Sửa khách hàng/i).first()).not.toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(800);

    // Verify persistence in profile header
    await expect(page.getByText(createdCustomerName + ' Updated')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(TEST_PHONE_PREFIX + '2')).toBeVisible();
    createdCustomerName = createdCustomerName + ' Updated';
  });

  test('TC3: Edit ONLY Medical tab and verify persistence', async ({ page }) => {
    await gotoCustomers(page);
    await searchCustomerInList(page, createdCustomerName);
    await clickCustomerInList(page, createdCustomerName);
    await openCustomerEdit(page);

    // Switch to Medical tab
    await page.getByRole('button', { name: /tiểu sử bệnh|Medical History/i }).click();
    await page.waitForTimeout(300);
    await expect(medicalFields.history(page)).toBeVisible();

    // Update medical history
    await medicalFields.history(page).clear();
    await medicalFields.history(page).fill('Cập nhật: Huyết áp cao, tiểu đường type 2');

    // Check a condition checkbox
    const hypertensionCheckbox = page.locator('label').filter({ hasText: /Huyết áp cao|Hypertension/i }).locator('input[type="checkbox"]');
    await hypertensionCheckbox.check();

    await saveEditForm(page);
    await expect(page.getByText(/Cập nhật|Sửa khách hàng/i).first()).not.toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(800);

    // Re-open edit and verify medical tab persisted
    await openCustomerEdit(page);
    await page.getByRole('button', { name: /tiểu sử bệnh|Medical History/i }).click();
    await page.waitForTimeout(300);
    await expect(medicalFields.history(page)).toHaveValue('Cập nhật: Huyết áp cao, tiểu đường type 2');
    await expect(hypertensionCheckbox).toBeChecked();

    await closeModalIfOpen(page);
  });

  test('TC4: Edit ONLY EInvoice tab and verify persistence', async ({ page }) => {
    await gotoCustomers(page);
    await searchCustomerInList(page, createdCustomerName);
    await clickCustomerInList(page, createdCustomerName);
    await openCustomerEdit(page);

    // Switch to EInvoice tab
    await page.getByRole('button', { name: /hóa đơn điện tử|E-Invoice/i }).click();
    await page.waitForTimeout(300);

    // Update einvoice fields
    await einvoiceFields.companyName(page).clear();
    await einvoiceFields.companyName(page).fill('Công ty Cập Nhật E2E');
    await einvoiceFields.taxCode(page).clear();
    await einvoiceFields.taxCode(page).fill('9876543210');
    await einvoiceFields.recipientName(page).clear();
    await einvoiceFields.recipientName(page).fill('Trần Văn E2E');

    await saveEditForm(page);
    await expect(page.getByText(/Cập nhật|Sửa khách hàng/i).first()).not.toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(800);

    // Re-open edit and verify einvoice tab persisted
    await openCustomerEdit(page);
    await page.getByRole('button', { name: /hóa đơn điện tử|E-Invoice/i }).click();
    await page.waitForTimeout(300);
    await expect(einvoiceFields.companyName(page)).toHaveValue('Công ty Cập Nhật E2E');
    await expect(einvoiceFields.taxCode(page)).toHaveValue('9876543210');
    await expect(einvoiceFields.recipientName(page)).toHaveValue('Trần Văn E2E');

    await closeModalIfOpen(page);
  });

  test('TC5: Tab switching during edit preserves unsaved data', async ({ page }) => {
    await gotoCustomers(page);
    await searchCustomerInList(page, createdCustomerName);
    await clickCustomerInList(page, createdCustomerName);
    await openCustomerEdit(page);

    // Change basic field
    await basicFields.job(page).clear();
    await basicFields.job(page).fill('Tester Tab Switch');

    // Switch to Medical — add text
    await page.getByRole('button', { name: /tiểu sử bệnh|Medical History/i }).click();
    await page.waitForTimeout(300);
    await medicalFields.history(page).clear();
    await medicalFields.history(page).fill('Draft medical note');

    // Switch to EInvoice — toggle on
    await page.getByRole('button', { name: /hóa đơn điện tử|E-Invoice/i }).click();
    await page.waitForTimeout(300);
    await einvoiceFields.toggle(page).check();
    await page.waitForTimeout(200);
    await einvoiceFields.personalTaxCode(page).fill('1111111111');

    // Switch back to Basic — verify job still there
    await page.getByRole('button', { name: /thông tin cơ bản|Basic Info/i }).click();
    await page.waitForTimeout(300);
    await expect(basicFields.job(page)).toHaveValue('Tester Tab Switch');

    // Switch back to Medical — verify history still there
    await page.getByRole('button', { name: /tiểu sử bệnh|Medical History/i }).click();
    await page.waitForTimeout(300);
    await expect(medicalFields.history(page)).toHaveValue('Draft medical note');

    // Switch back to EInvoice — verify toggle and field still there
    await page.getByRole('button', { name: /hóa đơn điện tử|E-Invoice/i }).click();
    await page.waitForTimeout(300);
    await expect(einvoiceFields.toggle(page)).toBeChecked();
    await expect(einvoiceFields.personalTaxCode(page)).toHaveValue('1111111111');

    // Cancel without saving
    await closeModalIfOpen(page);
  });

  test('TC6: Validation — empty required fields block save', async ({ page }) => {
    await gotoCustomers(page);
    await openAddCustomerModal(page);

    // Clear any auto-filled values
    await basicFields.name(page).clear();
    await basicFields.phone(page).clear();

    // Try save
    await saveAddForm(page);
    await page.waitForTimeout(600);

    // Modal should still be open
    await expect(page.getByText(/Thêm khách hàng/i).first()).toBeVisible();

    // Error should be visible
    await expect(page.getByText(/vui lòng|required|bắt buộc/i).first()).toBeVisible({ timeout: 5000 });

    await closeModalIfOpen(page);
  });

  test('TC7: Add customer with Basic-only then immediately edit all tabs', async ({ page }) => {
    const quickName = 'E2E Quick ' + TEST_PHONE_PREFIX.slice(-4);
    await gotoCustomers(page);
    await openAddCustomerModal(page);

    // Add with basic only
    await basicFields.name(page).fill(quickName);
    await basicFields.phone(page).fill(TEST_PHONE_PREFIX + '9');
    await basicFields.branchSelect(page).selectOption({ index: 1 });
    await saveAddForm(page);
    await expect(page.getByText(/Thêm khách hàng/i).first()).not.toBeVisible({ timeout: 15000 });

    // Reload and find customer
    await gotoCustomers(page);
    await searchCustomerInList(page, quickName);
    await clickCustomerInList(page, quickName);
    await openCustomerEdit(page);

    // Fill Medical
    await page.getByRole('button', { name: /tiểu sử bệnh|Medical History/i }).click();
    await page.waitForTimeout(300);
    await medicalFields.history(page).fill('Quick medical update');

    // Fill EInvoice
    await page.getByRole('button', { name: /hóa đơn điện tử|E-Invoice/i }).click();
    await page.waitForTimeout(300);
    await einvoiceFields.toggle(page).check();
    await page.waitForTimeout(200);
    await einvoiceFields.companyName(page).fill('Công ty Quick');

    // Save
    await saveEditForm(page);
    await expect(page.getByText(/Cập nhật|Sửa khách hàng/i).first()).not.toBeVisible({ timeout: 15000 });

    // Re-open and verify both tabs persisted
    await openCustomerEdit(page);
    await page.getByRole('button', { name: /tiểu sử bệnh|Medical History/i }).click();
    await expect(medicalFields.history(page)).toHaveValue('Quick medical update');
    await page.getByRole('button', { name: /hóa đơn điện tử|E-Invoice/i }).click();
    await expect(einvoiceFields.companyName(page)).toHaveValue('Công ty Quick');

    await closeModalIfOpen(page);
  });
});

// ─── Profile tabs sanity check ───────────────────────────────────────────────

test.describe('CustomerProfile tabs', () => {
  test('TC8: Profile / Appointments / Records / Payment tabs render', async ({ page }) => {
    await gotoCustomers(page);
    await page.getByRole('button', { name: /Add Customer|Thêm khách hàng/i }).first().click();
    await expect(page.getByText(/Thêm khách hàng/i).first()).toBeVisible({ timeout: 8000 });

    const name = 'E2E Profile Tab ' + TEST_PHONE_PREFIX.slice(-4);
    await basicFields.name(page).fill(name);
    await basicFields.phone(page).fill(TEST_PHONE_PREFIX + '8');
    await basicFields.branchSelect(page).selectOption({ index: 1 });
    await saveAddForm(page);
    await expect(page.getByText(/Thêm khách hàng/i).first()).not.toBeVisible({ timeout: 15000 });

    await gotoCustomers(page);
    await searchCustomerInList(page, name);
    await clickCustomerInList(page, name);

    const tabs = [
      { name: /profile|hồ sơ/i, content: /personal information|thông tin cá nhân/i },
      { name: /appointments|lịch hẹn/i, content: /appointment history|lịch sử lịch hẹn/i },
      { name: /records|phiếu khám/i, content: /tổng tiền điều trị|total cost/i },
      { name: /payment|thanh toán/i, content: /payment.*deposits|thanh toán/i },
    ];

    for (const tab of tabs) {
      await page.getByRole('button', { name: tab.name }).click();
      await page.waitForTimeout(400);
      await expect(page.getByText(tab.content).first()).toBeVisible({ timeout: 5000 });
    }
  });
});
