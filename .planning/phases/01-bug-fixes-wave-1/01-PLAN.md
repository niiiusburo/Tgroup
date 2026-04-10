---
phase: 01-bug-fixes-wave-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - website/src/components/services/ServiceForm.tsx
  - website/src/components/payment/PaymentForm.tsx
  - website/src/components/appointments/AppointmentForm.tsx
  - website/src/components/modules/PatientCheckIn.tsx
  - website/src/hooks/useOverviewAppointments.ts
  - website/e2e/bug-fixes-wave-1.spec.ts
autonomous: true
requirements:
  - BUG-01
  - BUG-02
  - BUG-03

must_haves:
  truths:
    - ServiceForm save button waits for async onSubmit to complete before closing
    - PaymentForm save button waits for async onSubmit to complete before closing
    - AppointmentForm save button waits for async onSubmit to complete before closing
    - Calendar/Overview schedule filters by selected branch (companyId)
    - PatientCheckIn scrolls to completed section within 500ms of marking done
    - Each fix has a passing Playwright E2E test with screenshot
  artifacts:
    - path: website/src/components/services/ServiceForm.tsx
      provides: async handleSubmit with await onSubmit(formData)
      pattern: "async function handleSubmit"
    - path: website/src/components/payment/PaymentForm.tsx
      provides: async handleSubmit with await onSubmit({...})
      pattern: "async function handleSubmit"
    - path: website/src/components/appointments/AppointmentForm.tsx
      provides: async handleSubmit with await onSubmit({...})
      pattern: "async function handleSubmit"
    - path: website/src/components/modules/PatientCheckIn.tsx
      provides: scroll-to-completed after status update to done
      pattern: "scrollIntoView.*behavior.*smooth"
    - path: website/src/hooks/useOverviewAppointments.ts
      provides: updateCheckInStatus callback now accepts optional onSuccess hook
      pattern: "onSuccess\?"
    - path: website/e2e/bug-fixes-wave-1.spec.ts
      provides: E2E tests with screenshots for all three bugs
      pattern: "screenshot"
  key_links:
    - from: ServiceForm.tsx
      to: parent onSubmit prop
      via: await onSubmit(formData)
      pattern: "await onSubmit"
    - from: PaymentForm.tsx
      to: parent onSubmit prop
      via: await onSubmit({...})
      pattern: "await onSubmit"
    - from: AppointmentForm.tsx
      to: parent onSubmit prop
      via: await onSubmit({...})
      pattern: "await onSubmit"
    - from: PatientCheckIn.tsx
      to: useOverviewAppointments updateCheckInStatus
      via: onUpdateStatus callback + scroll ref
      pattern: "onUpdateStatus.*done"
    - from: useOverviewAppointments.ts
      to: API updateAppointment
      via: await updateAppointment(id, { state: 'done' })
      pattern: "updateAppointment"
---

<objective>
Fix three critical bugs blocking daily clinic operations and verify each with Playwright E2E tests.

Purpose: Save-button race conditions cause data loss, branch-filtering leaks cross-branch appointments, and missing scroll breaks the check-in workflow.
Output: Async submits in three forms, branch filter wired, smooth scroll on completion, and a new passing E2E spec with screenshots.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-bug-fixes-wave-1/01-CONTEXT.md
@.planning/v1-1-audit-report.md
@.planning/v1-1-contradictions-report.md
@.planning/v1-1-playwright-report.md

From ServiceForm.tsx (current):
- `function handleSubmit(e?: React.FormEvent)` is synchronous, calls `onSubmit(...)` without await (line ~197-221)
- Footer uses `<button type="submit">` which triggers form onSubmit; no loading state inside handleSubmit

From PaymentForm.tsx (current):
- `function handleSubmit(e?: React.FormEvent)` is synchronous, calls `onSubmit({...})` without await (line ~173-202)
- Footer save button calls `onClick={() => handleSubmit()}` (line ~492)

From AppointmentForm.tsx (current):
- `function handleSubmit(e?: React.FormEvent)` is synchronous, calls `onSubmit({...})` without await (line ~225)

