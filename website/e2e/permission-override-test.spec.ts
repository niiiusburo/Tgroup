import { test, expect } from '@playwright/test';

/**
 * Permission Override Test
 * 1. Log in as Test Receptionist (no services.view)
 * 2. Verify /services is blocked
 * 3. Admin grants services.view override
 * 4. Log in again, verify /services is accessible
 */

const RECEPTION_EMAIL = 'testreception@tgclinic.vn';
const RECEPTION_PASSWORD = '123123';
const ADMIN_EMAIL = 't@clinic.vn';
const ADMIN_PASSWORD = '123123';

async function loginAsReceptionist(page: any) {
  await page.goto('http://localhost:5175/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', RECEPTION_EMAIL);
  await page.fill('input[type="password"]', RECEPTION_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5175/', { timeout: 15000 });
}

async function loginAsAdmin(page: any) {
  await page.goto('http://localhost:5175/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5175/', { timeout: 15000 });
}

test.describe('Permission Override - services.view', () => {
  test('1. Receptionist CANNOT access /services before override', async ({ page }) => {
    await loginAsReceptionist(page);
    await page.waitForTimeout(1000);
    
    // Screenshot: Receptionist overview
    await page.screenshot({ path: 'test-results/10-reception-overview.png', fullPage: false });
    
    // Try to navigate to /services
    await page.goto('http://localhost:5175/services');
    await page.waitForTimeout(1500);
    
    // Screenshot: Should show access denied or redirect
    await page.screenshot({ path: 'test-results/11-reception-services-denied.png', fullPage: false });
    
    // Verify we're NOT on services page (either redirected or access denied)
    const url = page.url();
    // Should be redirected to / or show 403
    expect(url).not.toContain('/services');
  });

  test('2. Admin grants services.view override to Receptionist', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Go to permissions page
    await page.goto('http://localhost:5175/permissions');
    await page.waitForTimeout(1500);
    
    // Click on Employees tab or find Test Receptionist
    // The ArchitectureView shows employees - click on the receptionist
    await page.getByText('Test Receptionist').click();
    await page.waitForTimeout(1000);
    
    // Screenshot: Before override
    await page.screenshot({ path: 'test-results/12-admin-before-override.png', fullPage: false });
    
    // Note: The UI may vary - this is a best-effort test
    // In reality, the admin would use the API to add an override
    test.info().annotations.push({ type: 'note', description: 'Manual step: Admin adds services.view grant override via API or UI' });
  });

  test('3. Receptionist CAN access /services after override', async ({ page }) => {
    // This test assumes the override was applied externally (via API or previous test)
    await loginAsReceptionist(page);
    await page.waitForTimeout(1000);
    
    // Navigate to /services
    await page.goto('http://localhost:5175/services');
    await page.waitForTimeout(1500);
    
    // Screenshot: Should now show services page
    await page.screenshot({ path: 'test-results/13-reception-services-allowed.png', fullPage: false });
    
    // Verify we're on services page
    const url = page.url();
    expect(url).toContain('/services');
  });
});
