import { test, expect } from '@playwright/test';

test.describe('VPS Final Verification - Appointments', () => {
  const VPS_URL = 'http://76.13.16.68:5174';

  test('VPS API returns 5 appointments for April 8th', async ({ request }) => {
    console.log('\n=== FINAL VPS VERIFICATION ===');
    console.log(`Testing: http://76.13.16.68:3002/api/Appointments?dateFrom=2026-04-08&dateTo=2026-04-08`);
    
    const response = await request.get('http://76.13.16.68:3002/api/Appointments?dateFrom=2026-04-08&dateTo=2026-04-08');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    console.log(`\n✅ VPS API RETURNED ${data.totalItems} APPOINTMENTS FOR APRIL 8TH!`);
    console.log('\nAppointments:');
    data.items?.forEach((item: any, i: number) => {
      console.log(`  ${i + 1}. ${item.time} - ${item.name}`);
    });
    
    // Verify we have 5 appointments
    expect(data.totalItems).toBe(5);
    expect(data.items).toHaveLength(5);
    
    // Check for expected appointment names
    const names = data.items.map((item: any) => item.name);
    expect(names).toContain('Nguyễn Thị Nguyệt');
    expect(names).toContain('Đặng Thị Hồng Thúy');
    expect(names).toContain('Vũ Hữu Đạt');
    expect(names).toContain('Nguyễn Thị Thanh');
    expect(names).toContain('PHẠM NGUYỄN MINH HIẾU');
    
    console.log('\n🎉 ALL CHECKS PASSED!');
    console.log('   - Backend fix is deployed');
    console.log('   - Database is synced from local');
    console.log('   - 5 appointments available for April 8th');
    console.log('\n👉 The Overview page should now show appointments!');
  });

  test('VPS frontend loads', async ({ page }) => {
    await page.goto(VPS_URL);
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/vps-frontend-loaded.png' });
    
    const title = await page.title();
    console.log(`\nPage title: ${title}`);
    
    expect(title).toContain('TDental');
  });
});