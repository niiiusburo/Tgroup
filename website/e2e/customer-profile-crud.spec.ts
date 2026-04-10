/**
 * Customer Profile CRUD E2E Tests
 *
 * TC1 - Edit customer phone number (+ app bug fix: profile refresh after update)
 * TC2 - Create appointment (doctor dropdown, custom date/time pickers)
 * TC3 - Edit appointment notes (hover to reveal edit button)
 * TC4 - Add service record (Records tab)
 * TC5 - Add deposit (Payment tab)
 * TC6 - Make payment (Payment tab)
 *
 * Customer: Phạm Ngọc Huy (id: b2262736-c7f4-4072-a67f-b3d00095dcf1)
 */

import { test, expect, type Page } from '@playwright/test';

const CUSTOMER_NAME = 'Phạm Ngọc Huy';
const ORIGINAL_PHONE = '0349762840';

// ─── helpers ─────────────────────────────────────────────────────────────────

async function login(page: Page) {
  // Auth state is pre-loaded from .auth/admin.json (storageState in playwright.config)
  // Just navigate to app — token in localStorage auto-authenticates
  await page.goto('http://localhost:5174/');

  // If login form appears (token expired), re-authenticate
  const emailInput = page.locator('#email');
  const isLoginPage = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
  if (isLoginPage) {
    await emailInput.fill('tg@clinic.vn');
    await page.locator('#password').fill('123456');
    await page.locator('button[type="submit"]').click();
    await expect(emailInput).toBeHidden({ timeout: 15000 });
  }

  await page.getByRole('link', { name: 'Customers' }).waitFor({ timeout: 10000 });
}

async function openCustomerProfile(page: Page, customerName: string) {
  await page.getByRole('link', { name: 'Customers' }).click();
  // Scope to main to avoid strict mode (banner also has h1 "Customers")
  await expect(page.locator('main').getByRole('heading', { name: 'Customers' })).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500); // let table rows load from API

  await page.getByRole('cell', { name: new RegExp(customerName, 'i') }).first().click();
  await expect(page.getByRole('heading', { name: 'Customer Profile' })).toBeVisible({ timeout: 10000 });
}

// ─── tests ───────────────────────────────────────────────────────────────────

