/**
 * Hotfix Verification Screenshots — Final Version
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const DIR = '/Users/thuanle/Documents/TamTMV/Tgrouptest/website/e2e/screenshots';
const URL = 'https://nk.2checkin.com';
const PHONE = '0984896556';

function getToken(): string {
  const token = fs.readFileSync('/tmp/tgroup_token.txt', 'utf-8').trim();
  if (!token || token.length < 50) throw new Error('No valid token in /tmp/tgroup_token.txt — run: bash get-token.sh');
  return token;
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  for (const f of fs.readdirSync(DIR)) {
    if (f.startsWith('hotfix-')) fs.unlinkSync(path.join(DIR, f));
  }

  const token = await getToken();
  console.log('🔐 Token obtained');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
  const page = await ctx.newPage();
  const sleep = (ms: number) => page.waitForTimeout(ms);

  try {
    // Auth
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate((t: string) => localStorage.setItem('tgclinic_token', t), token);
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await sleep(3000);
    console.log('✅ Logged in');

    // ====================================================
    // PROOF 1: CUSTOMER PROFILE — Note + Source
    // ====================================================
    console.log('\n📸 PROOF 1: Customer profile...');
    await page.goto(`${URL}/customers`, { waitUntil: 'load', timeout: 30000 });
    await sleep(3000);

    // Search
    const inputs = page.locator('input[type="text"]');
    for (let i = 0; i < await inputs.count(); i++) {
      const ph = await inputs.nth(i).getAttribute('placeholder');
      if (ph && /tìm|search/i.test(ph)) {
        await inputs.nth(i).fill(PHONE);
        await sleep(2000);
        break;
      }
    }

    // Click row
    const rows = page.locator('table tr, [role="row"]');
    for (let i = 0; i < await rows.count(); i++) {
      if ((await rows.nth(i).innerText()).includes(PHONE)) {
        await rows.nth(i).locator('td, [role="cell"]').first().click();
        await sleep(3000);
        break;
      }
    }

    await page.screenshot({ path: path.join(DIR, 'hotfix-01-customer-profile.png'), fullPage: true });
    console.log('✅ 01-customer-profile.png');

    // ====================================================
    // PROOF 2: RECORDS TAB — Staff fields
    // ====================================================
    console.log('\n📸 PROOF 2: Records tab...');
    const tabs = page.locator('button, [role="tab"], div[class*="tab"], li[class*="tab"]');
    for (let i = 0; i < await tabs.count(); i++) {
      const txt = await tabs.nth(i).innerText();
      if (/hồ sơ|lịch sử|điều trị|records/i.test(txt) && txt.length < 30) {
        await tabs.nth(i).click();
        await sleep(3000);
        console.log(`  Clicked: "${txt}"`);
        break;
      }
    }
    await page.screenshot({ path: path.join(DIR, 'hotfix-02-records-staff.png'), fullPage: true });
    console.log('✅ 02-records-staff.png');

    // ====================================================
    // PROOF 3: SERVICE CUSTOMER SEARCH
    // ====================================================
    console.log('\n📸 PROOF 3: Service phone search...');
    await page.goto(`${URL}/services`, { waitUntil: 'load', timeout: 30000 });
    await sleep(3000);

    // Click "New Service" button via JS to avoid pointer interception
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const newSvc = btns.find(b => b.textContent?.includes('New Service'));
      if (newSvc) (newSvc as HTMLButtonElement).click();
    });
    await sleep(3000);
    console.log('  Clicked "New Service" via JS');

    // Check if form appeared
    const formLabels = page.locator('label');
    const flCount = await formLabels.count();
    let foundCustomerLabel = false;
    for (let i = 0; i < flCount; i++) {
      const txt = await formLabels.nth(i).innerText();
      if (txt.includes('Khách hàng')) {
        foundCustomerLabel = true;
        console.log(`  Found label: "${txt}"`);
        break;
      }
    }
    console.log(`  Customer label found: ${foundCustomerLabel}`);

    if (!foundCustomerLabel) {
      console.log('  ⚠️ ServiceForm did not render! Taking debug screenshot');
      await page.screenshot({ path: path.join(DIR, 'hotfix-03a-search-5digits.png'), fullPage: true });
      // Try alternative: add service from customer profile instead
      console.log('  Trying via customer profile...');
      await page.goto(`${URL}/customers`, { waitUntil: 'load', timeout: 30000 });
      await sleep(3000);
      // Search for QA customer
      const cInputs = page.locator('input[type="text"]');
      for (let i = 0; i < await cInputs.count(); i++) {
        const ph = await cInputs.nth(i).getAttribute('placeholder');
        if (ph && /tìm|search/i.test(ph)) {
          await cInputs.nth(i).fill(PHONE);
          await sleep(2000);
          break;
        }
      }
      // Click customer row
      const cRows = page.locator('table tr, [role="row"]');
      for (let i = 0; i < await cRows.count(); i++) {
        if ((await cRows.nth(i).innerText()).includes(PHONE)) {
          await cRows.nth(i).locator('td, [role="cell"]').first().click();
          await sleep(3000);
          break;
        }
      }
      // Look for "Add Service" or "Thêm dịch vụ" button on profile
      const addSvcBtn = page.locator('button').filter({ hasText: /Thêm dịch vụ|Add Service|Tạo phiếu/i }).first();
      const asbExists = await addSvcBtn.count();
      console.log(`  Add Service button count: ${asbExists}`);
      if (asbExists > 0) {
        await addSvcBtn.click({ force: true, timeout: 5000 });
        await sleep(3000);
        console.log('  Clicked Add Service from profile');
      }
      // Now scroll down and try again
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1000);
    }

    // ServiceForm renders below the list — scroll down to find it
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1000);

    // Find the CustomerSelector button — shows "Select customer..." or similar
    const selectorBtn = page.locator('button').filter({ hasText: /Select customer|Chọn khách/i }).first();
    const sbExists = await selectorBtn.count();
    console.log(`  CustomerSelector button count: ${sbExists}`);
    if (sbExists > 0) {
      await selectorBtn.click({ force: true, timeout: 5000 });
      await sleep(2000);
      console.log('  Opened CustomerSelector dropdown');
    } else {
      // Debug: list all visible buttons
      console.log('  Listing all visible buttons:');
      const vbs = page.locator('button:visible');
      for (let i = 0; i < Math.min(await vbs.count(), 20); i++) {
        console.log(`    [${i}] "${(await vbs.nth(i).innerText()).substring(0, 60)}"`);
      }
    }

    // Find the dropdown search input
    const searchInp = page.locator('input[placeholder*="Tìm theo"], input[placeholder*="SĐT"]').first();
    const searchVis = await searchInp.isVisible().catch(() => false);
    console.log(`  Search input visible: ${searchVis}`);

    if (searchVis) {
      // Type 5 digits
      await searchInp.fill(PHONE.substring(0, 5));
      await sleep(2500);
      console.log(`  Typed 5 digits: ${PHONE.substring(0, 5)}`);
      await page.screenshot({ path: path.join(DIR, 'hotfix-03a-search-5digits.png') });

      // Type full number
      await searchInp.fill(PHONE);
      await sleep(2500);
      console.log(`  Typed full: ${PHONE}`);
      await page.screenshot({ path: path.join(DIR, 'hotfix-03b-search-full.png') });
    } else {
      // Debug state
      console.log('  Taking debug screenshot');
      await page.screenshot({ path: path.join(DIR, 'hotfix-03a-search-5digits.png') });
    }

    // Full page
    await page.screenshot({ path: path.join(DIR, 'hotfix-03c-service-form.png'), fullPage: true });
    console.log('✅ 03 service search screenshots');

    // ====================================================
    // SUMMARY
    // ====================================================
    console.log('\n🎉 DONE! Screenshots:');
    for (const f of fs.readdirSync(DIR).sort()) {
      if (f.startsWith('hotfix-')) {
        console.log(`  ${f} (${(fs.statSync(path.join(DIR, f)).size / 1024).toFixed(1)} KB)`);
      }
    }
    console.log('\n📍 Location:', DIR);
  } catch (err: any) {
    console.error('❌', err.message);
    await page.screenshot({ path: path.join(DIR, 'hotfix-ERROR.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
