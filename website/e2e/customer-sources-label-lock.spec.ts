import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREEN_DIR = path.join('e2e', 'screenshots', 'task12-source-label-lock');

test.describe('Customer source label lock (Settings UI smoke)', () => {
  test('referenced sources show lock, allow add path, and support active toggle', async ({ page }) => {
    fs.mkdirSync(SCREEN_DIR, { recursive: true });

    await page.goto('/settings');
    await expect(page.locator('main h1, h1').filter({ hasText: /Settings|Cài đặt/i }).first()).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('tab', { name: /Customer Sources|Nguồn khách hàng/i }).click();

    await expect(page.getByText(/keep their name and type|giữ nguyên tên và loại/i)).toBeVisible({
      timeout: 15_000,
    });

    // Prefer the heavily referenced Sale Online lookup (order/customer counts > 0).
    const saleRow = page.locator('[data-source-name="Sale Online"][data-referenced="true"]').first();
    await expect(saleRow).toBeVisible({ timeout: 15_000 });
    await expect(saleRow.getByText(/Label locked|Nhãn đã khóa/i)).toBeVisible();
    await expect(saleRow.locator('button[title*="Remove"], button[title*="Xóa"]')).toHaveCount(0);
    await expect(page.locator('[data-referenced="true"]').first()).toBeVisible();

    // Inactive historical rows remain readable in the management list.
    const inactiveRows = page.locator('[data-testid^="customer-source-row-"].opacity-60');
    await expect(inactiveRows.first()).toBeVisible();

    await page.getByRole('button', { name: /Add Source|Thêm nguồn/i }).click();
    await expect(page.getByText(/new source for semantic|Tạo nguồn mới khi đổi nghĩa/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Source Name|Tên nguồn/i)).toBeVisible();

    await page.screenshot({
      path: path.join(SCREEN_DIR, 'settings-customer-sources-locked.png'),
      fullPage: true,
    });

    // Toggle active on a lightly referenced row and restore.
    const mktRow = page.locator('[data-source-name="MKT1"]').first();
    await expect(mktRow).toBeVisible();
    const toggle = mktRow.locator('button[title*="Deactivate"], button[title*="Activate"], button[title*="Ngưng"], button[title*="Kích hoạt"]').first();
    const beforeTitle = await toggle.getAttribute('title');
    await toggle.click();
    await page.waitForTimeout(800);
    const afterTitle = await toggle.getAttribute('title');
    expect(afterTitle).not.toEqual(beforeTitle);
    await toggle.click();
    await page.waitForTimeout(800);
    await expect(toggle).toHaveAttribute('title', beforeTitle || /./);

    await page.screenshot({
      path: path.join(SCREEN_DIR, 'settings-customer-sources-after-toggle.png'),
      fullPage: true,
    });
  });
});
