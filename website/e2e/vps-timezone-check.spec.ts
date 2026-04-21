import { test, expect } from '@playwright/test';

/**
 * VPS Timezone Diagnostic Test
 * This test logs into the VPS deployment and checks:
 * 1. Browser's current date/time
 * 2. What date is being sent to the API
 * 3. What appointments are displayed
 * 4. Screenshots for visual verification
 */

const VPS_URL = process.env.VPS_URL || 'http://localhost:5175';

test.describe('VPS Timezone Diagnostics', () => {
  test('check overview appointments with date diagnostics', async ({ page }) => {
    // Capture console logs and network requests
    const consoleLogs: string[] = [];
    const apiRequests: { url: string; dateFrom?: string; dateTo?: string }[] = [];
    
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(text);
      console.log(text);
    });
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/Appointments') && url.includes('dateFrom')) {
        const urlObj = new URL(url);
        apiRequests.push({
          url: url,
          dateFrom: urlObj.searchParams.get('dateFrom') || undefined,
          dateTo: urlObj.searchParams.get('dateTo') || undefined,
        });
        console.log('📅 API Request:', url);
        console.log('   dateFrom:', urlObj.searchParams.get('dateFrom'));
        console.log('   dateTo:', urlObj.searchParams.get('dateTo'));
      }
    });

    // Navigate to login
    console.log(`\n🌐 Navigating to ${VPS_URL}/login`);
    await page.goto(`${VPS_URL}/login`);
    
    // Get browser's current date/time
    const browserInfo = await page.evaluate(() => {
      const now = new Date();
      return {
        browserDate: now.toISOString(),
        browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        browserOffset: now.getTimezoneOffset(),
        localDateString: now.toLocaleDateString('en-US', { 
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }),
        localTimeString: now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      };
    });
    
    console.log('\n📊 Browser Timezone Info:');
    console.log('   Browser Date (ISO):', browserInfo.browserDate);
    console.log('   Browser Timezone:', browserInfo.browserTimezone);
    console.log('   Browser Offset (minutes):', browserInfo.browserOffset);
    console.log('   Vietnam Date:', browserInfo.localDateString);
    console.log('   Vietnam Time:', browserInfo.localTimeString);
    
    // Take screenshot of login page
    await page.screenshot({ path: 'e2e/screenshots/vps-login-page.png', fullPage: true });
    
    // Login
    await page.fill('input#email', 'tg@clinic.vn');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForSelector('h1:has-text("Overview")', { timeout: 15000 });
    console.log('\n✅ Successfully logged in and reached Overview');
    
    // Wait a moment for API calls to complete
    await page.waitForTimeout(3000);
    
    // Get VPS server info if available
    const serverInfo = await page.evaluate(() => {
      // Check if there's any server info in the DOM or window object
      return {
        currentUrl: window.location.href,
        userAgent: navigator.userAgent,
        language: navigator.language,
      };
    });
    
    console.log('\n🖥️  Server/Page Info:');
    console.log('   URL:', serverInfo.currentUrl);
    console.log('   User Agent:', serverInfo.userAgent);
    console.log('   Language:', serverInfo.language);
    
    // Log API requests found
    console.log('\n📡 API Requests captured:', apiRequests.length);
    apiRequests.forEach((req, i) => {
      console.log(`   Request ${i + 1}:`);
      console.log(`     dateFrom: ${req.dateFrom}`);
      console.log(`     dateTo: ${req.dateTo}`);
    });
    
    // Check for appointments on the page
    const appointmentCount = await page.locator('[data-appointment-id], .appointment-item, tr[data-id]').count().catch(() => 0);
    console.log('\n📋 Appointments found on page:', appointmentCount);
    
    // Get text content of the appointments section
    const appointmentsText = await page.locator('text=/Today\'s Appointments|Lịch hẹn hôm nay/i').first().evaluate(el => {
      const container = el.closest('div[class*="card"], div[class*="panel"], section') || el.parentElement;
      return container?.textContent?.substring(0, 500) || 'No container found';
    }).catch(() => 'Could not extract appointments text');
    
    console.log('\n📝 Appointments section preview:', appointmentsText.substring(0, 200));
    
    // Take screenshot of overview
    await page.screenshot({ path: 'e2e/screenshots/vps-overview-page.png', fullPage: true });
    console.log('\n📸 Screenshots saved:');
    console.log('   - e2e/screenshots/vps-login-page.png');
    console.log('   - e2e/screenshots/vps-overview-page.png');
    
    // Output summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                  DIAGNOSTIC SUMMARY                    ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`VPS URL: ${VPS_URL}`);
    console.log(`Browser Vietnam Date: ${browserInfo.localDateString}`);
    console.log(`API dateFrom: ${apiRequests[0]?.dateFrom || 'Not captured'}`);
    console.log(`API dateTo: ${apiRequests[0]?.dateTo || 'Not captured'}`);
    console.log(`Appointments displayed: ${appointmentCount}`);
    console.log('═══════════════════════════════════════════════════════');
    
    // Assertions to help identify the issue
    expect(apiRequests.length).toBeGreaterThan(0);
    
    // The dateFrom should match Vietnam's current date
    const expectedDate = browserInfo.localDateString.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$1-$2');
    if (apiRequests[0]?.dateFrom) {
      console.log(`\n🔍 Date comparison:`);
      console.log(`   Expected (Vietnam): ${expectedDate}`);
      console.log(`   Actual (API): ${apiRequests[0].dateFrom}`);
      
      if (apiRequests[0].dateFrom !== expectedDate) {
        console.log('   ⚠️  MISMATCH! Dates are different - this explains missing appointments');
      } else {
        console.log('   ✅ Dates match - appointments should be showing');
      }
    }
  });
});