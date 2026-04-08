/**
 * Version Update E2E Tests
 * 
 * Tests that verify the version update system works correctly:
 * 1. Version detection works
 * 2. Update notification appears when new version available
 * 3. "Update Now" button clears caches and reloads
 * 4. User stays logged in after update
 */

import { test, expect, Page } from '@playwright/test';

// Mock version data
const OLD_VERSION = {
  version: '0.0.0',
  buildTime: '2026-04-01T00:00:00.000Z',
  gitCommit: 'abc1234',
  gitBranch: 'main',
  environment: 'development',
};

const NEW_VERSION = {
  version: '0.1.0',
  buildTime: '2026-04-08T12:00:00.000Z',
  gitCommit: 'def5678',
  gitBranch: 'main',
  environment: 'development',
};

/**
 * Setup route interception to mock version.json
 */
async function setupVersionMock(page: Page, versionData: typeof OLD_VERSION) {
  await page.route('**/version.json**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      body: JSON.stringify(versionData),
    });
  });
}

/**
 * Login helper
 */
async function login(page: Page) {
  await page.goto('http://localhost:5174/login');
  await page.fill('input#email', 'admin@tdental.vn');
  await page.fill('input#password', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page.locator('h1', { hasText: 'Overview' })).toBeVisible({ timeout: 15000 });
}

