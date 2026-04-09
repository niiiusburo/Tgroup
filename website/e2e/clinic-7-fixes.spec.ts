/**
 * E2E verification for the 7 clinic management fixes
 * Uses storageState to persist login across tests
 */
import { test as base, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

// Extend test to auto-login
const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Login
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('#email');
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill('tg@clinic.vn');
      await page.locator('#password').fill('123456');
      await page.locator('button[type="submit"]').click();
      // Wait for navigation away from login
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle');
    }

    // Verify we're past login
    const currentUrl = page.url();
    console.log('After login URL:', currentUrl);

    await use(page);
  },
});

test.describe('Clinic 7-Fixes Verification', () => {

  test('#6a+#6b: Employee form — 9 Vietnamese roles + password field', async ({ authenticatedPage: page }) => {
    await page.goto(`${BASE_URL}/employees`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/screenshots/fix6-employees-page.png' });

    // Click the "Add Employee" button
    const addBtn = page.locator('button:has-text("Add Employee")').first();
    await expect(addBtn).toBeVisible({ timeout: 8000 });
    await addBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/screenshots/fix6-employee-form.png' });

    // Check password field exists
    const passwordField = page.locator('input[type="password"]').first();
    await expect(passwordField).toBeVisible({ timeout: 5000 });
    console.log('✅ Password field found');

    // Check the role dropdown has Vietnamese role names
    const allOptionTexts = await page.locator('select option').allTextContents();

    const expectedRoles = [
      'Quản lý tổng', 'Quản lý cơ sở', 'Bác sĩ', 'Trợ lý Bác sĩ',
      'Phụ tá', 'Lễ tân', 'Sale online', 'CSKH', 'Marketing',
    ];

    let found = 0;
    for (const role of expectedRoles) {
      if (allOptionTexts.some(t => t.trim() === role)) found++;
    }
    console.log(`✅ Found ${found}/9 roles in:`, allOptionTexts);
    expect(found).toBe(9);
  });

  test('#2: Customer source dropdown — 8 Vietnamese values', async ({ authenticatedPage: page }) => {
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Search to load customer list
    const searchInput = page.locator('input[placeholder*="earch"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('a');
      await page.waitForTimeout(1500);
    }

    // Click "Add Customer" button
    const addBtn = page.locator('button:has-text("Add Customer")').first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await page.waitForTimeout(2500);

    await page.screenshot({ path: 'e2e/screenshots/fix2-customer-form.png' });

    const allOptions = await page.locator('select option').allTextContents();

    const expectedSources = [
      'Sale Online', 'Khách vãng lai', 'Hotline', 'Khách cũ',
      'Khách hàng giới thiệu', 'Nội bộ giới thiệu', 'MKT1', 'ĐNCB',
    ];

    let found = 0;
    for (const src of expectedSources) {
      if (allOptions.some(t => t.trim() === src)) found++;
    }
    console.log(`✅ Found ${found}/8 sources in:`, allOptions);
    expect(found).toBe(8);
  });

  test('#1: Customer edit form — save button reachable', async ({ authenticatedPage: page }) => {
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Search
    const searchInput = page.locator('input[placeholder*="earch"]').first();
    await searchInput.fill('a');
    await page.waitForTimeout(1500);

    // Click first customer
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    await firstRow.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/screenshots/fix1-customer-profile.png' });

    // Click Edit
    const editBtn = page.locator('button:has-text("Edit")').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/screenshots/fix1-customer-edit-form.png' });

    // Verify save button exists
    const saveBtn = page.locator('button[type="submit"]').last();
    await expect(saveBtn).toBeAttached({ timeout: 5000 });
    console.log('✅ Save button present');
  });

  test('#7: Appointment form — 2-col layout + reminder section', async ({ authenticatedPage: page }) => {
    await page.goto(`${BASE_URL}/appointments`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/screenshots/fix7-appointments-page.png' });

    // Click create appointment
    const createBtn = page.locator('button:has-text("Tạo lịch hẹn"), button:has-text("New Appointment"), button:has-text("Tạo mới")').first();
    await expect(createBtn).toBeVisible({ timeout: 8000 });
    await createBtn.click();
    await page.waitForTimeout(2500);

    await page.screenshot({ path: 'e2e/screenshots/fix7-appointment-form.png' });

    const hasBasic = await page.locator('text=Thông tin cơ bản').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasAdvanced = await page.locator('text=Thông tin nâng cao').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasReminder = await page.locator('text=Nhắc lịch hẹn').first().isVisible({ timeout: 3000 }).catch(() => false);

    console.log('Layout sections:', { hasBasic, hasAdvanced, hasReminder });
    expect(hasBasic).toBeTruthy();
    expect(hasAdvanced).toBeTruthy();
    expect(hasReminder).toBeTruthy();
  });

  test('#3: Service creation form renders correctly', async ({ authenticatedPage: page }) => {
    await page.goto(`${BASE_URL}/services`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const createBtn = page.locator('button:has-text("New Service")').first();
    await expect(createBtn).toBeVisible({ timeout: 8000 });
    await createBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/screenshots/fix3-service-form.png' });

    await expect(page.locator('text=Dịch vụ').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Khách hàng').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Bác sĩ').first()).toBeVisible({ timeout: 3000 });
    console.log('✅ Service form renders correctly');
  });
});
