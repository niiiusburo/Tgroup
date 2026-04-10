import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/permissions',    label: 'Permissions' },
  { path: '/service-catalog', label: 'Service Catalog' },
  { path: '/settings',       label: 'Settings' },
  { path: '/customers',      label: 'Customers' },
  { path: '/calendar',       label: 'Calendar' },
  { path: '/',               label: 'Overview' },
  { path: '/appointments',   label: 'Appointments' },
];

for (const pg of PAGES) {
  test(`${pg.label} (${pg.path}) - accessible`, async ({ page }) => {
    await page.goto(`http://localhost:5174${pg.path}`);
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    
    const denied = await page.getByText('Access Denied').isVisible().catch(() => false);
    if (denied) {
      console.log(`❌ ${pg.label} - ACCESS DENIED`);
    } else {
      const body = await page.textContent('body');
      console.log(`✅ ${pg.label} - loaded (${body?.length || 0} chars)`);
    }
    expect(denied).toBeFalsy();
  });
}
