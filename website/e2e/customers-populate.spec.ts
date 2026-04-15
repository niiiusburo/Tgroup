import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5175';

test('customers page populates for admin', async ({ page }) => {
  // Collect console errors
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // 1. Go to login
  await page.goto(`${BASE}/login`);
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();

  // 2. Wait for redirect to dashboard
  await page.waitForURL(`${BASE}/`, { timeout: 10000 });

  // 3. Navigate to customers
  await page.goto(`${BASE}/customers`);
  await page.waitForLoadState('networkidle');

  // 4. Wait for customer rows or the table to appear
  const rows = page.locator('table tbody tr');
  await rows.first().waitFor({ timeout: 10000 });

  // 5. Assert at least one customer is visible
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);

  // 6. Assert no JS crash errors (ignore transient network fetch errors)
  const jsErrors = errors.filter(e => !e.includes('Failed to fetch') && !e.includes('Error loading locations'));
  expect(jsErrors).toEqual([]);
});
