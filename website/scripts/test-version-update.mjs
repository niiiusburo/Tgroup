/**
 * Version Update Automation Script
 * 
 * This script uses Playwright to:
 * 1. Login to the app
 * 2. Check current version
 * 3. Mock a new version
 * 4. Click "Update Now"
 * 5. Verify update completes
 * 
 * Usage: node scripts/test-version-update.mjs
 */

import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

const OLD_VERSION = {
  version: '0.0.0',
  buildTime: '2026-04-01T00:00:00.000Z',
  gitCommit: 'abc1234',
  gitBranch: 'main',
  environment: 'development',
};

const NEW_VERSION = {
  version: '0.2.0',
  buildTime: '2026-04-08T12:00:00.000Z',
  gitCommit: 'xyz9999',
  gitBranch: 'main',
  environment: 'development',
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🚀 Starting Version Update Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();
  
  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('[Version') || text.includes('error') || text.includes('Error')) {
      console.log('  [Browser Log]:', text);
    }
  });
  
  // Capture errors
  page.on('pageerror', error => {
    console.log('  [Browser Error]:', error.message);
  });
  
  try {
    // Step 1: Navigate to login
    console.log('Step 1: Navigating to login page...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('h1', { timeout: 10000 });
    const title = await page.locator('h1').textContent();
    console.log('  → Page title:', title);
    
    // Step 2: Fill in login credentials
    console.log('\nStep 2: Filling login form...');
    await page.fill('input#email', 'admin@tdental.vn');
    await page.fill('input#password', 'admin123');
    console.log('  → Credentials filled');
    
    // Step 3: Click login
    console.log('\nStep 3: Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    console.log('  → Waiting for navigation...');
    await page.waitForLoadState('networkidle');
    await delay(3000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('  → Current URL:', currentUrl);
    
    // Check if we're on the dashboard
    const pageTitle = await page.title();
    console.log('  → Page title:', pageTitle);
    
    // Look for Overview text
    const hasOverview = await page.locator('text=Overview').first().isVisible().catch(() => false);
    console.log('  → Has Overview:', hasOverview);
    
    if (!hasOverview) {
      console.log('\n⚠️  Not on dashboard, checking what page we\'re on...');
      const bodyText = await page.locator('body').textContent();
      console.log('  Body text preview:', bodyText.substring(0, 200));
      await page.screenshot({ path: '/tmp/version-test-debug.png' });
      throw new Error('Login may have failed - not on Overview page');
    }
    
    console.log('  → ✅ Logged in successfully');
    
    // Step 4: Setup version mocking
    console.log('\nStep 4: Setting up version mocking...');
    await page.route('**/version.json**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(OLD_VERSION),
      });
    });
    console.log('  → Mocking version.json with:', OLD_VERSION.version);
    
    // Step 5: Wait for version display
    console.log('\nStep 5: Looking for version display...');
    await delay(2000);
    
    // Try to find version badge
    const versionButton = await page.locator('button:has-text("v0")').first();
    const hasVersion = await versionButton.isVisible().catch(() => false);
    
    if (!hasVersion) {
      console.log('  → Version badge not found, taking screenshot...');
      await page.screenshot({ path: '/tmp/version-test-no-version.png', fullPage: true });
      
      // Try alternative selectors
      const allButtons = await page.locator('button').all();
      console.log('  → Found', allButtons.length, 'buttons');
      for (const btn of allButtons.slice(0, 5)) {
        const text = await btn.textContent().catch(() => 'no text');
        console.log('    Button:', text.substring(0, 50));
      }
    } else {
      console.log('  → ✅ Version badge found');
    }
    
    // Step 6: Click version badge
    console.log('\nStep 6: Clicking version badge to check for updates...');
    await versionButton.click();
    await delay(1000);
    
    // Step 7: Change to new version
    console.log('\nStep 7: Switching to new version (0.2.0)...');
    await page.unroute('**/version.json**');
    await page.route('**/version.json**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(NEW_VERSION),
      });
    });
    console.log('  → Now mocking version.json with:', NEW_VERSION.version);
    
    // Click again to trigger check
    await versionButton.click();
    await delay(2000);
    
    // Step 8: Check for update notification
    console.log('\nStep 8: Checking for update notification...');
    const hasUpdate = await page.locator('text=Update Available').first().isVisible().catch(() => false);
    
    if (hasUpdate) {
      console.log('  → ✅ Update notification appeared!');
      await page.screenshot({ path: '/tmp/version-test-update-available.png' });
      
      // Step 9: Click Update Now
      console.log('\nStep 9: Clicking "Update Now"...');
      await page.click('button:has-text("Update Now")');
      
      // Step 10: Wait for reload
      console.log('\nStep 10: Waiting for page reload...');
      await page.waitForURL(/\?_v=/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await delay(3000);
      
      console.log('  → ✅ Page reloaded with cache-busting!');
      
      // Check if still logged in
      const stillLoggedIn = await page.locator('text=Overview').first().isVisible().catch(() => false);
      console.log('  → Still logged in:', stillLoggedIn ? 'YES ✅' : 'NO ❌');
      
    } else {
      console.log('  → ❌ Update notification did NOT appear');
      await page.screenshot({ path: '/tmp/version-test-no-update.png', fullPage: true });
      console.log('  → Screenshot saved for debugging');
    }
    
    // Final screenshot
    await page.screenshot({ path: '/tmp/version-test-final.png', fullPage: true });
    console.log('\nFinal screenshot: /tmp/version-test-final.png');
    
    // Keep browser open
    console.log('\nBrowser will stay open for 30 seconds...');
    await delay(30000);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    try {
      await page.screenshot({ path: '/tmp/version-test-error.png', fullPage: true });
      console.log('Error screenshot saved: /tmp/version-test-error.png');
    } catch {}
  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
}

runTest().catch(console.error);
