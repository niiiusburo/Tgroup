---
phase: 01-foundation-vietqr
plan: "02"
subsystem: foundation-vietqr
tags: [api, database, bank-settings, settings-ui]
dependencies:
  requires: [01-01]
  provides: [01-03, 01-04]
  affects: [api, website]
tech-stack:
  added: []
  patterns: [Express routes, PostgreSQL migration, React form component]
key-files:
  created:
    - api/migrations/001_company_bank_settings.sql
    - api/src/routes/bankSettings.js
    - website/src/components/settings/BankSettingsForm.tsx
  modified:
    - api/src/server.js
    - website/src/pages/Settings/index.tsx
decisions: []
metrics:
  duration-minutes: ~15
  completed-date: "2026-04-10"
---

# Phase 1 Plan 2: Bank Settings API and Admin Form Summary

**One-liner:** Created the clinic bank account backend (DB migration + Express API) and integrated the admin configuration form into the Settings page.

## What Was Done

1. **Database migration** (`api/migrations/001_company_bank_settings.sql`) — creates `company_bank_settings` table with `bank_bin`, `bank_number`, `bank_account_name`, and `updated_at`.
2. **Backend API** (`api/src/routes/bankSettings.js`) — added `GET /api/settings/bank` and `PUT /api/settings/bank` with field validation and upsert logic.
3. **Server wiring** (`api/src/server.js`) — mounted bank settings router at `/api/settings`.
4. **Frontend form** (`website/src/components/settings/BankSettingsForm.tsx`) — form with inputs for BIN, account number, and account name; loading state; inline success message.
5. **Settings page integration** (`website/src/pages/Settings/index.tsx`) — added a new "Bank Account" tab containing `<BankSettingsForm />`.

## Commits

| Hash | Message |
|------|---------|
| f33b97c0 | feat(01-foundation-vietqr-02): DB migration and backend API for bank settings |
| 479faff8 | feat(01-foundation-vietqr-02): bank settings admin form in settings page |

## Deviations from Plan

None — plan executed exactly as written.

## Known Issues / Deferred

- Website build fails due to a pre-existing TypeScript error in `src/hooks/useMonthlyPlans.ts` (unrelated to this plan). Our new component and Settings page edits have no type errors.

## Self-Check: PASSED

- [x] `api/migrations/001_company_bank_settings.sql` exists
- [x] `api/src/routes/bankSettings.js` exists and exports Express router
- [x] `api/src/server.js` mounts `/api/settings` route
- [x] `website/src/components/settings/BankSettingsForm.tsx` exists and exports `BankSettingsForm`
- [x] `website/src/pages/Settings/index.tsx` renders `<BankSettingsForm />` in a new "Bank Account" tab
- [x] Both commits exist in repo
