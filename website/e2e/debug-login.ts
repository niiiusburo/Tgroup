import { chromium } from 'playwright';

const URL = 'https://nk.2checkin.com';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const requests: string[] = [];
  page.on('request', (req: any) => {
    const u = req.url();
    if (u.includes('api') || u.includes('auth') || u.includes('login')) {
      requests.push('→ ' + req.method() + ' ' + u);
    }
  });
  page.on('response', (res: any) => {
    const u = res.url();
    if (u.includes('api') || u.includes('auth') || u.includes('login')) {
      requests.push('← ' + res.status() + ' ' + u);
    }
  });
  page.on('console', (msg: any) => console.log('  [console]', msg.type(), msg.text()));

  await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());

  const emailVisible = await page.locator('#email').isVisible();
  const passVisible = await page.locator('#password').isVisible();
  const submitBtn = page.locator('button[type="submit"]');
  const submitVisible = await submitBtn.isVisible();
  const submitText = await submitBtn.innerText().catch(() => 'n/a');

  console.log('email visible:', emailVisible);
  console.log('password visible:', passVisible);
  console.log('submit visible:', submitVisible, 'text:', submitText);

  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');

  const formAction = await page.locator('form').getAttribute('action').catch(() => 'no form');
  console.log('Form action:', formAction);

  await submitBtn.click();
  await page.waitForTimeout(5000);

  console.log('\nAfter submit:');
  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  const bodyText = await page.locator('body').innerText();
  console.log('Body (first 500 chars):', bodyText.substring(0, 500));

  const toastText = await page.locator('[class*="toast"], [class*="Toast"], [class*="notification"], [role="alert"]').first().innerText().catch(() => 'none');
  console.log('Toast/alert:', toastText);

  console.log('\nNetwork requests:');
  requests.forEach((r: string) => console.log(' ', r));

  await page.screenshot({ path: 'e2e/screenshots/debug-after-login.png', fullPage: true });

  await browser.close();
})();
