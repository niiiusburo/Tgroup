import { test, expect } from '@playwright/test';

test.describe('Brand Rename: localStorage keys use tgclinic prefix', () => {
  test('auth token stored as tgclinic_token after login', async ({ page }) => {
    await page.goto('http://localhost:5175/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('http://localhost:5175/login');
    await page.fill('input#email', 'tg@clinic.vn');
    await page.fill('input#password', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');

    const token = await page.evaluate(() => localStorage.getItem('tgclinic_token'));
    expect(token).toBeTruthy();

    const oldToken = await page.evaluate(() => localStorage.getItem('tdental_token'));
    expect(oldToken).toBeNull();
  });
});
