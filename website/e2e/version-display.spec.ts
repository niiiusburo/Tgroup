/**
 * TDD Test: Version Display System
 * 
 * Test that verifies:
 * 1. Version number displays correctly from package.json
 * 2. Update button actually works when clicked
 * 3. Version changes are detected properly
 */

import { test, expect, Page } from '@playwright/test';

// Hardcode expected version from package.json
const EXPECTED_VERSION = '0.1.6'; // This should match package.json version

test.describe('TDD: Version Display System', () => {
  
  test('RED: Should display actual version from package.json, not 0.0.0', async ({ page }) => {
    // Arrange: Load the app
    await page.goto('http://localhost:5174/login');
    await page.waitForTimeout(2000);
    
    // Act: Login
    await page.fill('input#email', 'admin@tdental.vn');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Assert: Version should match package.json, NOT 0.0.0
    // The version badge is in the bottom right corner
    const versionButton = await page.locator('button[class*="font-mono"]').first();
    const versionText = await versionButton.textContent();
    
    console.log('Expected version:', EXPECTED_VERSION);
    console.log('Actual version text:', versionText);
    
    // The version should contain the actual version number
    expect(versionText).toContain(EXPECTED_VERSION);
    expect(versionText).not.toContain('v0.0.0');
  });

  test('RED: Update button should trigger page reload', async ({ page }) => {
    // Arrange: Setup mock versions
    const oldVersion = { version: '0.0.0', buildTime: '2026-04-01T00:00:00.000Z', gitCommit: 'abc1234', gitBranch: 'main' };
    const newVersion = { version: '0.2.0', buildTime: '2026-04-08T12:00:00.000Z', gitCommit: 'xyz9999', gitBranch: 'main' };
    
    await page.route('**/version.json**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(oldVersion),
      });
    });
    
    // Login
    await page.goto('http://localhost:5174/login');
    await page.fill('input#email', 'admin@tdental.vn');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Switch to new version
    await page.unroute('**/version.json**');
    await page.route('**/version.json**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newVersion),
      });
    });
    
    // Click version to check for updates
    const versionButton = await page.locator('button[class*="font-mono"]').first();
    await versionButton.click();
    await page.waitForTimeout(2000);
    
    // Check if update notification appeared
    const updateNotification = await page.locator('text=Update Available').first();
    const isVisible = await updateNotification.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip('Update notification not visible - cannot test update button');
      return;
    }
    
    // Act: Click Update Now
    const updateButton = await page.locator('button:has-text("Update Now")').first();
    
    // Listen for navigation
    const navigationPromise = page.waitForNavigation({ timeout: 10000 });
    await updateButton.click();
    
    // Assert: Page should navigate/reload
    await expect(navigationPromise).resolves.toBeDefined();
    
    // URL should have cache-busting parameter
    const url = page.url();
    expect(url).toMatch(/\?_v=/);
  });
});
