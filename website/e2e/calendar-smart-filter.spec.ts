import { test, expect } from '@playwright/test';

async function clickByTestId(page: any, testId: string) {
  await page.evaluate((id: string) => {
    const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement;
    if (el) el.click();
  }, testId);
}

test.describe('Calendar Smart Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5175/calendar');
    await page.waitForSelector('[data-testid="calendar-filter-button"]', { timeout: 10000 });
  });

  test('opens and closes the filter drawer', async ({ page }) => {
    await page.locator('[data-testid="calendar-filter-button"]').click({ force: true });
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).toBeVisible();
    await clickByTestId(page, 'smart-filter-close');
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).not.toBeVisible();
  });

  test('closes drawer on backdrop click', async ({ page }) => {
    await page.locator('[data-testid="calendar-filter-button"]').click({ force: true });
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).toBeVisible();
    await page.locator('[data-testid="smart-filter-backdrop"]').click({ force: true });
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).not.toBeVisible();
  });

  test('status filter multi-select', async ({ page }) => {
    await page.locator('[data-testid="calendar-filter-button"]').click({ force: true });

    // Select "scheduled"
    await page.locator('[data-testid="filter-status-scheduled"]').click({ force: true });
    await expect(page.locator('[data-testid="filter-status-scheduled"]')).toHaveClass(/bg-blue-600/);

    // Also select "completed"
    await page.locator('[data-testid="filter-status-completed"]').click({ force: true });
    await expect(page.locator('[data-testid="filter-status-completed"]')).toHaveClass(/bg-blue-600/);

    // Apply
    await clickByTestId(page, 'smart-filter-apply');
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).not.toBeVisible();

    // Badge should show 2
    await expect(page.locator('[data-testid="calendar-filter-badge"]')).toHaveText('2');
  });

  test('doctor filter multi-select', async ({ page }) => {
    await page.locator('[data-testid="calendar-filter-button"]').click({ force: true });

    // Wait for at least one doctor chip
    await page.waitForSelector('[data-testid="filter-doctor-chip"]', { timeout: 5000 });
    const firstDoctor = page.locator('[data-testid="filter-doctor-chip"]').first();
    await firstDoctor.click({ force: true });
    await expect(firstDoctor).toHaveClass(/bg-blue-600/);

    // Select a second doctor if available
    const doctors = page.locator('[data-testid="filter-doctor-chip"]');
    const count = await doctors.count();
    if (count > 1) {
      const second = doctors.nth(1);
      await second.click({ force: true });
      await expect(second).toHaveClass(/bg-blue-600/);
    }

    await clickByTestId(page, 'smart-filter-apply');
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).not.toBeVisible();
  });

  test('color filter multi-select', async ({ page }) => {
    await page.locator('[data-testid="calendar-filter-button"]').click({ force: true });

    // Select color 0 and 1
    await page.locator('[data-testid="filter-color-0"]').click({ force: true });
    await page.locator('[data-testid="filter-color-1"]').click({ force: true });

    await expect(page.locator('[data-testid="filter-color-0"]')).toHaveClass(/bg-blue-600/);
    await expect(page.locator('[data-testid="filter-color-1"]')).toHaveClass(/bg-blue-600/);

    await clickByTestId(page, 'smart-filter-apply');
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).not.toBeVisible();
  });

  test('clear filters resets everything', async ({ page }) => {
    await page.locator('[data-testid="calendar-filter-button"]').click({ force: true });
    await page.locator('[data-testid="filter-status-scheduled"]').click({ force: true });
    await clickByTestId(page, 'smart-filter-apply');
    await expect(page.locator('[data-testid="calendar-filter-badge"]')).toHaveText('1');

    await page.locator('[data-testid="calendar-filter-button"]').click({ force: true });
    await clickByTestId(page, 'smart-filter-clear');

    // After clear, badge should disappear
    await expect(page.locator('[data-testid="calendar-filter-badge"]')).not.toBeVisible();
  });

  test('combined multi-select across all sections', async ({ page }) => {
    await page.locator('[data-testid="calendar-filter-button"]').click({ force: true });

    // Status
    await page.locator('[data-testid="filter-status-scheduled"]').click({ force: true });

    // Color
    await page.locator('[data-testid="filter-color-2"]').click({ force: true });

    // Doctor (first available)
    await page.waitForSelector('[data-testid="filter-doctor-chip"]', { timeout: 5000 });
    await page.locator('[data-testid="filter-doctor-chip"]').first().click({ force: true });

    await clickByTestId(page, 'smart-filter-apply');
    await expect(page.locator('[data-testid="calendar-filter-badge"]')).toHaveText('3');
  });
});
