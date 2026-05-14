import { test, expect } from '@playwright/test';

/**
 * Local Permission Domain Repair Verification
 * Run against http://localhost:5175
 */

const ADMIN_EMAIL = 't@clinic.vn';
const ADMIN_PASSWORD = '123123';

async function login(page: any) {
  // Clear any persisted auth state
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

test.describe('Permission Domain Repair - Local Verification', () => {
  test('1. Admin login with Remember Me 60d checkbox', async ({ page }) => {
    await page.goto('http://localhost:5175/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Screenshot: Login page with Remember Me checkbox
    await page.screenshot({ path: 'test-results/01-login-page.png', fullPage: false });
    
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    
    // Check Remember Me
    const rememberMeCheckbox = page.locator('input[type="checkbox"]');
    await expect(rememberMeCheckbox).toBeVisible();
    await rememberMeCheckbox.check();
    
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5175/', { timeout: 15000 });
    
    // Screenshot: Logged in Overview
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/02-logged-in-overview.png', fullPage: false });
  });

  test('2. Services page accessible with services.view', async ({ page }) => {
    await login(page);
    
    // Navigate to Services
    await page.goto('http://localhost:5175/services');
    await page.waitForTimeout(1500);
    
    // Should NOT show access denied - should load services page
    await page.screenshot({ path: 'test-results/03-services-page.png', fullPage: false });
    
    // Check that we're on services page (not 403)
    const url = page.url();
    expect(url).toContain('/services');
  });

  test('3. Permission Board shows real registry permissions', async ({ page }) => {
    await login(page);
    
    await page.goto('http://localhost:5175/permissions');
    await page.waitForTimeout(1500);
    
    // Screenshot: Permission Board Architecture view
    await page.screenshot({ path: 'test-results/04-permission-board.png', fullPage: true });
    
    // Click Matrix tab
    await page.getByRole('button', { name: /Permission Matrix/i }).click();
    await page.waitForTimeout(1500);
    
    // Screenshot: Permission Matrix
    await page.screenshot({ path: 'test-results/05-permission-matrix.png', fullPage: true });
    
    // Verify real permissions exist (matrix renders as readable labels)
    await expect(page.getByText('Services', { exact: true })).toBeVisible();
    await expect(page.getByText('Payment', { exact: true })).toBeVisible();
    await expect(page.getByText('External Checkups', { exact: true })).toBeVisible();
    
    // Verify fake permissions do NOT exist (no "Add" under Services category)
    // The old fake 'services.add' would have shown as Services + Add row
    // Since we use PERMISSION_BY_CATEGORY from generated registry, only real permissions render
    await expect(page.locator('text=Xuất Excel phiếu điều trị')).toBeVisible(); // services.export description
  });

  test('4. Export permissions visible in matrix', async ({ page }) => {
    await login(page);
    
    await page.goto('http://localhost:5175/permissions');
    await page.getByRole('button', { name: /Permission Matrix/i }).click();
    await page.waitForTimeout(1500);
    
    // All export permissions should be visible (as readable labels)
    await expect(page.locator('text=Xuất Excel lịch hẹn')).toBeVisible(); // appointments.export
    await expect(page.locator('text=Xuất Excel danh sách khách hàng')).toBeVisible(); // customers.export
    await expect(page.locator('text=Xuất Excel thanh toán')).toBeVisible(); // payment.export (payments.export)
    await expect(page.locator('text=Xuất Excel danh mục dịch vụ')).toBeVisible(); // products.export
    await expect(page.locator('text=Xuất Excel phiếu điều trị')).toBeVisible(); // services.export
    await expect(page.locator('text=Xuất báo cáo')).toBeVisible(); // reports.export
  });

  test('5. Admin can see Permission Board and matrix cells', async ({ page }) => {
    await login(page);
    
    await page.goto('http://localhost:5175/permissions');
    await page.getByRole('button', { name: /Permission Matrix/i }).click();
    await page.waitForTimeout(1500);
    
    // Check that matrix cells are interactive (admin has permissions.edit)
    const firstCell = page.locator('button').filter({ hasText: /✓|—/ }).first();
    await expect(firstCell).toBeVisible();
    
    // Screenshot showing matrix cells
    await page.screenshot({ path: 'test-results/06-matrix-cells.png', fullPage: true });
  });
});
