import { test, expect } from '@playwright/test';
import { loginAsUserWithPermissions } from './helpers/auth';

test.describe('Hosoonline permission gates', () => {
  test('patient create requires external_checkups.create', async ({ page }) => {
    await loginAsUserWithPermissions(page, ['external_checkups.create']);
    await page.goto('/customers/T000001');
    // Patient creation button should be visible
    await expect(page.locator('[data-testid="create-patient-btn"]').or(page.locator('text=Tạo hồ sơ')))).toBeVisible();
  });

  test('upload requires external_checkups.upload', async ({ page }) => {
    await loginAsUserWithPermissions(page, ['external_checkups.upload']);
    await page.goto('/customers/T000001');
    // Upload button should be visible
    await expect(page.locator('[data-testid="upload-checkup-btn"]').or(page.locator('text=Tải ảnh khám')))).toBeVisible();
  });

  test('user without upload cannot see upload button', async ({ page }) => {
    await loginAsUserWithPermissions(page, ['external_checkups.view']);
    await page.goto('/customers/T000001');
    await expect(page.locator('[data-testid="upload-checkup-btn"]').or(page.locator('text=Tải ảnh khám')))).not.toBeVisible();
  });
});
