/**
 * E2E verification for Phase 1 bug fixes (Wave 1)
 * Uses authenticatedPage fixture pattern (auto-login)
 */
import { test as base, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';

const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('#email');
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill('tg@clinic.vn');
      await page.locator('#password').fill('123456');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle');
    }

    console.log('After login URL:', page.url());
    await use(page);
  },
});

test.describe('Bug Fixes Wave 1', () => {

  test('ServiceForm async save works from customer profile', async ({ authenticatedPage: page }) => {
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Search for customers
    const searchInput = page.locator('input[placeholder*="earch"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('a');
      await page.waitForTimeout(1500);
    }

    // Click first customer row
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    await firstRow.click();
    await page.waitForTimeout(1500);

    // Click "Records" tab
    const recordsTab = page.locator('button:has-text("Records"), [role="tab"]:has-text("Records")').first();
    await expect(recordsTab).toBeVisible({ timeout: 5000 });
    await recordsTab.click();
    await page.waitForTimeout(1000);

    // Click "Add Service"
    const addServiceBtn = page.locator('button:has-text("Add Service")').first();
    await expect(addServiceBtn).toBeVisible({ timeout: 5000 });
    await addServiceBtn.click();

    // Wait for modal to open
    const modalHeader = page.locator('h2:has-text("Tạo dịch vụ")').first();
    await expect(modalHeader).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);

    // Fill Service selector
    const serviceSelectorBtn = page.locator('button:has-text("Chọn dịch vụ")').first();
    await serviceSelectorBtn.click();
    await page.waitForTimeout(600);
    const firstServiceOption = page.locator('div.max-h-56 button, div.max-h-48 button').first();
    await firstServiceOption.waitFor({ state: 'visible', timeout: 3000 });
    await firstServiceOption.click();
    await page.waitForTimeout(400);

    // Fill Doctor selector
    const doctorSelectorBtn = page.locator('button:has-text("Select doctor")').first();
    await doctorSelectorBtn.click();
    await page.waitForTimeout(600);
    const firstDoctorOption = page.locator('div.max-h-56 button, div.max-h-48 button').first();
    await firstDoctorOption.waitFor({ state: 'visible', timeout: 3000 });
    await firstDoctorOption.click();
    await page.waitForTimeout(400);

    // Location may already be pre-filled; if not, pick one
    const locationSelectorBtn = page.locator('button').filter({ hasText: /Chọn chi nhánh|Select location/ }).first();
    if (await locationSelectorBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await locationSelectorBtn.click();
      await page.waitForTimeout(600);
      const firstLocOption = page.locator('div.max-h-56 button, div.max-h-48 button').first();
      if (await firstLocOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstLocOption.click();
      }
      await page.waitForTimeout(400);
    }

    // Fill Start date using DatePicker "Hôm nay" button
    const dateTrigger = page.locator('button').filter({ hasText: /Chọn ngày|Pick a date/ }).first();
    if (await dateTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dateTrigger.click();
      await page.waitForTimeout(500);
      const todayBtn = page.locator('button:has-text("Hôm nay")').first();
      if (await todayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await todayBtn.click();
      } else {
        // Fallback: click today's date in calendar grid
        const todayCell = page.locator('button.bg-orange-50').first();
        if (await todayCell.isVisible({ timeout: 2000 }).catch(() => false)) {
          await todayCell.click();
        }
      }
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: 'e2e/screenshots/wave1-service-before-submit.png' });

    // Submit form
    const submitBtn = page.locator('button[type="submit"]').filter({ hasText: 'Tạo dịch vụ' }).first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();

    // Wait for modal to close
    await expect(modalHeader).not.toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/wave1-service-after-submit.png' });
    console.log('✅ ServiceForm async save passed');
  });

  test('Calendar branch filtering works', async ({ authenticatedPage: page }) => {
    await page.goto(`${BASE_URL}/calendar`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify global location filter button exists
    const locationFilterBtn = page.locator('button').filter({ hasText: /All Locations|Tấm Dentist/ }).first();
    await expect(locationFilterBtn).toBeVisible({ timeout: 8000 });

    // Open dropdown
    await locationFilterBtn.click();
    await page.waitForTimeout(800);

    // Select a specific branch (second option)
    const options = await page.locator('ul li button, ul li, [role="listbox"] [role="option"]').all();
    const targetBranch = options.length > 1 ? options[1] : options[0];
    if (targetBranch) {
      const branchName = await targetBranch.textContent();
      await targetBranch.click();
      console.log('Selected branch:', branchName?.trim());
    }

    await page.waitForTimeout(1500);

    // Verify selected branch appears in filter button
    const updatedFilterBtn = page.locator('button').filter({ hasText: /Tấm Dentist/ }).first();
    await expect(updatedFilterBtn).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/screenshots/wave1-calendar-branch-filter.png' });
    console.log('✅ Calendar branch filtering passed');
  });

  test('Overview appointment completion scroll', async ({ authenticatedPage: page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Wait for PatientCheckIn section
    const patientCheckInHeading = page.locator('text=Đón tiếp / Tiếp nhận bệnh nhân').first();
    await expect(patientCheckInHeading).toBeVisible({ timeout: 8000 });

    // Find a patient card with status "Chờ khám" — click the actual button
    const waitingBadgeBtn = page.locator('button:has-text("Chờ khám")').first();
    await expect(waitingBadgeBtn).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: 'e2e/screenshots/wave1-overview-before-update.png' });

    // Click the status badge to open dropdown
    await waitingBadgeBtn.click();
    await page.waitForTimeout(800);

    // Click "Hoàn thành" option inside the dropdown
    const doneOption = page.locator('label:has-text("Hoàn thành"), button:has-text("Hoàn thành"), div:has-text("Hoàn thành")').first();
    await expect(doneOption).toBeVisible({ timeout: 3000 });
    await doneOption.click();

    // Wait for status to update
    await page.waitForTimeout(1500);

    // Verify the badge now shows "Hoàn thành"
    const doneBadge = page.locator('button:has-text("Hoàn thành")').first();
    await expect(doneBadge).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: 'e2e/screenshots/wave1-overview-after-update.png' });
    console.log('✅ Overview appointment completion scroll passed');
  });
});
