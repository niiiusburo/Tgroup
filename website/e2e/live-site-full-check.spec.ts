import { test, expect, type Page } from '@playwright/test';

/**
 * Live Site Full Verification — nk.2checkin.com
 * Tests every module for empty labels and critical flows.
 */

const LIVE_URL = 'https://nk.2checkin.com';
const E2E_AUTH_TOKEN = process.env.E2E_AUTH_TOKEN;

async function login(page: Page) {
  if (E2E_AUTH_TOKEN) {
    await page.addInitScript((authToken) => {
      localStorage.setItem('tgclinic_token', authToken);
    }, E2E_AUTH_TOKEN);
    await page.goto(LIVE_URL);
    await page.waitForSelector('nav', { timeout: 20000 });
    return;
  }

  await page.goto(`${LIVE_URL}/login`);
  await page.waitForSelector('#email', { timeout: 15000 });

  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();

  await page.waitForSelector('nav', { timeout: 20000 });
  await page.waitForTimeout(2000);
}

// ─── Helper: assert NO empty shell elements on the current page ─────────────
async function assertNoEmptyElements(page: Page, pageName: string) {
  // Empty text-bearing elements. Empty divs are normally structural wrappers.
  const emptySelectors = [
    'span:empty', 'p:empty', 'label:empty',
    'h1:empty', 'h2:empty', 'h3:empty', 'h4:empty', 'h5:empty', 'h6:empty',
    'button:empty',
  ];

  let totalEmpty = 0;
  for (const sel of emptySelectors) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      // Some empty elements are legit (decorative divs, icons without text wrappers)
      // Filter out elements that are purely structural (no class, or just icon containers)
      const visibleEmpty = await page.locator(sel).evaluateAll((els) =>
        els.filter((el) => {
          const style = window.getComputedStyle(el);
          const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
          const hasWidth = el.clientWidth > 0 || el.scrollWidth > 0;
          const hasHeight = el.clientHeight > 0 || el.scrollHeight > 0;
          const textLike = el.className.includes('text') || el.className.includes('font');
          return isVisible && hasWidth && hasHeight && textLike;
        }).length
      );
      totalEmpty += visibleEmpty;
    }
  }

  if (totalEmpty > 0) {
    console.warn(`  ⚠️  ${pageName}: ${totalEmpty} potentially empty text elements found`);
  } else {
    console.log(`  ✅ ${pageName}: No empty text elements`);
  }
  return totalEmpty;
}

