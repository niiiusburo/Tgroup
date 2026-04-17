import { test, expect } from '@playwright/test';

test.describe('IP Access Control E2E', () => {
  test('should load IP Access settings and manage entries', async ({ page }) => {
    await page.goto('/settings');

    // Wait for Settings page
    await expect(page.locator('main h1', { hasText: 'Settings' })).toBeVisible({ timeout: 10_000 });

    // Click IP Access Control tab
    const ipTab = page.getByRole('tab', { name: /IP Access Control/i });
    await expect(ipTab).toBeVisible();
    await ipTab.click();

    // Wait for IP Access panel
    await expect(page.getByText('Access Control Mode')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/Allow All/i)).toBeVisible();
    await expect(page.getByLabel(/Block All/i)).toBeVisible();
    await expect(page.getByLabel(/Whitelist Only/i)).toBeVisible();
    await expect(page.getByLabel(/Blacklist Block/i)).toBeVisible();

    // Add whitelist entry
    await page.fill('input#ip-address', '192.168.50.10');
    await page.selectOption('select#ip-type', 'whitelist');
    await page.fill('input#ip-description', 'Test whitelist office');
    await page.getByRole('button', { name: /Add IP/i }).click();
    await expect(page.getByText('192.168.50.10')).toBeVisible();
    await expect(page.getByText('Test whitelist office')).toBeVisible();

    // Add blacklist entry
    await page.fill('input#ip-address', '10.20.30.40');
    await page.selectOption('select#ip-type', 'blacklist');
    await page.fill('input#ip-description', 'Test blacklist actor');
    await page.getByRole('button', { name: /Add IP/i }).click();
    await expect(page.getByText('10.20.30.40')).toBeVisible();
    await expect(page.getByText('Test blacklist actor')).toBeVisible();

    // Verify stats updated
    await expect(page.locator('text=2').first()).toBeVisible();

    // Toggle whitelist entry off
    const whitelistRow = page.locator('tr', { hasText: '192.168.50.10' });
    await whitelistRow.locator('button[aria-label="Active"]').click();

    // Delete entries
    page.on('dialog', dialog => dialog.accept());
    await whitelistRow.locator('button[aria-label*="Remove"]').click();
    await expect(page.getByText('192.168.50.10')).not.toBeVisible();

    const blacklistRow = page.locator('tr', { hasText: '10.20.30.40' });
    await blacklistRow.locator('button[aria-label*="Remove"]').click();
    await expect(page.getByText('10.20.30.40')).not.toBeVisible();

    // Verify empty state
    await expect(page.getByText('No IP entries found')).toBeVisible();

    console.log('✅ IP Access Control E2E passed');
  });

  test('should switch access modes', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('main h1', { hasText: 'Settings' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /IP Access Control/i }).click();
    await expect(page.getByText('Access Control Mode')).toBeVisible({ timeout: 10_000 });

    // Switch to Whitelist Only (click the visible label card)
    await page.locator('label', { hasText: 'Whitelist Only' }).click();
    await expect(page.locator('input[value="whitelist_only"]')).toBeChecked();

    // Switch to Blacklist Block
    await page.locator('label', { hasText: 'Blacklist Block' }).click();
    await expect(page.locator('input[value="blacklist_block"]')).toBeChecked();

    // Switch to Block All
    await page.locator('label', { hasText: 'Block All' }).click();
    await expect(page.locator('input[value="block_all"]')).toBeChecked();

    // Switch back to Allow All
    await page.locator('label', { hasText: 'Allow All' }).click();
    await expect(page.locator('input[value="allow_all"]')).toBeChecked();

    console.log('✅ Mode switching E2E passed');
  });
});
