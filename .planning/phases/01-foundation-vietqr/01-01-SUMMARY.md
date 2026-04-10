---
phase: 01-foundation-vietqr
plan: "01"
subsystem: website
tags: [vietqr, tdd, utilities, hooks]
dependency_graph:
  requires: []
  provides: ["vietqr.ts", "useBankSettings.ts"]
  affects: ["PaymentForm", "DepositWallet", "Settings"]
tech_stack:
  added: []
  patterns: ["VietQR img.vietqr.io URL builder", "custom React hook with fetch"]
key_files:
  created:
    - website/src/lib/vietqr.ts
    - website/src/lib/vietqr.test.ts
    - website/src/hooks/useBankSettings.ts
    - website/src/hooks/useBankSettings.test.ts
  modified: []
decisions:
  - "generatePaymentDescription correctly uses initials (first character of each name part) plus last 4 phone digits"
metrics:
  duration_minutes: ~5
  completed_date: "2026-04-10"
---

# Phase 01 Plan 01: Foundation VietQR Utilities Summary

## One-liner
Created foundational VietQR URL builder and bank settings hook with full TDD unit-test coverage.

## What Was Done

### Task 1: VietQR URL Builder + Unit Tests
- Implemented `buildVietQrUrl` in `website/src/lib/vietqr.ts` to generate `img.vietqr.io` URLs with `encodeURIComponent` for description and account name.
- Implemented `generatePaymentDescription` to create payment descriptions from customer initials and phone suffix.
- Added 5 test cases covering URL generation, normal description, empty name, whitespace-only name, and short phone numbers.

### Task 2: useBankSettings Hook + Unit Tests
- Implemented `useBankSettings` in `website/src/hooks/useBankSettings.ts` with `GET /api/settings/bank` (refresh) and `PUT /api/settings/bank` (updateSettings).
- Added 3 test cases covering initial fetch, update + refresh, and explicit refresh, using mocked `global.fetch`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected inconsistent example in plan test specification**
- **Found during:** Task 1
- **Issue:** Plan example stated `'LAN TRAN'` + `'09xx1234'` → `'LATR1234'`, but the described algorithm (first character of each whitespace-split part) produces `'LT1234'`.
- **Fix:** Updated test expectation to `'LT1234'` to align with the documented algorithm. The implementation was correct; the plan example contained a typo.
- **Files modified:** `website/src/lib/vietqr.test.ts`
- **Commit:** b1614e19

## Test Results
- `npx vitest run vietqr.test.ts` — 5/5 passed
- `npx vitest run useBankSettings.test.ts` — 3/3 passed

## Commits

| Hash | Message | Files |
|------|---------|-------|
| b1614e19 | feat(01-foundation-vietqr-01-01): VietQR URL builder and description generator | vietqr.ts, vietqr.test.ts |
| 04badd99 | feat(01-foundation-vietqr-01-01): useBankSettings hook with GET/PUT /api/settings/bank | useBankSettings.ts, useBankSettings.test.ts |

## Self-Check: PASSED
- All created files exist
- All tests pass
- Commits verified on branch
