const fs = require('fs');
const path = require('path');
const { chromium } = require('../website/node_modules/playwright');

const target = 'https://tmv.2checkin.com';
const accounts = [
  { email: 't@clinic.vn', password: '123123' },
  { email: 't@clinic.com', password: '123123' },
];
const startedAt = new Date();
const stamp = startedAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const artifactDir = path.resolve(__dirname, '..', 'docs/live-artifacts/tmv-cosmetic-login-monitor', `${stamp}-chrome`);
fs.mkdirSync(artifactDir, { recursive: true });

const result = {
  startedAt: startedAt.toISOString(),
  artifactDir,
  target,
  browser: 'system chrome via Playwright channel=chrome',
  loginAttempts: [],
  accountWorked: null,
  loginSucceeded: false,
  cosmeticVisible: false,
  cosmeticBlocker: null,
  screens: [],
  apiErrors: [],
  consoleErrors: [],
  failedRequests: [],
  visibleErrors: [],
  cosmeticHeaderScreenshot: null,
  finishedAt: null,
};

function isApiUrl(url) {
  return /\/api\//i.test(url);
}

async function collectVisibleErrors(page) {
  return page.evaluate(() => {
    const selectors = [
      '[role="alert"]',
      '.alert',
      '.toast',
      '.Toastify__toast',
      '.text-red-500',
      '.text-red-600',
      '.text-destructive',
    ];
    const seen = new Set();
    const out = [];
    for (const el of document.querySelectorAll(selectors.join(','))) {
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^Xóa bộ lọc$/i.test(text)) continue;
      if (/^(?:\d+h )?\d+m \d+s \*$/i.test(text)) continue;
      if (text && !seen.has(text)) {
        seen.add(text);
        out.push(text.slice(0, 300));
      }
    }
    return out;
  });
}

async function pageText(page) {
  return page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim());
}

function normalizeForSearch(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

async function cosmeticIsVisible(page) {
  const text = await pageText(page);
  const normalized = normalizeForSearch(text);
  return normalized.includes('cosmetic') || normalized.includes('tham my');
}

async function redactSensitiveDom(page) {
  await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const value = node.textContent || '';
      if (/0\d{8,10}/.test(value)) {
        node.textContent = value.replace(/0\d{8,10}/g, '0xxxxxxxxx');
      }
    }
  }).catch(() => {});
  await page.addStyleTag({
    content: `
      table tbody td,
      [role="table"] [role="cell"],
      [data-radix-scroll-area-viewport] tbody td,
      [class*="appointment"] div,
      [class*="Appointment"] div,
      [class*="schedule"] div,
      [class*="Schedule"] div,
      .fc-event-title,
      .fc-event-time,
      .fc-list-event-title,
      .fc-list-event-time {
        color: transparent !important;
        text-shadow: 0 0 7px rgba(15, 23, 42, 0.75) !important;
      }
    `,
  }).catch(() => {});
}

async function fillLogin(page, email, password) {
  const emailBox = page.locator('#login-identifier, input[type="email"], input[name="email"], input[name="identifier"], input[placeholder*="Email" i], input[placeholder*="tgclinic" i]').first();
  const passwordBox = page.locator('#password, input[type="password"], input[name="password"], input[placeholder*="password" i], input[placeholder*="mật khẩu" i]').first();
  await emailBox.waitFor({ state: 'visible', timeout: 15000 });
  await passwordBox.waitFor({ state: 'visible', timeout: 15000 });
  await emailBox.fill(email);
  await passwordBox.fill(password);
  const submit = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Đăng nhập"), button:has-text("Sign in")').first();
  await Promise.all([
    page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {}),
    submit.click(),
  ]);
  await page.waitForTimeout(2500);
}

