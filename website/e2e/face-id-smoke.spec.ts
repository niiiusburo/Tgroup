import { test, expect, devices } from '@playwright/test';

const FACE_ID_BUTTON_NAME = /Quét nhanh khuôn mặt|Nhận diện khuôn mặt|Quick Face ID|Face ID/i;
const FACE_ID_SCAN_STATUS =
  /Đang tìm khuôn mặt|Đã phát hiện khuôn mặt|Đang tự chụp|Scanning for face|Face detected|Auto capturing/i;
const IPHONE_14_PRO = devices['iPhone 14 Pro'];

test.use({
  viewport: IPHONE_14_PRO.viewport,
  deviceScaleFactor: IPHONE_14_PRO.deviceScaleFactor,
  isMobile: IPHONE_14_PRO.isMobile,
  hasTouch: IPHONE_14_PRO.hasTouch,
  userAgent: IPHONE_14_PRO.userAgent,
  storageState: '.auth/admin.json',
  permissions: ['camera'],
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
});

const BASE = 'http://localhost:5175';

test.describe('Face ID Smoke', () => {
  test('Face ID button is visible on customer list', async ({ page }) => {
    await page.goto(BASE + '/customers');
    await expect(page.getByRole('main').getByRole('heading', { name: /Customers|Khách hàng/i })).toBeVisible({ timeout: 15000 });

    const faceIdBtn = page.getByRole('button', { name: FACE_ID_BUTTON_NAME });
    await expect(faceIdBtn).toBeVisible();
  });

  test('Face ID modal opens when button is clicked', async ({ page }) => {
    await page.goto(BASE + '/customers');
    await expect(page.getByRole('main').getByRole('heading', { name: /Customers|Khách hàng/i })).toBeVisible({ timeout: 15000 });

    const faceIdBtn = page.getByRole('button', { name: FACE_ID_BUTTON_NAME });
    await faceIdBtn.click();

    // Modal should open with auto-scan feedback and camera controls.
    await expect(page.locator('video')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /Đổi camera|Switch camera/i })).toBeVisible();
    await expect(page.getByText(FACE_ID_SCAN_STATUS)).toBeVisible();
    await expect(page.locator('video')).toHaveClass(/blur-\[12px\]/);
  });

  test('Face ID modal can be cancelled', async ({ page }) => {
    await page.goto(BASE + '/customers');
    await expect(page.getByRole('main').getByRole('heading', { name: /Customers|Khách hàng/i })).toBeVisible({ timeout: 15000 });

    const faceIdBtn = page.getByRole('button', { name: FACE_ID_BUTTON_NAME });
    await faceIdBtn.click();

    const cancelBtn = page.getByRole('button', { name: /Hủy|Cancel/i });
    await expect(cancelBtn).toBeVisible({ timeout: 8000 });
    await cancelBtn.click();

    // Should return to the main customer list view
    await expect(faceIdBtn).toBeVisible({ timeout: 5000 });
  });
});
