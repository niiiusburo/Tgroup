import { test, expect } from '@playwright/test';
import { loginAsUserWithPermissions } from './helpers/auth';

test.describe('/services route guard', () => {
  test('accessible with services.view permission', async ({ page }) => {
    await loginAsUserWithPermissions(page, ['services.view']);
    await page.goto('/services');
    await expect(page.locator('text=Services')).toBeVisible();
  });

  test('blocked for user with only customers.edit (no services.view)', async ({ page }) => {
    await loginAsUserWithPermissions(page, ['customers.edit']);
    await page.goto('/services');
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });
});
