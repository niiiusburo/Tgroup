import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test('check console for JS errors on Calendar', async ({ page }) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') errors.push(text);
    if (msg.type() === 'warning') warnings.push(text);
    console.log(`[${msg.type()}] ${text}`);
  });
  page.on('pageerror', err => {
    errors.push(err.message);
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  await page.goto('http://localhost:5175/calendar');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'e2e/console-check-calendar.png', fullPage: true });

  console.log(`Errors: ${errors.length}, Warnings: ${warnings.length}`);
  expect(errors.filter(e => !e.includes('favicon') && !e.includes('Source map'))).toHaveLength(0);
});
