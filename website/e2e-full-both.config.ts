/**
 * Playwright config for running the FULL E2E suite against both
 * local dev server AND VPS production, to verify deploy parity.
 *
 * Usage:
 *   # Run both environments:
 *   npx playwright test --config=e2e-full-both.config.ts
 *
 *   # Local only:
 *   npx playwright test --config=e2e-full-both.config.ts --project=@local/*
 *
 *   # VPS only:
 *   npx playwright test --config=e2e-full-both.config.ts --project=@vps/*
 */
import { defineConfig, devices } from '@playwright/test';

const LOCAL_BASE = process.env.LOCAL_URL || 'http://localhost:5175';
const VPS_BASE = process.env.VPS_URL || 'https://nk.2checkin.com';

// Core test files — the ones that represent real features, not one-off debug sessions
const CORE_TESTS = [
  'e2e/auth-setup.spec.ts',
  'e2e/deploy-verify.spec.ts',
  'e2e/login-and-settings.spec.ts',
  'e2e/brand-rename.spec.ts',
  'e2e/brand-storage-keys.spec.ts',
  'e2e/version-display.spec.ts',
  'e2e/overview-appointments.spec.ts',
  'e2e/customer-create-save.spec.ts',
  'e2e/customer-profile-crud.spec.ts',
  'e2e/customer-persistence-sweep.spec.ts',
  'e2e/appointment-status-persistence.spec.ts',
  'e2e/permissions-matrix.spec.ts',
  'e2e/permissions-check.spec.ts',
  'e2e/permissions-tooltips.spec.ts',
  'e2e/deep-audit-verification.spec.ts',
  'e2e/phase2-quick-features.spec.ts',
  'e2e/phase3-architecture-shifts.spec.ts',
  'e2e/clinic-7-fixes.spec.ts',
  'e2e/bug-fixes-wave-1.spec.ts',
  'e2e/employee-save.spec.ts',
  'e2e/bank-selector.spec.ts',
  'e2e/vietqr-payment.spec.ts',
  'e2e/accent-insensitive-search.spec.ts',
  'e2e/filter-location-dropdown.spec.ts',
  'e2e/address-autocomplete.spec.ts',
];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },

  projects: [
    // ─── LOCAL ENVIRONMENT ────────────────────────────────
    {
      name: '@local/auth-setup',
      testMatch: /auth-setup\.spec\.ts/,
      use: {
        baseURL: LOCAL_BASE,
        storageState: undefined,
      },
    },
    {
      name: '@local/core',
      testMatch: new RegExp(CORE_TESTS.map(t => t.replace('e2e/', '').replace('.', '\\.')).join('|')),
      testIgnore: /auth-setup\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: LOCAL_BASE,
        storageState: '.auth/admin.local.json',
      },
      dependencies: ['@local/auth-setup'],
    },

    // ─── VPS ENVIRONMENT ──────────────────────────────────
    {
      name: '@vps/auth-setup',
      testMatch: /auth-setup\.spec\.ts/,
      use: {
        baseURL: VPS_BASE,
        storageState: undefined,
      },
    },
    {
      name: '@vps/core',
      testMatch: new RegExp(CORE_TESTS.map(t => t.replace('e2e/', '').replace('.', '\\.')).join('|')),
      testIgnore: /auth-setup\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: VPS_BASE,
        storageState: '.auth/admin.vps.json',
      },
      dependencies: ['@vps/auth-setup'],
    },
  ],
});
