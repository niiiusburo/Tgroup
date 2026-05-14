import { test, expect } from '@playwright/test';
import { loginAsUserWithPermissions } from './helpers/auth';

test.describe('Payment permission gates', () => {
  test('proof upload requires payment.add', async ({ page }) => {
    await loginAsUserWithPermissions(page, ['payment.add', 'payment.view']);
    await page.goto('/payment');
    // Proof upload action should be available
    await expect(page.locator('text=Thêm bằng chứng').or(page.locator('text=Upload proof'))).toBeVisible();
  });

  test('record patch requires payment.edit', async ({ page }) => {
    await loginAsUserWithPermissions(page, ['payment.edit', 'payment.view']);
    await page.goto('/payment');
    // Edit action should be available
    await expect(page.locator('text=Chỉnh sửa').or(page.locator('text=Edit'))).toBeVisible();
  });

  test('void/delete requires payment.void', async ({ page }) => {
    await loginAsUserWithPermissions(page, ['payment.void', 'payment.view']);
    await page.goto('/payment');
    // Void action should be available
    await expect(page.locator('text=Hủy').or(page.locator('text=Void'))).toBeVisible();
  });
});
