---
phase: 02-quick-features-validations
plan: 03
subsystem: website
 tags: [react, typescript, playwright, express]

requires:
  - phase: 02-01
  - phase: 02-02

provides:
  - Calendar page with three independent quick search boxes
  - WaitTimer integration in Overview PatientCheckIn cards
  - Phase 2 E2E test coverage with version bump and CHANGELOG update

affects:
  - calendar
  - overview
  - testing

tech-stack:
  added: []
  patterns:
    - "Decomposed search state into three independent filters"
    - "Conditional WaitTimer rendering based on check-in status"

key-files:
  created:
    - website/e2e/phase2-quick-features.spec.ts
  modified:
    - website/src/pages/Calendar.tsx
    - website/src/hooks/useCalendarData.ts
    - website/src/components/modules/PatientCheckIn.tsx
    - website/src/hooks/useOverviewAppointments.ts
    - website/package.json
    - website/public/CHANGELOG.json
    - api/src/routes/partners.js

key-decisions:
  - "Replaced backend duplicate phone query to remove reference to non-existent isdeleted column"
  - "Used .first() on Add Customer button locator to avoid matching the floating action button with the same aria-label"

duration: 26min
completed: 2026-04-10
---

# Phase 02 Plan 03: Calendar Search, WaitTimer, and Phase 2 E2E Summary

**One-liner:** Added three independent quick search boxes to the Calendar page, integrated WaitTimer into Overview PatientCheckIn cards for waiting patients, and wrote a full Playwright E2E suite covering all Phase 2 features.

## Performance

- **Duration:** 26 min
- **Started:** 2026-04-10
- **Completed:** 2026-04-10
- **Tasks:** 3
- **Files created/modified:** 7

## Accomplishments

- Replaced single `searchTerm` in `useCalendarData.ts` with `patientSearch`, `doctorSearch`, and `serviceSearch`, updating `filteredAppointments` to match all three terms independently.
- Replaced the Calendar toolbar's single search input with three side-by-side inputs with Vietnamese placeholders (`Bệnh nhân...`, `Bác sĩ...`, `Dịch vụ...`).
- Added `arrivalTime` and `treatmentStartTime` to `OverviewAppointment`, mapping them from appointment time in `useOverviewAppointments.ts`.
- Rendered a compact `WaitTimer` in `PatientCheckIn.tsx` for patients with `currentStatus === 'waiting'`.
- Updated `markArrived` and `updateCheckInStatus` action callbacks to keep `arrivalTime`/`treatmentStartTime` consistent with status changes.
- Created `phase2-quick-features.spec.ts` with 7 E2E tests verifying customer code visibility, duplicate phone API rejection, dental aide selector, deposit/payment date pickers, calendar search boxes, and the quick-add customer flow.
- Bumped version to `0.4.13` and added a top entry in `CHANGELOG.json`.

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Calendar page 3 quick search boxes | `bcfb96b5` |
| 2 | Integrate WaitTimer into PatientCheckIn | `d8d2ab08` |
| 3 | Playwright E2E tests, version bump, CHANGELOG | `ed959c14` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed backend duplicate phone query referencing non-existent `isdeleted` column**
- **Found during:** Task 3 (E2E test execution)
- **Issue:** The `POST /api/Partners` duplicate check used `SELECT id FROM partners WHERE phone = $1 AND isdeleted = false LIMIT 1`, but the `dbo.partners` table does not have an `isdeleted` column, causing the query to fail silently and allowing duplicate phone creations.
- **Fix:** Removed the `AND isdeleted = false` clause from the duplicate check query in `api/src/routes/partners.js`, then restarted the backend server.
- **Files modified:** `api/src/routes/partners.js`
- **Verification:** Direct API call to `POST /api/Partners` with phone `0349762840` returned 409 after the fix.
- **Committed in:** `ed959c14` (Task 3 commit)

**2. [Rule 3 - Blocking] Updated E2E locators to match actual Vietnamese UI text and button structure**
- **Found during:** Task 3 (E2E test execution)
- **Issue:** Initial E2E assertions used English headings (`New Service Record`) and a locator that matched the floating action button's `aria-label`, which was being intercepted by a tooltip overlay.
- **Fix:** Updated test to use Vietnamese headings (`Tạo dịch vụ`, `Thêm khách hàng`) and scoped the Add Customer button click to `.first()` to target the header button instead of the floating action button.
- **Files modified:** `website/e2e/phase2-quick-features.spec.ts`
- **Verification:** All 8 Playwright tests passed after the fixes.
- **Committed in:** `ed959c14` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both blocking)
**Impact on plan:** Necessary fixes to keep E2E suite green and backend validation functional. No scope creep.

## Issues Encountered

- Backend duplicate phone validation was non-functional due to a schema mismatch (fixed inline).
- Playwright bottom-right floating button click was intercepted by the release-notes tooltip (fixed by targeting the top-right header button).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Calendar now supports patient, doctor, and service quick search.
- Overview PatientCheckIn cards show live wait timers for waiting patients.
- Full Phase 2 E2E coverage is in place and passing.
- Ready for subsequent architecture and polish phases.

---
*Phase: 02-quick-features-validations*
*Completed: 2026-04-10*
