#!/usr/bin/env node
/**
 * NK3 live protected-routes audit — TestSprite-style QA
 * Login: t@clinic.vn / 123123, Cosmetic LOB
 * Target: https://tmv.2checkin.com
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://tmv.2checkin.com';
const ADMIN = { email: 't@clinic.vn', password: '123123' };

const ROUTES = [
  { path: '/', label: 'Overview' },
  { path: '/customers', label: 'Customers' },
  { path: '/calendar', label: 'Calendar' },
  { path: '/employees', label: 'Employees' },
  { path: '/services', label: 'Services' },
  { path: '/service-catalog', label: 'Service Catalog' },
  { path: '/payment', label: 'Payment' },
  { path: '/permissions', label: 'Permissions' },
  { path: '/commission', label: 'Commission' },
  { path: '/reports/dashboard', label: 'Reports Dashboard' },
  { path: '/reports/revenue', label: 'Reports Revenue' },
  { path: '/reports/appointments', label: 'Reports Appointments' },
  { path: '/reports/customers', label: 'Reports Customers' },
  { path: '/reports/doctors', label: 'Reports Doctors' },
  { path: '/reports/services', label: 'Reports Services' },
  { path: '/reports/employees', label: 'Reports Employees' },
  { path: '/reports/locations', label: 'Reports Locations' },
  { path: '/locations', label: 'Locations' },
  { path: '/settings', label: 'Settings' },
  { path: '/feedback', label: 'Feedback' },
  { path: '/relationships', label: 'Relationships' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/website', label: 'Website' },
];

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve(__dirname, `../output/playwright/nk3-protected-routes-audit-${ts}`);
fs.mkdirSync(outDir, { recursive: true });

function normalizePath(url) {
  try {
    const u = new URL(url);
    return u.pathname.replace(/\/$/, '') || '/';
  } catch {
    return url;
  }
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* no-op */
    }
  });
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const identifier = page.locator('#login-identifier, #email, input[type="email"]').first();
  await identifier.waitFor({ state: 'visible', timeout: 20000 });
  await identifier.fill(ADMIN.email);
  await page.locator('#password').fill(ADMIN.password);
  await page.locator('button[type="submit"]').click();
  await identifier.waitFor({ state: 'hidden', timeout: 25000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function switchToCosmetic(page) {
  const lobButton = page
    .locator('button[aria-haspopup="listbox"]')
    .filter({ hasText: /Dental|Cosmetic|Thẩm mỹ|Nha khoa/i })
    .first();
  const visible = await lobButton.isVisible().catch(() => false);
  if (!visible) {
    return { switched: false, reason: 'LOB toggle not visible (may already be cosmetic-only)' };
  }
  const currentText = (await lobButton.innerText()).trim();
  if (/cosmetic|thẩm mỹ/i.test(currentText)) {
    return { switched: false, reason: 'Already on Cosmetic' };
  }
  await lobButton.click();
  await page.waitForTimeout(400);
  const option = page.locator('[role="option"], [role="menuitem"], li, button').filter({ hasText: /^Cosmetic$|^Thẩm mỹ$/i }).first();
  if (await option.isVisible().catch(() => false)) {
    await option.click();
  } else {
    await page.getByText(/^Cosmetic$/i).first().click({ timeout: 5000 }).catch(async () => {
      await page.getByText(/Thẩm mỹ/i).first().click({ timeout: 5000 });
    });
  }
  await page.waitForTimeout(1200);
  return { switched: true, reason: 'Switched to Cosmetic' };
}

async function auditRoute(page, route, index) {
  const apiErrors = [];
  const consoleErrors = [];

  const onResponse = (res) => {
    const url = res.url();
    if (url.includes('/api/') && res.status() >= 400) {
      apiErrors.push({ status: res.status(), url });
    }
  };
  const onConsole = (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300));
  };
  const onPageError = (err) => consoleErrors.push(`PageError: ${err.message}`.slice(0, 300));

  page.on('response', onResponse);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  const targetUrl = `${BASE}${route.path}?lob=cosmetic`;
  let navigated = false;
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    navigated = true;
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
  } catch (err) {
    page.off('response', onResponse);
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    const shot = path.join(outDir, `${String(index).padStart(2, '0')}-${route.label.replace(/\s+/g, '-').toLowerCase()}-error.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    return {
      route: route.path,
      label: route.label,
      status: 'FAIL',
      url: page.url(),
      issues: [{ severity: 'P0', type: 'navigation', message: `Navigation failed: ${err.message}` }],
      apiErrors,
      consoleErrors: consoleErrors.slice(0, 5),
      screenshot: shot,
      bodyLength: 0,
      redirectedToHome: false,
      stuckSpinner: false,
      accessDenied: false,
      blank: true,
    };
  }

  const finalUrl = page.url();
  const finalPath = normalizePath(finalUrl);
  const expectedPath = normalizePath(route.path);
  const redirectedToHome = expectedPath !== '/' && (finalPath === '/' || finalPath === '/login');

  const bodyText = await page.locator('body').innerText().catch(() => '');
  const bodyLength = bodyText.trim().length;

  const accessDenied =
    /access denied|không có quyền|permission denied|unauthorized/i.test(bodyText) ||
    (await page.getByText(/Access Denied|không có quyền/i).isVisible().catch(() => false));

  const spinnerSelectors = [
    '.animate-spin:visible',
    '[class*="spinner"]:visible',
    'text=/^Loading\\.\\.\\.$/i',
    'text=/^Đang tải/i',
  ];
  let stuckSpinner = false;
  for (const sel of spinnerSelectors) {
    try {
      const count = await page.locator(sel).count();
      if (count > 0) {
        const visible = await page
          .locator(sel)
          .first()
          .isVisible()
          .catch(() => false);
        if (visible) {
          stuckSpinner = true;
          break;
        }
      }
    } catch {
      /* no-op */
    }
  }

  const blank = bodyLength < 80;
  const hasErrorText = /something went wrong|page not found|404|cannot get|failed to load/i.test(bodyText);

  const issues = [];
  if (redirectedToHome) {
    issues.push({ severity: 'P0', type: 'redirect', message: `Redirected to ${finalPath} instead of ${expectedPath}` });
  }
  if (accessDenied) {
    issues.push({ severity: 'P0', type: 'access', message: 'Access denied page shown' });
  }
  if (blank) {
    issues.push({ severity: 'P0', type: 'blank', message: `Page appears blank (${bodyLength} chars)` });
  }
  if (hasErrorText) {
    issues.push({ severity: 'P1', type: 'error-ui', message: 'Error text visible on page' });
  }
  if (stuckSpinner) {
    issues.push({ severity: 'P1', type: 'spinner', message: 'Loading spinner still visible after wait' });
  }
  for (const e of apiErrors) {
    issues.push({
      severity: e.status >= 500 ? 'P0' : 'P1',
      type: 'api',
      message: `${e.status} ${e.url}`,
    });
  }

  let status = 'PASS';
  if (issues.some((i) => i.severity === 'P0')) status = 'FAIL';
  else if (issues.length > 0) status = 'PARTIAL';

  const slug = route.label.replace(/\s+/g, '-').toLowerCase();
  const screenshot = path.join(outDir, `${String(index).padStart(2, '0')}-${slug}.png`);
  if (status !== 'PASS' || apiErrors.length > 0) {
    await page.screenshot({ path: screenshot, fullPage: true });
  } else if (index <= 3) {
    await page.screenshot({ path: screenshot, fullPage: false });
  }

  page.off('response', onResponse);
  page.off('console', onConsole);
  page.off('pageerror', onPageError);

  return {
    route: route.path,
    label: route.label,
    status,
    url: finalUrl,
    expectedPath,
    finalPath,
    bodyLength,
    textStart: bodyText.slice(0, 400),
    redirectedToHome,
    stuckSpinner,
    accessDenied,
    blank,
    apiErrors,
    consoleErrors: consoleErrors.slice(0, 5),
    issues,
    screenshot: fs.existsSync(screenshot) ? screenshot : null,
  };
}

async function main() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--window-size=1440,900'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log(`\n🔐 Logging in to ${BASE}...`);
  await login(page);
  await page.screenshot({ path: path.join(outDir, '00-after-login.png'), fullPage: false });

  console.log('🔄 Switching to Cosmetic LOB...');
  const lobResult = await switchToCosmetic(page);
  console.log(`   ${lobResult.reason}`);

  const results = [];
  for (let i = 0; i < ROUTES.length; i++) {
    const route = ROUTES[i];
    process.stdout.write(`\n[${i + 1}/${ROUTES.length}] ${route.path} ... `);
    const result = await auditRoute(page, route, i + 1);
    results.push(result);
    const icon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
    console.log(`${icon} ${result.status}${result.apiErrors.length ? ` (${result.apiErrors.length} API errors)` : ''}`);
    if (result.issues.length) {
      for (const issue of result.issues) {
        console.log(`    [${issue.severity}] ${issue.type}: ${issue.message}`);
      }
    }
  }

  const summary = {
    auditedAt: new Date().toISOString(),
    baseUrl: BASE,
    login: ADMIN.email,
    lob: 'Cosmetic',
    outDir,
    lobSwitch: lobResult,
    totals: {
      pass: results.filter((r) => r.status === 'PASS').length,
      partial: results.filter((r) => r.status === 'PARTIAL').length,
      fail: results.filter((r) => r.status === 'FAIL').length,
    },
    allApiErrors: results.flatMap((r) => r.apiErrors.map((e) => ({ route: r.route, ...e }))),
    results,
  };

  const reportPath = path.join(outDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

  const mdPath = path.join(outDir, 'report.md');
  const md = [
    '# NK3 Protected Routes Audit',
    '',
    `**Site:** ${BASE}`,
    `**Login:** ${ADMIN.email} / Cosmetic LOB`,
    `**Date:** ${summary.auditedAt}`,
    '',
    '## Summary',
    '',
    `| Status | Count |`,
    `|--------|-------|`,
    `| PASS | ${summary.totals.pass} |`,
    `| PARTIAL | ${summary.totals.partial} |`,
    `| FAIL | ${summary.totals.fail} |`,
    '',
    '## Route Results',
    '',
    '| Route | Status | API 4xx/5xx | Notes | Screenshot |',
    '|-------|--------|-------------|-------|------------|',
    ...results.map((r) => {
      const api = r.apiErrors.length ? r.apiErrors.map((e) => e.status).join(', ') : '—';
      const notes = r.issues.map((i) => i.message).join('; ') || 'OK';
      const shot = r.screenshot ? path.basename(r.screenshot) : '—';
      return `| \`${r.route}\` | **${r.status}** | ${api} | ${notes.slice(0, 120)} | ${shot} |`;
    }),
    '',
    '## Bugs',
    '',
    ...results
      .flatMap((r) => r.issues.map((i) => ({ route: r.route, ...i })))
      .map((b) => `- **[${b.severity}]** \`${b.route}\` — ${b.type}: ${b.message}`),
  ].join('\n');
  fs.writeFileSync(mdPath, md);

  await browser.close();

  console.log(`\n📄 Report: ${reportPath}`);
  console.log(`📄 Markdown: ${mdPath}`);
  console.log(`📸 Screenshots: ${outDir}`);
  console.log(`\n=== FINAL: ${summary.totals.pass} PASS / ${summary.totals.partial} PARTIAL / ${summary.totals.fail} FAIL ===\n`);

  process.exit(summary.totals.fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Audit crashed:', err);
  process.exit(2);
});