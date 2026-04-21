/**
 * E2E: Appointment Form — Doctor / Assistant / Dental Aide Dropdowns
 *
 * Guards against:
 *   1. Schema mismatch (missing tier_id on employees view) → API 500
 *   2. Missing role filter → all employees shown in every dropdown
 *
 * Hard-coded port: 5175
 */

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

// Helper: assert dropdown options match expected role labels
type RoleExpectation = { include: string[]; exclude: string[] };

async function assertDropdownRoleFilter(
  page: Page,
  dropdownLabel: RegExp,
  roleExpectation: RoleExpectation,
  screenshotPath: string
) {
  const btn = page.locator('button').filter({ hasText: dropdownLabel }).first();
  await expect(btn).toBeVisible({ timeout: 5000 });
  await btn.click();
  await page.waitForTimeout(400);

  // Must not be empty
  const emptyMsg = page.getByText(/Không tìm thấy bác sĩ|No doctors found/i);
  const hasEmptyMsg = await emptyMsg.isVisible({ timeout: 1000 }).catch(() => false);
  if (hasEmptyMsg) {
    throw new Error(`Dropdown "${dropdownLabel.source}" is empty — employees API likely returned [] or 500`);
  }

  // Read all option labels (name + role subtitle)
  const options = page.locator('.max-h-48.overflow-y-auto button');
  const count = await options.count();
  expect(count, `Dropdown "${dropdownLabel.source}" should have >=1 option`).toBeGreaterThanOrEqual(1);

  // Verify role filtering: each option should show a role that MATCHES the expectation
  for (let i = 0; i < count; i++) {
    const text = await options.nth(i).textContent() ?? '';
    const lower = text.toLowerCase();

    // Must include at least one expected role string
    const hasIncludedRole = roleExpectation.include.some((r) => lower.includes(r.toLowerCase()));
    expect(
      hasIncludedRole,
      `Option ${i} in "${dropdownLabel.source}" dropdown should show one of [${roleExpectation.include.join(', ')}], got: "${text}"`
    ).toBe(true);

    // Must NOT show excluded roles
    for (const excluded of roleExpectation.exclude) {
      expect(
        lower.includes(excluded.toLowerCase()),
        `Option ${i} in "${dropdownLabel.source}" dropdown should NOT show "${excluded}", got: "${text}"`
      ).toBe(false);
    }
  }

  await page.screenshot({ path: screenshotPath });

  // Close dropdown (press Escape or click elsewhere)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

test.describe('Appointment form staff dropdowns', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('doctor dropdown shows only doctors', async ({ page }) => {
    await openAddAppointmentModal(page);

    await assertDropdownRoleFilter(
      page,
      /Chọn bác sĩ|Select doctor/i,
      { include: ['Bác sĩ', 'doctor'], exclude: ['Phụ tá', 'Trợ lý', 'assistant'] },
      'e2e/screenshots/doctor-dropdown-filtered.png'
    );
  });

  test('assistant dropdown shows only assistants', async ({ page }) => {
    await openAddAppointmentModal(page);

    await assertDropdownRoleFilter(
      page,
      /Chọn phụ tá|Select assistant/i,
      { include: ['Phụ tá', 'assistant'], exclude: ['Bác sĩ', 'Trợ lý', 'doctor'] },
      'e2e/screenshots/assistant-dropdown-filtered.png'
    );
  });

  test('dental aide dropdown shows only dental aides', async ({ page }) => {
    await openAddAppointmentModal(page);

    await assertDropdownRoleFilter(
      page,
      /Chọn trợ lý|Select dental aide|dental aide/i,
      { include: ['Trợ lý', 'doctor-assistant'], exclude: ['Phụ tá', 'assistant'] },
      'e2e/screenshots/dentalaide-dropdown-filtered.png'
    );
  });
});
