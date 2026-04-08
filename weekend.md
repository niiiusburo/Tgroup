# Weekend Build List

Remaining items from the Blueprint vs Codebase gap analysis (2026-04-08).

## Priority: Medium

### 1. Customer Profile — Records Tab Empty State
- **File:** `src/components/customer/CustomerProfile.tsx`
- **Issue:** Records tab shows "Treatment records will be displayed here" empty state
- **Fix:** Wire up `ServiceHistory` component (exists at `components/customer/ServiceHistory.tsx`) into the Records tab
- **Data:** Needs service records for the selected customer — check `useServices` hook or create a `useCustomerServices` hook
- **Blueprint ref:** cu-12, cu-13

### 2. Customer Profile — Multi-visit Tracker in Records Tab
- **File:** `src/components/customer/CustomerProfile.tsx`
- **Issue:** Multi-visit treatments (e.g., braces 8/24 sessions) not shown in Records tab
- **Fix:** Import and render `MultiVisitTracker` for active multi-session services
- **Blueprint ref:** cu-14

### 3. Customer Profile — Check-in Flow in Appointments Tab
- **File:** `src/components/customer/CustomerProfile.tsx`
- **Issue:** Check-in workflow only exists on standalone Appointments page
- **Fix:** Show `CheckInFlow` component inline for appointments with status 'scheduled' or 'confirmed'
- **Blueprint ref:** cu-10

### 4. Calendar — Color Coding Toggle
- **File:** `src/pages/Calendar.tsx`
- **Issue:** No toggle to switch color coding between doctor/status/service-type modes
- **Fix:** Add a color mode selector dropdown (Doctor / Status / Service Type) that changes how AppointmentCard colors are applied
- **Blueprint ref:** ca-7

### 5. Employee — Schedule Editing
- **File:** `src/components/employees/ScheduleCalendar.tsx`
- **Issue:** Schedule view is display-only
- **Fix:** Add click-to-edit working hours, mark days off, save schedule
- **Blueprint ref:** em-7

### 6. Reports — Connect to Real Data
- **File:** `src/pages/Reports.tsx`
- **Issue:** Entire page is static placeholder HTML with hardcoded numbers
- **Fix:** Connect stat cards and charts to `DashboardReports` API endpoint, add date range filters, add export functionality
- **Blueprint ref:** lr-1, lr-2, lr-3, lr-4

### 7. Settings — Audit Log
- **Status:** Not implemented
- **Blueprint ref:** se-5
- **Note:** Needs backend support for tracking who changed what and when

## Priority: Low (Future)

### 8. Commission Module
- **Files:** `src/pages/Commission.tsx`
- **Issue:** Entire page is placeholder with no real functionality
- **Blueprint ref:** co-1 to co-4
- **Tasks:** Commission structure setup, tracking, payout, reports

### 9. Relationships — Link Managers
- **File:** `src/pages/Relationships.tsx`
- **Issue:** Only has Permission Matrix and Entity Map overview
- **Missing:** 6 specific Link Manager views:
  - Customer ↔ Employee (via referral code)
  - Employee ↔ Location
  - Employee ↔ Employee (Doctor ↔ Assistant)
  - Service ↔ Appointment
  - Payment ↔ Service
  - Relationship Rules Config
- **Blueprint ref:** rl-17 to rl-22

### 10. Relationships — Custom Permission Overrides
- **File:** `src/pages/Relationships.tsx`
- **Issue:** No override capability per employee
- **Fix:** Add a table where specific employees can be given elevated/reduced permissions beyond their tier defaults
- **Blueprint ref:** rl-15

### 11. Customer Profile — Photo Gallery (Separate Component)
- **Note:** User explicitly said this will be a completely different component, not the existing `PhotoGallery.tsx`
- **Status:** TBD — new component needed
- **Blueprint ref:** cu-5

### 12. Customer Profile — Source Tracking Display
- **Note:** `CustomerSourceDropdown` is in AddCustomerForm but the Profile tab doesn't show the source info prominently
- **Fix:** Show source badge/label on the profile card
- **Blueprint ref:** cu-7

### 13. Notifications — SMS/Email Sending
- **File:** `src/pages/Notifications.tsx`
- **Issue:** Template list exists but no actual sending mechanism
- **Fix:** Integrate with SMS/email provider API
- **Blueprint ref:** cu-22, cu-23

### 14. Multi-location Reporting (Compare Branches)
- **File:** `src/pages/Reports.tsx` or `src/pages/Locations.tsx`
- **Issue:** No side-by-side comparison view
- **Fix:** Add table/card comparing branches by client count, revenue, appointment volume, staffing
- **Blueprint ref:** lo-5

### 15. Modular Card Scrolling Pattern
- **Status:** Only `AddCustomerForm` uses the independent card scrolling pattern
- **Remaining forms need the pattern:**
  - `components/appointments/AppointmentForm.tsx`
  - `components/services/ServiceForm.tsx`
  - `components/payment/PaymentForm.tsx`
  - `components/employees/EmployeeForm.tsx`
- **Reference:** See CLAUDE.md "Modular Card Scrolling" section

## Completed (2026-04-08)

- ✅ **Multi-source PaymentForm** — deposit + cash + bank combo, partial payment OK (blueprint cu-18)
- ✅ **Location Form** — Real form behind the Add Location button (blueprint lo-2)
- ✅ **PaymentForm backward compat** — CustomerProfile passes `defaultCustomerId` + `depositBalance` + `outstandingBalance`

## Settings Page — Frozen As-Is

User decided to keep Settings page as currently built (2 tabs: System Settings, IP Access Control). Do NOT add blueprint tabs (Service Catalog, Roles, Customer Sources). The components exist but are intentionally not wired:
- `ServiceCatalogSettings` — unused
- `RoleConfig` — unused
- `CustomerSourcesConfig` — unused (source management is inline in AddCustomerForm instead)
- `PermissionGroupConfig` — unused