From PatientCheckIn.tsx (current):
- `PatientCard` has a `cardRef` registered with `useAppointmentHover` and scrolls on `isHighlighted`, but NOT on status change to done
- `onUpdateStatus` is passed from Overview via `useOverviewAppointments`

From useOverviewAppointments.ts (current):
- `updateCheckInStatus` updates local state after API call but provides no success callback for scroll trigger
- Hook already correctly passes `companyId` to `fetchAppointments` for Overview

From useTodaySchedule.ts (current):
- Already passes `companyId: locationId && locationId !== 'all' ? locationId : undefined` to `fetchAppointments` (line ~33)
- Therefore TodaySchedule hook IS filtering; verify Calendar page wires `selectedLocationId` into any schedule view that uses raw appointments without location filter

From useCalendarData.ts (current):
- Already passes `companyId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined` to `fetchAppointments` (line ~76)
- Therefore Calendar page IS filtering at the API level

E2E pattern:
- Existing specs in `website/e2e/` use `BASE_URL = 'http://localhost:5174'`, login with `tg@clinic.vn` / `123456`
- Screenshots saved to `e2e/screenshots/`
</context>

<tasks>

<task type="auto">
  <name>Task 1: Convert ServiceForm handleSubmit to async with loading state</name>
  <files>website/src/components/services/ServiceForm.tsx</files>
  <read_first>website/src/components/employees/EmployeeForm.tsx</read_first>
  <action>
    1. Change `function handleSubmit(e?: React.FormEvent)` to `async function handleSubmit(e?: React.FormEvent)`.
    2. Add local loading state: `const [isSaving, setIsSaving] = useState(false);` near other state declarations.
    3. Wrap the body in try/finally: `setIsSaving(true);` at start, `finally { setIsSaving(false); }`.
    4. Add `await onSubmit({ ... });` after constructing the payload.
    5. Change the footer submit button `disabled` prop from `disabled={isLoading}` to `disabled={isLoading || isSaving}`.
    6. Follow the EmployeeForm pattern for error handling: add a `try` / `catch` block, and on error `setErrors({ submit: getErrorMessage(error) })` (or simple `console.error` if no error helper exists; prefer setting a local error banner if room permits).
    7. Keep all other UI/UX exactly the same — this is a behavior fix only.
  </action>
  <verify>
    <automated>grep -n "async function handleSubmit" website/src/components/services/ServiceForm.tsx && grep -n "await onSubmit" website/src/components/services/ServiceForm.tsx && grep -n "isSaving" website/src/components/services/ServiceForm.tsx</automated>
  </verify>
  <done>
    ServiceForm.tsx contains `async function handleSubmit`, `await onSubmit(...)`, `isSaving` state, and the submit button disables while saving.
  </done>
</task>

<task type="auto">
  <name>Task 2: Convert PaymentForm handleSubmit to async</name>
  <files>website/src/components/payment/PaymentForm.tsx</files>
  <read_first>website/src/components/services/ServiceForm.tsx (after Task 1)</read_first>
  <action>
    1. Change `function handleSubmit(e?: React.FormEvent)` to `async function handleSubmit(e?: React.FormEvent)`.
    2. Add `const [isSaving, setIsSaving] = useState(false);`.
    3. Wrap body in `try { ... await onSubmit({ ... }); } catch (error) { console.error('Payment save failed:', error); } finally { setIsSaving(false); }`.
    4. Update footer save button `disabled={isLoading || isSaving || totalPayment <= 0}`.
    5. Do NOT change any layout, labels, or validation logic.
  </action>
  <verify>
    <automated>grep -n "async function handleSubmit" website/src/components/payment/PaymentForm.tsx && grep -n "await onSubmit" website/src/components/payment/PaymentForm.tsx && grep -n "isSaving" website/src/components/payment/PaymentForm.tsx</automated>
  </verify>
  <done>
    PaymentForm.tsx contains `async function handleSubmit`, `await onSubmit(...)`, `isSaving` state, and disabled save button during save.
  </done>
</task>

