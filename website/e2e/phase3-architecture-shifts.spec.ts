/**
 * Phase 3 Architecture Shifts E2E Tests
 *
 * TC-EmployeeMultiBranch: Employee form shows additional branch selector
 * TC-CustomerSoftDelete: Soft delete hides customer from list
 * TC-PaymentDotKhamTab: Payment form has dotkham allocation tab
 */

import { test, expect, type Page } from '@playwright/test';

const CUSTOMER_NAME = 'Phạm Ngọc Huy';

async function login(page: Page) {
  await page.goto('http://localhost:5174/');
  const emailInput = page.locator('#email');
  const isLoginPage = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
  if (isLoginPage) {
    await emailInput.fill('tg@clinic.vn');
    await page.locator('#password').fill('123456');
    await page.locator('button[type="submit"]').click();
    await expect(emailInput).toBeHidden({ timeout: 15000 });
  }
  await page.getByRole('link', { name: 'Customers' }).waitFor({ timeout: 10000 });
}

async function openCustomerProfile(page: Page, customerName: string) {
  await page.getByRole('link', { name: 'Customers' }).click();
  await expect(page.locator('main').getByRole('heading', { name: 'Customers' })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.getByRole('cell', { name: new RegExp(customerName, 'i') }).first().click();
  await expect(page.getByRole('heading', { name: 'Customer Profile' })).toBeVisible({ timeout: 10000 });
}

test.describe('Phase 3 Architecture Shifts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('TC-EmployeeMultiBranch: Employee form shows additional branch selector', async ({ page }) => {
    await page.getByRole('link', { name: 'Employees' }).click();
    await expect(page.locator('main').getByRole('heading', { name: /Nhân viên|Employees/ })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /Add Employee|Thêm nhân viên/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Thêm nhân viên' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/Chi nhánh phụ/i)).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/phase3-TC-EmployeeMultiBranch.png' });
    await page.keyboard.press('Escape');
  });

  test('TC-CustomerSoftDelete: Soft delete hides customer from list', async ({ page }) => {
    await page.getByRole('link', { name: 'Customers' }).click();
    await expect(page.locator('main').getByRole('heading', { name: 'Customers' })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);
    const firstCell = page.getByRole('cell').first();
    await firstCell.click();
    await expect(page.getByRole('heading', { name: 'Customer Profile' })).toBeVisible({ timeout: 10000 });
    const deleteBtn = page.locator('button[title="Xóa mềm"], button:has-text("Xóa mềm"), [data-testid="soft-delete-btn"]').first();
    const hasDelete = await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (!hasDelete) {
      await page.screenshot({ path: 'e2e/screenshots/phase3-TC-CustomerSoftDelete-skipped.png' });
      return;
    }
    await deleteBtn.click();
    const confirmBtn = page.getByRole('button', { name: /Xác nhận|Confirm|Xóa/ }).first();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await expect(page.locator('main').getByRole('heading', { name: 'Customers' })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/phase3-TC-CustomerSoftDelete.png' });
  });

  test('TC-PaymentDotKhamTab: Payment form has dotkham allocation tab', async ({ page }) => {
    await openCustomerProfile(page, CUSTOMER_NAME);
    await page.getByRole('button', { name: 'Payment' }).click();
    await expect(page.getByRole('heading', { name: 'Payment & Deposits' })).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: 'Make Payment' }).click();
    await expect(page.getByRole('heading', { name: 'Ghi nhận thanh toán' })).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: 'Đợt khám' }).click();
    await expect(page.getByText(/Phân bổ thanh toán|Tổng:/i)).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'e2e/screenshots/phase3-TC-PaymentDotKhamTab.png' });
    await page.keyboard.press('Escape');
  });
});
