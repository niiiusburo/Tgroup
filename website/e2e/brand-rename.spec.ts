import { test, expect } from '@playwright/test';

test.describe('Brand Rename: TDental -> TG Clinic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5175/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('http://localhost:5175/login');
  });

  test('login page title contains TG Clinic', async ({ page }) => {
    await expect(page).toHaveTitle(/TG Clinic/);
  });

  test('login page heading shows TG Clinic', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('TG Clinic');
  });

  test('login page footer contains TG Clinic Management System', async ({ page }) => {
    await expect(page.locator('text=TG Clinic Management System')).toBeVisible();
  });

  test('sidebar shows TG Clinic after login', async ({ page }) => {
    await page.fill('input#email', 'tg@clinic.vn');
    await page.fill('input#password', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    const content = await page.content();
    expect(content).toContain('TG Clinic');
  });
});
