import { test, expect } from '@playwright/test';

test.describe('Login and Settings Flow', () => {
  test('should login and show IP Access settings', async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:5175/login');
    
    // Verify login page
    await expect(page.locator('h1')).toContainText('TG Clinic');
    
    // Fill credentials
    await page.fill('input#email', 'tg@clinic.vn');
    await page.fill('input#password', 'admin123');
    
    // Click login
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await expect(page.locator('h1', { hasText: 'Overview' })).toBeVisible({ timeout: 15000 });
    
    // Click on Settings in sidebar
    await page.getByRole('link', { name: 'Settings' }).click();
    
    // Wait for Settings page (use main h1, not header)
    await expect(page.locator('main h1', { hasText: 'Settings' })).toBeVisible({ timeout: 10000 });
    
    // Verify both tabs are present
    await expect(page.getByRole('button', { name: 'System Setting' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'IP' })).toBeVisible();
    
    // Click IP tab
    await page.getByRole('button', { name: 'IP' }).click();
    
    // Verify IP page loaded
    await expect(page.getByText('Access Control Mode')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Add New IP Entry')).toBeVisible();
    
    // Take final screenshot
    await page.screenshot({ path: 'e2e/screenshots/ip-access-settings.png', fullPage: true });
    
    console.log('✅ Test completed successfully!');
  });

  test('should add IP entry and validate input', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5175/login');
    await page.fill('input#email', 'tg@clinic.vn');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page.locator('h1', { hasText: 'Overview' })).toBeVisible({ timeout: 15000 });
    
    // Go to Settings > IP
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.locator('main h1', { hasText: 'Settings' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'IP' }).click();
    await expect(page.getByText('Access Control Mode')).toBeVisible({ timeout: 10000 });
    
    // Try invalid IP
    await page.fill('input#ip-address', 'invalid');
    await page.getByRole('button', { name: 'Add IP' }).click();
    await expect(page.getByText('Please enter a valid IPv4 address')).toBeVisible();
    
    // Add valid IP
    await page.fill('input#ip-address', '192.168.1.100');
    await page.selectOption('select#ip-type', 'whitelist');
    await page.fill('input#ip-description', 'Test office');
    await page.getByRole('button', { name: 'Add IP' }).click();
    
    // Verify IP appears
    await expect(page.getByText('192.168.1.100')).toBeVisible();
    await expect(page.getByText('Test office')).toBeVisible();
    
    console.log('✅ IP entry tests passed!');
  });
});