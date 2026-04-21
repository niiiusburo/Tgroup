import { test, expect } from '@playwright/test';

test('bank selector dropdown', async ({ page }) => {
  await page.goto('http://localhost:5175/');
  await expect(page.locator('h1', { hasText: /Overview|Tổng quan/i })).toBeVisible({ timeout: 15_000 });

  await page.getByRole('link', { name: /Settings|Cài đặt/i }).click();
  await expect(page.locator('main h1', { hasText: /Settings|Cài đặt/i })).toBeVisible({ timeout: 10_000 });

  const bankTab = page.getByRole('tab', { name: /Bank|Ngân hàng|bank/i });
  await expect(bankTab).toBeVisible();
  await bankTab.click();

  const bankInput = page.locator('input[placeholder*="Chọn ngân hàng"], input[placeholder*="Select bank"], input[placeholder*="ngân hàng"], input[placeholder*="bank"]').first();
  await expect(bankInput).toBeVisible();

  await bankInput.click();
  await bankInput.fill('Vietcombank');

  const dropdownOption = page.locator('text=Vietcombank').first();
  await expect(dropdownOption).toBeVisible({ timeout: 5_000 });
  await dropdownOption.click();

  const value = await bankInput.inputValue();
  expect(value).toContain('Vietcombank');

  await page.screenshot({ path: 'e2e/screenshots/bank-selector.png' });
});
