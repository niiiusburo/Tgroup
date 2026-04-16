import { test, expect } from '@playwright/test';

test('intercept API groups response', async ({ page }) => {
  await page.goto('http://76.13.16.68:5174/login');
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#email')).toBeHidden({ timeout: 20000 });

  let apiResponse: any = null;
  page.on('response', async (res) => {
    if (res.url().includes('/api/Permissions/groups')) {
      try {
        apiResponse = await res.json();
      } catch {}
    }
  });

  await page.goto('http://76.13.16.68:5174/permissions');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  if (!apiResponse) {
    throw new Error('No API response captured');
  }

  const admin = apiResponse.find((g: any) => g.name.toLowerCase().includes('admin'));
  if (!admin) {
    throw new Error('No admin group. Names: ' + JSON.stringify(apiResponse.map((g: any) => g.name)));
  }

  console.log('Admin permissions from API:', admin.permissions);
  expect(admin.permissions).toContain('external_checkups.view');
  expect(admin.permissions).toContain('external_checkups.create');
});
