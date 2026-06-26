/**
 * Investor Portal Phase 2 E2E — staff settings, customers column, investor reset UI.
 * Prereq: API :3002 + Vite :5175 (127.0.0.1), migration 069, staff t@clinic.vn / 123123
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5175';
const API = process.env.E2E_API_URL || 'http://127.0.0.1:3002/api';
const STAFF_EMAIL = 't@clinic.vn';
const STAFF_PASSWORD = '123123';
const SCREENSHOT_DIR = path.join(
  process.cwd(),
  '..',
  'docs/live-artifacts/live-verify-screenshots',
);

async function useEnglish(page: import('@playwright/test').Page) {
  await page.addInitScript(() => localStorage.setItem('tg-lang', 'en'));
}

async function staffLogin(page: import('@playwright/test').Page) {
  await useEnglish(page);
  await page.goto(`${BASE}/login`);
  await page.getByRole('textbox', { name: /email|ctv phone/i }).fill(STAFF_EMAIL);
  await page.getByRole('textbox', { name: /password/i }).fill(STAFF_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole('textbox', { name: /email|ctv phone/i })).toBeHidden({ timeout: 20_000 });
}

test.describe('Investor Portal Phase 2', () => {
  test('staff sees Investors settings tab and customers investor column', async ({ page }) => {
    await staffLogin(page);

    await page.goto(`${BASE}/settings`);
    await expect(page.locator('main h1')).toContainText(/settings/i, { timeout: 10_000 });

    const investorsTab = page.getByRole('tab', { name: /investors/i });
    await expect(investorsTab).toBeVisible({ timeout: 10_000 });
    await investorsTab.click();
    await expect(page.getByText(/investor accounts/i)).toBeVisible({ timeout: 10_000 });

    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'investor-phase2-settings-2026-06-26.png'),
      fullPage: true,
    });

    await page.goto(`${BASE}/customers`);
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    const investorHeader = page.getByRole('columnheader', { name: /investor/i });
    await expect(investorHeader).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'investor-phase2-customers-column-2026-06-26.png'),
      fullPage: true,
    });
  });

  test('investor reset password page renders', async ({ page }) => {
    await useEnglish(page);
    await page.goto(`${BASE}/investor/reset-password`);
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible({ timeout: 10_000 });

    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'investor-phase2-reset-password-2026-06-26.png'),
      fullPage: true,
    });
  });

  test('full API loop then investor dashboard (backend + portal UI)', async ({ page, request }) => {
    const loginRes = await request.post(`${API}/Auth/login`, {
      data: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token: staffToken } = await loginRes.json();

    const testEmail = `e2e-${Date.now()}@clinic.vn`;
    const createRes = await request.post(`${API}/admin/investors`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      data: { email: testEmail, investorName: 'E2E Investor', lob: 'dental' },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    const investorId = created.investor?.id;
    const initialPassword = created.initialPassword;
    expect(investorId).toBeTruthy();
    expect(initialPassword).toBeTruthy();

    const partnersRes = await request.get(`${API}/Partners?limit=1`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const partnerId = (await partnersRes.json()).items?.[0]?.id;
    expect(partnerId).toBeTruthy();

    const patchRes = await request.patch(`${API}/Partners/${partnerId}/investor-visibility`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      data: { investorId, isVisible: true },
    });
    expect(patchRes.ok()).toBeTruthy();

    await useEnglish(page);
    await page.goto(`${BASE}/investor/login`);
    await page.locator('#investor-email').fill(testEmail);
    await page.locator('#investor-password').fill(initialPassword);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/shared clients/i)).toBeVisible({ timeout: 15_000 });

    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'investor-phase2-dashboard-2026-06-26.png'),
      fullPage: true,
    });
  });
});