import { test, expect } from '@playwright/test';

/**
 * Visual test: Admin grants and revokes permissions, verifies in UI
 */

const ADMIN_EMAIL = 't@clinic.vn';
const ADMIN_PASSWORD = '123123';

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

test.describe('Permission Override Visual Verification', () => {
  test('Admin views Permission Board with all permission groups', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.goto('http://localhost:5175/permissions');
    await page.waitForTimeout(1500);
    
    // Screenshot: Full permission board
    await page.screenshot({ path: 'test-results/20-permission-board-full.png', fullPage: true });
    
    // Verify all groups visible
    await expect(page.getByText('Admin', { exact: true })).toBeVisible();
    await expect(page.getByText('Clinic Manager', { exact: true })).toBeVisible();
    await expect(page.getByText('Dentist', { exact: true })).toBeVisible();
    await expect(page.getByText('Receptionist', { exact: true })).toBeVisible();
    await expect(page.getByText('Dental Assistant', { exact: true })).toBeVisible();
  });

  test('Admin clicks Matrix tab and sees real permissions', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.goto('http://localhost:5175/permissions');
    await page.getByRole('button', { name: /Permission Matrix/i }).click();
    await page.waitForTimeout(1500);
    
    // Screenshot: Matrix with real permissions
    await page.screenshot({ path: 'test-results/21-permission-matrix-real.png', fullPage: true });
    
    // Verify real permissions are visible as readable labels
    await expect(page.getByText('Xem danh mục dịch vụ', { exact: true })).toBeVisible(); // services.view
    await expect(page.getByText('Tạo thanh toán mới', { exact: true })).toBeVisible(); // payment.add
    await expect(page.getByText('Tải lên ảnh khám ngoài', { exact: true })).toBeVisible(); // external_checkups.upload
  });

  test('Admin views effective permissions for a user', async ({ page }) => {
    await loginAsAdmin(page);
    
    await page.goto('http://localhost:5175/permissions');
    await page.waitForTimeout(1500);
    
    // Click on Test Receptionist
    await page.getByText('Test Receptionist').click();
    await page.waitForTimeout(1000);
    
    // Screenshot: Effective permissions view
    await page.screenshot({ path: 'test-results/22-effective-permissions.png', fullPage: false });
  });
});
