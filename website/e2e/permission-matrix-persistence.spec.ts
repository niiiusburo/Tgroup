import { test, expect } from '@playwright/test';

/**
 * E2E: Permission Matrix Persistence
 * Verifies that toggling permissions in the UI actually persists to the backend.
 */

test('admin can toggle permission and change persists after refresh', async ({ page }) => {
  // Login as admin
  await page.goto('http://localhost:5175');
  await page.fill('#email', 't@clinic.vn');
  await page.fill('#password', '123123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Overview', { timeout: 15000 });

  // Navigate to Settings > Permissions
  await page.click('text=Settings');
  await page.waitForURL('**/settings');
  await page.click('text=Permissions');
  await page.waitForURL('**/permissions');

  // Click on Dentist group
  await page.click('text=Dentist');
  await page.waitForSelector('text=Members — Dentist');

  // Find the Appointments module and toggle "Add" permission
  const appointmentsSection = page.locator('div', { hasText: 'Appointments' }).first();
  await expect(appointmentsSection).toBeVisible();

  // Get initial state of appointments.add
  const addButton = appointmentsSection.locator('button', { hasText: 'Add' });
  const initialHasPermission = await addButton.evaluate((el) =>
    el.classList.contains('bg-primary/10')
  );

  // Toggle the permission
  await addButton.click();

  // Wait for API call to complete (spinner should appear and disappear)
  await page.waitForTimeout(1000);

  // Refresh the page
  await page.reload();
  await page.waitForSelector('text=Overview', { timeout: 15000 });
  await page.click('text=Settings');
  await page.click('text=Permissions');
  await page.click('text=Dentist');
  await page.waitForSelector('text=Members — Dentist');

  // Verify the permission toggle persisted
  const refreshedAddButton = page.locator('div', { hasText: 'Appointments' }).first().locator('button', { hasText: 'Add' });
  const afterHasPermission = await refreshedAddButton.evaluate((el) =>
    el.classList.contains('bg-primary/10')
  );

  // Should be opposite of initial state
  expect(afterHasPermission).toBe(!initialHasPermission);

  // Toggle back to restore original state
  await refreshedAddButton.click();
  await page.waitForTimeout(1000);
});

test('multi-role permission verification', async ({ page }) => {
  const accounts = [
    { email: 'testadmin@tgroup.local', password: 'test123', expectedPermCount: 45 },
    { email: 'testmanager@tgroup.local', password: 'test123', expectedPermCount: 29 },
    { email: 'testdentist@tgroup.local', password: 'test123', expectedPermCount: 10 },
    { email: 'testreception@tgroup.local', password: 'test123', expectedPermCount: 14 },
  ];

  for (const account of accounts) {
    await page.goto('http://localhost:5175');
    await page.fill('#email', account.email);
    await page.fill('#password', account.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Overview', { timeout: 15000 });

    // Check sidebar visibility based on permissions
    const hasReports = await page.locator('text=Reports').isVisible().catch(() => false);
    const hasSettings = await page.locator('text=Settings').isVisible().catch(() => false);
    const hasPayment = await page.locator('text=Payment').isVisible().catch(() => false);

    if (account.email.includes('admin')) {
      expect(hasReports).toBe(true);
      expect(hasSettings).toBe(true);
      expect(hasPayment).toBe(true);
    } else if (account.email.includes('dentist')) {
      expect(hasReports).toBe(false);
      expect(hasPayment).toBe(false);
    }

    // Logout
    await page.evaluate(() => localStorage.clear());
  }
});
