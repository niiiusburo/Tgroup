// verify_ui.mjs — adversarial check of the two UI passes most at risk of false-positive,
// plus screenshot evidence for /ctv/join, /commission (payouts + ctv tabs), /payment.
import { createRequire } from 'module';
import { CONFIG, login, loggedInPage } from './lib.mjs';
const require = createRequire('/Users/thuanle/Documents/TamTMV/Tgrouptest/website/');
const { chromium } = require('playwright');

const SHOT = '/Users/thuanle/Documents/TamTMV/Tgrouptest/testsprite_tests/ctv_commission/shots';
import { mkdirSync } from 'fs';
mkdirSync(SHOT, { recursive: true });

const b = await chromium.launch({ headless: true });
const { context, page } = await loggedInPage(b);
const out = {};

// W4: dump the ACTUAL LOB selector option labels in the Payouts tab (not a substring match).
await page.goto(`${CONFIG.BASE}/commission`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const payTab = page.locator('button:has-text("Chi trả"), [role="tab"]:has-text("Chi trả"), button:has-text("Payout")').first();
if (await payTab.count()) { await payTab.click().catch(() => {}); await page.waitForTimeout(1500); }
out.w4_select_options = await page.evaluate(() => {
  const opts = [];
  document.querySelectorAll('select option').forEach((o) => opts.push(o.textContent.trim()));
  // also capture segmented buttons that act as LOB filter
  document.querySelectorAll('button').forEach((btn) => {
    const t = btn.textContent.trim();
    if (/tất cả|combined|gộp|dental|cosmetic|nha khoa|thẩm mỹ|all/i.test(t) && t.length < 30) opts.push('[btn] ' + t);
  });
  return [...new Set(opts)];
});
await page.screenshot({ path: `${SHOT}/commission_payouts.png`, fullPage: false });

// W6: confirm the draggable elements are CTV hierarchy rows (tag + a sample of their text).
const ctvTab = page.locator('button:has-text("CTV"), [role="tab"]:has-text("CTV"), button:has-text("Cộng tác")').first();
if (await ctvTab.count()) { await ctvTab.click().catch(() => {}); await page.waitForTimeout(1500); }
out.w6_draggable = await page.evaluate(() => {
  const els = [...document.querySelectorAll('[draggable="true"]')];
  const tags = {};
  els.slice(0, 300).forEach((e) => { tags[e.tagName] = (tags[e.tagName] || 0) + 1; });
  const sample = els.slice(0, 4).map((e) => (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50));
  return { count: els.length, byTag: tags, sample };
});
await page.screenshot({ path: `${SHOT}/commission_ctv.png`, fullPage: false });

// Evidence shots for the other surfaces.
await page.goto(`${CONFIG.BASE}/payment`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
out.w7_selector = await page.locator('#deposit-history-customer').count();
await page.screenshot({ path: `${SHOT}/payment.png`, fullPage: false });

const jp = await b.newPage();
await jp.goto(`${CONFIG.BASE}/ctv/join`, { waitUntil: 'domcontentloaded' });
await jp.waitForTimeout(1800);
out.w1_join_text = (await jp.evaluate(() => document.body.innerText || '')).replace(/\s+/g, ' ').slice(0, 400);
await jp.screenshot({ path: `${SHOT}/ctv_join.png`, fullPage: false });

await context.close(); await b.close();
console.log(JSON.stringify(out, null, 2));
