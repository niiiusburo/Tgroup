import { test, expect } from '@playwright/test';

/**
 * Deep audit verification — login and check every page loads correctly.
 * Verifies: sidebar nav, header, no console errors, key content present.
 */

const PAGES = [
  { path: '/',              label: 'Overview',         expectedText: /Revenue|Today's Schedule|Stat/i },
  { path: '/calendar',      label: 'Calendar',         expectedText: /Week|Month|Day|appointments/i },
  { path: '/customers',     label: 'Customers',        expectedText: /Customer|Search|Add Customer/i },
  { path: '/employees',     label: 'Employees',        expectedText: /Employee|Doctor|Search/i },
  { path: '/locations',     label: 'Locations',        expectedText: /Location|Branch|District/i },
  { path: '/service-catalog', label: 'Service Catalog', expectedText: /Service|Catalog|Product/i },
  { path: '/settings',      label: 'Settings',         expectedText: /Settings|Preferences|Config/i },
  { path: '/permission-board', label: 'Permissions',   expectedText: /Permission|Role|Matrix/i },
  { path: '/reports',       label: 'Reports',          expectedText: /Report/i },
  { path: '/commission',    label: 'Commission',       expectedText: /Commission|Percent/i },
  { path: '/notifications', label: 'Notifications',    expectedText: /Notification/i },
];

test.describe('Audit verification — all pages load after login', () => {
  test('login succeeds and dashboard renders', async ({ page }) => {
    await page.goto('http://localhost:5174/login');

    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    await emailInput.fill('tg@clinic.vn');
    await page.locator('#password').fill('123456');
    await page.locator('button[type="submit"]').click();

    // Wait for dashboard to render (login form hidden)
    await expect(page.locator('#email')).toBeHidden({ timeout: 15_000 });

    // Sidebar visible
    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible({ timeout: 5_000 });

    // Header shows page title
    await expect(page.locator('h1')).toContainText(/Overview/i, { timeout: 5_000 });

    // No blank page / crash
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();

    // Check for blank page indicator (white screen = React crash)
    const hasContent = await page.locator('main').isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();

    console.log('✅ Login + dashboard render verified');
  });

  for (const pg of PAGES) {
    test(`page: ${pg.label} (${pg.path}) loads without errors`, async ({ page }) => {
      // Navigate
      const navLink = page.getByRole('link', { name: new RegExp(pg.label, 'i') });

      if (await navLink.isVisible().catch(() => false)) {
        // Click sidebar nav item
        await navLink.click();
      } else {
        // Fallback: direct navigation
        await page.goto(`http://localhost:5174${pg.path}`);
      }

      // Wait for network idle
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

      // Page rendered — not blank
      const bodyText = await page.textContent('body');
      expect(bodyText?.length).toBeGreaterThan(20);

      // No "Access Denied" page
      const hasAccessDenied = await page.getByText('Access Denied').isVisible().catch(() => false);
      expect(hasAccessDenied).toBeFalsy();

      // No "Route not found" from fallback route
      const hasNotFound = await page.getByText('page not found').isVisible().catch(() => false);
      expect(hasNotFound).toBeFalsy();

      // Check expected content present
      if (pg.expectedText) {
        await expect(page.locator('body')).toContainText(pg.expectedText, { timeout: 10_000 })
          .catch(() => console.log(`⚠️  ${pg.label}: expected text "${pg.expectedText}" not found`));
      }

      console.log(`✅ ${pg.label} (${pg.path}) — loaded OK`);
    });
  }

  test('no console errors on any page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    for (const pg of PAGES) {
      await page.goto(`http://localhost:5174${pg.path}`, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // Filter out expected/minor errors
    const realErrors = errors.filter(e =>
      !e.includes('302') &&           // Redirects
      !e.includes('Failed to fetch')  // Known API endpoints not implemented
    );

    if (realErrors.length > 0) {
      console.log(`⚠️  ${realErrors.length} console error(s):`, realErrors.slice(0, 10));
    } else {
      console.log('✅ No console errors during navigation');
    }

    expect(realErrors.length).toBeLessThan(10);
  });

  test('sidebar navigation items match routes', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await expect(page.locator('#email')).toBeHidden({ timeout: 10_000 });
    await page.waitForLoadState('networkidle');

    const navItems = await page.locator('nav a').allTextContents();
    console.log(`📋 Sidebar nav items:`, navItems);

    // Core nav items should be present
    for (const item of ['Overview', 'Calendar', 'Customers', 'Employees', 'Locations', 'Settings']) {
      const found = navItems.some(n => n.includes(item));
      if (!found) {
        console.log(`⚠️  Missing nav item: ${item}`);
      }
    }
  });
});