<task type="auto">
  <name>Task 3: Convert AppointmentForm handleSubmit to async</name>
  <files>website/src/components/appointments/AppointmentForm.tsx</files>
  <read_first>website/src/components/services/ServiceForm.tsx (after Task 1)</read_first>
  <action>
    1. Change `function handleSubmit(e?: React.FormEvent)` to `async function handleSubmit(e?: React.FormEvent)`.
    2. Add `const [isSaving, setIsSaving] = useState(false);`.
    3. Wrap body in `try { ... await onSubmit({ ... }); } catch (error) { console.error('Appointment save failed:', error); } finally { setIsSaving(false); }`.
    4. Update the submit button(s) to include `|| isSaving` in their disabled conditions.
    5. Do NOT change any layout, labels, or validation logic.
  </action>
  <verify>
    <automated>grep -n "async function handleSubmit" website/src/components/appointments/AppointmentForm.tsx && grep -n "await onSubmit" website/src/components/appointments/AppointmentForm.tsx && grep -n "isSaving" website/src/components/appointments/AppointmentForm.tsx</automated>
  </verify>
  <done>
    AppointmentForm.tsx contains `async function handleSubmit`, `await onSubmit(...)`, `isSaving` state, and disabled save button during save.
  </done>
</task>

<task type="auto">
  <name>Task 4: Add scroll-to-completed in PatientCheckIn after marking done</name>
  <files>website/src/components/modules/PatientCheckIn.tsx, website/src/hooks/useOverviewAppointments.ts</files>
  <read_first>website/src/components/modules/PatientCheckIn.tsx</read_first>
  <action>
    1. In useOverviewAppointments.ts, modify `updateCheckInStatus` to accept an optional second argument `onSuccess?: () => void` and call it after `setAppointments` succeeds (inside the try block, after state update).
    2. In PatientCheckIn.tsx, add `const doneSectionRef = useRef<HTMLDivElement>(null);` and attach `ref={doneSectionRef}` to the outer wrapper of the "Hoàn thành" / done appointment list section (the div that renders the grid of done cards).
    3. In PatientCheckIn.tsx, define `const scrollToDone = useCallback(() => { doneSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, []);`.
    4. Pass `scrollToDone` as a new prop `onDone?: () => void` to each `PatientCard` instance inside PatientCheckIn.
    5. In PatientCard component props, add `onDone?: () => void`.
    6. In PatientCard, inside the status-change handler where `onUpdateStatus(appointment.id, status)` is called, if `status === 'done'`, call `onDone?.()` immediately after `onUpdateStatus(...)`.
    7. Do NOT use `any` types. Keep TypeScript strict.
  </action>
  <verify>
    <automated>grep -n "scrollIntoView" website/src/components/modules/PatientCheckIn.tsx && grep -n "doneSectionRef" website/src/components/modules/PatientCheckIn.tsx && grep -n "onDone" website/src/components/modules/PatientCheckIn.tsx</automated>
  </verify>
  <done>
    PatientCheckIn.tsx has `doneSectionRef`, passes `onDone` to PatientCard, and PatientCard calls `onDone?.()` when status changes to done, triggering smooth scroll.
  </done>
</task>

