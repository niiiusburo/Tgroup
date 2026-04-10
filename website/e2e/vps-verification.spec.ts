import { test, expect } from '@playwright/test';

test.describe('VPS Verification - Appointments Display', () => {
  const VPS_URL = 'http://76.13.16.68:5174';

  test('VPS Overview shows appointments', async ({ page }) => {
    console.log(`\n=== Testing VPS: ${VPS_URL} ===`);
    
    // Navigate and login
    await page.goto(`${VPS_URL}/login`);
    await page.waitForSelector('text=Sign In', { timeout: 10000 });
    
    await page.fill('input[type="email"]', 'tg@clinic.vn');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Sign In")');
    
    // Wait for Overview
    await page.waitForSelector('text=Overview', { timeout: 15000 });
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/vps-overview-with-appointments.png', fullPage: true });
    
    // Check for appointments
    const bodyText = await page.locator('body').innerText();
    
    // Look for appointment indicators
    const hasAppointments = 
      bodyText.includes('Lịch') || 
      bodyText.includes('Đạt') || 
      bodyText.includes('Thanh') || 
      bodyText.includes('Thúy') ||
      bodyText.includes('HIẾU');
    
    console.log('Has appointments on page:', hasAppointments);
    
    if (hasAppointments) {
      console.log('✅ VPS OVERVIEW SHOWS APPOINTMENTS!');
    } else {
      console.log('❌ No appointments visible');
      console.log('Page text sample:', bodyText.substring(0, 1000));
    }
    
    expect(hasAppointments, 'VPS Overview should display appointments').toBe(true);
  });

  test('VPS API returns appointments', async ({ request }) => {
    console.log('\n=== Testing VPS API ===');
    
    // The API now works with the dateTo fix
    const response = await request.get('http://76.13.16.68:3002/api/Appointments?dateFrom=2026-04-07&dateTo=2026-04-07');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    console.log(`API returned ${data.totalItems} appointments`);
    
    expect(data.totalItems).toBeGreaterThan(0);
    
    console.log('✅ VPS API FIX IS WORKING!');
  });
});