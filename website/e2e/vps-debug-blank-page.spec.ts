import { test, expect } from '@playwright/test';

test.describe('VPS Debug - Blank Page Investigation', () => {
  const VPS_URL = 'http://76.13.16.68:5175';

  test('Check for console errors on Overview', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });

    page.on('pageerror', (error) => {
      console.log(`❌ Page Error: ${error.message}`);
    });

    console.log('\n=== Debugging VPS Blank Page ===');
    console.log(`Loading: ${VPS_URL}`);
    
    await page.goto(VPS_URL, { timeout: 60000 });
    
    // Wait longer for React to mount
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/vps-debug-overview.png', fullPage: true });
    
    // Check if root element has content
    const rootContent = await page.locator('#root').innerHTML().catch(() => 'EMPTY');
    console.log(`\n#root content length: ${rootContent.length}`);
    console.log(`#root content preview: ${rootContent.substring(0, 500)}`);
    
    // Check page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Check if body has content
    const bodyText = await page.locator('body').innerText();
    console.log(`Body text length: ${bodyText.length}`);
    
    // List console errors
    console.log(`\nConsole errors count: ${consoleErrors.length}`);
    
    // The page should have content
    expect(rootContent.length).toBeGreaterThan(50);
  });

  test('Login and check Overview', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });

    console.log('\n=== Testing Login Flow ===');
    
    // Go to login
    await page.goto(`${VPS_URL}/login`);
    await page.waitForTimeout(2000);
    
    // Fill login form
    await page.fill('input[type="email"]', 'tg@clinic.vn');
    await page.fill('input[type="password"]', 'admin123');
    
    // Click login
    await page.click('button:has-text("Sign In")');
    
    // Wait for navigation
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/vps-debug-after-login.png', fullPage: true });
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Check for content
    const rootContent = await page.locator('#root').innerHTML().catch(() => 'EMPTY');
    console.log(`#root content length after login: ${rootContent.length}`);
    
    // Check if we're on Overview
    if (currentUrl === `${VPS_URL}/`) {
      console.log('✅ Successfully redirected to Overview');
    } else {
      console.log(`⚠️ Not on Overview, on: ${currentUrl}`);
    }
    
    // Check body text
    const bodyText = await page.locator('body').innerText();
    console.log(`Body text preview: ${bodyText.substring(0, 500)}`);
    
    console.log(`\nConsole errors: ${consoleErrors.length}`);
    
    // Should have content
    expect(rootContent.length).toBeGreaterThan(100);
  });

  test('Check individual API calls', async ({ request }) => {
    console.log('\n=== Checking API Health ===');
    
    const endpoints = [
      'http://76.13.16.68:3002/api/Companies',
      'http://76.13.16.68:3002/api/Partners',
      'http://76.13.16.68:3002/api/Employees',
      'http://76.13.16.68:3002/api/Appointments?dateFrom=2026-04-08&dateTo=2026-04-08',
    ];
    
    for (const url of endpoints) {
      try {
        const response = await request.get(url, { timeout: 10000 });
        console.log(`${response.ok() ? '✅' : '❌'} ${url.split('/').pop()}: ${response.status()}`);
      } catch (e: any) {
        console.log(`❌ ${url.split('/').pop()}: ERROR - ${e.message}`);
      }
    }
  });

});
