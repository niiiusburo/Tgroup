import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Permission self-lockout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/permissions');
    await page.getByRole('button', { name: 'Permission Matrix' }).click();
  });

  test('admin sees confirmation when trying to revoke own permissions.edit', async ({ page }) => {
    // This test requires the frontend confirmation modal to be implemented.
    // For now, the backend returns SELF_LOCKOUT_RISK (409) which the UI surfaces as an error.
    test.skip(true, 'Frontend confirmation modal not yet implemented; backend guard is tested in unit tests');
  });
});
