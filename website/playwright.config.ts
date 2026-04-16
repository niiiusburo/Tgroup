import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for TGroup clinic management E2E tests.
 *
 * Usage:
 *   1. Start dev environment:  ./scripts/dev-e2e.sh
 *   2. Run all tests:          npx playwright test
 *   3. Run single test:        npx playwright test e2e/clinic-7-fixes.spec.ts
 *
 * The dev-e2e.sh script handles DB + API + Vite startup.
 * Tests run serially (--workers=1) because the Node API is single-threaded
 * and bcrypt auth is slow enough to cause timeouts under parallel load.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'html' : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
  },

  projects: [
    // Auth setup — runs first, saves login cookies to .auth/admin.json
    {
      name: 'auth-setup',
      testMatch: /auth-setup\.spec\.ts/,
      use: {
        // No storageState — this test CREATES it
        storageState: undefined,
      },
    },
    // All other E2E tests — uses saved auth state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin.json',
      },
      dependencies: ['auth-setup'],
      testIgnore: /auth-setup\.spec\.ts/,
    },
  ],
});
