# PRD: Audit and Fix Appointment Date Filtering Across Overview and Calendar

## Problem Statement

A user created an appointment for "today" (2026-04-13) via the Calendar page. The appointment card appears correctly in the Calendar Day view, but the **Overview page shows zero appointments** in both:
- **Zone 3 — Lịch hẹn hôm nay** (Today’s Appointments sidebar)
- **Zone 1 — Đón tiếp / Tiếp nhận bệnh nhân** (Patient Check-in)

## Database Investigation

**Appointment record queried directly from PostgreSQL:**
```sql
SELECT id, name, date, time, state, partnerid, companyid
FROM dbo.appointments
WHERE id = 'cf898f68-2f79-4f6b-9cc7-f8be7983f2ab';
```

**Result:**
| id | name | date | time | state | companyid |
|---|---|---|---|---|---|
| cf898f68-... | AP235541 | 2026-04-13 00:00:00 | 10:51 | scheduled | b178d5ee-d9ac-477e-088e-08db9a4c4cf4 |

**Backend API simulation (same SQL that Overview executes):**
```sql
SELECT ... FROM appointments a
WHERE a.date >= '2026-04-13'
  AND a.date <= '2026-04-13T23:59:59'
ORDER BY a.date DESC;
```
**Result:** 1 row returned — the backend is **not** filtering the appointment out.

**Node/pg driver behavior check:**
- `pg` parses `timestamp without time zone` using the **Node process timezone**.
- The API server runs in a timezone with a **-7 hour offset** (e.g. PDT).
- Therefore the DB value `2026-04-13 00:00:00` is serialized to JSON as:  
  `"2026-04-12T17:00:00.000Z"`

**Conclusion:** The appointment exists in the database and the API returns it. The loss happens in **frontend client-side filtering**.

---

## Root Cause Analysis

### 1. Naïve date extraction in `useOverviewAppointments.ts`
The hook tries to extract the calendar day from the API date string with:

```ts
apt.date?.split('T')[0]
```

Because the API sends `"2026-04-12T17:00:00.000Z"` (UTC midnight on the 12th equals 07:00 ICT on the 13th), `split('T')[0]` yields **`2026-04-12`**.

The Overview then compares this to `todayStr` which is computed in the clinic timezone (`Asia/Ho_Chi_Minh`) and equals **`2026-04-13`**. The comparison fails and the appointment is discarded.

### 2. Why the Calendar view works
`useCalendarData` and `mapApiAppointmentToCalendar` use `utcToLocalDateStr()` which explicitly converts the UTC string back to `Asia/Ho_Chi_Minh`. The Calendar therefore sees `2026-04-13` and renders the appointment on the correct day.

### 3. Secondary issue — stale data on tab switch
The Overview page fetches appointments only on mount. If a user adds an appointment in the Calendar tab and then switches back to the Overview tab, the data remains stale because there is no `visibilitychange` listener.

---

## Solution Design

### Module 1: Fix date normalization in `useOverviewAppointments.ts`
**Requirement:** All date extraction from API responses must respect the user-configured timezone.

**Changes:**
1. Import `formatDate` from `useTimezone()`.
2. Update `mapApiToOverview` to accept a `formatDate` callback.
3. Replace `apt.date?.split('T')[0]` with `formatDate(apt.date, 'yyyy-MM-dd')` in both:
   - The mapping function (`date` field of `OverviewAppointment`)
   - The client-side today filter inside `loadAppointments`

### Module 2: Audit `useAppointments.ts`
**Requirement:** The shared appointments hook must also handle timezone-sensitive date parsing consistently.

**Changes:**
1. Import `useTimezone` and read `formatDate`.
2. Remove the helper `parseDate(dateString)` which relies on `new Date()` in the browser’s local timezone.
3. Pass `formatDate` into `mapApiToManagedAppointment` and use it for the `date` field.
4. Update all `.map()` calls in `refetch`, `search`, and `createAppointment` to pass the formatter.

### Module 3: Add visibility-change refresh to Overview
**Requirement:** Overview dashboard must auto-refresh when the browser tab regains focus so that cross-tab changes are visible.

**Changes:**
1. In `useOverviewAppointments.ts`, add a `useEffect` that listens for `document.visibilitychange`.
2. When `document.visibilityState === 'visible'`, call `loadAppointments()`.
3. Clean up the event listener on unmount.

### Module 4: Regression test coverage
**Requirement:** Automated tests must verify the fix and prevent future regressions.

**Tests to add:**
1. **Unit test for `mapApiToOverview`** — Given an ISO string `2026-04-12T17:00:00.000Z` and timezone `Asia/Ho_Chi_Minh`, assert that the mapped `date` is `2026-04-13`.
2. **Unit test for `loadAppointments` filter** — Mock `fetchAppointments` returning the above appointment on `2026-04-13`; assert that `appointments` state contains it.
3. **Unit test for visibility refresh** — Simulate `document.visibilityState = 'visible'` and assert `loadAppointments` is invoked.
4. **E2E test (optional / recommended)** — From the Calendar page, create an appointment for today, navigate to Overview, and verify the appointment appears in Zone 3.

---

## Implementation Decisions

- **Do NOT change the database schema.** The fix belongs in the frontend because the backend SQL is correct and the API already returns the full timestamp.
- **Do NOT change the API server timezone.** Frontend timezone handling is the canonical source of truth for the clinic staff.
- **Do NOT patch `node-postgres` date parsing.** Using the existing `TimezoneContext.formatDate` utility is safer and aligns with the rest of the codebase.
- **Re-use `useTimezone().formatDate`** instead of hard-coding `Asia/Ho_Chi_Minh` (used in `utcToLocalDateStr`) so that the fix continues to work if the clinic ever changes its configured timezone.

---

## Files Modified

| File | Change |
|---|---|
| `website/src/hooks/useOverviewAppointments.ts` | Fix date extraction + add visibility refresh |
| `website/src/hooks/useAppointments.ts` | Fix date extraction to use timezone context |

---

## Acceptance Criteria

- [ ] An appointment created for today appears in the Calendar **and** the Overview page.
- [ ] The Overview page refreshes automatically when the browser tab regains focus.
- [ ] Unit tests for `mapApiToOverview` pass with the UTC-offset edge-case date string.
- [ ] No regressions in existing Calendar, Appointments, or Overview functionality.

---

## Out of Scope

- Refactoring the entire Calendar date pipeline (it already works correctly).
- Changing the `timestamp without time zone` column type.
- Adding real-time WebSocket updates (visibility refresh is sufficient for this audit).
