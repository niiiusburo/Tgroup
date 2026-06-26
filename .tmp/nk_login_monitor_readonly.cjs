const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const baseUrl = 'https://nk.2checkin.com';
const accounts = [
  { email: 't@clinic.vn', password: '123123' },
  { email: 't@clinic.com', password: '123123' },
];

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const artifactDir = path.resolve(__dirname, '..', 'docs', 'live-artifacts', 'nk-login-monitor', stamp);
const safeDir = path.join(artifactDir, 'redacted-safe');
fs.mkdirSync(safeDir, { recursive: true });

const apiErrors = [];
const consoleErrors = [];
const pageErrors = [];
const requestFailures = [];
const loginAttempts = [];
const allowedScreenPaths = new Set(['/', '/calendar', '/customers']);
const allowedScreenSlugs = new Set(['overview', 'calendar', 'customers']);

function redactErrorText(text) {
  return String(text || '')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
    .slice(0, 500);
}

async function waitForAppSettled(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function visibleBodySummary(page) {
  return await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
}

async function waitForScreenReady(page, screen) {
  if (screen.slug === 'calendar' || screen.slug === 'customers') {
    await page
      .locator('text=/Loading\\.\\.\\.|Loading calendar|Fetching appointments|Đang tải|Đang tải lịch|Đang tải khách hàng/i')
      .first()
      .waitFor({ state: 'hidden', timeout: 20000 })
      .catch(() => {});
    await page.waitForTimeout(1500);
  }
}

async function getLoginError(page) {
  const text = await visibleBodySummary(page);
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const errorLine = lines.find((line) => /invalid|không đúng|sai|error|lỗi|failed|thất bại|unauthorized/i.test(line));
  return errorLine ? redactErrorText(errorLine) : '';
}

async function isLoggedIn(page) {
  const url = page.url();
  if (!/\/login(?:$|\?)/.test(url)) {
    const navVisible = await page.locator('nav, aside').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (navVisible) return true;
  }
  const text = await visibleBodySummary(page);
  return /Tổng quan|Overview|Khách hàng|Lịch hẹn|Dashboard/i.test(text) && !/Đăng nhập|Login/i.test(text.slice(0, 300));
}

async function login(page) {
  for (const account of accounts) {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForAppSettled(page);

    const email = page.locator('#email, input[name="email"], input[type="email"]').first();
    const password = page.locator('#password, input[name="password"], input[type="password"]').first();
    await email.fill(account.email);
    await password.fill(account.password);

    const priorApiErrorCount = apiErrors.length;
    await page.locator('button[type="submit"], button:has-text("Đăng nhập"), button:has-text("Login")').first().click();
    await page.waitForTimeout(2500);
    await waitForAppSettled(page);

    const ok = await isLoggedIn(page);
    const loginError = ok ? '' : await getLoginError(page);
    loginAttempts.push({
      email: account.email,
      ok,
      visibleError: loginError,
      apiErrorsDuringAttempt: apiErrors.slice(priorApiErrorCount),
      finalUrl: page.url(),
    });
    if (ok) return account.email;
  }
  return null;
}

async function applyPrivacyMask(page) {
  await page.evaluate(() => {
    const protectedRoots = Array.from(document.querySelectorAll('main, [role="main"]'));
    if (!protectedRoots.length) return;

    const maskText = (value) => value.replace(/[^\s]/g, '•');
    for (const root of protectedRoots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const text = node.textContent || '';
        if (text.trim()) node.textContent = maskText(text);
      }
    }
  }).catch(() => {});

  await page.addStyleTag({
    content: `
      tbody, [role="rowgroup"], .customer-card, .patient-card,
      [class*="customer" i] table, [class*="patient" i] table,
      [class*="appointment" i] table, [class*="payment" i] table {
        filter: blur(7px) !important;
      }
      input, textarea {
        color: transparent !important;
        text-shadow: 0 0 8px rgba(0,0,0,.55) !important;
      }
    `,
  }).catch(() => {});
}

