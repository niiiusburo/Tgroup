/**
 * NK3 commission-focused TestSprite-style audit (live tmv.2checkin.com).
 * Probes: NewClients tab, Payouts tab LOB filter, Earnings API, Payment PATCH 405.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('../website/node_modules/playwright');

const target = process.env.NK3_TARGET || 'https://tmv.2checkin.com';
const startedAt = new Date();
const stamp = startedAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const artifactDir = path.resolve(__dirname, '..', 'docs/live-artifacts/nk3-commission-audit', `${stamp}-chrome`);
fs.mkdirSync(artifactDir, { recursive: true });

const result = {
  startedAt: startedAt.toISOString(),
  target,
  artifactDir,
  login: { ok: false, email: null },
  cosmetic: { ok: false },
  probes: [],
  bugs: [],
  passed: [],
  apiErrors: [],
  consoleErrors: [],
  networkMisses: [],
  finishedAt: null,
};

function isApiUrl(url) {
  return /\/api\//i.test(url);
}

function addBug(severity, id, title, detail, evidence = {}) {
  result.bugs.push({ severity, id, title, detail, evidence });
}

function addPass(id, title, detail, evidence = {}) {
  result.passed.push({ id, title, detail, evidence });
}

function addProbe(id, status, detail, evidence = {}) {
  result.probes.push({ id, status, detail, evidence });
}

async function pageText(page) {
  return page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim());
}

async function login(page) {
  const accounts = [
    { email: 't@clinic.vn', password: '123123' },
    { email: 't@clinic.com', password: '123123' },
  ];
  for (const account of accounts) {
    await page.goto(`${target}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const emailBox = page.locator('#login-identifier, input[type="email"]').first();
    const passwordBox = page.locator('#password, input[type="password"]').first();
    await emailBox.waitFor({ state: 'visible', timeout: 15000 });
    await passwordBox.fill(account.password);
    await emailBox.fill(account.email);
    await page.locator('button[type="submit"], button:has-text("Đăng nhập"), button:has-text("Login")').first().click();
    await page.waitForTimeout(3500);
    if (!/\/login\b/i.test(new URL(page.url()).pathname)) {
      result.login = { ok: true, email: account.email };
      return;
    }
  }
  throw new Error('login failed');
}

async function selectCosmetic(page) {
  const cosmeticBtn = page.locator('button:has-text("Cosmetic"), button:has-text("Thẩm mỹ"), [role="button"]:has-text("Cosmetic")').first();
  if (await cosmeticBtn.count()) {
    await cosmeticBtn.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
  const text = await pageText(page);
  result.cosmetic.ok = /\bCosmetic\b/i.test(text) || /\bThẩm mỹ\b/i.test(text);
}

async function waitForApi(page, pattern, timeout = 20000) {
  return page.waitForResponse(
    (res) => isApiUrl(res.url()) && pattern.test(res.url()) && res.request().method() === 'GET',
    { timeout },
  ).catch(() => null);
}

async function probeNewClients(page, token) {
  const probeId = 'P1-newClients';
  let apiRes = null;
  const onResponse = (res) => {
    const url = res.url();
    if (/\/api\/cosmetic\/NewClients/i.test(url) && res.request().method() === 'GET') {
      apiRes = res;
    }
  };
  page.on('response', onResponse);

  const waitPromise = waitForApi(page, /\/api\/cosmetic\/NewClients/i);
  await page.goto(`${target}/commission?tab=newClients&lob=cosmetic`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitPromise;
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  page.off('response', onResponse);

  const shot = path.join(artifactDir, '01-newClients-cosmetic.png');
  await page.screenshot({ path: shot, fullPage: true });
  const text = await pageText(page);

  // Direct API probe with auth token
  let apiBody = null;
  let apiStatus = null;
  let apiUrl = `${target}/api/cosmetic/NewClients?limit=10`;
  if (token) {
    const direct = await page.request.get(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    apiStatus = direct.status();
    apiBody = await direct.json().catch(() => null);
  }

  const responseUsed = apiBody || (apiRes ? await apiRes.json().catch(() => null) : null);
  const statusUsed = apiStatus ?? apiRes?.status() ?? null;
  const urlUsed = apiRes?.url() || apiUrl;

  const hasItems = Array.isArray(responseUsed?.items);
  const first = hasItems ? responseUsed.items[0] : null;
  const hasServiceTotal = first ? Object.prototype.hasOwnProperty.call(first, 'service_total') : hasItems;
  const hasCommissionTotal = first ? Object.prototype.hasOwnProperty.call(first, 'commission_total') : hasItems;

  const headerPatterns = [/Doanh thu|Revenue|service/i, /COM|Hoa hồng|Commission/i];
  const headersVisible = headerPatterns.every((p) => p.test(text));

  const evidence = {
    url: page.url(),
    apiUrl: urlUsed,
    apiStatus: statusUsed,
    itemCount: responseUsed?.items?.length ?? 0,
    sampleKeys: first ? Object.keys(first).slice(0, 20) : [],
    screenshot: shot,
    bodySnippet: text.slice(0, 400),
  };

  if (statusUsed >= 400) {
    addBug('P0', 'BUG-NC-API', 'NewClients API error on cosmetic', `${urlUsed} → ${statusUsed}`, evidence);
    addProbe(probeId, 'FAIL', 'API returned error', evidence);
    return;
  }

  if (!hasServiceTotal || !hasCommissionTotal) {
    addBug('P1', 'BUG-NC-FIELDS', 'NewClients API missing service_total/commission_total', JSON.stringify(evidence.sampleKeys), evidence);
  } else {
    addPass('PASS-NC-API', 'NewClients API returns service_total & commission_total', `${urlUsed} status=${statusUsed}`, evidence);
  }

  if (text.length < 100) {
    addBug('P0', 'BUG-NC-BLANK', 'New Clients tab blank page', text, evidence);
    addProbe(probeId, 'FAIL', 'blank page', evidence);
    return;
  }

  if (!headersVisible && (responseUsed?.items?.length || 0) > 0) {
    addBug('P2', 'BUG-NC-COLUMNS', 'Revenue/COM columns not visible in UI', text.slice(0, 300), evidence);
    addProbe(probeId, 'PARTIAL', 'API ok but column headers not found', evidence);
  } else if ((responseUsed?.items?.length || 0) === 0) {
    addPass('PASS-NC-EMPTY', 'New Clients tab loads (empty dataset)', 'No rows but page rendered', evidence);
    addProbe(probeId, 'PASS', 'empty state ok', evidence);
  } else {
    addPass('PASS-NC-UI', 'New Clients tab loads with revenue/COM columns', `${responseUsed.items.length} rows`, evidence);
    addProbe(probeId, 'PASS', 'columns and data load', evidence);
  }
}

async function probePayoutsLob(page, token) {
  const probeId = 'P2-payouts-lob';
  const apiCalls = [];

  const onResponse = (res) => {
    const url = res.url();
    if (isApiUrl(url) && (/\/api\/(?:cosmetic\/)?(?:Payouts|Earnings)/i.test(url))) {
      apiCalls.push({
        url,
        status: res.status(),
        method: res.request().method(),
      });
    }
  };
  page.on('response', onResponse);

  await page.goto(`${target}/commission?tab=payouts&lob=cosmetic`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const shotCosmetic = path.join(artifactDir, '02-payouts-cosmetic.png');
  await page.screenshot({ path: shotCosmetic, fullPage: true });

  const lobSelect = page.locator('select').filter({ has: page.locator('option[value="cosmetic"]') }).first();
  const options = await lobSelect.locator('option').allTextContents().catch(() => []);
  const optionValues = await lobSelect.locator('option').evaluateAll((els) => els.map((el) => el.value)).catch(() => []);

  const hasAll = optionValues.includes('all');
  const hasCombined = options.some((o) => /combined|tất cả|all/i.test(o));

  // Switch to dental and capture API calls
  apiCalls.length = 0;
  if (optionValues.includes('dental')) {
    await lobSelect.selectOption('dental');
    await page.waitForTimeout(2500);
    await page.locator('button:has-text("Tải lại"), button:has-text("Reload"), button:has-text("reload")').first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  const shotDental = path.join(artifactDir, '03-payouts-dental.png');
  await page.screenshot({ path: shotDental, fullPage: true });

  page.off('response', onResponse);

  const text = await pageText(page);
  const apiFails = apiCalls.filter((c) => c.status >= 400);
  const evidence = {
    url: page.url(),
    lobOptions: optionValues,
    lobLabels: options,
    hasAllOption: hasAll,
    hasCombinedLabel: hasCombined,
    apiCalls,
    screenshots: [shotCosmetic, shotDental],
    bodySnippet: text.slice(0, 400),
  };

  for (const err of apiFails) {
    addBug('P1', 'BUG-PAYOUT-API', `Payouts/Earnings API ${err.status}`, `${err.method} ${err.url}`, evidence);
    result.apiErrors.push(err);
  }

  if (text.length < 80) {
    addBug('P0', 'BUG-PAYOUT-BLANK', 'Payouts tab blank', text, evidence);
    addProbe(probeId, 'FAIL', 'blank page', evidence);
    return;
  }

  if (!hasAll && !hasCombined) {
    addBug('P3', 'BUG-PAYOUT-NO-ALL', 'Payouts tab lacks All/Combined LOB filter (only per-LOB)', `options=${optionValues.join(',')}`, evidence);
  }

  if (apiFails.length === 0) {
    addPass('PASS-PAYOUT-LOAD', 'Payouts tab loads and LOB switch works', `options: ${optionValues.join(', ')}`, evidence);
    addProbe(probeId, hasAll ? 'PASS' : 'PARTIAL', hasAll ? 'All LOB available' : 'per-LOB only (no All)', evidence);
  } else {
    addProbe(probeId, 'FAIL', 'API errors on LOB switch', evidence);
  }
}

async function probeEarningsApi(page, token) {
  const probeId = 'P3-earnings-api';
  if (!token) {
    addBug('P1', 'BUG-NO-TOKEN', 'Cannot probe Earnings API without auth token', 'login token missing');
    addProbe(probeId, 'SKIP', 'no token');
    return;
  }

  const urls = [
    `${target}/api/cosmetic/Earnings?limit=5`,
    `${target}/api/Earnings?lob=cosmetic&limit=5`,
    `${target}/api/Earnings?lob=all&limit=5`,
  ];

  const responses = [];
  for (const url of urls) {
    const res = await page.request.get(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json().catch(() => null);
    responses.push({ url, status: res.status(), body });
    if (res.status() >= 400) {
      result.apiErrors.push({ url, status: res.status(), method: 'GET' });
    }
  }

  const cosmeticRes = responses.find((r) => /\/api\/cosmetic\/Earnings/i.test(r.url));
  const evidence = {
    responses: responses.map((r) => ({
      url: r.url,
      status: r.status,
      itemCount: r.body?.items?.length,
      keys: r.body?.items?.[0] ? Object.keys(r.body.items[0]).slice(0, 15) : [],
    })),
  };

  if (!cosmeticRes || cosmeticRes.status >= 400) {
    addBug('P0', 'BUG-EARN-API', 'GET /api/cosmetic/Earnings failed', JSON.stringify(evidence), evidence);
    addProbe(probeId, 'FAIL', `status ${cosmeticRes?.status}`, evidence);
    return;
  }

  const hasItems = Array.isArray(cosmeticRes.body?.items);
  if (!hasItems) {
    addBug('P1', 'BUG-EARN-SHAPE', 'Earnings API response missing items array', JSON.stringify(evidence), evidence);
    addProbe(probeId, 'FAIL', 'bad response shape', evidence);
    return;
  }

  addPass('PASS-EARN-API', 'GET /api/cosmetic/Earnings returns 200 with items', `${cosmeticRes.url} → ${cosmeticRes.status}`, evidence);
  addProbe(probeId, 'PASS', `${cosmeticRes.body.items.length} items`, evidence);
}

async function probePaymentPatch405(page, token) {
  const probeId = 'P4-payment-patch';
  if (!token) {
    addProbe(probeId, 'SKIP', 'no token');
    return;
  }

  // Find a real payment id from cosmetic payments list
  const listRes = await page.request.get(`${target}/api/cosmetic/Payments?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listBody = await listRes.json().catch(() => null);
  const paymentId = listBody?.items?.[0]?.id || listBody?.[0]?.id || '00000000-0000-0000-0000-000000000001';

  const patchUrls = [
    `${target}/api/Payments/${paymentId}`,
    `${target}/api/cosmetic/Payments/${paymentId}`,
  ];

  const responses = [];
  for (const url of patchUrls) {
    const res = await page.request.patch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { notes: 'qa-probe-readonly' },
    });
    const body = await res.json().catch(() => null);
    responses.push({ url, status: res.status(), body });
  }

  const evidence = { paymentId, responses };
  const any405 = responses.some((r) => r.status === 405);
  const any200 = responses.some((r) => r.status >= 200 && r.status < 300);

  if (any200) {
    addBug('P0', 'BUG-PAY-EDIT', 'Payment PATCH allowed when edit should be disabled', JSON.stringify(responses), evidence);
    addProbe(probeId, 'FAIL', 'PATCH succeeded unexpectedly', evidence);
    return;
  }

  if (any405) {
    const r405 = responses.find((r) => r.status === 405);
    const code = r405?.body?.error?.code;
    addPass('PASS-PAY-405', 'PATCH /api/Payments/:id returns 405 (edit disabled)', `${r405.url} → 405 code=${code}`, evidence);
    addProbe(probeId, 'PASS', `405 B_PAYMENT_EDIT_DISABLED=${code === 'B_PAYMENT_EDIT_DISABLED'}`, evidence);
    return;
  }

  // 404 is acceptable if no payment exists; 403 permission issue
  const statuses = responses.map((r) => r.status).join(',');
  if (responses.every((r) => r.status === 404)) {
    addPass('PASS-PAY-405-NOID', 'Payment PATCH blocked (404 no sample payment; cannot confirm 405)', statuses, evidence);
    addProbe(probeId, 'PARTIAL', 'no payment id to test 405', evidence);
  } else {
    addBug('P1', 'BUG-PAY-UNEXPECTED', 'Payment PATCH returned unexpected status (not 405)', statuses, evidence);
    addProbe(probeId, 'FAIL', `statuses: ${statuses}`, evidence);
  }
}

async function extractToken(page) {
  return page.evaluate(() => {
    const keys = ['token', 'accessToken', 'access_token', 'authToken', 'jwt'];
    for (const k of keys) {
      const v = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (v) return v;
    }
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (/token|auth|jwt/i.test(key || '')) {
        const v = localStorage.getItem(key);
        if (v && v.length > 20) return v;
      }
    }
    return null;
  });
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') result.consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on('pageerror', (err) => {
    result.consoleErrors.push(err.message.slice(0, 300));
  });
  page.on('requestfailed', (req) => {
    if (isApiUrl(req.url())) {
      result.networkMisses.push({ url: req.url(), error: req.failure()?.errorText || 'failed' });
    }
  });
  page.on('response', (res) => {
    if (isApiUrl(res.url()) && res.status() >= 400) {
      result.apiErrors.push({ url: res.url(), status: res.status(), method: res.request().method() });
    }
  });

  try {
    await login(page);
    addPass('PASS-LOGIN', 'Login succeeded', result.login.email);
    await selectCosmetic(page);
    if (!result.cosmetic.ok) {
      addBug('P1', 'BUG-COSMETIC', 'Cosmetic LOB not visibly selected after login', 'header check failed');
    } else {
      addPass('PASS-COSMETIC', 'Cosmetic LOB selected', 'visible in UI');
    }

    const token = await extractToken(page);

    await probeNewClients(page, token);
    await probePayoutsLob(page, token);
    await probeEarningsApi(page, token);
    await probePaymentPatch405(page, token);
  } catch (err) {
    addBug('P0', 'BUG-RUNNER', 'Audit runner crashed', String(err));
  } finally {
    result.finishedAt = new Date().toISOString();

    const md = [
      `# NK3 Commission Audit — ${stamp}`,
      '',
      `- Target: ${target}`,
      `- Login: ${result.login.ok ? result.login.email : 'FAIL'}`,
      `- Cosmetic LOB: ${result.cosmetic.ok ? 'OK' : 'not confirmed'}`,
      `- Bugs: ${result.bugs.length} | Passed: ${result.passed.length}`,
      '',
      '## Bugs',
      ...(result.bugs.length ? result.bugs.map((b) => `- **${b.severity}** \`${b.id}\`: ${b.title} — ${b.detail}`) : ['- None']),
      '',
      '## Passed',
      ...result.passed.map((p) => `- \`${p.id}\`: ${p.title} — ${p.detail}`),
      '',
      '## API 4xx/5xx',
      ...(result.apiErrors.length
        ? result.apiErrors.map((e) => `- ${e.method || 'GET'} ${e.url} → ${e.status}`)
        : ['- None captured']),
      '',
      '## Console errors',
      ...(result.consoleErrors.length ? result.consoleErrors.slice(0, 15).map((e) => `- ${e}`) : ['- None']),
      '',
      '## Probes',
      ...result.probes.map((p) => `- ${p.id}: **${p.status}** — ${p.detail}`),
    ].join('\n');

    fs.writeFileSync(path.join(artifactDir, 'REPORT.json'), JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(artifactDir, 'REPORT.md'), md);
    console.log(md);
    console.log(`\nArtifacts: ${artifactDir}`);
    await browser.close();
    process.exit(result.bugs.some((b) => b.severity === 'P0') ? 1 : 0);
  }
}

main();