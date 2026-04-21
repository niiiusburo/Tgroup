import { test, expect } from '@playwright/test';

test('External Checkups has checks for super admin', async ({ page }) => {
  await page.goto('http://76.13.16.68:5175/login');
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#email')).toBeHidden({ timeout: 20000 });
  await page.goto('http://76.13.16.68:5175/permissions');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("Permission Matrix")').click();
  await page.waitForTimeout(1000);

  // Find the External Checkups View row and get the super admin cell (2nd td in the row)
  const viewRow = page.locator('table tbody tr', { hasText: 'External Checkups' }).first();
  await expect(viewRow).toBeVisible();

  // The row with "View" is the same tr. The cells are: Module/Action, super admin, admin, editor, receptionist, assistant
  const superAdminCell = viewRow.locator('td').nth(1);
  const btn = superAdminCell.locator('button');
  await expect(btn).toHaveText('✓');

  // Find the Create sub-row (next tr)
  const createRow = viewRow.locator('+ tr');
  const createSuperAdminCell = createRow.locator('td').nth(1);
  const createBtn = createSuperAdminCell.locator('button');
  await expect(createBtn).toHaveText('✓');

  // Also verify Permissions Edit is checked for super admin
  const permRow = page.locator('table tbody tr', { hasText: /^Permissions/ }).first();
  const permEditRow = permRow.locator('+ tr'); // next tr has "Edit"
  await permEditRow.scrollIntoViewIfNeeded();
  await expect(permEditRow.locator('td').nth(1).locator('button')).toHaveText('✓');
});
