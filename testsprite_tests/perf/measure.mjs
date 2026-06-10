// measure.mjs — sequential (contention-free) perf scout of the live NK3 admin portal.
// API latencies (median of 3) + headless page-load timings with per-page XHR waterfalls.
// Output: testsprite_tests/perf/results.json + a ranked console summary.
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CONFIG, login, api, getBrowser, closeBrowser, loggedInPage } from '../ctv_commission/lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TODAY = process.env.TODAY || '2026-06-06';

const API_TARGETS = [
  '/api/Auth/me',
  '/api/DashboardReports',
  `/api/Appointments?date=${TODAY}`,
  '/api/Appointments?limit=50',
  '/api/Partners?limit=20',
  '/api/Partners?limit=50',
  '/api/SaleOrders?limit=20',
  '/api/SaleOrders/lines?limit=20',
  '/api/Payments?limit=20',
  '/api/Earnings?limit=50',
  '/api/NewClients?limit=20',
  '/api/Ctvs',
  '/api/Payouts?lob=dental&limit=20',
  '/api/Products?limit=50',
  '/api/ProductCategories',
  '/api/Services',
  '/api/Employees?limit=50',
  '/api/Companies',
  '/api/Permissions/groups',
  '/api/Permissions/employees',
  '/api/MonthlyPlans',
  '/api/CommissionConfig?lob=dental',
  '/api/CustomerSources',
  '/api/DotKhams?limit=20',
  '/api/Reports/revenue',
  '/api/Reports/appointments',
  '/api/SystemPreferences',
  '/api/settings',
];

const PAGES = [
  '/', '/calendar', '/appointments', '/customers', '/services', '/service-catalog',
  '/payment', '/employees', '/locations', '/commission', '/settings', '/feedback',
  '/permissions', '/relationships', '/notifications',
  '/reports/dashboard', '/reports/revenue', '/reports/appointments', '/reports/doctors',
  '/reports/customers', '/reports/services', '/reports/employees', '/reports/locations',
];

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

async function timeApi(path, token) {
  const runs = []; let status = 0, bytes = 0;
  for (let i = 0; i < 3; i++) {
    const t = Date.now();
    const r = await api(path, { token });
    runs.push(Date.now() - t); status = r.status; bytes = (r.text || '').length;
  }
  return { path, ms: median(runs), max: Math.max(...runs), status, kb: Math.round(bytes / 1024) };
}

async function timePage(context, path) {
  const page = await context.newPage();
  const t0 = Date.now();
  try {
    await page.goto(CONFIG.BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 18000 }).catch(() => {});
  } catch { /* capture whatever we got */ }
  const wallMs = Date.now() - t0;
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paint = performance.getEntriesByType('paint');
    const fcp = (paint.find((p) => p.name === 'first-contentful-paint') || {}).startTime || null;
    const all = performance.getEntriesByType('resource');
    const xhr = all.filter((r) => r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest')
      .map((r) => ({ name: r.name.replace(location.origin, ''), dur: Math.round(r.duration), kb: Math.round((r.transferSize || r.encodedBodySize || 0) / 1024) }))
      .sort((a, b) => b.dur - a.dur);
    const jsKb = Math.round(all.filter((r) => /\.js(\?|$)/.test(r.name)).reduce((s, r) => s + (r.transferSize || 0), 0) / 1024);
    return {
      ttfb: Math.round(nav.responseStart || 0),
      dcl: Math.round(nav.domContentLoadedEventEnd || 0),
      load: Math.round(nav.loadEventEnd || 0),
      fcp: fcp ? Math.round(fcp) : null,
      xhrCount: xhr.length,
      xhrTotalKb: xhr.reduce((s, x) => s + x.kb, 0),
      jsKb,
      slowXhr: xhr.slice(0, 6),
    };
  }).catch(() => ({}));
  await page.close();
  return { path, wallMs, ...m };
}

const token = await login();
console.log('login OK — measuring API (median of 3)...');
const apiRes = [];
for (const t of API_TARGETS) { const r = await timeApi(t, token); apiRes.push(r); console.log(`  ${String(r.ms).padStart(5)}ms ${String(r.status)} ${String(r.kb).padStart(5)}KB  ${t}`); }
apiRes.sort((a, b) => b.ms - a.ms);

console.log('\nmeasuring pages (sequential headless)...');
const browser = await getBrowser();
const { context } = await loggedInPage(browser);
const pageRes = [];
for (const p of PAGES) { const r = await timePage(context, p); pageRes.push(r); console.log(`  ${String(r.wallMs).padStart(6)}ms  fcp=${r.fcp ?? '?'} xhr=${r.xhrCount}/${r.xhrTotalKb}KB js=${r.jsKb}KB  ${p}`); }
pageRes.sort((a, b) => b.wallMs - a.wallMs);
await context.close(); await closeBrowser();

writeFileSync(join(__dirname, 'results.json'), JSON.stringify({ base: CONFIG.BASE, today: TODAY, apiRes, pageRes }, null, 2));

console.log('\n=== TOP 10 SLOWEST API ===');
apiRes.slice(0, 10).forEach((r) => console.log(`  ${String(r.ms).padStart(5)}ms (max ${r.max}) ${r.status} ${r.kb}KB  ${r.path}`));
console.log('\n=== TOP 10 SLOWEST PAGES ===');
pageRes.slice(0, 10).forEach((r) => console.log(`  ${String(r.wallMs).padStart(6)}ms  fcp=${r.fcp ?? '?'} xhr=${r.xhrCount}/${r.xhrTotalKb}KB js=${r.jsKb}KB  ${r.path}  | slowest: ${(r.slowXhr || []).slice(0, 2).map((x) => x.name.split('?')[0] + ' ' + x.dur + 'ms').join(', ')}`));
console.log(`\nresults: ${join(__dirname, 'results.json')}`);
