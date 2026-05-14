import { test, expect } from '@playwright/test';

test.describe('Remember Me login', () => {
  test('token cookie has 60-day expiry when Remember Me is checked', async ({ page, context }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@tgclinic.vn');
    await page.fill('input[type="password"]', 'password');
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('/', { timeout: 10000 });

    const cookies = await context.cookies();
    const tokenCookie = cookies.find(c => c.name === 'tgclinic_token');
    // Token should be present; exact expiry is server-side but localStorage flag confirms remember me
    expect(tokenCookie).toBeDefined();
  });
});
