// lib.mjs — shared helpers for the CTV referral & commission TestSprite-style suite.
// API-level tests use built-in fetch (Node 18+). UI-level tests use Playwright
// resolved from website/node_modules. Safe-by-default: mutating tests are gated
// behind ALLOW_MUTATIONS=1 and skipped otherwise.
import { createRequire } from 'module';

const WEBSITE = '/Users/thuanle/Documents/TamTMV/Tgrouptest/website/';
const require = createRequire(WEBSITE);

export const CONFIG = {
  BASE: process.env.TS_BASE || 'https://tmv.2checkin.com',
  EMAIL: process.env.TS_EMAIL || 't@clinic.vn',
  PASSWORD: process.env.TS_PASSWORD || '123123',
  ALLOW_MUTATIONS: process.env.ALLOW_MUTATIONS === '1' || process.env.ALLOW_MUTATIONS === 'true',
  HEADLESS: process.env.HEADLESS !== '0',
  UI: process.env.NO_UI !== '1',
};

export class AssertError extends Error {}

export function assert(cond, msg) {
  if (!cond) throw new AssertError(msg || 'assertion failed');
}
export function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new AssertError(`${msg || 'assertEq'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
export function assertIn(needle, haystack, msg) {
  if (!String(haystack).includes(needle)) {
    throw new AssertError(`${msg || 'assertIn'}: "${needle}" not found`);
  }
}

// --- HTTP -----------------------------------------------------------------
export async function login() {
  const r = await fetch(`${CONFIG.BASE}/api/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CONFIG.EMAIL, password: CONFIG.PASSWORD }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.token) throw new Error(`login failed: HTTP ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j.token;
}

// api(path, {method, body, token, lob, headers}) -> {status, json, text}
export async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  if (opts.lob) headers['X-LOB'] = opts.lob;
  const init = { method: opts.method || 'GET', headers };
  if (opts.body !== undefined) init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
  const r = await fetch(`${CONFIG.BASE}${path}`, init);
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: r.status, json, text };
}

export function errCode(res) {
  return res.json && res.json.error && res.json.error.code ? res.json.error.code : null;
}

// --- Browser --------------------------------------------------------------
let _chromium = null;
export async function getBrowser() {
  if (!_chromium) {
    const { chromium } = require('playwright');
    _chromium = await chromium.launch({ headless: CONFIG.HEADLESS, args: ['--window-size=1440,900'] });
  }
  return _chromium;
}
export async function closeBrowser() {
  if (_chromium) { await _chromium.close().catch(() => {}); _chromium = null; }
}

// Returns a logged-in page. Live login email input is type="text" (NOT email),
// so we fill the first text-ish input directly (lesson from prior Playwright runs).
export async function loggedInPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  await page.goto(`${CONFIG.BASE}/login`, { waitUntil: 'domcontentloaded' });
  // Fill credentials: be resilient to text vs email input types.
  const inputs = page.locator('input');
  await inputs.first().waitFor({ state: 'visible', timeout: 15000 });
  const emailInput = page.locator('input[type="email"], input[type="text"], input[name="email"]').first();
  const pwInput = page.locator('input[type="password"]').first();
  await emailInput.fill(CONFIG.EMAIL);
  await pwInput.fill(CONFIG.PASSWORD);
  await page.locator('button[type="submit"], button:has-text("Đăng nhập"), button:has-text("Login")').first().click();
  await page.waitForURL((u) => !/\/login$/.test(u.toString()), { timeout: 20000 }).catch(() => {});
  return { context, page };
}

export async function bodyText(page) {
  return page.evaluate(() => document.body.innerText || '');
}
