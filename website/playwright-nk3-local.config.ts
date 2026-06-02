import { defineConfig, devices } from '@playwright/test';

/**
 * NK3 Local Verification Config (for this machine only)
 *
 * Targets the local dev servers on this Mac:
 * - Frontend: http://127.0.0.1:5175 (Vite, as per project rules — NOT localhost)
 * - API:      http://127.0.0.1:3002   (Node, reading 5433 tdental_demo / tcosmetic_demo)
 *
 * Use this to verify the earnings reversal fix on payment delete/void
 * against the real NK3 demo data (the 5433 DBs).
 *
 * Usage:
 *   1. Start API + Vite dev servers (npm run dev or the project's dev script)
 *   2. npx playwright test --config=playwright-nk3-local.config.ts e2e/nk3-payment-earnings-reversal.spec.ts
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: 'list',

  use: {
    // IMPORTANT: Use 127.0.0.1 per project rules (avoids IPv6/Docker binding issues)
    baseURL: 'http://127.0.0.1:5175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium-nk3-local',
      use: {
        ...devices['Desktop Chrome'],
        // We will handle login manually in the test for the specific NK3 admin account
        // (t@clinic.vn / 123123) because the standard .auth/admin.json may be for a different user.
        storageState: undefined,
      },
    },
  ],
});
