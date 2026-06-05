import { defineConfig, devices } from '@playwright/test';

// One-off recording config for the NK3 CTV commission-cascade demo.
// Records video of logging into the 3 CTV accounts and showing the cascaded commission.
export default defineConfig({
  testDir: './e2e',
  testMatch: /ctv-commission-demo\.record\.spec\.ts/,
  timeout: 180_000,
  retries: 0,
  workers: 1,
  outputDir: 'test-results/ctv-demo',
  reporter: [['list']],
  use: {
    baseURL: 'https://tmv.2checkin.com',
    viewport: { width: 1366, height: 900 },
    video: { mode: 'on', size: { width: 1366, height: 900 } },
    screenshot: 'on',
    actionTimeout: 30_000,
    navigationTimeout: 45_000,
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