async function clickNav(page, screen) {
  if (!allowedScreenPaths.has(screen.path)) throw new Error(`Unexpected monitor path: ${screen.path}`);
  const candidates = [
    `a[href="${screen.path}"]`,
    `a[href^="${screen.path}?"]`,
    `a[href$="${screen.path}"]`,
    `button:has-text("${screen.vn}")`,
    `a:has-text("${screen.vn}")`,
    `button:has-text("${screen.en}")`,
    `a:has-text("${screen.en}")`,
  ];

  for (const selector of candidates) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible({ timeout: 1500 }).catch(() => false)) {
      await locator.click();
      await waitForAppSettled(page);
      return { clickedSelector: selector, fallback: false };
    }
  }

  await page.goto(`${baseUrl}${screen.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 }); // nosemgrep: javascript.playwright.security.audit.playwright-goto-injection.playwright-goto-injection -- screen.path is restricted to the static monitor allowlist above.
  await waitForAppSettled(page);
  return { clickedSelector: `goto:${screen.path}`, fallback: true };
}

async function inspectScreen(page, screen, index) {
  const beforeApiErrors = apiErrors.length;
  const beforeConsoleErrors = consoleErrors.length;
  const beforePageErrors = pageErrors.length;
  const beforeRequestFailures = requestFailures.length;

  const navResult = await clickNav(page, screen);
  await waitForScreenReady(page, screen);
  let body = await visibleBodySummary(page);
  if ((screen.slug === 'calendar' || screen.slug === 'customers') && (body.trim().length < 120 || /Loading\.{3}|Loading calendar|Fetching appointments|Đang tải|Đang tải khách hàng/i.test(body))) {
    await page.goto(`${baseUrl}${screen.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 }); // nosemgrep: javascript.playwright.security.audit.playwright-goto-injection.playwright-goto-injection -- screen.path is restricted to the static monitor allowlist above.
    await waitForAppSettled(page);
    await waitForScreenReady(page, screen);
    body = await visibleBodySummary(page);
  }
  if (!allowedScreenSlugs.has(screen.slug)) throw new Error(`Unexpected monitor slug: ${screen.slug}`);
  const blank = body.trim().length < 120;
  const loading = /Loading\.{3}|Loading calendar|Fetching appointments|Đang tải|Đang tải khách hàng/i.test(body);
  const visibleError = /Internal Server Error|Something went wrong|Application error|Network Error|Không thể tải|Lỗi tải/i.test(body);
  const expectedText = screen.expect.some((re) => re.test(body));
  const safeScreenshot = path.join(safeDir, `${String(index).padStart(2, '0')}-${screen.slug}.png`); // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal -- screen.slug is restricted to the static monitor allowlist above.
  await applyPrivacyMask(page);
  await page.screenshot({ path: safeScreenshot, fullPage: true });

  return {
    name: screen.name,
    path: screen.path,
    finalUrl: page.url(),
    clickedSelector: navResult.clickedSelector,
    usedFallbackGoto: navResult.fallback,
    bodyChars: body.trim().length,
    blank,
    loading,
    visibleError,
    expectedText,
    apiErrors: apiErrors.slice(beforeApiErrors),
    consoleErrors: consoleErrors.slice(beforeConsoleErrors),
    pageErrors: pageErrors.slice(beforePageErrors),
    requestFailures: requestFailures.slice(beforeRequestFailures),
    screenshot: safeScreenshot,
  };
}

(async () => {
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(redactErrorText(msg.text()));
  });
  page.on('pageerror', (err) => pageErrors.push(redactErrorText(err.message)));
  page.on('requestfailed', (req) => requestFailures.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText || 'failed'}`));
  page.on('response', async (res) => {
    if (res.url().includes('/api/') && res.status() >= 400) {
      let body = '';
      try {
        body = redactErrorText(await res.text());
      } catch (_) {}
      apiErrors.push(`${res.status()} ${res.request().method()} ${res.url()} ${body}`.trim());
    }
  });

  const versionResponse = await context.request.get(`${baseUrl}/version.json`).catch(() => null);
  const version = versionResponse && versionResponse.ok() ? await versionResponse.json().catch(() => null) : null;
  const workedAccount = await login(page);

  const screens = [];
  if (workedAccount) {
    const targets = [
      { name: 'Overview', slug: 'overview', path: '/', vn: 'Tổng quan', en: 'Overview', expect: [/Tổng quan|Overview|Doanh thu|Khách hàng/i] },
      { name: 'Calendar', slug: 'calendar', path: '/calendar', vn: 'Lịch', en: 'Calendar', expect: [/Lịch|Calendar|Tháng|Tuần|Hôm nay/i] },
      { name: 'Customers', slug: 'customers', path: '/customers', vn: 'Khách hàng', en: 'Customers', expect: [/Khách hàng|Customers|Số điện thoại|Tìm kiếm/i] },
    ];
    for (let i = 0; i < targets.length; i += 1) {
      screens.push(await inspectScreen(page, targets[i], i + 1));
    }
  }

  const result = {
    checkedAt: new Date().toISOString(),
    baseUrl,
    workedAccount,
    loginSucceeded: Boolean(workedAccount),
    loginAttempts,
    version,
    aggregate: {
      apiErrors,
      consoleErrors,
      pageErrors,
      requestFailures,
    },
    screens,
    artifactDir,
    safeDir,
  };

  fs.writeFileSync(path.join(artifactDir, 'result.json'), JSON.stringify(result, null, 2));
  await browser.close();

  console.log(JSON.stringify(result, null, 2));
  if (!result.loginSucceeded) process.exit(2);
  const brokenScreens = screens.filter((screen) => screen.blank || screen.loading || screen.visibleError || !screen.expectedText || screen.apiErrors.length || screen.pageErrors.length);
  if (brokenScreens.length) process.exit(3);
})();
