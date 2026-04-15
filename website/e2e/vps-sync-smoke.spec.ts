import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

const BASE = 'http://localhost:5175';

test('VPS sync smoke — login + KIEN row visible', async ({ page }) => {
  await page.goto(BASE);
  const emailInput = page.locator('#email');
  await expect(emailInput).toBeVisible({ timeout: 10_000 });

  await emailInput.fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();

  await expect(page.locator('#email')).toBeHidden({ timeout: 15_000 });
  await page.waitForLoadState('networkidle');

  const token = await page.evaluate(() => localStorage.getItem('tgclinic_token'));
  expect(token).toBeTruthy();

  await page.goto(`${BASE}/employees`);
  await page.waitForLoadState('networkidle');

  const kienRow = page.getByText(/ki[eê]n/i).first();
  await expect(kienRow).toBeVisible({ timeout: 10_000 });
});
