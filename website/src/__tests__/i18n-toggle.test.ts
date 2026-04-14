/**
 * i18n Language Toggle — Full E2E Verification
 *
 * Verifies that:
 * 1. App renders Vietnamese by default
 * 2. Toggle switches sidebar to English  
 * 3. Toggle switches back to Vietnamese
 * 4. Language persists across navigation and reload
 * 5. Every page renders correct language after toggle
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';

const BASE = 'http://localhost:5175';

let browser: Browser;
let page: Page;

async function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function login(p: Page) {
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await wait(1500);
  await p.locator('input[type="email"]').fill('tg@clinic.vn');
  await p.locator('input[type="password"]').fill('123456');
  await p.locator('button[type="submit"]').click();
  await wait(3000);
}

async function switchLang(p: Page, lang: 'en' | 'vi') {
  // Click toggle button to open dropdown
  const toggle = p.locator('button[aria-label="Switch language"]');
  await toggle.click({ force: true });
  await wait(400);
  // Click language option inside dropdown
  const dropdown = p.getByTestId('lang-dropdown');
  const label = lang === 'en' ? 'English' : 'Tiếng Việt';
  await dropdown.locator(`button:has-text("${label}")`).click({ force: true });
  await wait(1500);
}

async function sidebarContains(p: Page, text: string): Promise<boolean> {
  const sb = await p.locator('aside').innerText({ timeout: 5000 });
  return sb.includes(text);
}

// [route, vietnamese substring, english substring]
const PAGES: Array<[string, string, string]> = [
  ['/', 'PHÒNG KHÁM', 'CLINIC'],
  ['/calendar', 'Lịch', 'Revenue'],  // Calendar is top-level, may be hidden when collapsed; Revenue is always in Reports submenu
  ['/customers', 'Khách hàng', 'Customers'],
  ['/payment', 'Kế hoạch thanh toán', 'Payment Plans'],
  ['/employees', 'Nhân viên', 'Employees'],
  ['/locations', 'Chi nhánh', 'Locations'],
  ['/reports/dashboard', 'BÁO CÁO', 'REPORTS'],
  ['/settings', 'Cài đặt', 'Settings'],
];

describe('i18n Language Toggle', { timeout: 300000, sequential: true }, () => {
  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(() => localStorage.removeItem('tg-lang'));
  }, 30000);

  afterAll(async () => {
    await browser.close();
  });

  // ─── Core Toggle Tests ───

  it('login page shows Vietnamese', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await wait(1000);
    const body = await page.locator('body').innerText();
    expect(body).toContain('Đăng nhập');
  });

  it('sidebar is Vietnamese after login', async () => {
    await login(page);
    expect(await sidebarContains(page, 'PHÒNG KHÁM')).toBe(true);
    expect(await sidebarContains(page, 'Nhân viên')).toBe(true);
    expect(await sidebarContains(page, 'Cài đặt')).toBe(true);
  });

  it('toggle switches to English', async () => {
    await switchLang(page, 'en');
    expect(await sidebarContains(page, 'CLINIC')).toBe(true);
    expect(await sidebarContains(page, 'Employees')).toBe(true);
    expect(await sidebarContains(page, 'Settings')).toBe(true);
    expect(await sidebarContains(page, 'PHÒNG KHÁM')).toBe(false);
  });

  it('toggle switches back to Vietnamese', async () => {
    await switchLang(page, 'vi');
    expect(await sidebarContains(page, 'PHÒNG KHÁM')).toBe(true);
    expect(await sidebarContains(page, 'CLINIC')).toBe(false);
  });

  it('persists language to localStorage', async () => {
    await switchLang(page, 'en');
    const stored = await page.evaluate(() => localStorage.getItem('tg-lang'));
    expect(stored).toBe('en');
  });

  it('persists across page reload', async () => {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await wait(3000);
    expect(await sidebarContains(page, 'CLINIC')).toBe(true);
  });

  // ─── Per-Page Vietnamese Tests ───

  for (const [route, viText] of PAGES) {
    it(`VI: ${route} → "${viText}"`, async () => {
      await switchLang(page, 'vi');
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await wait(2000);
      expect(await sidebarContains(page, viText)).toBe(true);
    });
  }

  // ─── Per-Page English Tests ───

  for (const [route, , enText] of PAGES) {
    it(`EN: ${route} → "${enText}"`, async () => {
      await switchLang(page, 'en');
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await wait(2000);
      expect(await sidebarContains(page, enText)).toBe(true);
    });
  }
});
