# Handoff: Feedback Bug Fixes (8 Manual Reports)

**Handoff ID:** pi-20260516-052800-feedback-fixes
**Date:** 2026-05-16T05:28:00+07:00
**Session Tool:** Pi
**Session ID:** current-session
**Branch:** fix/feedback-reports
**Worktree:** /Users/thuanle/Documents/TamTMV/Tgrouptest

## What we were doing
Fixing 8 manual staff feedback reports from the NK feedback system. The extraction was done on 2026-05-15T21:37:24.528Z and produced 311 threads (8 manual + 303 auto).

## Decisions made
- Deploy fixes to NK2 staging FIRST, verify, then deploy to NK live
- Take BEFORE/AFTER screenshots for each visible bug fix
- Use the verification script `scripts/verify-feedback.js` to track progress

## Files changed
- `api/src/services/exports/builders/paymentsExport.js` — Added cash/bank/deposit columns
- `api/src/services/exports/builders/reportSalesEmployeesExport.js` — Split sale order code/name columns
- `.gitignore` — Added `.venv/` and `__pycache__/`
- `website/package.json` — Bumped to v0.32.1
- `scripts/verify-feedback.js` — Created admin-authenticated feedback verifier

## Current state
3 of 8 manual bugs FIXED and verified on NK2 staging:
- ✅ #7 (926fe4a4): Payments export missing cash/bank/deposit columns
- ✅ #8 (b064ee3d): Revenue export "Phiếu khám" column mixing
- ✅ #5 (aaab3cf5): Calendar export presets now use currently viewed date

Bug #5 fix details:
- Added `referenceDate` prop to `ExportDateRangeModal`
- Calendar passes `currentDate` to the modal
- All presets (1 day, 7 days, week, month, 3 weeks) now use the viewed date
- BEFORE: viewing May 13 + clicking "1 day" → exported May 16 (today)
- AFTER: viewing May 13 + clicking "1 day" → exports May 13
- Deploy required rebuilding Docker image (old container had cached chunk)

## Verification results
- `node scripts/verify-feedback.js live` → 311 threads confirmed
- NK2 staging API restarted with fix/feedback-reports branch
- Payments export preview: 200 OK, 12,026 rows
- Revenue employee export preview: 200 OK, 3,579 rows
- Both downloads produce valid Excel files

## Blockers / open questions
- Bug #4 (1f83120e): "Download báo cáo bị mất" — Need to clarify WHICH download is missing. The UI shows "Xuất dữ liệu" buttons. May refer to a legacy export center component not in current codebase.
- Bug #2 (91eeb398): "Revenue export shape changed too much" — Staff wants old report back. Need to check git history for previous export format.

## Next steps
1. Fix bug #3 (b660c63f): Advance receipt lands in payment receipt area — Check customer page payment/deposit UI components
2. Fix bug #1 (7bd930b0) and #6 (84adb3d5): Hồ sơ online image viewing — Check ExternalCheckups API and image blob URL handling
3. Clarify bug #4 with staff — take screenshot of specific missing download
4. Fix bug #2 (91eeb398): Revenue export shape changed too much — Staff wants old report back. Check git history for previous format.
5. After all fixes verified on NK2, deploy to NK live (night deploy recommended, current time is ~05:30 Vietnam time)

## Context to preserve
- NK2 staging URL: https://nk2.2checkin.com
- NK live URL: https://nk.2checkin.com
- Admin credentials: t@clinic.vn / 123123 (in .agents/live-site.env)
- VPS: root@76.13.16.68
- Staging API container: tgroup-staging-api (port 3102)
- Staging web container: tgroup-staging-web (port 5275→80)
- Live API container: tgroup-api (port 3002)
- Live web container: tgroup-web (port 5175→80)
