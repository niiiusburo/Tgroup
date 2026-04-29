import { chromium } from 'playwright';

const URL = 'https://nk.2checkin.com';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Collect network info
  const requests: string[] = [];
  page.on('request', req => {
    if (req.url().includes('api') || req.url().includes('auth') || req.url().includes('login')) {
      requests.push(`→ ${req.method()} ${req.url()}`);
    }
  });
  page.on('response', res => {
    if (res.url().includes('api') || res.url().includes('auth') || res.url().includes('login')) {
      requests.push(`← ${res.status()} ${res.url()}`);
    }
  });
  page.on('console', msg => console.log('  [console]', msg.type(), msg.text()));

  await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());

  // Check what elements are present
  const emailVisible = await page.locator('#email').isVisible();
  const passVisible = await page.locator('#password').isVisible();
  const submitBtn = page.locator('button[type="submit"]');
  const submitVisible = await submitBtn.isVisible();
  const submitText = await submitBtn.innerText().catch(() => 'n/a');

  console.log('email visible:', emailVisible);
  console.log('password visible:', passVisible);
  console.log('submit visible:', submitVisible, 'text:', submitText);

  // Fill and submit
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');

  // Check what button type and form action looks like
  const formAction = await page.locator('form').getAttribute('action').catch(() => 'no form');
  console.log('Form action:', formAction);

  // Click submit
  await submitBtn.click();
  await page.waitForTimeout(5000);

  console.log('\nAfter submit:');
  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  // Check body content
  const bodyText = await page.locator('body').innerText();
  console.log('Body (first 500 chars):', bodyText.substring(0, 500));

  // Check for any toast/notification
  const toastText = await page.locator('[class*="toast"], [class*="Toast"], [class*="notification"], [role="alert"]').first().innerText().catch(() => 'none');
  console.log('Toast/alert:', toastText);

  // Network summary
  console.log('\nNetwork requests:');
  requests.forEach(r => console.log(' ', r));

  await page.screenshot({ path: 'e2e/screenshots/debug-after-login.png', fullPage: true });

  await browser.close();
})();
