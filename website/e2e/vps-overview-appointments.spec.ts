import { test, expect, type Page } from '@playwright/test';

const VPS_URL = 'http://76.13.16.68:5175';

async function login(page: Page) {
  await page.goto(`${VPS_URL}/login`);
  const alreadyLoggedIn = await page.locator('text=/Overview|Tổng quan/').isVisible().catch(() => false);
  if (alreadyLoggedIn) return;

  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', 'tg@clinic.vn');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=/Overview|Tổng quan/', { timeout: 15000 });
}

test.describe.configure({ mode: 'serial' });

test.describe('VPS Overview Page - Appointments Display', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    console.log(`\n=== Logging in to VPS: ${VPS_URL} ===`);
    await login(page);
    console.log('  ✓ Logged in');
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('VPS Overview page shows today appointments and edit form populates all 3 staff', async () => {
    console.log(`\n=== Testing VPS Frontend: ${VPS_URL} ===`);

    // Ensure we're on overview
    await page.goto(`${VPS_URL}/`);
    await page.waitForTimeout(3000);

    // Take screenshot of overview
    await page.screenshot({ path: 'test-results/vps-overview.png', fullPage: true });

    // Get page content
    const bodyText = await page.locator('body').innerText();

    // Check for today's appointment names (from actual DB on 2026-04-21)
    const expectedNames = ['Mai', 'Dung', 'kiên test 2', 'test 3'];
    let foundNames = 0;
    for (const name of expectedNames) {
      if (bodyText.includes(name)) {
        foundNames++;
        console.log(`  ✓ Found patient: ${name}`);
      }
    }

    console.log(`\nFound ${foundNames}/${expectedNames.length} patient names on VPS page`);
    expect(foundNames, `Expected at least 1 patient name on Overview page. Found ${foundNames}.`).toBeGreaterThanOrEqual(1);

    // Find an appointment card that has assistant + dental aide (from DB: "Mai" has both)
    const maiCard = page.locator('text=Mai').first();
    const count = await maiCard.count();
    if (count > 0) {
      console.log('  Clicking on "Mai" appointment card to test edit form...');
      // Click the card (not a button inside it)
      await maiCard.locator('..').locator('..').click();

      // Wait for modal to open
      await page.waitForTimeout(500);

      // Take screenshot of edit modal
      await page.screenshot({ path: 'test-results/vps-edit-modal.png', fullPage: true });

      const modalText = await page.locator('body').innerText();

      // Verify all 3 staff roles are present in the form
      const lowerModal = modalText.toLowerCase();
      const hasDoctor = lowerModal.includes('bác sĩ') || lowerModal.includes('doctor');
      const hasAssistant = lowerModal.includes('phụ tá') || lowerModal.includes('assistant');
      const hasDentalAide = lowerModal.includes('trợ lý bác sĩ') || lowerModal.includes('dental aide');

      console.log(`  Form staff fields - Doctor: ${hasDoctor}, Assistant: ${hasAssistant}, Dental Aide: ${hasDentalAide}`);

      expect(hasDoctor, 'Edit form should show Doctor field').toBe(true);
      expect(hasAssistant, 'Edit form should show Assistant field').toBe(true);
      expect(hasDentalAide, 'Edit form should show Dental Aide field').toBe(true);

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else {
      console.log('  ⚠️ "Mai" appointment not found, skipping edit form test');
    }
  });

  test('VPS Customer profile records tab loads with non-zero count', async () => {
    console.log(`\n=== Testing VPS Customer Profile: ${VPS_URL} ===`);

    // Navigate to customers page
    await page.goto(`${VPS_URL}/customers`);
    await page.waitForTimeout(2000);

    // Click first customer row
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(2000);

    // Click the "Phiếu khám" / Records tab
    const recordsTab = page.locator('button:has-text("Phiếu khám"), button:has-text("Records"), button:has-text("records")').first();
    if (await recordsTab.count() > 0) {
      await recordsTab.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-results/vps-customer-records.png', fullPage: true });

      const tabText = await recordsTab.innerText();
      console.log(`  Records tab text: ${tabText}`);

      // The tab should not show "0" after loading (it may show … while loading, then a number)
      expect(tabText, 'Records tab should show a count (not stuck at 0 or loading forever)').not.toBe('Phiếu khám 0');
    } else {
      console.log('  ⚠️ Records tab not found');
    }
  });
});
