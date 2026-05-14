import { test, expect } from '@playwright/test';

/**
 * Tier Permission Matrix Test
 * Logs in as each tier and verifies what they can see
 */

const TIERS = [
  { name: 'Admin', email: 't@clinic.vn', password: '123123' },
  { name: 'Clinic Manager', email: 'testmanager@tgclinic.vn', password: '123123' },
  { name: 'Dentist', email: 'testdentist@tgclinic.vn', password: '123123' },
  { name: 'Receptionist', email: 'testreception@tgclinic.vn', password: '123123' },
  { name: 'Dental Assistant', email: 'testassistant@tgclinic.vn', password: '123123' },
];

async function login(page: any, email: string, password: string) {
  await page.goto('http://localhost:5175/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5175/', { timeout: 15000 });
}

for (const tier of TIERS) {
  test.describe(`${tier.name} Tier`, () => {
    test(`logs in and shows correct sidebar`, async ({ page }) => {
      await login(page, tier.email, tier.password);
      await page.waitForTimeout(1000);

      // Screenshot: Overview page with sidebar visible
      await page.screenshot({
        path: `test-results/tier-${tier.name.toLowerCase().replace(/\s+/g, '-')}-overview.png`,
        fullPage: false
      });
    });

    test(`can access /services or is blocked`, async ({ page }) => {
      await login(page, tier.email, tier.password);
      await page.goto('http://localhost:5175/services');
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: `test-results/tier-${tier.name.toLowerCase().replace(/\s+/g, '-')}-services.png`,
        fullPage: false
      });
    });

    test(`can access /payment or is blocked`, async ({ page }) => {
      await login(page, tier.email, tier.password);
      await page.goto('http://localhost:5175/payment');
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: `test-results/tier-${tier.name.toLowerCase().replace(/\s+/g, '-')}-payment.png`,
        fullPage: false
      });
    });

    test(`can access /permissions or is blocked`, async ({ page }) => {
      await login(page, tier.email, tier.password);
      await page.goto('http://localhost:5175/permissions');
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: `test-results/tier-${tier.name.toLowerCase().replace(/\s+/g, '-')}-permissions.png`,
        fullPage: false
      });
    });
  });
}
