import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Permission Board Matrix', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/permissions');
    await page.getByRole('button', { name: 'Permission Matrix' }).click();
  });

  test('matrix rows come from real registry, not labels', async ({ page }) => {
    // services.add was a fake label-derived permission — should not appear
    await expect(page.locator('text=services.add')).not.toBeVisible();
    // calendar.edit was fake — should not appear
    await expect(page.locator('text=calendar.edit')).not.toBeVisible();
    // services.view is real — should appear
    await expect(page.locator('text=services.view')).toBeVisible();
    // reports.export is real — should appear
    await expect(page.locator('text=reports.export')).toBeVisible();
  });

  test('export permissions are visible in matrix', async ({ page }) => {
    await expect(page.locator('text=appointments.export')).toBeVisible();
    await expect(page.locator('text=customers.export')).toBeVisible();
    await expect(page.locator('text=payments.export')).toBeVisible();
    await expect(page.locator('text=products.export')).toBeVisible();
    await expect(page.locator('text=services.export')).toBeVisible();
  });
});
