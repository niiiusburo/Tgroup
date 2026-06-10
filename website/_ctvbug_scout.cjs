
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto('https://tmv.2checkin.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('#email').fill('t@clinic.vn');
    await page.locator('#password').fill('123123');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    const url = page.url();
    console.log('AFTER-LOGIN-URL:', url);
    const token = await page.evaluate(() => localStorage.getItem('tgclinic_token'));
    console.log('TOKEN-LEN:', (token || '').length);
    const r = await page.evaluate(async () => {
      const t = localStorage.getItem('tgclinic_token');
      const res = await fetch('/api/Ctvs?offset=0&limit=20', { headers: { Authorization: 'Bearer ' + t } });
      return { status: res.status, body: (await res.text()).slice(0, 2500) };
    });
    console.log('CTVS-RESP:', JSON.stringify(r));
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    await browser.close();
  }
})();
