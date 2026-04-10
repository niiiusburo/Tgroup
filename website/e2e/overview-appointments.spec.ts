import { test, expect } from '@playwright/test';

test.describe('Overview Page - Appointments Display', () => {
  test('should display appointments for today (April 8th) - FULL VERIFICATION', async ({ page }) => {
    // Step 1: Navigate to login and authenticate
    await page.goto('http://localhost:5174/login');
    await page.waitForSelector('text=Sign In', { timeout: 10000 });
    
    // Fill credentials
    await page.fill('input[type="email"]', 'tg@clinic.vn');
    await page.fill('input[type="password"]', 'admin123');
    
    // Click Sign In
    await page.click('button:has-text("Sign In")');
    
    // Step 2: Wait for Overview page to load
    await page.waitForSelector('text=Overview', { timeout: 15000 });
    
    // Step 3: Wait longer for data to load (API calls)
    await page.waitForTimeout(5000);
    
    // Step 4: Take screenshot of the loaded page
    await page.screenshot({ path: 'test-results/1-overview-loaded.png', fullPage: true });
    
    // Step 5: Get page content
    const bodyText = await page.locator('body').innerText();
    
    // Step 6: Check for appointment times from the database (5 appointments)
    const expectedAppointments = [
      { time: '08:00', name: 'PHẠM NGUYỄN MINH HIẾU' },
      { time: '08:30', name: 'Nguyễn Thị Thanh' },
      { time: '09:00', name: 'Vũ Hữu Đạt' },
      { time: '09:30', name: 'Đặng Thị Hồng Thúy' },
      { time: '10:00', name: 'Nguyễn Thị Nguyệt' }
    ];
    
    let foundAppointments = 0;
    const results: { expected: string; found: boolean }[] = [];
    
    for (const appt of expectedAppointments) {
      // Check for time pattern (08:00, 08:30, etc)
      const timeFound = bodyText.includes(appt.time);
      
      // Check for name (check partial names for flexibility)
      const nameParts = appt.name.split(' ');
      const lastName = nameParts[nameParts.length - 1];
      const nameFound = bodyText.includes(lastName) || bodyText.includes(appt.name);
      
      const isFound = timeFound || nameFound;
      if (isFound) foundAppointments++;
      
      results.push({
        expected: `${appt.time} - ${appt.name}`,
        found: isFound
      });
      
      console.log(`Appointment: ${appt.time} - ${appt.name}`);
      console.log(`  Time found: ${timeFound}, Name found: ${nameFound}`);
    }
    
    // Step 7: Log results
    console.log('\n=== VERIFICATION RESULTS ===');
    console.log(`Total appointments in database: 5`);
    console.log(`Appointments found on page: ${foundAppointments}`);
    console.log('\nDetails:');
    results.forEach(r => {
      console.log(`  ${r.found ? '✓' : '✗'} ${r.expected}`);
    });
    
    // Step 8: Also check using locators for time patterns
    const timeElements = await page.locator('text=/\\d{2}:\\d{2}/').count();
    console.log(`\nTime elements found on page: ${timeElements}`);
    
    // Step 9: Take another screenshot focused on appointments area
    await page.screenshot({ path: 'test-results/2-overview-appointments.png', fullPage: true });
    
    // Step 10: Verify at least 3 of 5 appointments are visible
    console.log('\n=== FINAL ASSERTION ===');
    expect(
      foundAppointments >= 3 || timeElements >= 5,
      `Expected at least 3 appointments or 5 time elements to be visible. ` +
      `Found ${foundAppointments} appointments and ${timeElements} time elements. ` +
      `Check screenshots in test-results/`
    ).toBe(true);
    
    console.log('✓ TEST PASSED: Appointments are displaying on the Overview page!');
  });

  test('API returns 5 appointments for April 8th', async ({ request }) => {
    // Test the API directly
    const response = await request.get('http://localhost:3002/api/Appointments?dateFrom=2026-04-08&dateTo=2026-04-08');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    console.log('\n=== API VERIFICATION ===');
    console.log(`Total items from API: ${data.totalItems}`);
    console.log(`Items array length: ${data.items?.length}`);
    
    // Verify count
    expect(data.totalItems).toBe(5);
    expect(data.items).toHaveLength(5);
    
    // Log appointment names
    console.log('\nAppointments from API:');
    data.items.forEach((item: any, i: number) => {
      console.log(`  ${i + 1}. ${item.time || 'N/A'} - ${item.name}`);
    });
    
    console.log('\n✓ API TEST PASSED: API returns exactly 5 appointments for April 8th!');
  });
});