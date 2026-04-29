import { chromium } from 'playwright';

const URL = 'https://nk.2checkin.com';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Try passwords
  for (const pwd of ['123456', 'admin123', 'Admin@123', 'password']) {
    console.log(`\nTrying tg@clinic.vn / ${pwd}...`);
    await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    const emailEl = page.locator('#email');
    try {
      await emailEl.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      // Already logged in from previous attempt?
      console.log('  No login form visible, checking URL:', page.url());
      const bodyText = await page.locator('body').innerText();
      console.log('  Body preview:', bodyText.substring(0, 200));
      continue;
    }

    await emailEl.fill('tg@clinic.vn');
    await page.locator('#password').fill(pwd);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(4000);

    const url = page.url();
    console.log('  Result URL:', url);

    // Check if still on login
    const stillLogin = await page.locator('#email').isVisible().catch(() => false);
    console.log('  Login form still visible:', stillLogin);

    // Check for error messages
    const errorText = await page.locator('[class*="error"], [class*="Error"], .text-red-500, .text-danger').first().innerText().catch(() => 'none');
    console.log('  Error message:', errorText);

    // Screenshot
    await page.screenshot({ path: `e2e/screenshots/login-${pwd}.png` });

    if (!stillLogin && url !== URL + '/login' && !url.endsWith('/login')) {
      console.log('  ✅ SUCCESS with password:', pwd);
      // Check localStorage
      const token = await page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          console.log('  localStorage:', key, '=', (localStorage.getItem(key) || '').substring(0, 50));
        }
        return localStorage.getItem('tgclinic_token') || localStorage.getItem('token') || 'no token found';
      });
      console.log('  Token:', token?.substring(0, 50));
      break;
    }
  }

  await browser.close();
})();
