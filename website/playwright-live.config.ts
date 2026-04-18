import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for live site E2E testing (nk.2checkin.com).
 * Does NOT depend on auth-setup — each test logs in independently.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'https://nk.2checkin.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    headless: true,
  },

  projects: [
    {
      name: 'live-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /live-site-full-check\.spec\.ts/,
    },
  ],
});
