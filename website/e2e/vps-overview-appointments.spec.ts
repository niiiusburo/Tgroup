import { test, expect } from '@playwright/test';

test.describe('VPS Overview Page - Appointments Display', () => {
  const VPS_URL = 'http://76.13.16.68:5174';
  const VPS_API = 'http://76.13.16.68:3002';

  test('VPS API should return appointments for April 8th', async ({ request }) => {
    console.log(`\n=== Testing VPS API: ${VPS_API} ===`);
    
    const response = await request.get(`${VPS_API}/api/Appointments?dateFrom=2026-04-08&dateTo=2026-04-08`);
    
    console.log(`Response status: ${response.status()}`);
    
    if (!response.ok()) {
      console.log('API ERROR - Response not OK');
      const text = await response.text();
      console.log('Response text:', text.substring(0, 500));
    }
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2).substring(0, 2000));
    
    console.log(`\nVPS API Total items: ${data.totalItems}`);
    
    if (data.totalItems === 0) {
      console.log('❌ VPS API returning 0 appointments - needs backend fix deployed!');
    } else {
      console.log('✅ VPS API returning appointments correctly');
      data.items?.forEach((item: any, i: number) => {
        console.log(`  ${i + 1}. ${item.time || 'N/A'} - ${item.name}`);
      });
    }
    
    // We expect 5 appointments - this will FAIL until backend is fixed on VPS
    expect(data.totalItems, 
      `VPS API should return 5 appointments. Currently returns ${data.totalItems}. ` +
      `The backend fix needs to be deployed to the VPS.`
    ).toBe(5);
  });

  test('VPS Overview page shows appointments', async ({ page }) => {
    console.log(`\n=== Testing VPS Frontend: ${VPS_URL} ===`);
    
    // Navigate to VPS login
    await page.goto(`${VPS_URL}/login`);
    
    // Wait for login form
    await page.waitForSelector('text=Sign In', { timeout: 10000 });
    
    // Fill credentials
    await page.fill('input[type="email"]', 'tg@clinic.vn');
    await page.fill('input[type="password"]', 'admin123');
    
    // Click Sign In
    await page.click('button:has-text("Sign In")');
    
    // Wait for Overview page
    await page.waitForSelector('text=Overview', { timeout: 15000 });
    
    // Wait for data to load
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/vps-overview.png', fullPage: true });
    
    // Get page content
    const bodyText = await page.locator('body').innerText();
    
    console.log('\nVPS Page content check:');
    
    // Check for appointment names
    const patientNames = ['Nguyệt', 'Thúy', 'Đạt', 'Thanh', 'HIẾU', 'Minh'];
    let foundNames = 0;
    for (const name of patientNames) {
      if (bodyText.includes(name)) {
        foundNames++;
        console.log(`  ✓ Found: ${name}`);
      }
    }
    
    console.log(`\nFound ${foundNames}/5 patient names on VPS page`);
    
    if (foundNames === 0) {
      console.log('❌ NO APPOINTMENTS SHOWING ON VPS - Backend needs fix deployed!');
    } else if (foundNames < 5) {
      console.log('⚠️ Partial appointments showing');
    } else {
      console.log('✅ All appointments showing correctly!');
    }
    
    // This will fail until VPS backend is fixed
    expect(foundNames, 
      `Expected at least 3 patient names on VPS Overview page. ` +
      `Only found ${foundNames}. The backend fix needs to be deployed.`
    ).toBeGreaterThanOrEqual(3);
  });
});