test.describe('Version Update System', () => {
  
  test('should display current version in footer', async ({ page }) => {
    await setupVersionMock(page, OLD_VERSION);
    await login(page);
    
    // Wait for version to load
    await page.waitForTimeout(1000);
    
    // Check version display shows
    const versionBadge = page.locator('text=v0.0.0');
    await expect(versionBadge).toBeVisible();
    
    // Check commit hash shows
    const commitHash = page.locator('text=(abc1234)');
    await expect(commitHash).toBeVisible();
  });

  test('should detect new version and show update notification', async ({ page }) => {
    // Start with old version
    await setupVersionMock(page, OLD_VERSION);
    await login(page);
    
    // Wait for initial version check
    await page.waitForTimeout(1000);
    
    // Verify old version showing
    await expect(page.locator('text=v0.0.0')).toBeVisible();
    
    // No update notification initially
    await expect(page.locator('text=Update Available')).not.toBeVisible();
    
    // Now change to new version
    await setupVersionMock(page, NEW_VERSION);
    
    // Click version to trigger check
    await page.click('text=v0.0.0');
    
    // Wait for update detection
    await page.waitForTimeout(2000);
    
    // Update notification should appear
    await expect(page.locator('text=Update Available')).toBeVisible();
    await expect(page.locator('text=New version 0.1.0 is ready')).toBeVisible();
  });

  test('should stay logged in after clicking Update Now', async ({ page, context }) => {
    // Start with old version
    await setupVersionMock(page, OLD_VERSION);
    await login(page);
    
    // Wait and verify logged in
    await expect(page.locator('text=Overview')).toBeVisible();
    
    // Store the auth token before update
    const tokenBefore = await page.evaluate(() => localStorage.getItem('tdental_token'));
    expect(tokenBefore).toBeTruthy();
    
    // Trigger update
    await setupVersionMock(page, NEW_VERSION);
    await page.click('text=v0.0.0');
    await page.waitForTimeout(2000);
    
    // Click Update Now
    await page.click('button:has-text("Update Now")');
    
    // Wait for reload with cache-busting parameter
    await page.waitForURL(/\?_v=/, { timeout: 10000 });
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify still logged in (token preserved)
    const tokenAfter = await page.evaluate(() => localStorage.getItem('tdental_token'));
    expect(tokenAfter).toBe(tokenBefore);
    
    // Should still see Overview (logged in state)
    await expect(page.locator('text=Overview')).toBeVisible();
  });

  test('should clear caches when updating', async ({ page }) => {
    test.setTimeout(30000);
    
    await setupVersionMock(page, OLD_VERSION);
    await login(page);
    
    // Add some test data to cache
    await page.evaluate(async () => {
      if ('caches' in window) {
        const cache = await caches.open('test-cache');
        await cache.put('/test', new Response('test data'));
      }
    });
    
    // Verify cache exists
    const cacheExistsBefore = await page.evaluate(async () => {
      if ('caches' in window) {
        const names = await caches.keys();
        return names.includes('test-cache');
      }
      return false;
    });
    expect(cacheExistsBefore).toBe(true);
    
    // Trigger update
    await setupVersionMock(page, NEW_VERSION);
    await page.click('text=v0.0.0');
    await page.waitForTimeout(2000);
    
    // Click Update Now
    await page.click('button:has-text("Update Now")');
    
    // Wait for reload
    await page.waitForURL(/\?_v=/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Cache should be cleared
    const cacheExistsAfter = await page.evaluate(async () => {
      if ('caches' in window) {
        const names = await caches.keys();
        return names.includes('test-cache');
      }
      return false;
    });
    expect(cacheExistsAfter).toBe(false);
  });

  test('should dismiss update notification', async ({ page }) => {
    await setupVersionMock(page, OLD_VERSION);
    await login(page);
    
    // Trigger update
    await setupVersionMock(page, NEW_VERSION);
    await page.click('text=v0.0.0');
    await page.waitForTimeout(2000);
    
    // Update notification should appear
    await expect(page.locator('text=Update Available')).toBeVisible();
    
    // Click Later
    await page.click('button:has-text("Later")');
    
    // Notification should disappear
    await expect(page.locator('text=Update Available')).not.toBeVisible();
    
    // But version badge should still show update indicator
    await expect(page.locator('.bg-amber-100')).toBeVisible();
  });

  test('should show loading state while checking for updates', async ({ page }) => {
    await setupVersionMock(page, OLD_VERSION);
    await login(page);
    
    // Click version badge
    await page.click('text=v0.0.0');
    
    // Should show spinner briefly
    await expect(page.locator('animate-spin')).toBeVisible({ timeout: 1000 });
  });

  test('should handle version check errors gracefully', async ({ page }) => {
    // Mock version.json to fail
    await page.route('**/version.json**', async (route) => {
      await route.abort('failed');
    });
    
    await login(page);
    await page.waitForTimeout(1000);
    
    // Click to check for updates
    await page.click('button[title="Click to check for updates"]');
    await page.waitForTimeout(1000);
    
    // Should show error indicator
    await expect(page.locator('.text-red-500')).toBeVisible();
  });
});

test.describe('Version Update - Real Deployment Scenario', () => {
  
  test('complete update flow simulation', async ({ page, context }) => {
    test.setTimeout(60000);
    
    // Step 1: Login with old version
    await setupVersionMock(page, OLD_VERSION);
    await login(page);
    
    // Verify initial state
    await expect(page.locator('text=v0.0.0')).toBeVisible();
    const initialUrl = page.url();
    
    // Step 2: Simulate new deployment by changing version
    await setupVersionMock(page, NEW_VERSION);
    
    // Step 3: Manually trigger version check
    await page.click('button[title="Click to check for updates"]');
    await page.waitForTimeout(2000);
    
    // Step 4: Verify update detected
    await expect(page.locator('text=Update Available')).toBeVisible();
    await expect(page.locator('text=New version 0.1.0')).toBeVisible();
    
    // Step 5: Click Update Now
    await page.click('button:has-text("Update Now")');
    
    // Step 6: Wait for reload with cache-busting
    await page.waitForURL(/\?_v=\d+/, { timeout: 10000 });
    
    // Step 7: Wait for app to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Step 8: Verify still logged in
    await expect(page.locator('h1', { hasText: 'Overview' })).toBeVisible();
    
    // Step 9: Verify new version loaded
    // Note: In real scenario, the new JS bundle would show new version
    // In our mock test, we're verifying the reload mechanism works
    const currentUrl = page.url();
    expect(currentUrl).not.toBe(initialUrl);
    expect(currentUrl).toMatch(/\?_v=\d+/);
    
    // Step 10: Verify console logs
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));
    
    // Should have cache clearing logs
    expect(logs.some(log => log.includes('[VersionCheck]'))).toBe(true);
  });
});
