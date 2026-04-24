/**
 * E2E: Service edit from customer profile — doctor change save verification
 * Regression test for: editing a service from customer profile used sale order
 * line ID instead of sale order ID, causing 404 on PATCH /SaleOrders/:id
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5175';

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

test.describe('Service edit from customer profile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('can edit doctor on an existing service and save successfully', async ({ page }) => {
    await page.locator('a[href="/customers"]').first().click();
    await expect(page.locator('main').getByRole('heading', { name: /Customers|Khách hàng/i })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // Search to find customers with services
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

    // Check if there's an edit button for an existing service
    const editBtn = page.locator('button[title*="edit"], button[title*="sửa"]').first();
    const hasService = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasService) {
      test.skip(true, 'No existing services to edit for this customer');
      return;
    }

    // Click edit on first service
    await editBtn.click();
    await page.waitForTimeout(800);

    // Wait for edit modal
    const modalHeader = page.locator('h2:has-text("Sửa dịch vụ"), h2:has-text("Edit Service")').first();
    await expect(modalHeader).toBeVisible({ timeout: 8000 });

    // Open doctor selector and pick a different doctor (or same, just verify save works)
    const doctorSelectorBtn = page.locator('button').filter({ hasText: /Select doctor|Chọn bác sĩ/i }).first();
    if (await doctorSelectorBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await doctorSelectorBtn.click();
      await page.waitForTimeout(600);
      const firstDoctorOption = page.locator('div.max-h-56 button, div.max-h-48 button').first();
      if (await firstDoctorOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstDoctorOption.click();
      }
      await page.waitForTimeout(400);
    }

    await page.screenshot({ path: 'e2e/screenshots/service-edit-before-submit.png' });

    // Submit the form
    const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /Lưu|Save|Cập nhật|Update/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();

    // Wait for modal to close — this is the key assertion
    await expect(modalHeader).not.toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/service-edit-after-submit.png' });

    // Verify no error toast/panel is visible
    const errorToast = page.locator('.bg-red-50, [role="alert"]').filter({ hasText: /Lỗi|Error|failed|404/i });
    const hasError = await errorToast.isVisible({ timeout: 1500 }).catch(() => false);
    expect(hasError).toBe(false);

    console.log('✅ Service edit from customer profile passed');
  });
});
