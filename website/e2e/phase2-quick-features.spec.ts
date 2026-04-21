/**
 * Phase 2 Quick Features E2E Tests
 *
 * TC-ProfileCode: Customer code visible in profile
 * TC-DuplicatePhone: API rejects duplicate phone with 409
 * TC-ServiceDentalAide: Third selector (dental aide) in ServiceForm
 * TC-DepositDate: Date picker in DepositWallet defaults to today
 * TC-PaymentDate: Date picker in PaymentForm defaults to today
 * TC-CalendarSearch: Three search boxes on Calendar page
 * TC-QuickAddCustomer: Floating + button opens AddCustomerForm on Customers page
 */

import { test, expect, type Page } from '@playwright/test';

const CUSTOMER_NAME = 'Phạm Ngọc Huy';

async function login(page: Page) {
  await page.goto('http://localhost:5175/');
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

function todayISO(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

test.describe('Phase 2 Quick Features', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('TC-ProfileCode: Customer code is visible in profile', async ({ page }) => {
    await openCustomerProfile(page, CUSTOMER_NAME);
    await expect(page.getByText('Customer Code', { exact: false })).toBeVisible({ timeout: 5000 });
  });

  test('TC-DuplicatePhone: API rejects duplicate phone with 409', async ({ request }) => {
    const res = await request.post('http://localhost:3002/api/Partners', {
      data: {
        name: 'Duplicate Test',
        phone: '0349762840',
        email: 'dup@example.com',
      },
    });
    expect(res.status()).toBe(409);
  });

  test('TC-ServiceDentalAide: ServiceForm has dental aide selector', async ({ page }) => {
    await openCustomerProfile(page, CUSTOMER_NAME);
    await page.getByRole('button', { name: /^Records/ }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Add Service' }).click();
    await expect(page.getByRole('heading', { name: 'Tạo dịch vụ' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /Chọn nha sĩ phụ/i })).toBeVisible({ timeout: 5000 });
  });

  test('TC-DepositDate: DepositWallet date picker defaults to today', async ({ page }) => {
    await openCustomerProfile(page, CUSTOMER_NAME);
    await page.getByRole('button', { name: 'Payment' }).click();
    await expect(page.getByText('Deposit Wallet')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: 'Add Deposit' }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Deposit' })).toBeVisible({ timeout: 5000 });
    const dateInput = page.locator('input[type="date"]').first();
    await expect(dateInput).toBeVisible({ timeout: 5000 });
    await expect(dateInput).toHaveValue(todayISO());
    // Close modal for cleanliness
    await page.keyboard.press('Escape');
  });

  test('TC-PaymentDate: PaymentForm date picker defaults to today', async ({ page }) => {
    await openCustomerProfile(page, CUSTOMER_NAME);
    await page.getByRole('button', { name: 'Payment' }).click();
    await expect(page.getByRole('heading', { name: 'Payment & Deposits' })).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: 'Make Payment' }).click();
    await expect(page.getByRole('heading', { name: 'Ghi nhận thanh toán' })).toBeVisible({ timeout: 8000 });
    const dateInput = page.locator('input[type="date"]').first();
    await expect(dateInput).toBeVisible({ timeout: 5000 });
    await expect(dateInput).toHaveValue(todayISO());
    await page.keyboard.press('Escape');
  });

  test('TC-CalendarSearch: Calendar has three search inputs', async ({ page }) => {
    await page.getByRole('link', { name: /^Calendar/i }).click();
    await expect(page.locator('main').getByRole('heading', { name: /Lịch hẹn/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('Bệnh nhân...')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('Bác sĩ...')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('Dịch vụ...')).toBeVisible({ timeout: 5000 });
  });

  test('TC-QuickAddCustomer: Add Customer button opens AddCustomerForm on Customers page', async ({ page }) => {
    await page.getByRole('link', { name: 'Customers' }).click();
    await expect(page.locator('main').getByRole('heading', { name: 'Customers' })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);
    // Dismiss any popup first
    await page.keyboard.press('Escape');
    // Click the top-right + Add Customer button
    await page.getByRole('button', { name: /Add Customer/i }).first().click();
    await expect(page.getByRole('heading', { name: /Thêm khách hàng/ })).toBeVisible({ timeout: 8000 });
  });
});
