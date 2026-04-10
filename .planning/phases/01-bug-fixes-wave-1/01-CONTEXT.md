# Phase 1: Bug Fixes Wave 1 - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Source:** v1-1-audit-report.md + v1-1-contradictions-report.md + v1-1-playwright-report.md

<domain>
## Phase Boundary

Fix three critical bugs blocking daily clinic operations:
1. Save buttons fail on ServiceForm and PaymentForm due to synchronous `handleSubmit` race conditions
2. Calendar/TodaySchedule shows appointments from ALL branches regardless of location filter selection
3. Appointment completion does not scroll to the completed section

All fixes must include Playwright E2E tests with screenshots per user requirement: "every test got to go through playwright pictures."

</domain>

<decisions>
## Implementation Decisions

### Save Button Fix
- Convert `ServiceForm.handleSubmit` (`website/src/components/services/ServiceForm.tsx:197-221`) from sync to async with `await onSubmit(...)`
- Convert `PaymentForm.handleSubmit` (`website/src/components/payment/PaymentForm.tsx:173-202`) from sync to async with `await onSubmit(...)`
- Add loading state and error handling consistent with `EmployeeForm` pattern
- Keep `PageEditor` Save button out of scope for this phase (separate issue)

### Branch Filtering Fix
- `useTodaySchedule` hook (`website/src/hooks/useTodaySchedule.ts`) does NOT pass `companyId` to its API call
- `useOverviewAppointments` (`website/src/hooks/useOverviewAppointments.ts:166-170`) already passes `companyId`
- Calendar page may need similar wiring in `useCalendarData`
- Fix: thread `companyId` from `LocationContext` through to the API params in all schedule/appointment list hooks

### Appointment Completion Scroll
- `PatientCheckIn` (`website/src/components/modules/PatientCheckIn.tsx`) has no scroll trigger on status change
- `updateCheckInStatus` in `useOverviewAppointments` updates API but does not scroll
- Fix: add a ref to the "Completed" section in `PatientCheckIn` and call `scrollIntoView({ behavior: 'smooth' })` after successful status update

### Testing
- Every fix MUST have a Playwright test that captures a screenshot
- Use existing test patterns in `website/e2e/`
- Admin login for tests: `tg@clinic.vn` / `123456`

</decisions>

<canonical_refs>
## Canonical References

- `website/src/components/services/ServiceForm.tsx` — source of save button bug
- `website/src/components/payment/PaymentForm.tsx` — source of save button bug
- `website/src/hooks/useTodaySchedule.ts` — missing branch filter
- `website/src/hooks/useCalendarData.ts` — calendar data hook
- `website/src/components/modules/PatientCheckIn.tsx` — needs scroll trigger
- `website/src/hooks/useOverviewAppointments.ts` — status update logic
- `website/e2e/` — Playwright test suite location
- `website/playwright.config.ts` — screenshot configuration

</canonical_refs>

<specifics>
## Specific Acceptance Criteria

1. `ServiceForm.tsx` `handleSubmit` contains `await onSubmit(formData)`
2. `PaymentForm.tsx` `handleSubmit` contains `await onSubmit(formData)`
3. `useTodaySchedule.ts` passes `companyId` to the appointment fetch when a specific branch is selected
4. `PatientCheckIn.tsx` scrolls to completed section within 500ms of marking done
5. Each bug fix has a passing Playwright test with `screenshot: 'on'`

</specifics>

<deferred>
## Deferred Ideas

- PageEditor Save button (no onClick handler at all) — deferred to later phase
- Full branch filter on all calendar views beyond today/schedule — out of scope

</deferred>
