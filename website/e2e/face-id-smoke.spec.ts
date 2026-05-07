import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

const BASE = 'http://localhost:5175';

test.describe('Face ID Smoke', () => {
  test('Face ID button is visible on customer list', async ({ page }) => {
    await page.goto(BASE + '/customers');
    await expect(page.getByRole('main').getByRole('heading', { name: /Customers|Khách hàng/i })).toBeVisible({ timeout: 15000 });

    const faceIdBtn = page.getByRole('button', { name: /Nhận diện khuôn mặt|Face ID/i });
    await expect(faceIdBtn).toBeVisible();
  });

  test('Face ID modal opens when button is clicked', async ({ page }) => {
    await page.goto(BASE + '/customers');
    await expect(page.getByRole('main').getByRole('heading', { name: /Customers|Khách hàng/i })).toBeVisible({ timeout: 15000 });

    const faceIdBtn = page.getByRole('button', { name: /Nhận diện khuôn mặt|Face ID/i });
    await faceIdBtn.click();

    // Modal should open with capture button
    await expect(page.getByRole('button', { name: /Chụp|Capture/i })).toBeVisible({ timeout: 8000 });
  });

  test('Face ID modal can be cancelled', async ({ page }) => {
    await page.goto(BASE + '/customers');
    await expect(page.getByRole('main').getByRole('heading', { name: /Customers|Khách hàng/i })).toBeVisible({ timeout: 15000 });

    const faceIdBtn = page.getByRole('button', { name: /Nhận diện khuôn mặt|Face ID/i });
    await faceIdBtn.click();

    const cancelBtn = page.getByRole('button', { name: /Hủy|Cancel/i });
    await expect(cancelBtn).toBeVisible({ timeout: 8000 });
    await cancelBtn.click();

    // Should return to the main customer list view
    await expect(faceIdBtn).toBeVisible({ timeout: 5000 });
  });
});
