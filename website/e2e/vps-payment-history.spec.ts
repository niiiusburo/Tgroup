import { test, expect, type Page } from '@playwright/test';

/**
 * VPS Payment History Verification Test
 *
 * Verifies that historical payments from accountpayments table
 * correctly show up on the customer profile Payment tab.
 *
 * Run against VPS:
 *   VPS_URL=http://your-vps-ip:5174 npx playwright test e2e/vps-payment-history.spec.ts --workers=1
 */

const TARGET_URL = process.env.VPS_URL || 'http://localhost:5174';
const CUSTOMER_NAME = 'LƯƠNG HỒNG NHUNG';

async function login(page: Page) {
  await page.goto(`${TARGET_URL}/login`);

  const emailInput = page.locator('#email');
  const isLoginPage = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
  if (!isLoginPage) {
    // Already authenticated via localStorage token
    await page.goto(`${TARGET_URL}/`);
    await page.getByRole('link', { name: 'Customers' }).waitFor({ timeout: 10000 });
    return;
  }

  await emailInput.fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();

  // Wait for dashboard to load
  await page.getByRole('link', { name: 'Customers' }).waitFor({ timeout: 15000 });
}

async function openCustomerProfile(page: Page, customerName: string) {
  await page.getByRole('link', { name: 'Customers' }).click();
  await expect(page.locator('main').getByRole('heading', { name: 'Customers' })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500); // let table rows load

  await page.getByRole('cell', { name: new RegExp(customerName, 'i') }).first().click();
  await expect(page.getByRole('heading', { name: 'Customer Profile' })).toBeVisible({ timeout: 10000 });
}

test.describe('VPS Payment History', () => {
  test('Payment tab shows historical payments for Lương Hồng Nhung', async ({ page }) => {
    console.log(`\n🌐 Testing against: ${TARGET_URL}`);

    await login(page);
    await openCustomerProfile(page, CUSTOMER_NAME);

    // Click Payment tab
    const paymentTab = page.locator('button', { hasText: /^Payment/i });
    await paymentTab.click();
    await page.waitForTimeout(1000);

    // Take screenshot of payment tab
    await page.screenshot({ path: 'e2e/screenshots/vps-payment-history.png' });

    // Assert payment history list is visible (not empty state)
    const emptyState = page.getByText('No payment records found');
    const hasPayments = await emptyState.isHidden({ timeout: 5000 }).catch(() => true);

    if (!hasPayments) {
      console.error('\n❌ FAIL: Payment history is empty on VPS');
      console.error('   Expected: historical payments from accountpayments table');
      console.error('   Actual: "No payment records found"');
    }

    expect(hasPayments, 'Payment history should not be empty').toBe(true);

    // Verify at least one payment row is visible
    const paymentRows = page.locator('div[class*="hover:bg-gray-50"]').filter({ hasText: /\d{1,3}(\.\d{3})+\s*đ/ });
    const rowCount = await paymentRows.count();

    console.log(`\n✅ PASS: Found ${rowCount} payment row(s) for ${CUSTOMER_NAME}`);
    expect(rowCount).toBeGreaterThan(0);
  });
});
