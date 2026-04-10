import { test, expect } from '@playwright/test';

test.describe('Accent-insensitive search', () => {
  test('Calendar search should match Vietnamese names without accents', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

    // Wait for the calendar week view to render and load appointments
    await page.waitForSelector('text=Lịch hẹn', { timeout: 10_000 });
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[placeholder*="Tìm theo tên"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    // Helper: count appointment cards containing a given text
    const countAppointments = async (text: string) => {
      const cards = page.locator('[class*="calendar"], [class*="appointment"]').locator('text=' + text);
      // Fallback: just count occurrences in the body text
      const body = await page.locator('body').innerText();
      return (body.match(new RegExp(text, 'g')) || []).length;
    };

    // Clear search first
    await searchInput.fill('');
    await page.waitForTimeout(500);
    const phamCountBefore = await countAppointments('PHẠM');
    console.log('PHẠM count before search:', phamCountBefore);
    expect(phamCountBefore).toBeGreaterThanOrEqual(1);

    // Test 1: Search "ph" should show PHẠM appointments
    await searchInput.fill('ph');
    await page.waitForTimeout(600);
    const phamCountAfterPh = await countAppointments('PHẠM');
    console.log('PHẠM count after "ph":', phamCountAfterPh);
    expect(phamCountAfterPh).toBeGreaterThanOrEqual(1);

    // Test 2: Search "pha" should STILL show PHẠM appointments (accent-insensitive)
    await searchInput.fill('pha');
    await page.waitForTimeout(600);
    const phamCountAfterPha = await countAppointments('PHẠM');
    console.log('PHẠM count after "pha":', phamCountAfterPha);
    expect(phamCountAfterPha, 'Expected "pha" to match "PHẠM" with accent-insensitive search').toBeGreaterThanOrEqual(1);

    // Test 3: Search "pham" should still show PHẠM appointments
    await searchInput.fill('pham');
    await page.waitForTimeout(600);
    const phamCountAfterPham = await countAppointments('PHẠM');
    console.log('PHẠM count after "pham":', phamCountAfterPham);
    expect(phamCountAfterPham, 'Expected "pham" to match "PHẠM" with accent-insensitive search').toBeGreaterThanOrEqual(1);

    // Test 4: Clear search and verify broader results return
    await searchInput.fill('');
    await page.waitForTimeout(600);
    const phamCountAfterClear = await countAppointments('PHẠM');
    console.log('PHẠM count after clear:', phamCountAfterClear);
    expect(phamCountAfterClear).toBeGreaterThanOrEqual(phamCountBefore);
  });
});