async function tryLogin(page, account) {
  await page.goto(`${target}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await fillLogin(page, account.email, account.password);
  const errors = await collectVisibleErrors(page);
  const screenshot = path.join(artifactDir, `login-after-${account.email.replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '')}.png`);
  await redactSensitiveDom(page);
  await page.screenshot({ path: screenshot, fullPage: true });
  const urlAfter = page.url();
  const body = await pageText(page);
  const stillOnLogin = /\/login\b/i.test(new URL(urlAfter).pathname) || /đăng nhập|login|sign in/i.test(body.slice(0, 1000));
  const succeeded = !stillOnLogin;
  result.loginAttempts.push({ email: account.email, succeeded, errors, urlAfter, screenshot });
  return succeeded;
}

async function clickCosmeticIfNeeded(page) {
  if (await cosmeticIsVisible(page)) return true;
  const selectors = [
    'button:has-text("Cosmetic")',
    'a:has-text("Cosmetic")',
    '[role="button"]:has-text("Cosmetic")',
  ];
  for (const selector of selectors) {
    const cosmetic = page.locator(selector).first();
    if (await cosmetic.count()) {
      await cosmetic.click({ timeout: 10000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);
      if (await cosmeticIsVisible(page)) return true;
    }
  }
  const textMatch = page.getByText(/Cosmetic/i).first();
  if (await textMatch.count()) {
    await textMatch.click({ timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }
  return cosmeticIsVisible(page);
}

async function clickNav(page, screen) {
  const candidates = screen.hrefs.flatMap((href) => [
    `nav a[href="${href}"]`,
    `aside a[href="${href}"]`,
    `a[href="${href}"]`,
    `nav a[href^="${href}?"]`,
    `aside a[href^="${href}?"]`,
    `a[href^="${href}?"]`,
  ]);
  for (const selector of candidates) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      await locator.click({ timeout: 12000 });
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1500);
      return true;
    }
  }
  const byText = page.locator(`nav a:has-text("${screen.label}"), aside a:has-text("${screen.label}"), a:has-text("${screen.label}")`).first();
  if (await byText.count()) {
    await byText.click({ timeout: 12000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

async function waitForRouteContent(page) {
  await page.waitForFunction(() => {
    const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    return text.length > 80 && !/^Loading\.{0,3}$/i.test(text);
  }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function captureScreen(page, screen, index) {
  const clickedNav = await clickNav(page, screen);
  if (!clickedNav) {
    await page.goto(screen.fallbackUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
  await waitForRouteContent(page);
  let screenshot;
  if (index === 1) {
    screenshot = path.join(artifactDir, '01-dashboard.png');
  } else if (index === 2) {
    screenshot = path.join(artifactDir, '02-customers.png');
  } else {
    screenshot = path.join(artifactDir, '03-calendar.png');
  }
  await redactSensitiveDom(page);
  await page.screenshot({ path: screenshot, fullPage: true });
  const text = await pageText(page);
  const visibleErrorMessages = await collectVisibleErrors(page);
  result.visibleErrors.push(...visibleErrorMessages.map((message) => ({ screen: screen.name, message })));
  result.screens.push({
    name: screen.name,
    url: page.url(),
    clickedNav,
    screenshot,
    cosmeticVisible: await cosmeticIsVisible(page),
    textLength: text.length,
    blank: text.length < 80,
    visibleErrorCount: visibleErrorMessages.length,
  });
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const page = await context.newPage();

    page.on('console', (message) => {
      if (message.type() === 'error') {
        result.consoleErrors.push({ text: message.text(), location: message.location() });
      }
    });
    page.on('pageerror', (error) => {
      result.consoleErrors.push({ text: error.message, location: {} });
    });
    page.on('requestfailed', (request) => {
      result.failedRequests.push({
        method: request.method(),
        url: request.url(),
        errorText: request.failure()?.errorText || 'unknown',
      });
    });
    page.on('response', (response) => {
      if (isApiUrl(response.url()) && response.status() >= 400) {
        result.apiErrors.push({ method: response.request().method(), url: response.url(), status: response.status() });
      }
    });

    for (const account of accounts) {
      const succeeded = await tryLogin(page, account);
      if (succeeded) {
        result.loginSucceeded = true;
        result.accountWorked = account.email;
        break;
      }
    }

    if (!result.loginSucceeded) {
      result.cosmeticBlocker = 'Neither configured account completed login.';
      return;
    }

    result.cosmeticVisible = await clickCosmeticIfNeeded(page);
    result.cosmeticHeaderScreenshot = path.join(artifactDir, '00-cosmetic-header.png');
    await redactSensitiveDom(page);
    await page.screenshot({ path: result.cosmeticHeaderScreenshot, fullPage: true });
    if (!result.cosmeticVisible) {
      result.cosmeticBlocker = 'Logged in, but Cosmetic was not visibly selected or selectable.';
      return;
    }

    const screens = [
      { name: 'Dashboard', slug: 'dashboard', label: 'Dashboard', hrefs: ['/'], fallbackUrl: `${target}/` },
      { name: 'Customers', slug: 'customers', label: 'Customers', hrefs: ['/customers'], fallbackUrl: `${target}/customers` },
      { name: 'Calendar', slug: 'calendar', label: 'Calendar', hrefs: ['/calendar'], fallbackUrl: `${target}/calendar?lob=cosmetic` },
    ];
    for (let i = 0; i < screens.length; i += 1) {
      await captureScreen(page, screens[i], i + 1);
    }
  } finally {
    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(artifactDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
    if (browser) await browser.close();
    console.log(JSON.stringify(result, null, 2));
  }
})().catch((error) => {
  result.finishedAt = new Date().toISOString();
  result.fatalError = error.stack || error.message || String(error);
  fs.writeFileSync(path.join(artifactDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.error(result.fatalError);
  process.exit(1);
});