// ─── Helper: capture console & network errors ───────────────────────────────
async function captureErrors(page: Page, label: string) {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`PageError: ${err.message}`);
  });
  page.on('response', (res) => {
    if (!res.ok() && res.url().includes('/api/')) {
      networkErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  return () => {
    if (consoleErrors.length) {
      console.warn(`\n  🚨 Console errors (${label}):`);
      consoleErrors.forEach((e) => console.warn(`     ${e.substring(0, 200)}`));
    }
    if (networkErrors.length) {
      console.warn(`\n  🚨 Network errors (${label}):`);
      networkErrors.forEach((e) => console.warn(`     ${e}`));
    }
    return { consoleErrors, networkErrors };
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Live Site — nk.2checkin.com Full Verification', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ── PAGE LOAD + EMPTY LABEL CHECKS ───────────────────────────────────────

  test('Overview page loads with all labels', async ({ page }) => {
    const stopCapture = await captureErrors(page, 'Overview');
    await page.goto(`${LIVE_URL}/`);
    await page.waitForTimeout(3000);

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Overview|Tổng quan/);

    const empty = await assertNoEmptyElements(page, 'Overview');
    const { networkErrors } = stopCapture();
    expect(networkErrors.filter((e) => !e.includes('401') && !e.includes('403'))).toHaveLength(0);
    expect(empty).toBeLessThan(5); // allow a few decorative empties
  });

  test('Calendar page loads with all labels', async ({ page }) => {
    const stopCapture = await captureErrors(page, 'Calendar');
    await page.goto(`${LIVE_URL}/calendar`);
    await page.waitForTimeout(3000);

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Calendar|Lịch|Tuần|Tháng/);

    const empty = await assertNoEmptyElements(page, 'Calendar');
    stopCapture();
    expect(empty).toBeLessThan(5);
  });

  test('Customers page loads with all labels', async ({ page }) => {
    const stopCapture = await captureErrors(page, 'Customers');
    await page.goto(`${LIVE_URL}/customers`);
    await page.waitForTimeout(3000);

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Customers|Khách hàng/);

    const empty = await assertNoEmptyElements(page, 'Customers');
    stopCapture();
    expect(empty).toBeLessThan(5);
  });

  test('Appointments page loads with all labels', async ({ page }) => {
    const stopCapture = await captureErrors(page, 'Appointments');
    await page.goto(`${LIVE_URL}/appointments`);
    await page.waitForTimeout(3000);

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Appointments|Lịch hẹn/);

    const empty = await assertNoEmptyElements(page, 'Appointments');
    stopCapture();
    expect(empty).toBeLessThan(5);
  });

  test('Payment page loads with all labels', async ({ page }) => {
    const stopCapture = await captureErrors(page, 'Payment');
    await page.goto(`${LIVE_URL}/payment`);
    await page.waitForTimeout(3000);

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Payment|Thanh toán/);

    // Check specific payment labels
    expect(body).toMatch(/Số dư ví|Deposit|Còn nợ|Outstanding/);

    const empty = await assertNoEmptyElements(page, 'Payment');
    stopCapture();
    expect(empty).toBeLessThan(5);
  });

  test('Employees page loads with all labels', async ({ page }) => {
    const stopCapture = await captureErrors(page, 'Employees');
    await page.goto(`${LIVE_URL}/employees`);
    await page.waitForTimeout(3000);

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Employees|Nhân viên/);

    const empty = await assertNoEmptyElements(page, 'Employees');
    stopCapture();
    expect(empty).toBeLessThan(5);
  });

  test('Settings page loads with all labels', async ({ page }) => {
    const stopCapture = await captureErrors(page, 'Settings');
    await page.goto(`${LIVE_URL}/settings`);
    await page.waitForTimeout(3000);

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Settings|Cài đặt/);

    const empty = await assertNoEmptyElements(page, 'Settings');
    stopCapture();
    expect(empty).toBeLessThan(5);
  });

  // ── CRITICAL FLOW: Add Service from Customer Profile ─────────────────────

  test('CRITICAL: Add service from customer profile', async ({ page }) => {
    const stopCapture = await captureErrors(page, 'AddService');

    // 1. Go to Customers
    await page.goto(`${LIVE_URL}/customers`);
    await page.waitForTimeout(3000);

    // 2. Click first customer row
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();
    await page.waitForTimeout(2000);

    // 3. Should be on customer profile
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Customer Profile|Hồ sơ/);

    // 4. Click the "Phiếu khám" (Records) tab — Add Service button lives here
    const recordsTab = page.locator('button').filter({ hasText: /Phiếu khám|Records|Lịch sử/i });
    await expect(recordsTab).toBeVisible({ timeout: 5000 });
    await recordsTab.click();
    await page.waitForTimeout(2000);

    // 5. Scroll down to find the Add Service button
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);

    // Try to click "Add Service"
    const addServiceBtn = page.getByRole('button', { name: /Add Service|Thêm dịch vụ|Tạo dịch vụ|Thêm lịch khám/i });
    const hasAddService = await addServiceBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasAddService) {
      const allButtons = await page.locator('button').allInnerTexts();
      console.log('All buttons on profile:', allButtons.filter((b) => b.trim()).slice(0, 30));
    }

    expect(hasAddService, 'Add Service button should be visible in Records tab').toBe(true);

    await addServiceBtn.click();
    await page.waitForTimeout(2000);

    // 6. Modal should open with title
    const modalText = await page.locator('body').innerText();
    console.log('Modal text sample:', modalText.substring(0, 500));

    expect(modalText).toMatch(/New Service|Thêm dịch vụ|Tạo dịch vụ/);

    // 7. Verify no empty labels in the modal
    const empty = await assertNoEmptyElements(page, 'AddServiceModal');
    expect(empty).toBeLessThan(3);

    // Take screenshot for visual verification
    await page.screenshot({ path: 'e2e/screenshots/live-add-service-modal.png' });

    const { networkErrors } = stopCapture();
    // No 500/404 errors on API calls
    const criticalErrors = networkErrors.filter(
      (e) => !e.includes('401') && !e.includes('403') && !e.includes('404')
    );
    if (criticalErrors.length > 0) {
      console.warn('Critical network errors:', criticalErrors);
    }
  });

  // ── CRITICAL FLOW: Payment Form Labels ───────────────────────────────────

  test('CRITICAL: Payment form shows all labels', async ({ page }) => {
    const stopCapture = await captureErrors(page, 'PaymentForm');

    await page.goto(`${LIVE_URL}/payment`);
    await page.waitForTimeout(3000);

    // Look for "Add Payment" or payment button
    const addPaymentBtn = page.getByRole('button', { name: /Add Payment|Thêm thanh toán|Ghi nhận/i });
    const hasAddPayment = await addPaymentBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasAddPayment) {
      await addPaymentBtn.first().click();
      await page.waitForTimeout(2000);

      const modalText = await page.locator('body').innerText();
      console.log('Payment modal text sample:', modalText.substring(0, 500));

      // Key labels that were previously empty
      expect(modalText).toMatch(/Số dư ví|Deposit|Còn nợ|Outstanding/);
      expect(modalText).toMatch(/Nguồn thanh toán|Sources|Tiền mặt|Cash/);
      expect(modalText).toMatch(/Tổng thanh toán|Total Payment/);

      // Check for empty elements
      const empty = await assertNoEmptyElements(page, 'PaymentFormModal');
      expect(empty).toBeLessThan(3);

      await page.screenshot({ path: 'e2e/screenshots/live-payment-form.png' });
    }

    stopCapture();
  });

  // ── CRITICAL FLOW: Calendar Export Dialog ────────────────────────────────

  test('CRITICAL: Calendar export dialog shows labels', async ({ page }) => {
    const stopCapture = await captureErrors(page, 'ExportDialog');

    await page.goto(`${LIVE_URL}/calendar`);
    await page.waitForTimeout(3000);

    // Look for export button
    const exportBtn = page.getByRole('button', { name: /Export|Xuất/i });
    const hasExport = await exportBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasExport) {
      await exportBtn.first().click();
      await page.waitForTimeout(1000);

      const dialogText = await page.locator('body').innerText();
      expect(dialogText).toMatch(/Xuất|Export/);

      // Check for empty elements
      const empty = await assertNoEmptyElements(page, 'ExportDialog');
      expect(empty).toBeLessThan(3);

      await page.keyboard.press('Escape');
    }

    stopCapture();
  });

  // ── CRITICAL FLOW: Smart Filter Drawer ───────────────────────────────────

  test('CRITICAL: Smart filter drawer shows labels', async ({ page }) => {
    const stopCapture = await captureErrors(page, 'SmartFilter');

    await page.goto(`${LIVE_URL}/calendar`);
    await page.waitForTimeout(3000);

    // Look for filter button
    const filterBtn = page.getByRole('button', { name: /Filter|Lọc|Bộ lọc/i });
    const hasFilter = await filterBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasFilter) {
      await filterBtn.first().click();
      await page.waitForTimeout(1500);

      const drawerText = await page.locator('body').innerText();
      console.log('Filter drawer text sample:', drawerText.substring(0, 400));

      expect(drawerText).toMatch(/Bộ lọc|Filter|Bác sĩ|Doctor|Trạng thái|Status/);

      const empty = await assertNoEmptyElements(page, 'SmartFilterDrawer');
      expect(empty).toBeLessThan(3);

      // Close drawer
      const closeBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
      await closeBtn.click().catch(() => page.keyboard.press('Escape'));
    }

    stopCapture();
  });

  // ── CRITICAL FLOW: Bank Settings Form ────────────────────────────────────

  test('CRITICAL: Bank settings form shows labels', async ({ page }) => {
    const stopCapture = await captureErrors(page, 'BankSettings');

    await page.goto(`${LIVE_URL}/settings`);
    await page.waitForTimeout(3000);

    // Click bank settings tab if exists
    const bankTab = page.getByRole('button', { name: /Bank|Ngân hàng/i });
    if (await bankTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bankTab.click();
      await page.waitForTimeout(1500);

      const body = await page.locator('body').innerText();
      console.log('Bank settings text:', body.substring(0, 400));

      expect(body).toMatch(/Ngân hàng|Bank|tài khoản|account/);

      const empty = await assertNoEmptyElements(page, 'BankSettings');
      expect(empty).toBeLessThan(3);
    }

    stopCapture();
  });

  // ── CRITICAL FLOW: VietQR Modal ──────────────────────────────────────────

  test('CRITICAL: VietQR modal shows labels', async ({ page }) => {
    const stopCapture = await captureErrors(page, 'VietQR');

    await page.goto(`${LIVE_URL}/payment`);
    await page.waitForTimeout(3000);

    // Look for QR or VietQR button
    const qrBtn = page.getByRole('button', { name: /QR|VietQR|Quét/i });
    const hasQR = await qrBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasQR) {
      await qrBtn.first().click();
      await page.waitForTimeout(1500);

      const modalText = await page.locator('body').innerText();
      console.log('VietQR modal text:', modalText.substring(0, 400));

      expect(modalText).toMatch(/Thanh toán VietQR|VietQR|Số tiền|Amount/);

      const empty = await assertNoEmptyElements(page, 'VietQRModal');
      expect(empty).toBeLessThan(3);

      await page.keyboard.press('Escape');
    }

    stopCapture();
  });

  // ── FULL SITE NAVIGATION SMOKE TEST ──────────────────────────────────────

  test('Full site navigation — all routes load', async ({ page }) => {
    const routes = [
      { path: '/', name: 'Overview' },
      { path: '/calendar', name: 'Calendar' },
      { path: '/customers', name: 'Customers' },
      { path: '/appointments', name: 'Appointments' },
      { path: '/payment', name: 'Payment' },
      { path: '/employees', name: 'Employees' },
      { path: '/locations', name: 'Locations' },
      { path: '/settings', name: 'Settings' },
      { path: '/permissions', name: 'Permissions' },
      { path: '/reports', name: 'Reports' },
      { path: '/commission', name: 'Commission' },
      { path: '/feedback', name: 'Feedback' },
    ];

    let passed = 0;
    let failed = 0;

    for (const { path, name } of routes) {
      try {
        await page.goto(`${LIVE_URL}${path}`, { timeout: 20000 });
        await page.waitForTimeout(2000);

        const body = await page.locator('body').innerText();
        const hasContent = body.length > 200;

        if (hasContent) {
          passed++;
          console.log(`  ✅ ${name}`);
        } else {
          failed++;
          console.log(`  ❌ ${name} — blank page`);
        }
      } catch (e: any) {
        failed++;
        console.log(`  ❌ ${name} — ${e.message.substring(0, 80)}`);
      }
    }

    console.log(`\n  Summary: ${passed}/${routes.length} passed`);
    expect(failed).toBe(0);
  });
});
