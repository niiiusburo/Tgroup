import { expect, test } from '@playwright/test';

test.describe('CTV discount fan landing', () => {
  test('public link opens landing with CTV name and voucher QR', async ({ page }) => {
    await page.goto('http://127.0.0.1:5175/ctv/discount/CTV-333333');
    await expect(page).not.toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: /CTV Test Leaf/i })
    ).toBeVisible({ timeout: 15_000 });

    const claimButton = page.getByRole('button', { name: /nhận mã giảm giá/i });
    if (await claimButton.isVisible().catch(() => false)) {
      await claimButton.click();
    }

    await expect(page.getByText(/MÃ GIẢM GIÁ CỦA BẠN/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('canvas').first()).toBeVisible();
  });
});