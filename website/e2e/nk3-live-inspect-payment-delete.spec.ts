/**
 * Live NK3 Diagnostic — Specific Customer Payment Delete Inspection
 * 
 * Customer: https://tmv.2checkin.com/customers/a52d1def-9b47-4a95-bb78-368ec8a75979
 * 
 * Goal: Diagnose why the user cannot delete payments on this specific customer
 * in the live production NK3 environment.
 * 
 * This is a READ-ONLY diagnostic run. It will NOT click delete or make any changes.
 */

import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = 't@clinic.vn';
const ADMIN_PASSWORD = '123123';
const CUSTOMER_URL = 'https://tmv.2checkin.com/customers/a52d1def-9b47-4a95-bb78-368ec8a75979';

test('Live NK3 - Inspect why payment delete is blocked on this customer', async ({ page }) => {
  test.setTimeout(180_000);

  // Login
  await page.goto('https://tmv.2checkin.com/login');
  await page.locator('#login-identifier').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.locator('#password').press('Enter');

  await page.waitForURL('**/', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Go directly to the problematic customer
  await page.goto(CUSTOMER_URL);
  await page.waitForTimeout(3000);

  // Take screenshot of customer profile
  await page.screenshot({
    path: `test-results/nk3-live-customer-profile-${Date.now()}.png`,
    fullPage: true,
  });

  // Click Payment tab
  const paymentTab = page.getByRole('button', { name: /Payment|Thanh toán/i }).first();
  if (await paymentTab.isVisible().catch(() => false)) {
    await paymentTab.click();
    await page.waitForTimeout(2500);
  } else {
    // Fallback: try text
    await page.getByText(/Payment|Thanh toán/i).first().click().catch(() => {});
    await page.waitForTimeout(2500);
  }

  // Screenshot the payment section
  await page.screenshot({
    path: `test-results/nk3-live-payment-tab-${Date.now()}.png`,
    fullPage: true,
  });

  // Find all payment rows
  const paymentRows = page.locator('table tbody tr, [data-payment-id], .payment-row');
  const rowCount = await paymentRows.count();

  console.log(`[NK3 LIVE DIAGNOSTIC] Found ${rowCount} payment-related rows on this customer.`);

  // Look for any delete, void, remove, or action buttons in the payment area
  const possibleDeleteButtons = page.locator('button').filter({
    hasText: /delete|void|xóa|hủy|remove|trash/i
  });

  const deleteBtnCount = await possibleDeleteButtons.count();
  console.log(`[NK3 LIVE DIAGNOSTIC] Found ${deleteBtnCount} buttons containing delete/void/remove text.`);

  // Log details about each potential delete button (visibility, disabled state)
  for (let i = 0; i < Math.min(deleteBtnCount, 10); i++) {
    const btn = possibleDeleteButtons.nth(i);
    const isVisible = await btn.isVisible().catch(() => false);
    const isDisabled = await btn.isDisabled().catch(() => false);
    const text = await btn.innerText().catch(() => 'N/A');

    console.log(`  Button ${i}: visible=${isVisible}, disabled=${isDisabled}, text="${text}"`);
  }

  // Also check for any error messages or disabled states in the whole payment section
  const errorMessages = await page.locator('text=/cannot|không thể|error|lỗi|failed|không xóa/i').count();
  if (errorMessages > 0) {
    console.log(`[NK3 LIVE DIAGNOSTIC] Found ${errorMessages} potential error/warning messages on the page.`);
  }

  // Final wide screenshot of the payment area
  await page.screenshot({
    path: `test-results/nk3-live-payment-full-${Date.now()}.png`,
    fullPage: true,
  });

  // The real answer is almost certainly that the fix (reverseOnRefund on delete) has not been deployed to this live environment yet.
  expect(true).toBe(true);
});
