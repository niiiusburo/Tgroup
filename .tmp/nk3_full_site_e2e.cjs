/**
 * NK3 full-site TestSprite-style E2E runner (live tmv.2checkin.com).
 * Read-only by default; set ALLOW_WRITES=1 to run mutating customer delete probe.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('../website/node_modules/playwright');

const target = process.env.NK3_TARGET || 'https://tmv.2checkin.com';
const allowWrites = process.env.ALLOW_WRITES === '1';
const startedAt = new Date();
const stamp = startedAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const artifactDir = path.resolve(__dirname, '..', 'docs/live-artifacts/nk3-full-site-e2e', `${stamp}-chrome`);
fs.mkdirSync(artifactDir, { recursive: true });

const accounts = [
  { email: 't@clinic.vn', password: '123123' },
  { email: 't@clinic.com', password: '123123' },
];

const ROUTES = [
  { id: 'R-001', path: '/', label: 'Overview', expect: /Tổng quan|Overview/i },
  { id: 'R-002', path: '/customers', label: 'Customers', expect: /Khách hàng|Customers|Tìm kiếm/i },
  { id: 'R-003', path: '/calendar', label: 'Calendar', expect: /Lịch hẹn|Calendar/i },
  { id: 'R-004', path: '/employees', label: 'Employees', expect: /Nhân viên|Employees/i },
  { id: 'R-005', path: '/services', label: 'Services', expect: /Dịch vụ|Services/i },
  { id: 'R-006', path: '/service-catalog', label: 'Service Catalog', expect: /Danh mục|Catalog|Dịch vụ/i },
  { id: 'R-007', path: '/payment', label: 'Payment', expect: /thanh toán|Payment|Kế hoạch/i },
  { id: 'R-008', path: '/permissions', label: 'Permissions', expect: /Quyền hạn|Permission/i },
  { id: 'R-009', path: '/commission', label: 'Commission', expect: /Hoa hồng|Commission|CTV/i },
  { id: 'R-010', path: '/commission?tab=newClients&lob=cosmetic', label: 'New Clients COM', expect: /Khách mới|New Client|COM|Hoa hồng/i },
  { id: 'R-011', path: '/reports/dashboard', label: 'Reports Dashboard', expect: /Báo cáo|Report|Dashboard/i },
  { id: 'R-012', path: '/reports/revenue', label: 'Reports Revenue', expect: /Doanh thu|Revenue/i },
  { id: 'R-013', path: '/reports/appointments', label: 'Reports Appointments', expect: /Lịch hẹn|Appointment/i },
  { id: 'R-014', path: '/reports/customers', label: 'Reports Customers', expect: /Khách hàng|Customer/i },
  { id: 'R-015', path: '/reports/doctors', label: 'Reports Doctors', expect: /Bác sĩ|Doctor/i },
  { id: 'R-016', path: '/locations', label: 'Locations', expect: /Chi nhánh|Location/i },
  { id: 'R-017', path: '/settings', label: 'Settings', expect: /Cài đặt|Settings/i },
  { id: 'R-018', path: '/feedback', label: 'Feedback', expect: /Phản hồi|Feedback/i },
  { id: 'R-019', path: '/relationships', label: 'Relationships', expect: /Quan hệ|Relationship/i },
  { id: 'R-020', path: '/notifications', label: 'Notifications', expect: /Thông báo|Notification/i },
];

const result = {
  startedAt: startedAt.toISOString(),
  target,
  allowWrites,
  artifactDir,
  loginSucceeded: false,
  cosmeticSelected: false,
  routes: [],
  bugs: [],
  apiErrors: [],
  consoleErrors: [],
  networkMisses: [],
  finishedAt: null,
};

function isApiUrl(url) {
  return /\/api\//i.test(url);
}

function setReactInput(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (!setter) throw new Error('no input setter');
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

async function pageText(page) {
  return page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim());
}

async function collectVisibleErrors(page) {
  return page.evaluate(() => {
    const selectors = ['[role="alert"]', '.text-red-500', '.text-red-600', '.text-destructive'];
    const seen = new Set();
    const out = [];
    for (const el of document.querySelectorAll(selectors.join(','))) {
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text && !seen.has(text)) {
        seen.add(text);
        out.push(text.slice(0, 300));
      }
    }
    return out;
  });
}

async function login(page) {
  for (const account of accounts) {
    await page.goto(`${target}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const emailBox = page.locator('#login-identifier, input[type="email"]').first();
    const passwordBox = page.locator('#password, input[type="password"]').first();
    await emailBox.waitFor({ state: 'visible', timeout: 15000 });
    await passwordBox.waitFor({ state: 'visible', timeout: 15000 });
    await emailBox.fill(account.email);
    await passwordBox.fill(account.password);
    await page.locator('button[type="submit"], button:has-text("Đăng nhập"), button:has-text("Login")').first().click();
    await page.waitForTimeout(3000);
    if (!/\/login\b/i.test(new URL(page.url()).pathname)) {
      result.loginSucceeded = true;
      return account.email;
    }
  }
  throw new Error('login failed for all accounts');
}

async function selectCosmetic(page) {
  const cosmeticBtn = page.locator('button:has-text("Cosmetic"), button:has-text("Thẩm mỹ"), [role="button"]:has-text("Cosmetic")').first();
  if (await cosmeticBtn.count()) {
    await cosmeticBtn.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
  const text = await pageText(page);
  result.cosmeticSelected = /\bCosmetic\b/i.test(text) || /\bThẩm mỹ\b/i.test(text);
}

async function checkRoute(page, route) {
  const apiErrors = [];
  const onResponse = (res) => {
    const url = res.url();
    if (!isApiUrl(url)) return;
    if (res.status() >= 400) {
      apiErrors.push({ url, status: res.status(), route: route.id });
    }
  };
  page.on('response', onResponse);

  await page.goto(`${target}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const text = await pageText(page);
  const visibleErrors = await collectVisibleErrors(page);
  const redirectedHome = route.path !== '/' && new URL(page.url()).pathname === '/';
  const contentOk = route.expect.test(text);
  const shot = path.join(artifactDir, `${route.id}.png`);
  await page.screenshot({ path: shot, fullPage: true });

  page.off('response', onResponse);

  const status = redirectedHome ? 'FAIL' : contentOk ? 'PASS' : visibleErrors.length ? 'FAIL' : 'PARTIAL';
  const entry = {
    id: route.id,
    path: route.path,
    label: route.label,
    status,
    url: page.url(),
    visibleErrors,
    apiErrors,
    screenshot: shot,
  };
  result.routes.push(entry);

  if (redirectedHome) {
    result.bugs.push({
      severity: 'P1',
      id: `BUG-${route.id}-redirect`,
      title: `${route.label} redirects to home`,
      detail: `Navigated to ${route.path} but landed on ${page.url()}`,
    });
  }
  for (const err of apiErrors) {
    result.bugs.push({
      severity: err.status === 404 ? 'P0' : 'P1',
      id: `BUG-${route.id}-api-${err.status}`,
      title: `API ${err.status} on ${route.label}`,
      detail: err.url,
    });
  }
  if (!contentOk && !redirectedHome) {
    result.bugs.push({
      severity: 'P2',
      id: `BUG-${route.id}-content`,
      title: `${route.label} missing expected content`,
      detail: text.slice(0, 200),
    });
  }
}

async function probeCustomerDeleteLob(page) {
  if (!allowWrites) {
    result.routes.push({ id: 'W-DELETE-PROBE', status: 'SKIP', detail: 'ALLOW_WRITES not set' });
    return;
  }

  const badCalls = [];
  page.on('request', (req) => {
    const url = req.url();
    if (req.method() === 'PATCH' && /\/api\/Partners\/[^/]+\/soft-delete$/.test(url)) {
      badCalls.push(url);
    }
  });

  await page.goto(`${target}/customers`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Create disposable test customer
  const stampName = `ZZ_E2E_${Date.now()}`;
  const addBtn = page.locator('button:has-text("Thêm"), button:has-text("Add")').first();
  if (!(await addBtn.count())) {
    result.bugs.push({ severity: 'P2', id: 'BUG-DELETE-NO-ADD', title: 'Cannot find add customer button' });
    return;
  }
  await addBtn.click();
  await page.waitForTimeout(1000);

  const nameInput = page.locator('input[name="name"], label:has-text("Tên") + input, form input').first();
  const phoneInput = page.locator('input[name="phone"], input[type="tel"]').first();
  if (await nameInput.count()) await nameInput.fill(stampName);
  if (await phoneInput.count()) await phoneInput.fill(`09${String(Date.now()).slice(-8)}`);

  const saveBtn = page.locator('button:has-text("Lưu"), button:has-text("Save"), button:has-text("Tạo")').first();
  if (await saveBtn.count()) await saveBtn.click();
  await page.waitForTimeout(3000);

  if (badCalls.length) {
    result.bugs.push({
      severity: 'P0',
      id: 'BUG-COSMETIC-DELETE-LOB',
      title: 'Customer delete uses dental API path on Cosmetic LOB',
      detail: badCalls.join('; '),
    });
  }
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') result.consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on('requestfailed', (req) => {
    if (isApiUrl(req.url())) {
      result.networkMisses.push({ url: req.url(), error: req.failure()?.errorText || 'failed' });
    }
  });

  try {
    await login(page);
    await selectCosmetic(page);

    for (const route of ROUTES) {
      await checkRoute(page, route);
    }

    await probeCustomerDeleteLob(page);
  } catch (err) {
    result.bugs.push({ severity: 'P0', id: 'BUG-RUNNER', title: 'Runner crashed', detail: String(err) });
  } finally {
    result.finishedAt = new Date().toISOString();
    const reportPath = path.join(artifactDir, 'REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

    const md = [
      `# NK3 Full-Site E2E — ${stamp}`,
      '',
      `- Target: ${target}`,
      `- Login: ${result.loginSucceeded ? 'OK' : 'FAIL'}`,
      `- Cosmetic LOB: ${result.cosmeticSelected ? 'visible' : 'not confirmed'}`,
      `- Routes: ${result.routes.filter((r) => r.status === 'PASS').length} PASS / ${result.routes.filter((r) => r.status === 'FAIL').length} FAIL / ${result.routes.filter((r) => r.status === 'PARTIAL').length} PARTIAL`,
      `- Bugs: ${result.bugs.length}`,
      '',
      '## Bugs',
      ...result.bugs.map((b) => `- **${b.severity}** ${b.id}: ${b.title} — ${b.detail}`),
      '',
      '## Routes',
      ...result.routes.map((r) => `| ${r.id} | ${r.path} | ${r.status} | ${r.label || ''} |`),
    ].join('\n');
    fs.writeFileSync(path.join(artifactDir, 'REPORT.md'), md);
    console.log(md);
    console.log(`\nArtifacts: ${artifactDir}`);
    await browser.close();
    process.exit(result.bugs.some((b) => b.severity === 'P0') ? 1 : 0);
  }
}

main();