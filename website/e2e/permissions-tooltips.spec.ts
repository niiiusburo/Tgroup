import { test, expect } from '@playwright/test';

test.describe('Permission Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/permissions');
    await expect(page.locator('text=Permission System Architecture')).toBeVisible({ timeout: 15_000 });
    await page.click('button:has-text("Permission Matrix")');
    await expect(page.locator('table')).toBeVisible({ timeout: 5_000 });
  });

  test('Admin can toggle customers.view_all checkbox', async ({ page }) => {
    const viewAllCell = page.locator('td:has-text("View All")');
    await expect(viewAllCell).toBeVisible();
    const viewAllRow = viewAllCell.locator('..');
    const toggleBtn = viewAllRow.locator('button').nth(1);
    await expect(toggleBtn).toBeVisible();
    const initialText = await toggleBtn.textContent();
    await toggleBtn.click();
    await page.waitForTimeout(500);
    const afterText = await toggleBtn.textContent();
    expect(afterText).not.toBe(initialText);
  });

  test('permission rows show tooltip with description on info icon hover', async ({ page }) => {
    const infoIcon = page.locator('[data-testid="perm-info-customers.view_all"]');
    await expect(infoIcon).toBeVisible();
    await infoIcon.hover();
    const tooltip = page.locator('[data-testid="perm-tooltip-customers.view_all"]');
    await expect(tooltip).toBeVisible({ timeout: 3_000 });
    await expect(tooltip).toContainText('Xem tất cả khách hàng');
  });

  test('overview.view permission shows correct tooltip', async ({ page }) => {
    const infoIcon = page.locator('[data-testid="perm-info-overview.view"]');
    await expect(infoIcon).toBeVisible();
    await infoIcon.hover();
    const tooltip = page.locator('[data-testid="perm-tooltip-overview.view"]');
    await expect(tooltip).toBeVisible({ timeout: 3_000 });
    await expect(tooltip).toContainText('Xem trang tổng quan Dashboard');
  });

  test('payment.refund permission shows correct tooltip', async ({ page }) => {
    const infoIcon = page.locator('[data-testid="perm-info-payment.refund"]');
    await expect(infoIcon).toBeVisible();
    await infoIcon.hover();
    const tooltip = page.locator('[data-testid="perm-tooltip-payment.refund"]');
    await expect(tooltip).toBeVisible({ timeout: 3_000 });
    await expect(tooltip).toContainText('Hoàn tiền thanh toán');
  });
});