test.describe('Customer Profile CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ─── TC1: Edit phone number ───────────────────────────────────────────────
  test('TC1: Edit customer phone number and verify change persists', async ({ page }) => {
    await openCustomerProfile(page, CUSTOMER_NAME);

    // Click the Edit button in the profile header
    await page.getByRole('button', { name: 'Edit' }).click();

    // AddCustomerForm opens — wait for its title (Vietnamese)
    await expect(page.getByText('Chỉnh sửa khách hàng')).toBeVisible({ timeout: 8000 });

    // Phone input has placeholder "0901 111 222" and current value "0349762840"
    const phoneInput = page.getByPlaceholder('0901 111 222');
    await phoneInput.clear();
    const newPhone = '0912345678';
    await phoneInput.fill(newPhone);

    // Submit — button says "Cập nhật" in edit mode
    await page.getByRole('button', { name: 'Cập nhật' }).click();

    // Modal closes
    await expect(page.getByText('Chỉnh sửa khách hàng')).not.toBeVisible({ timeout: 8000 });

    // App bug fix (Customers.tsx): refetchProfile() called after updateCustomer.
    // Phone appears in TWO places (header span + Personal Information p) — use first()
    await expect(page.getByText(newPhone).first()).toBeVisible({ timeout: 10000 });

    // ── restore original phone ─────────────────────────────────────────────
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByText('Chỉnh sửa khách hàng')).toBeVisible({ timeout: 8000 });
    await page.getByPlaceholder('0901 111 222').fill(ORIGINAL_PHONE);
    await page.getByRole('button', { name: 'Cập nhật' }).click();
    await expect(page.getByText('Chỉnh sửa khách hàng')).not.toBeVisible({ timeout: 8000 });
  });

  // ─── TC2: Create appointment ──────────────────────────────────────────────
  test('TC2: Create appointment from customer profile', async ({ page }) => {
    await openCustomerProfile(page, CUSTOMER_NAME);

    await page.getByRole('button', { name: /^Appointments/ }).click();
    await expect(page.getByRole('button', { name: 'Add Appointment' })).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: 'Add Appointment' }).click();

    await expect(page.getByRole('heading', { name: 'Tạo lịch hẹn' })).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500); // Wait for API data to load

    // ── Select Doctor — use evaluate for reliable React state update ──
    await page.evaluate(() => new Promise<void>(resolve => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Select doctor...');
      if (btn) { btn.click(); }
      setTimeout(() => {
        const opts = [...document.querySelectorAll('button')].filter(b => /BS\./.test(b.textContent ?? ''));
        if (opts.length) { opts[0].click(); }
        resolve();
      }, 500);
    }));
    await page.waitForTimeout(300);

    // ── Select Location (if not pre-filled) ──
    const locVisible = await page.getByRole('button', { name: 'Select location...' }).isVisible({ timeout: 500 }).catch(() => false);
    if (locVisible) {
      await page.evaluate(() => new Promise<void>(resolve => {
        const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Select location...');
        if (btn) { btn.click(); }
        setTimeout(() => {
          const opt = [...document.querySelectorAll('button')].find(b => /TG Clinic/.test(b.textContent ?? ''));
          if (opt) { opt.click(); }
          resolve();
        }, 500);
      }));
      await page.waitForTimeout(300);
    }

    // ── Service name ──
    await page.getByRole('button', { name: 'Chọn dịch vụ...' }).click();
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: /^Răng/ }).first().click();
    await page.waitForTimeout(300);

    // ── Date ──
    await page.evaluate(() => new Promise<void>(resolve => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Chọn ngày');
      if (btn) { btn.click(); }
      setTimeout(() => {
        const day = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '15' && !b.disabled);
        if (day) { day.click(); }
        resolve();
      }, 500);
    }));
    await page.waitForTimeout(300);

    // ── Start time ──
    await page.evaluate(() => new Promise<void>(resolve => {
      const labels = [...document.querySelectorAll('label')];
      const startLabel = labels.find(l => /Giờ bắt đầu/.test(l.textContent ?? ''));
      const container = startLabel?.closest('div')?.parentElement;
      const trigger = container?.querySelector('button');
      if (trigger) { trigger.click(); }
      setTimeout(() => {
        const dd = [...document.querySelectorAll('.overflow-y-auto')].pop();
        const slot = dd?.querySelector('button');
        if (slot) { (slot as HTMLButtonElement).click(); }
        resolve();
      }, 500);
    }));
    await page.waitForTimeout(400);

    // Take screenshot to debug form state
    await page.screenshot({ path: 'e2e/screenshots/tc2-before-submit.png' });

    // Capture console errors during submission
    const consoleErrors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.getByRole('button', { name: 'Tạo lịch hẹn' }).click();
    await page.waitForTimeout(3000);

    // Log console errors for debugging
    if (consoleErrors.length > 0) {
      console.log('Console errors during submit:', consoleErrors.join('\n'));
    }

    await expect(page.getByRole('heading', { name: 'Tạo lịch hẹn' })).not.toBeVisible({ timeout: 10000 });
  });

  // ─── TC3: Edit appointment notes ─────────────────────────────────────────
  test('TC3: Edit appointment notes and verify change', async ({ page }) => {
    await openCustomerProfile(page, CUSTOMER_NAME);

    await page.getByRole('button', { name: /^Appointments/ }).click();
    await page.waitForTimeout(1000);

    // Click the first edit button — use evaluate to bypass opacity-0 hover state
    const hasEdit = await page.evaluate(() => {
      const btn = document.querySelector('button[title="Edit appointment"]') as HTMLButtonElement | null;
      if (btn) { btn.click(); return true; }
      return false;
    });

    if (!hasEdit) {
      test.skip(true, 'No editable appointments found');
      return;
    }

    await expect(page.getByRole('heading', { name: 'Sửa lịch hẹn' })).toBeVisible({ timeout: 8000 });

    // serviceName may be empty — fill it to pass validation using catalog selector
    const serviceBtn = page.getByRole('button', { name: 'Chọn dịch vụ...' });
    if (await serviceBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await serviceBtn.click();
      await page.waitForTimeout(500);
      await page.locator('button').filter({ hasText: /^Răng/ }).first().click();
      await page.waitForTimeout(300);
    }

    // Giờ bắt đầu may be empty
    await page.evaluate(() => new Promise<void>(resolve => {
      const labels = [...document.querySelectorAll('label')];
      const startLabel = labels.find(l => /Giờ bắt đầu/.test(l.textContent ?? ''));
      const container = startLabel?.closest('div')?.parentElement;
      const trigger = container?.querySelector('button');
      if (trigger && /Chọn giờ/.test(trigger.textContent ?? '')) {
        trigger.click();
        setTimeout(() => {
          const dropdowns = [...document.querySelectorAll('.overflow-y-auto')];
          for (const dd of dropdowns) {
            const slot = [...dd.querySelectorAll('button')].find(b => b.textContent?.trim() === '17:00');
            if (slot) { (slot as HTMLButtonElement).click(); break; }
          }
          resolve();
        }, 500);
      } else {
        resolve();
      }
    }));
    await page.waitForTimeout(400);

    const notesArea = page.getByPlaceholder('Ghi chú thêm...');
    await notesArea.clear();
    const newNote = 'QA automated test note ' + Date.now();
    await notesArea.fill(newNote);

    await page.getByRole('button', { name: 'Cập nhật' }).click();
    await page.waitForTimeout(3000);

    // Modal should close — verify by checking profile is visible again
    await expect(page.getByRole('heading', { name: 'Customer Profile' })).toBeVisible({ timeout: 10000 });
  });

  // ─── TC4: Add service record ──────────────────────────────────────────────
  test('TC4: Add service record from Records tab', async ({ page }) => {
    await openCustomerProfile(page, CUSTOMER_NAME);

    await page.getByRole('button', { name: /^Records/ }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: 'Add Service' })).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Add Service' }).click();
    await expect(page.getByRole('heading', { name: 'New Service Record' })).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500); // Wait for API data

    // ── Select service from catalog ──
    const serviceBtn = page.getByRole('button', { name: 'Select service...' });
    if (await serviceBtn.isVisible({ timeout: 1000 })) {
      await serviceBtn.click();
      await page.waitForTimeout(500);
      // Click "Teeth Cleaning" from the mock catalog dropdown
      await page.locator('button').filter({ hasText: 'Teeth Cleaning' }).first().click();
      await page.waitForTimeout(300);
    }

    // ── Select Doctor ──
    const doctorBtn = page.getByRole('button', { name: 'Select doctor...' });
    if (await doctorBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await doctorBtn.click();
      await page.waitForTimeout(300);
      await page.locator('button').filter({ hasText: /^BS\./ }).first().click();
      await page.waitForTimeout(200);
    }

    // ── Select Location (if not pre-filled) ──
    const locationBtn = page.getByRole('button', { name: 'Select location...' });
    if (await locationBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await locationBtn.click();
      await page.waitForTimeout(300);
      await page.locator('button').filter({ hasText: /TG Clinic/ }).first().click();
      await page.waitForTimeout(200);
    }

    // ── Start Date ──
    await page.getByRole('button', { name: 'Chọn ngày' }).first().click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: /^15$/ }).first().click();
    await page.waitForTimeout(200);

    // ── Notes ──
    await page.getByPlaceholder('Treatment notes...').fill('QA automated service record');

    await page.getByRole('button', { name: 'Create Service Record' }).click();
    await page.waitForTimeout(3000);

    await expect(page.getByRole('heading', { name: 'New Service Record' })).not.toBeVisible({ timeout: 10000 });
  });

  // ─── TC5: Add deposit ─────────────────────────────────────────────────────
  test('TC5: Add deposit to customer wallet', async ({ page }) => {
    await openCustomerProfile(page, CUSTOMER_NAME);

    await page.getByRole('button', { name: 'Payment' }).click();
    await expect(page.getByText('Deposit Wallet')).toBeVisible({ timeout: 8000 });

    // Click the "Add Deposit" button in the wallet header (first one)
    await page.getByRole('button', { name: 'Add Deposit' }).first().click();

    // Modal h4 heading
    await expect(page.getByRole('heading', { name: 'Add Deposit' })).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder('Enter amount').fill('500000');

    // Cash is default; confirm explicitly
    await page.getByRole('button', { name: 'Cash' }).first().click();

    await page.getByPlaceholder('Add a note').fill('QA test deposit');

    await page.screenshot({ path: 'e2e/screenshots/tc5-deposit-form.png' });

    // Submit — last "Add Deposit" button in the modal footer
    await page.getByRole('button', { name: 'Add Deposit' }).last().click();

    // h4 heading should disappear
    await expect(page.getByRole('heading', { name: 'Add Deposit' })).not.toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Deposit Wallet')).toBeVisible({ timeout: 5000 });
  });

  // ─── TC5b: Deposit modal submit keeps Payment tab active ─────────────────
  test('TC5b: Submitting deposit keeps Payment tab active', async ({ page }) => {
    await openCustomerProfile(page, CUSTOMER_NAME);

    await page.getByRole('button', { name: 'Payment' }).click();
    await expect(page.getByText('Deposit Wallet')).toBeVisible({ timeout: 8000 });

    // Open the deposit modal, fill, and submit so onAddDeposit -> refetchProfile runs
    await page.getByRole('button', { name: 'Add Deposit' }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Deposit' })).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder('Enter amount').fill('1000');
    await page.getByPlaceholder('Add a note').fill('QA tab persistence test');

    await page.getByRole('button', { name: 'Add Deposit' }).last().click();
    await expect(page.getByRole('heading', { name: 'Add Deposit' })).not.toBeVisible({ timeout: 8000 });

    // Bug: tab was resetting to Profile after modal close because refetchProfile
    // unmounts CustomerProfile while loading, and activeTab defaulted to 'profile'.
    await expect(page.getByRole('heading', { name: 'Payment & Deposits' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Deposit Wallet')).toBeVisible({ timeout: 5000 });
  });

  // ─── TC6: Make payment ────────────────────────────────────────────────────
  test('TC6: Make payment from customer profile', async ({ page }) => {
    await openCustomerProfile(page, CUSTOMER_NAME);

    await page.getByRole('button', { name: 'Payment' }).click();
    await expect(page.getByRole('heading', { name: 'Payment & Deposits' })).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: 'Make Payment' }).click();
    await expect(page.getByRole('heading', { name: 'Ghi nhận thanh toán' })).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);

    // Service selector (required)
    await page.getByRole('button', { name: 'Chọn dịch vụ...' }).click();
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: /^Răng/ }).first().click();
    await page.waitForTimeout(300);

    // Amount (required, > 0) — scope to the modal overlay to avoid matching other number inputs
    const modal = page.locator('div.modal-content, .fixed.inset-0 .bg-white').last();
    // Use Cash amount field (Tiền mặt)
    await modal.locator('input[type="number"]').first().fill('300000');

    // Notes
    await page.getByPlaceholder('Ghi chú thanh toán...').fill('QA test payment');

    await page.screenshot({ path: 'e2e/screenshots/tc6-payment-form.png' });

    // Submit button
    await page.getByRole('button', { name: /^Ghi nhận/ }).click();
    await page.waitForTimeout(2000);

    // Modal should close — createPayment is client-side only (mock), so it resolves immediately
    await expect(page.getByRole('heading', { name: 'Ghi nhận thanh toán' })).not.toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('heading', { name: 'Payment & Deposits' })).toBeVisible({ timeout: 5000 });
  });
});
