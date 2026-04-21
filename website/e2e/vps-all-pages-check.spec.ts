import { test, expect } from '@playwright/test';

/**
 * Comprehensive VPS Page Verification
 * Tests every route to ensure proper loading
 */

test.describe('VPS All Pages Verification', () => {
  const VPS_URL = 'http://76.13.16.68:5175';
  const RESULTS_DIR = 'e2e/screenshots/vps-check';

  // Auth credentials
  const LOGIN_CREDENTIALS = {
    email: 'tg@clinic.vn',
    password: 'admin123'
  };

  /**
   * Helper: Login before tests
   */
  async function login(page: any) {
    await page.goto(`${VPS_URL}/login`);
    
    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill credentials
    await page.fill('input[type="email"]', LOGIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', LOGIN_CREDENTIALS.password);
    
    // Submit
    await page.click('button:has-text("Sign In")');
    
    // Wait for redirect to Overview
    await page.waitForURL(`${VPS_URL}/`, { timeout: 15000 });
    await page.waitForTimeout(2000);
  }

  /**
   * Helper: Check page loads without errors
   */
  async function checkPageLoads(page: any, route: string, pageName: string) {
    const url = `${VPS_URL}${route}`;
    console.log(`\n🔍 Checking ${pageName} at ${url}`);
    
    try {
      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // Take screenshot
      const screenshotPath = `${RESULTS_DIR}/${pageName.toLowerCase().replace(/\s+/g, '-')}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Check for error indicators
      const bodyText = await page.locator('body').innerText({ timeout: 5000 });
      
      const errorIndicators = [
        '404 Not Found',
        'Page Not Found',
        'Something went wrong',
        'Error',
        'Failed to load',
        'Cannot GET',
        'Cannot POST'
      ];
      
      const hasError = errorIndicators.some(err => 
        bodyText.toLowerCase().includes(err.toLowerCase())
      );
      
      // Check for React root mount (indicates React app loaded)
      const hasReactRoot = await page.locator('#root').count() > 0 ||
                           await page.locator('div[id="root"]').count() > 0;
      
      // Check for common app elements
      const hasSidebar = await page.locator('nav, aside, [class*="sidebar"], [class*="Sidebar"]').count() > 0;
      const hasHeader = await page.locator('header, [class*="header"], [class*="Header"]').count() > 0;
      
      // Check for white/blank page
      const isBlank = bodyText.trim().length < 50;
      
      const result = {
        pageName,
        route,
        url,
        screenshotPath,
        hasError,
        hasReactRoot,
        hasSidebar,
        hasHeader,
        isBlank,
        bodyLength: bodyText.length,
        status: hasError || isBlank ? 'FAIL' : 'PASS'
      };
      
      console.log(`  ${result.status === 'PASS' ? '✅' : '❌'} ${pageName}: ${result.status}`);
      if (result.status === 'FAIL') {
        console.log(`     - Has error text: ${hasError}`);
        console.log(`     - Is blank: ${isBlank}`);
        console.log(`     - Body length: ${bodyText.length}`);
      }
      
      return result;
      
    } catch (error: any) {
      console.log(`  ❌ ${pageName}: ERROR - ${error.message}`);
      return {
        pageName,
        route,
        url,
        screenshotPath: null,
        hasError: true,
        error: error.message,
        status: 'ERROR'
      };
    }
  }

  test.beforeAll(async () => {
    // Create results directory
    try {
      await import('fs').then(fs => {
        if (!fs.existsSync(RESULTS_DIR)) {
          fs.mkdirSync(RESULTS_DIR, { recursive: true });
        }
      });
    } catch {
      // Directory may already exist or not needed
    }
  });

  test('Login page loads', async ({ page }) => {
    console.log('\n=== VPS PAGE VERIFICATION ===');
    console.log(`Testing: ${VPS_URL}`);
    
    const result = await checkPageLoads(page, '/login', 'Login');
    
    // Specific checks for login page
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible({ timeout: 10000 });
    
    expect(result.status).toBe('PASS');
  });

  test('Overview page loads after login', async ({ page }) => {
    await login(page);
    
    const result = await checkPageLoads(page, '/', 'Overview');
    
    // Overview specific checks
    const bodyText = await page.locator('body').innerText();
    const hasOverviewContent = 
      bodyText.includes('Overview') ||
      bodyText.includes('Dashboard') ||
      bodyText.includes('Tổng quan') ||
      bodyText.includes('Lịch hẹn') ||
      bodyText.includes('Doanh thu');
    
    expect(hasOverviewContent).toBe(true);
    expect(result.status).toBe('PASS');
  });

  test('Calendar page loads', async ({ page }) => {
    await login(page);
    
    const result = await checkPageLoads(page, '/calendar', 'Calendar');
    
    // Calendar specific checks
    const bodyText = await page.locator('body').innerText();
    const hasCalendarContent = 
      bodyText.includes('Calendar') ||
      bodyText.includes('Lịch') ||
      bodyText.includes('Day') ||
      bodyText.includes('Week') ||
      bodyText.includes('Month');
    
    expect(hasCalendarContent || result.status === 'PASS').toBe(true);
  });

  test('Customers page loads', async ({ page }) => {
    await login(page);
    
    const result = await checkPageLoads(page, '/customers', 'Customers');
    
    // Customers specific checks
    const bodyText = await page.locator('body').innerText();
    const hasCustomerContent = 
      bodyText.includes('Customers') ||
      bodyText.includes('Khách hàng') ||
      bodyText.includes('Patient');
    
    expect(hasCustomerContent || result.status === 'PASS').toBe(true);
  });

  test('Employees page loads', async ({ page }) => {
    await login(page);
    
    const result = await checkPageLoads(page, '/employees', 'Employees');
    
    // Employees specific checks
    const bodyText = await page.locator('body').innerText();
    const hasEmployeeContent = 
      bodyText.includes('Employees') ||
      bodyText.includes('Nhân viên') ||
      bodyText.includes('Bác sĩ') ||
      bodyText.includes('Doctor');
    
    expect(hasEmployeeContent || result.status === 'PASS').toBe(true);
  });

  test('Locations page loads', async ({ page }) => {
    await login(page);
    
    const result = await checkPageLoads(page, '/locations', 'Locations');
    
    // Locations specific checks
    const bodyText = await page.locator('body').innerText();
    const hasLocationContent = 
      bodyText.includes('Locations') ||
      bodyText.includes('Chi nhánh') ||
      bodyText.includes('Cơ sở') ||
      bodyText.includes('TG Clinic');
    
    expect(hasLocationContent || result.status === 'PASS').toBe(true);
  });

  test('Service Catalog page loads', async ({ page }) => {
    await login(page);
    
    const result = await checkPageLoads(page, '/website', 'Service Catalog');
    
    // Service Catalog specific checks
    const bodyText = await page.locator('body').innerText();
    const hasCatalogContent = 
      bodyText.includes('Service') ||
      bodyText.includes('Dịch vụ') ||
      bodyText.includes('Catalog');
    
    expect(hasCatalogContent || result.status === 'PASS').toBe(true);
  });

  test('Settings page loads', async ({ page }) => {
    await login(page);
    
    const result = await checkPageLoads(page, '/settings', 'Settings');
    
    // Settings specific checks
    const bodyText = await page.locator('body').innerText();
    const hasSettingsContent = 
      bodyText.includes('Settings') ||
      bodyText.includes('Cài đặt') ||
      bodyText.includes('General') ||
      bodyText.includes('Appearance');
    
    expect(hasSettingsContent || result.status === 'PASS').toBe(true);
  });

  test('Relationships page loads', async ({ page }) => {
    await login(page);
    
    const result = await checkPageLoads(page, '/relationships', 'Relationships');
    
    // Relationships specific checks
    const bodyText = await page.locator('body').innerText();
    const hasRelationshipContent = 
      bodyText.includes('Relationships') ||
      bodyText.includes('Mối quan hệ') ||
      bodyText.includes('Entity');
    
    expect(hasRelationshipContent || result.status === 'PASS').toBe(true);
  });

  test('Commission page loads', async ({ page }) => {
    await login(page);
    
    const result = await checkPageLoads(page, '/commission', 'Commission');
    
    // Commission specific checks
    const bodyText = await page.locator('body').innerText();
    const hasCommissionContent = 
      bodyText.includes('Commission') ||
      bodyText.includes('Hoa hồng') ||
      bodyText.includes('%');
    
    expect(hasCommissionContent || result.status === 'PASS').toBe(true);
  });

  test('Reports page loads', async ({ page }) => {
    await login(page);
    
    const result = await checkPageLoads(page, '/reports', 'Reports');
    
    // Reports specific checks
    const bodyText = await page.locator('body').innerText();
    const hasReportsContent = 
      bodyText.includes('Reports') ||
      bodyText.includes('Báo cáo');
    
    expect(hasReportsContent || result.status === 'PASS').toBe(true);
  });

  test('Notifications page loads', async ({ page }) => {
    await login(page);
    
    const result = await checkPageLoads(page, '/notifications', 'Notifications');
    
    // Notifications specific checks
    const bodyText = await page.locator('body').innerText();
    const hasNotificationsContent = 
      bodyText.includes('Notifications') ||
      bodyText.includes('Thông báo');
    
    expect(hasNotificationsContent || result.status === 'PASS').toBe(true);
  });

  test('Permissions page loads', async ({ page }) => {
    await login(page);
    
    const result = await checkPageLoads(page, '/permissions', 'Permissions');
    
    // Permissions specific checks
    const bodyText = await page.locator('body').innerText();
    const hasPermissionsContent = 
      bodyText.includes('Permissions') ||
      bodyText.includes('Phân quyền') ||
      bodyText.includes('Permission') ||
      bodyText.includes('Matrix');
    
    expect(hasPermissionsContent || result.status === 'PASS').toBe(true);
  });

  test('404/unknown routes redirect to Overview', async ({ page }) => {
    await login(page);
    
    await page.goto(`${VPS_URL}/this-route-does-not-exist`);
    await page.waitForTimeout(2000);
    
    // Should redirect to Overview (root)
    const currentUrl = page.url();
    console.log(`\n🧪 Unknown route redirected to: ${currentUrl}`);
    
    // Should end up at root
    expect(currentUrl).toBe(`${VPS_URL}/`);
  });

  test('Full site navigation works', async ({ page }) => {
    await login(page);
    
    console.log('\n=== FULL NAVIGATION CHECK ===');
    
    // Navigate through all main routes
    const routes = [
      { route: '/', name: 'Overview' },
      { route: '/calendar', name: 'Calendar' },
      { route: '/customers', name: 'Customers' },
      { route: '/employees', name: 'Employees' },
      { route: '/locations', name: 'Locations' },
      { route: '/website', name: 'Service Catalog' },
      { route: '/settings', name: 'Settings' },
    ];
    
    const results = [];
    
    for (const { route, name } of routes) {
      try {
        await page.goto(`${VPS_URL}${route}`, { timeout: 20000 });
        await page.waitForTimeout(2000);
        
        // Check if page has actual content
        const bodyText = await page.locator('body').innerText();
        const hasContent = bodyText.length > 100;
        
        results.push({ name, route, status: hasContent ? 'PASS' : 'FAIL' });
        console.log(`  ${hasContent ? '✅' : '❌'} ${name}`);
        
      } catch (error: any) {
        results.push({ name, route, status: 'ERROR', error: error.message });
        console.log(`  ❌ ${name}: ERROR - ${error.message}`);
      }
    }
    
    // Summary
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length;
    
    console.log(`\n=== NAVIGATION SUMMARY ===`);
    console.log(`  ✅ Passed: ${passed}/${results.length}`);
    console.log(`  ❌ Failed: ${failed}/${results.length}`);
    
    // At least 5 of 7 main routes should work
    expect(passed).toBeGreaterThanOrEqual(5);
  });

  test('API endpoints are accessible', async ({ request }) => {
    console.log('\n=== API HEALTH CHECK ===');
    
    const endpoints = [
      { url: 'http://76.13.16.68:3002/api/Companies', name: 'Companies' },
      { url: 'http://76.13.16.68:3002/api/Partners', name: 'Partners' },
      { url: 'http://76.13.16.68:3002/api/Employees', name: 'Employees' },
      { url: 'http://76.13.16.68:3002/api/Appointments?dateFrom=2026-04-08&dateTo=2026-04-08', name: 'Appointments' },
    ];
    
    const results = [];
    
    for (const { url, name } of endpoints) {
      try {
        const response = await request.get(url, { timeout: 10000 });
        const ok = response.ok();
        
        results.push({ name, ok, status: response.status() });
        console.log(`  ${ok ? '✅' : '❌'} ${name}: ${response.status()}`);
        
      } catch (error: any) {
        results.push({ name, ok: false, error: error.message });
        console.log(`  ❌ ${name}: ERROR - ${error.message}`);
      }
    }
    
    const passed = results.filter(r => r.ok).length;
    console.log(`\n  API Summary: ${passed}/${results.length} endpoints working`);
    
    // All APIs should work
    expect(passed).toBe(results.length);
  });

});
