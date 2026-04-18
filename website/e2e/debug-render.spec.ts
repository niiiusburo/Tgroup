import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5174';

test('debug - check page content and console errors', async ({ page }) => {
  // Collect console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  // Get full page HTML content
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  const rootHTML = await page.evaluate(() => document.getElementById('root')?.innerHTML ?? 'NO ROOT');
  
  console.log('\n=== Root div content (first 500 chars) ===');
  console.log(rootHTML.substring(0, 500));
  console.log(`\nRoot length: ${rootHTML.length}`);
  
  console.log('\n=== Console Errors ===');
  for (const e of errors) {
    console.log(`  ${e}`);
  }

  // Get page title
  const title = await page.title();
  console.log(`\nPage title: "${title}"`);

  // Check if React root exists
  const hasRoot = await page.evaluate(() => !!document.getElementById('root'));
  console.log(`Has #root: ${hasRoot}`);

  await page.screenshot({ path: 'e2e/screenshots/debug-page.png', fullPage: true });
});
