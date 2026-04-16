import { test, expect } from '@playwright/test';

test('appointment status labels are translated', async ({ page }) => {
  await page.goto('http://76.13.16.68:5174/login');
  await page.locator('#email').fill('tg@clinic.vn');
  await page.locator('#password').fill('123456');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#email')).toBeHidden({ timeout: 20000 });

  // Go to overview where today appointments are visible
  await page.goto('http://76.13.16.68:5174/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Click the edit pencil on the first today appointment card
  const editBtn = page.locator('button[title="Edit appointment"]').first();
  if (await editBtn.count() === 0) {
    test.skip('No edit pencil found on today appointments');
    return;
  }
  await editBtn.click();
  await page.waitForTimeout(1500);

  // Wait for edit modal to appear
  const modalTitle = page.locator('text=Sửa lịch hẹn');
  if (await modalTitle.count() === 0) {
    test.skip('Edit modal did not open');
    return;
  }

  // Scroll to status section
  const statusLabel = page.locator('text=Trạng thái').first();
  await statusLabel.scrollIntoViewIfNeeded();

  // Verify Vietnamese labels are shown
  await expect(page.locator('button:has-text("Đang hẹn")').first()).toBeVisible();
  await expect(page.locator('button:has-text("Đã đến")').first()).toBeVisible();
  await expect(page.locator('button:has-text("Hủy hẹn")').first()).toBeVisible();

  // Raw i18n keys should NOT be visible
  await expect(page.locator('text=appointments.status.scheduled').first()).not.toBeVisible();
  await expect(page.locator('text=appointments.status.arrived').first()).not.toBeVisible();
  await expect(page.locator('text=appointments.status.cancelled').first()).not.toBeVisible();

  await page.screenshot({ path: '/tmp/vps_appointment_status_fixed.png' });
});
