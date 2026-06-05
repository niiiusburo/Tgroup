import { defineConfig, devices } from '@playwright/test';

/**
 * Minimal one-off config for safe observation on the live NK3 site.
 * - Targets tmv.2checkin.com (real production NK3)
 * - No storageState (test handles its own login)
 * - Video + screenshots enabled for evidence
 * - Only runs the observation test
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /nk3-live-.*-payment-delete.*\.spec\.ts/,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: 'list',

  use: {
    baseURL: 'https://tmv.2checkin.com',
    video: { mode: 'on', size: { width: 1366, height: 900 } },
    screenshot: 'on',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium-live-nk3',
      use: {
        ...devices['Desktop Chrome'],
        // Explicitly no storageState — the test logs in fresh every time
        storageState: undefined,
      },
    },
  ],
});
