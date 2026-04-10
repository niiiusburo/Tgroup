import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

test('TC-VQ1: Generate VietQR from customer payments tab', async ({ page }) => {
  // Navigate to login
  await page.goto('http://localhost:5174/login');

  // Wait for login form and fill credentials
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  await page.fill('input[type="email"]', 'tg@clinic.vn');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');

  // Wait for dashboard to load
  await expect(page.locator('h1', { hasText: 'Overview' })).toBeVisible({ timeout: 15000 });

  // Navigate to Customers page
  await page.goto('http://localhost:5174/customers');
  await expect(page.locator('h1', { hasText: 'Customers' }).first()).toBeVisible({ timeout: 15000 });

  // Click first customer row to open profile
  const firstCustomerRow = page.locator('table tbody tr').first();
  await expect(firstCustomerRow).toBeVisible({ timeout: 10000 });
  await firstCustomerRow.click();

  // Click "Payment" tab
  await expect(page.getByRole('button', { name: 'Payment 0' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Payment 0' }).click();

  // Click "Make Payment" to open payment form
  await expect(page.getByRole('button', { name: /Make Payment/i })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /Make Payment/i }).click();

  // Wait for payment form modal heading and click "Tạo QR" button inside Bank section
  await expect(page.getByRole('heading', { name: /Ghi nhận thanh toán/i })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Tạo QR' }).first().click();

  // Wait for VietQR modal and fill amount
  const qrModal = page.locator('.fixed').filter({ hasText: /Thanh toán VietQR/i }).first();
  await expect(qrModal).toBeVisible({ timeout: 10000 });
  const amountInput = qrModal.locator('input[type="number"]').first();
  await expect(amountInput).toBeVisible({ timeout: 5000 });
  await amountInput.fill('500000');

  // Click Tạo QR inside VietQR modal
  await qrModal.getByRole('button', { name: 'Tạo QR' }).click();

  // Assert QR image visible
  const qrImage = qrModal.locator('img[src*="img.vietqr.io"]');
  await expect(qrImage).toBeVisible({ timeout: 10000 });
});
