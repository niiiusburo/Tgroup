import { test, expect } from '@playwright/test';

test('check API permissions directly', async ({ page }) => {
  await page.goto('http://76.13.16.68:5175/login');
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#email')).toBeHidden({ timeout: 20000 });

  const res = await page.evaluate(async () => {
    const r = await fetch('/api/Permissions/groups', { cache: 'no-store' });
    return r.json();
  });

  if (!Array.isArray(res)) {
    throw new Error('API did not return array: ' + JSON.stringify(res));
  }
  const admin = res.find((g: any) => g.name.toLowerCase().includes('admin'));
  if (!admin) {
    throw new Error('No admin group found. Groups: ' + JSON.stringify(res.map((g: any) => g.name)));
  }
  console.log('Admin permissions:', admin.permissions);

  expect(admin.permissions).toContain('external_checkups.view');
  expect(admin.permissions).toContain('external_checkups.create');
  expect(admin.permissions).toContain('permissions.edit');
});
