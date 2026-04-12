import { test, expect } from '@playwright/test';

test('FilterByLocation dropdown appears above page content', async ({ page }) => {
  await page.goto('/overview');
  await page.waitForLoadState('networkidle');

  // Inject location data into LocationContext by dispatching the auth-change event.
  // The real admin user has allowedLocations: [] (all-access), which renders an empty dropdown.
  // We dispatch tgclinic:auth-change to populate it with test locations.
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('tgclinic:auth-change', {
        detail: {
          locations: [
            { id: 'loc-001', name: 'Tấm Dentist Gò Vấp' },
            { id: 'loc-002', name: 'Tấm Dentist Quận 10' },
          ],
        },
      })
    );
  });

  // Wait for React to re-render with the new locations
  await page.waitForTimeout(200);

  // The filter button is inside <header> in Layout.tsx
  const filterButton = page.locator('header button:has-text("All Locations")').first();
  await expect(filterButton).toBeVisible({ timeout: 10_000 });
  await filterButton.click();

  // Wait a moment for dropdown to render
  await page.waitForTimeout(300);

  // The dropdown list container uses `absolute top-full` positioning.
  // Scope the option locator inside it to avoid matching the trigger button after selection.
  const dropdownList = page.locator('header .absolute.top-full').first();
  await expect(dropdownList).toBeVisible({ timeout: 5000 });

  const dropdownOption = dropdownList.locator('button:has-text("Tấm Dentist Gò Vấp")').first();
  await expect(dropdownOption).toBeVisible({ timeout: 5000 });

  // Click the option — proves it is on top and interactive (not obscured)
  await dropdownOption.click();

  // Dropdown list should close after selection
  await expect(dropdownList).not.toBeVisible({ timeout: 3000 });

  // Filter button should now show the selected location name
  await expect(page.locator('header button:has-text("Tấm Dentist Gò Vấp")').first()).toBeVisible();
});