<task type="auto">
  <name>Task 5: Fix branch filtering in Calendar/TodaySchedule</name>
  <files>website/src/hooks/useTodaySchedule.ts, website/src/hooks/useCalendarData.ts, website/src/pages/Calendar.tsx</files>
  <read_first>website/src/hooks/useTodaySchedule.ts, website/src/hooks/useCalendarData.ts</read_first>
  <action>
    1. Open `website/src/pages/Calendar.tsx`. Find the `useCalendarData` call. If `selectedLocationId` is NOT passed as an argument, add it: change `const { appointments, ... } = useCalendarData(dateRange);` to `const { appointments, ... } = useCalendarData(dateRange, selectedLocationId);` (or match the hook's actual signature).
    2. If `Calendar.tsx` does not import `useLocationFilter`, add `import { useLocationFilter } from '@/contexts/LocationContext';` and destructure `const { selectedLocationId } = useLocationFilter();` near the top of the Calendar component.
    3. If `Calendar.tsx` renders `<TodaySchedule appointments={...} />` via a hook that ignores location, wrap or filter the appointments prop so only appointments matching `selectedLocationId` are passed when `selectedLocationId !== 'all'`.
    4. In `useTodaySchedule.ts`, verify the hook already passes `companyId: locationId && locationId !== 'all' ? locationId : undefined` to `fetchAppointments`. If missing, add it.
    5. In `useCalendarData.ts`, verify the hook already passes `companyId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined` to `fetchAppointments`. If missing, add it.
  </action>
  <verify>
    <automated>grep -n "companyId.*locationId\|companyId.*selectedLocationId" website/src/hooks/useTodaySchedule.ts website/src/hooks/useCalendarData.ts && grep -n "useCalendarData(selectedLocationId)\|useTodaySchedule" website/src/pages/Calendar.tsx</automated>
  </verify>
  <done>
    Calendar/TodaySchedule correctly filters appointments by `companyId` when a specific branch is selected; any missing wiring has been patched.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Write Playwright E2E spec with screenshots</name>
  <files>website/e2e/bug-fixes-wave-1.spec.ts</files>
  <read_first>website/e2e/clinic-7-fixes.spec.ts</read_first>
  <action>
    Create `website/e2e/bug-fixes-wave-1.spec.ts` with three focused tests:

    1. **Save button async — ServiceForm from customer profile**
       - Log in via `tg@clinic.vn` / `123456` (reuse the authenticatedPage pattern from clinic-7-fixes.spec.ts).
       - Navigate to `/customers`, open first customer profile.
       - Click "Add service" (or equivalent button) to open ServiceForm.
       - Fill required fields (service selector, doctor, location, date).
       - Click save. Wait for network idle + expect modal to close or success toast to appear.
       - Take screenshot `e2e/screenshots/bugfix-serviceform-save.png`.

    2. **Branch filtering — Calendar page**
       - Log in, navigate to `/calendar`.
       - Wait for appointments to load.
       - Select a specific branch from the global location filter (NOT "All Locations").
       - Wait for reload.
       - Verify no appointments from other branches appear (assert at least one appointment has `locationName` matching selected branch, or simply assert filter applied by checking URL or DOM state).
       - Take screenshot `e2e/screenshots/bugfix-calendar-filter.png`.

    3. **Appointment completion scroll — Overview page**
       - Log in, navigate to `/overview`.
       - Ensure at least one patient is in Zone 1 (arrived). If none, mark one from Zone 3 as arrived.
       - In Zone 1, change a patient's status dropdown from "Chờ khám" or "Đang khám" to "Hoàn thành".
       - Wait 600ms for smooth scroll.
       - Take screenshot `e2e/screenshots/bugfix-completion-scroll.png`.
       - Assert the "Hoàn thành" tab is visible in viewport (or simply that the screenshot captures it).

    Use `test.extend` for authenticatedPage exactly like clinic-7-fixes.spec.ts.
    Use `BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174'`.
    Add `screenshot: 'on'` only in test step, not globally.
  </action>
  <verify>
    <automated>cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npx playwright test e2e/bug-fixes-wave-1.spec.ts --project=chromium --max-failures=3</automated>
  </verify>
  <done>
    Spec exists, runs, and produces screenshots in `e2e/screenshots/` prefixed with `bugfix-`.
  </done>
</task>

</tasks>

<verification>
- All three forms use `async function handleSubmit` and `await onSubmit(...)`.
- Calendar branch filter passes `companyId` to API.
- PatientCheckIn scrolls on completion.
- `npx playwright test e2e/bug-fixes-wave-1.spec.ts` passes.
</verification>

<success_criteria>
- ServiceForm.tsx, PaymentForm.tsx, and AppointmentForm.tsx all have async submits with loading state.
- Branch filtering works on Calendar/TodaySchedule for specific branch selection.
- Marking an appointment as done scrolls the completed section into view smoothly.
- Playwright spec passes and writes three screenshot files.
</success_criteria>

<output>
After completion, create `.planning/phases/01-bug-fixes-wave-1/01-bug-fixes-wave-1-01-SUMMARY.md`
</output>
