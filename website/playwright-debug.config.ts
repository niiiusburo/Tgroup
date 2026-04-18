import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 60000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },
  projects: [
    {
      name: 'debug',
      testMatch: /debug-render\.spec\.ts/,
    },
  ],
});
