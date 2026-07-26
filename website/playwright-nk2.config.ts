import { defineConfig, devices } from '@playwright/test';
import process from 'node:process';

/**
 * Playwright config for verifying a deploy on nk2 (staging).
 *
 * Deliberately separate from playwright-live.config.ts, which hardcodes
 * baseURL: https://nk.2checkin.com — that is PRODUCTION, and its live-chromium project
 * restricts testMatch to two specific specs. Verifying staging through that config would
 * either find no tests or point at prod.
 *
 * Defaults to nk2 and never to nk, so a forgotten env var cannot drive traffic at
 * production. Each test logs in on its own; no auth-setup dependency.
 *
 * Run: cd website && npx playwright test --config=playwright-nk2.config.ts
 */
const BASE = process.env.E2E_BASE_URL || 'https://nk2.2checkin.com';

if (/\/\/nk\.2checkin\.com/.test(BASE)) {
  throw new Error(
    'playwright-nk2.config.ts is for staging. Refusing to run against nk.2checkin.com — ' +
      'use playwright-live.config.ts for production checks.'
  );
}

process.env.E2E_BASE_URL = BASE;
process.env.E2E_API_BASE_URL ??= BASE;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: 'list',
  timeout: 90_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    headless: true,
  },

  projects: [
    {
      name: 'nk2-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /nk2-.*\.spec\.ts/,
    },
  ],
});
