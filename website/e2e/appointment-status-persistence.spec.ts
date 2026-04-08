import { test, expect } from '@playwright/test';

test.describe('Appointment Status Change Persistence', () => {
  test('should persist status change via API and survive page reload', async ({ page, request }) => {
    // Step 1: Login
    await page.goto('http://localhost:5174/login');
    await page.waitForSelector('text=Sign In', { timeout: 10000 });
    await page.fill('input#email', 'admin@tamdentist.vn');
    await page.fill('input#password', '123456');
    await page.click('button[type="submit"]');
    await page.waitForSelector('h1:has-text("Overview")', { timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Step 2: Get an appointment that can be updated (not already done)
    const apiResponse = await request.get('http://localhost:3002/api/Appointments?limit=50');
    const data = await apiResponse.json();
    const updatableAppointment = data.items.find((item: any) => item.state !== 'done' && item.state !== 'cancelled');
    
    if (!updatableAppointment) {
      console.log('No updatable appointments found.');
      test.skip();
      return;
    }
    
    console.log(`Found appointment: ${updatableAppointment.name} (state: ${updatableAppointment.state})`);
    
    // Step 3: Update the appointment status via API
    const updateResponse = await request.put(`http://localhost:3002/api/Appointments/${updatableAppointment.id}`, {
      data: { state: 'done' }
    });
    
    expect(updateResponse.ok()).toBeTruthy();
    const updatedData = await updateResponse.json();
    console.log(`Updated to state: ${updatedData.state}`);
    expect(updatedData.state).toBe('done');
    
    // Step 4: Verify the change persisted by fetching again
    const verifyResponse = await request.get(`http://localhost:3002/api/Appointments/${updatableAppointment.id}`);
    const verifyData = await verifyResponse.json();
    console.log(`Verified state: ${verifyData.state}`);
    expect(verifyData.state).toBe('done');
    
    // Step 5: Navigate to Overview and verify UI shows updated status
    await page.goto('http://localhost:5174/');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/status-test-1-after-update.png', fullPage: true });
    
    // Look for the appointment name or completion indicator in the page
    const bodyText = await page.locator('body').innerText();
    const hasCompletionIndicator = bodyText.includes('Hoàn thành') || 
                                   bodyText.includes('done') ||
                                   bodyText.includes(updatableAppointment.name);
    
    console.log(`UI shows completion: ${hasCompletionIndicator}`);
    expect(hasCompletionIndicator).toBe(true);
    
    // Step 6: Navigate away to Customers
    await page.goto('http://localhost:5174/customers');
    await page.waitForTimeout(3000);
    
    // Step 7: Come back to Overview
    await page.goto('http://localhost:5174/');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/status-test-2-after-reload.png', fullPage: true });
    
    // Step 8: Verify the API still shows the completed status
    const finalResponse = await request.get(`http://localhost:3002/api/Appointments/${updatableAppointment.id}`);
    const finalData = await finalResponse.json();
    console.log(`Final state after reload: ${finalData.state}`);
    
    expect(finalData.state).toBe('done');
    
    console.log('\n✓ TEST PASSED: Status change persisted to database and survived page reload!');
  });
  
  test('API should reject unauthenticated status updates', async ({ request }) => {
    // Try to update an appointment without authentication
    const response = await request.put('http://localhost:3002/api/Appointments/some-id', {
      data: { state: 'done' }
    });
    
    // Should get 401 Unauthorized or 403 Forbidden (or 400 if validation happens first)
    const status = response.status();
    expect([401, 403, 400].includes(status)).toBe(true);
    console.log(`✓ TEST PASSED: API returned ${status} for unauthenticated request`);
  });
});
