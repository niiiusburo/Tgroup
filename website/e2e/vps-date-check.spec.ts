import { test, expect } from '@playwright/test';

/**
 * Quick VPS Date Check
 * This test just checks what date the browser thinks it is
 * and what date the application would send to the API
 */

const VPS_URL = process.env.VPS_URL || 'http://localhost:5175';

test.describe('Quick VPS Date Check', () => {
  test('check browser date vs Vietnam date', async ({ page }) => {
    console.log(`\n🌐 Checking VPS: ${VPS_URL}`);
    
    await page.goto(`${VPS_URL}/login`);
    
    // Get all date info from browser
    const dateInfo = await page.evaluate(() => {
      const now = new Date();
      
      // Raw browser date
      const rawDate = now.toISOString();
      const rawLocalDate = now.toLocaleDateString();
      const rawLocalTime = now.toLocaleTimeString();
      
      // Vietnam timezone
      const vietnamFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const vietnamParts = vietnamFormatter.formatToParts(now);
      const get = (t: string) => vietnamParts.find(p => p.type === t)?.value || '00';
      
      const vietnamDate = `${get('year')}-${get('month')}-${get('day')}`;
      const vietnamTime = `${get('hour')}:${get('minute')}:${get('second')}`;
      
      // UTC date
      const utcDate = now.toISOString().split('T')[0];
      
      return {
        rawDate,
        rawLocalDate,
        rawLocalTime,
        browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        browserOffset: now.getTimezoneOffset(),
        vietnamDate,
        vietnamTime,
        utcDate,
        difference: utcDate !== vietnamDate ? '⚠️ UTC and Vietnam are different dates!' : '✅ Same date'
      };
    });
    
    console.log('\n📅 DATE ANALYSIS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Raw Browser Date:      ${dateInfo.rawDate}`);
    console.log(`Browser Local Date:    ${dateInfo.rawLocalDate}`);
    console.log(`Browser Local Time:    ${dateInfo.rawLocalTime}`);
    console.log(`Browser Timezone:      ${dateInfo.browserTimezone}`);
    console.log(`Browser Offset (min):  ${dateInfo.browserOffset}`);
    console.log('───────────────────────────────────────────────────────');
    console.log(`UTC Date (YYYY-MM-DD): ${dateInfo.utcDate}`);
    console.log(`Vietnam Date:          ${dateInfo.vietnamDate}`);
    console.log(`Vietnam Time:          ${dateInfo.vietnamTime}`);
    console.log('───────────────────────────────────────────────────────');
    console.log(`Status: ${dateInfo.difference}`);
    console.log('═══════════════════════════════════════════════════════');
    
    if (dateInfo.utcDate !== dateInfo.vietnamDate) {
      console.log('\n⚠️  WARNING: UTC and Vietnam are on different days!');
      console.log('   This means if your VPS uses UTC, appointments may not show.');
      console.log(`   VPS would query for: ${dateInfo.utcDate}`);
      console.log(`   But appointments are for: ${dateInfo.vietnamDate}`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/vps-date-check.png' });
    
    // Always pass - this is diagnostic only
    expect(true).toBe(true);
  });
});