import { test, expect } from '@playwright/test';

/**
 * Auth setup — runs before all other E2E tests.
 * Logs in as admin with Remember Me and saves storage state (localStorage token)
 * so subsequent tests skip the login flow entirely.
 */
test('authenticate as admin', async ({ page }) => {
  // Navigate to app — will show login form
  await page.goto('http://localhost:5175');

  // Wait for the login form to render (SPA takes a moment)
  const emailInput = page.locator('#email');
  await expect(emailInput).toBeVisible({ timeout: 10_000 });

  // Fill and submit login
  await emailInput.fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('#rememberMe').setChecked(true);
  await page.locator('button[type="submit"]').click();

  // Wait for auth to complete — the login form disappears and dashboard renders
  // The app stays on / but renders the main layout instead of the login form
  await expect(page.locator('#email')).toBeHidden({ timeout: 15_000 });
  await page.waitForLoadState('networkidle');

  // Verify token was saved in localStorage
  const token = await page.evaluate(() => localStorage.getItem('tgclinic_token'));
  expect(token).toBeTruthy();
  console.log('✅ Login successful — token saved');

  // Save storage state for other tests
  await page.context().storageState({ path: '.auth/admin.json' });
});
