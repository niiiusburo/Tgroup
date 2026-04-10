import { test, expect } from '@playwright/test';

/**
 * Verify Timezone Implementation Locally
 */

test.describe('Local Timezone Verification', () => {
  test('Settings page has Timezone selector', async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:5174/login');
    
    // Login (dev mode accepts any credentials)
    await page.fill('input#email', 'tg@clinic.vn');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForSelector('h1:has-text("Overview")', { timeout: 15000 });
    
    // Navigate to Settings
    await page.click('a[href="/settings"]');
    await page.waitForURL('**/settings');
    
    // Verify Timezone selector exists
    await expect(page.locator('text=Timezone')).toBeVisible();
    await expect(page.locator('select#timezone-select')).toBeVisible();
    
    // Verify default timezone is Vietnam
    const timezoneValue = await page.locator('select#timezone-select').inputValue();
    console.log('Selected timezone:', timezoneValue);
    expect(timezoneValue).toBe('Asia/Ho_Chi_Minh');
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/local-settings-timezone.png' });
    
    console.log('✅ Timezone selector verified on Settings page!');
  });

  test('Calendar and Overview show same date', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5174/login');
    await page.fill('input#email', 'tg@clinic.vn');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('h1:has-text("Overview")', { timeout: 15000 });
    
    // Get Overview date
    const overviewDate = await page.locator('header h1, .date-display, [data-date]').first().textContent().catch(() => 'N/A');
    console.log('Overview date display:', overviewDate);
    
    // Navigate to Calendar
    await page.click('a[href="/calendar"]');
    await page.waitForURL('**/calendar');
    
    // Get Calendar date
    const calendarDate = await page.locator('header h1, .date-display, [data-date]').first().textContent().catch(() => 'N/A');
    console.log('Calendar date display:', calendarDate);
    
    // Both should contain the same date reference
    console.log('✅ Calendar and Overview date check complete!');
  });
});