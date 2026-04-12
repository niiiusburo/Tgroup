import { test, expect } from '@playwright/test';

test.describe('Location filter - appointments', () => {
  test('Overview appointments change when location filter is changed', async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    // Wait for the appointments sidebar to render
    const appointmentsHeader = page.locator('text=Lịch hẹn hôm nay').first();
    await expect(appointmentsHeader).toBeVisible({ timeout: 10_000 });

    // Wait for appointments to load (API call)
    await page.waitForTimeout(1500);

    // Helper: count appointment cards in the TodayAppointments sidebar by counting time elements
    async function getAppointmentCount() {
      const sidebar = page.locator('.bg-white.rounded-2xl.border').filter({ hasText: 'Lịch hẹn hôm nay' });
      // Each card has a time like "08:00"
      const times = sidebar.locator('text=/\\d{2}:\\d{2}/');
      return times.count();
    }

    const initialCount = await getAppointmentCount();
    console.log(`Initial appointment count: ${initialCount}`);

    // Open the location filter dropdown using the same locator as the existing passing test
    const filterButton = page.locator('header button:has-text("All Locations")').first();
    await expect(filterButton).toBeVisible({ timeout: 10_000 });
    await filterButton.click();

    // Wait for dropdown to appear
    const dropdownList = page.locator('header .absolute.top-full').first();
    await expect(dropdownList).toBeVisible({ timeout: 5_000 });

    // Count options and click the second one (first real location after "All Locations")
    const options = dropdownList.locator('button');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThanOrEqual(2);

    const targetName = (await options.nth(1).textContent())?.trim() || '';
    console.log(`Selecting location: ${targetName}`);
    await options.nth(1).click();

    // Wait for dropdown to close and API to refetch
    await expect(dropdownList).not.toBeVisible({ timeout: 3_000 });
    await page.waitForTimeout(2000);

    const filteredCount = await getAppointmentCount();
    console.log(`Filtered appointment count: ${filteredCount}`);

    // The key assertion: count should have changed after selecting a different location
    // (If the DB happens to have all today's appointments at that location, counts could match,
    // but in the demo data they are spread across locations so this is a valid check.)
    expect(
      filteredCount !== initialCount,
      `Expected appointment count to change after selecting a different location. ` +
        `Initial: ${initialCount}, Filtered (${targetName}): ${filteredCount}`
    ).toBe(true);
  });
});
