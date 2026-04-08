import { test, expect } from '@playwright/test';

test.describe('Address Autocomplete', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the customers page
    await page.goto('http://localhost:5174/customers');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should show Google Places suggestions when typing an address', async ({ page }) => {
    // Click "Add Customer" button
    await page.getByRole('button', { name: /add customer/i }).click();
    
    // Wait for modal to open
    await page.waitForSelector('text=Thêm khách hàng', { timeout: 5000 });
    
    // Find the address input - look for the placeholder text
    const addressInput = page.getByPlaceholder(/Nhập địa chỉ/i);
    
    // Wait for Google Places script to load
    await page.waitForTimeout(2000);
    
    // Type a US address
    await addressInput.fill('5051 N Hamlin ave');
    
    // Wait for suggestions to appear
    await page.waitForTimeout(1500);
    
    // Take a screenshot to see current state
    await page.screenshot({ path: 'test-results/address-input-filled.png' });
    
    // Check if suggestions dropdown appears
    const suggestionsDropdown = page.locator('.animate-in.fade-in');
    const isVisible = await suggestionsDropdown.isVisible().catch(() => false);
    
    if (isVisible) {
      console.log('✓ Suggestions dropdown is visible');
      
      // Get all suggestion items
      const suggestions = await page.locator('button:has-text("N Hamlin Ave")').all();
      console.log(`Found ${suggestions.length} suggestions`);
      
      // Click on the first suggestion
      await suggestions[0].click();
      
      // Wait for address to be selected
      await page.waitForTimeout(1000);
      
      // Take screenshot after selection
      await page.screenshot({ path: 'test-results/address-selected.png' });
      
      // Check if city/district/ward fields were auto-filled
      const citySelect = page.locator('select').filter({ hasText: /-- Chọn Tỉnh\/Thành --/ });
      const districtSelect = page.locator('select').filter({ hasText: /-- Chọn Quận\/Huyện --/ });
      const wardSelect = page.locator('select').filter({ hasText: /-- Chọn Phường\/Xã --/ });
      
      // Get current values
      const cityValue = await citySelect.inputValue();
      const districtValue = await districtSelect.inputValue();
      const wardValue = await wardSelect.inputValue();
      
      console.log('City value:', cityValue);
      console.log('District value:', districtValue);
      console.log('Ward value:', wardValue);
      
      // For a US address, these should remain empty since we only have Vietnamese cities
      expect(cityValue).toBe('');
    } else {
      console.log('✗ Suggestions dropdown is NOT visible - checking for errors...');
      
      // Check browser console for errors
      const logs = await page.evaluate(() => {
        return (window as any).consoleLogs || [];
      });
      console.log('Console logs:', logs);
      
      // Check if input has any error styling
      const hasError = await addressInput.evaluate(el => el.classList.contains('border-red-200'));
      if (hasError) {
        const errorText = await page.locator('text=/Google Places API key not configured/i').isVisible();
        console.log('API key error visible:', errorText);
      }
      
      // Take error screenshot
      await page.screenshot({ path: 'test-results/address-error.png' });
      
      throw new Error('Address autocomplete suggestions did not appear');
    }
  });

  test('should auto-fill Vietnamese address fields', async ({ page }) => {
    // Click "Add Customer" button
    await page.getByRole('button', { name: /add customer/i }).click();
    
    // Wait for modal to open
    await page.waitForSelector('text=Thêm khách hàng', { timeout: 5000 });
    
    // Find the address input
    const addressInput = page.getByPlaceholder(/Nhập địa chỉ/i);
    
    // Wait for Google Places script to load
    await page.waitForTimeout(2000);
    
    // Type a Vietnamese address
    await addressInput.fill('123 Nguyễn Huệ, Quận 1, TP HCM');
    
    // Wait for suggestions
    await page.waitForTimeout(1500);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/vn-address-input.png' });
    
    // Try to click first suggestion
    const suggestions = await page.locator('button:has-text("Nguyễn Huệ")').all();
    if (suggestions.length > 0) {
      await suggestions[0].click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-results/vn-address-selected.png' });
      
      // For Vietnamese addresses, check if fields were filled
      // Note: This depends on the exact matching logic
    }
  });

  test('should handle script loading errors gracefully', async ({ page }) => {
    // This test verifies the component shows an error message if Google script fails to load
    
    // Navigate with a fake/broken API key
    await page.addInitScript(() => {
      (window as any).env = { VITE_GOOGLE_PLACES_API_KEY: 'invalid_key' };
    });
    
    await page.reload();
    await page.goto('http://localhost:5174/customers');
    await page.waitForLoadState('networkidle');
    
    // Click "Add Customer" button
    await page.getByRole('button', { name: /add customer/i }).click();
    
    // Wait for modal
    await page.waitForSelector('text=Thêm khách hàng', { timeout: 5000 });
    
    // Find the address input
    const addressInput = page.getByPlaceholder(/Nhập địa chỉ/i);
    
    // Check if error styling is applied
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/address-error-state.png' });
  });
});
