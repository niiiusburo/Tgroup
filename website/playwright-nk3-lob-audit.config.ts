import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /nk3-live-cosmetic-lob-routing-audit\.spec\.ts/,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  reporter: 'list',

  use: {
    baseURL: 'https://tmv.2checkin.com',
    video: 'off',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: true,
    headless: true,
  },

  projects: [
    {
      name: 'chromium-nk3-lob-audit',
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined,
      },
    },
  ],
});