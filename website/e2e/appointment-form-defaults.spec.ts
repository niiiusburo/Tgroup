import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5175';
const CUSTOMER_NAME = 'Phạm Ngọc Huy';

async function login(page: Page) {
  await page.goto(BASE);
  const emailInput = page.locator('#email');
  const isLoginPage = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
  if (isLoginPage) {
    await emailInput.fill('tg@clinic.vn');
    await page.locator('#password').fill('123456');
    await page.locator('button[type="submit"]').click();
    await expect(emailInput).toBeHidden({ timeout: 15000 });
  }
  await page.locator('a[href="/customers"]').first().waitFor({ timeout: 15000 });
}

async function openAddAppointmentModal(page: Page) {
  await page.locator('a[href="/customers"]').first().click();
  await expect(page.locator('main').getByRole('heading', { name: /Customers|Khách hàng/i })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500);

  await page.getByRole('cell', { name: new RegExp(CUSTOMER_NAME, 'i') }).first().click();
  await expect(page.getByRole('heading', { name: /Customer Profile|Hồ sơ khách hàng/i })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: /^Appointments|Lịch hẹn/i }).click();
  await page.waitForTimeout(600);

  await page.locator('button').filter({ hasText: /Add Appointment|Thêm lịch hẹn/i }).first().click();
  await expect(page.getByRole('heading', { name: /Thêm lịch hẹn|Sửa lịch hẹn/i })).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(1500);
}

test.describe('Appointment form defaults', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('date defaults to today', async ({ page }) => {
    await openAddAppointmentModal(page);

    // DatePicker displays DD/MM/YYYY
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const todayDisplay = `${dd}/${mm}/${yyyy}`;

    const dateBtn = page.locator('button').filter({ hasText: todayDisplay }).first();
    await expect(dateBtn).toBeVisible({ timeout: 5000 });
  });

  test('start time defaults to 09:00', async ({ page }) => {
    await openAddAppointmentModal(page);

    // Start time is a TimePicker button showing the value
    const startTimeBtn = page.locator('button').filter({ hasText: /^09:00$/ }).first();
    await expect(startTimeBtn).toBeVisible({ timeout: 5000 });
  });
});
