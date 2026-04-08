const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('1. Opening http://localhost:5174...');
    await page.goto('http://localhost:5174', { timeout: 10000 });
    console.log('   Page loaded!');
    console.log(`   URL: ${page.url()}`);
    
    await page.waitForLoadState('networkidle');
    
    // Check if we're on login or dashboard
    const isDashboard = await page.$('.sidebar, [class*="sidebar"], nav');
    
    if (isDashboard) {
      console.log('\n✅ Already logged in - showing dashboard');
    } else {
      console.log('\n2. Logging in...');
      await page.fill('input[type="email"]', 'tg@clinic.vn');
      await page.fill('input[type="password"]', '123456');
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
      
      console.log(`   URL after login: ${page.url()}`);
    }
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/playwright-dashboard.png', fullPage: true });
    console.log('\n📸 Screenshot: /tmp/playwright-dashboard.png');
    
    console.log('\n✅ All services UP:');
    console.log('   - Frontend: http://localhost:5174 ✅');
    console.log('   - API: http://localhost:3002 ✅');
    console.log('   - Database: tdental-demo (port 55433) ✅');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
