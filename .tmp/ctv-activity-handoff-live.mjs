import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('docs/live-artifacts/live-verify-screenshots');
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const outPath = path.join(outDir, `tmv-ctv-activity-handoff-${stamp}.png`);

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--window-size=390,844'],
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

try {
  await page.goto('https://tmv.2checkin.com/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', '0972020908');
  await page.fill('input[type="password"]', '123123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/ctv**', { timeout: 20000 }).catch(() => undefined);
  if (!page.url().includes('/ctv')) {
    await page.goto('https://tmv.2checkin.com/ctv', { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(2000);

  const activityBtn = page.locator('button').filter({ hasText: 'Lương Thị Ái Duyên' }).first();
  await activityBtn.waitFor({ timeout: 15000 });
  await activityBtn.click();
  await page.waitForTimeout(1500);

  const search = page.locator('input[type="search"]');
  const searchValue = await search.inputValue();
  const focusBanner = await page.locator('text=Từ hoa hồng').count();
  const expanded = await page.locator('button[aria-expanded="true"]').count();
  const fillerVisible = await page.locator('text=Giảm đau').count();

  await page.screenshot({ path: outPath, fullPage: true });

  console.log(JSON.stringify({
    url: page.url(),
    searchValue,
    focusBanner,
    expandedFlipCards: expanded,
    serviceVisible: fillerVisible,
    screenshot: outPath,
  }, null, 2));
} finally {
  await browser.close();
}