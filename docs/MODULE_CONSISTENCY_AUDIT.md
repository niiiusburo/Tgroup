# Module Consistency Audit Report
**Date:** 2026-04-08
**Auditor:** Pi (multi-team orchestration)

---

## Executive Summary

After auditing all 80+ components across 17 pages and 16 component directories, we found **7 critical inconsistencies** across 5 module families. The biggest offender is the **Appointment module family** — 6 separate files handle appointment creation/editing/display but have diverged in features (color picker, selectors, status handling).

---

## Team 1: Appointment Module Family Audit

### Files in this family:

| # | File | Role | Pages Used |
|---|------|------|------------|
| 1 | `components/appointments/AppointmentForm.tsx` | **CREATE** new appointment | Appointments, Calendar (via QuickAdd), Overview (via QuickAdd), CustomerProfile |
| 2 | `components/modules/EditAppointmentModal.tsx` | **EDIT** today's appointment | Overview → TodayAppointments |
| 3 | `components/calendar/AppointmentDetailsModal.tsx` | **VIEW** appointment details | Calendar, Appointments |
| 4 | `components/calendar/AppointmentCard.tsx` | **DISPLAY** card in calendar views | Calendar (Day/Week/Month) |
| 5 | `components/modules/TodayAppointments.tsx` | **LIST** today's appointments | Overview |
| 6 | `components/modules/PatientCheckIn.tsx` | **CHECK-IN** flow for arrived patients | Overview |
| 7 | `components/shared/QuickAddAppointmentButton.tsx` | **TRIGGER** create appointment | Overview, Calendar |

### ASCII Relationship Map — Appointment Module Family

```
╔════════════════════════════════════════════════════════════════════════════════════════╗
║                        APPOINTMENT MODULE FAMILY — RELATIONSHIP MAP                    ║
╠════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                        ║
║  ┌──────────────────────┐        ┌──────────────────────┐                              ║
║  │  AppointmentForm.tsx  │◄───────│ QuickAddAppointment  │                              ║
║  │  [CREATE + EDIT]      │        │ Button.tsx [TRIGGER] │                              ║
║  │  ─────────────────── │        └──────────────────────┘                              ║
║  │  ✅ Color picker: NO  │              │                                              ║
║  │  ✅ Uses shared:      │              │ triggers create                               ║
║  │    CustomerSelector   │              ▼                                              ║
║  │    DoctorSelector     │     ┌─────────────────┐                                     ║
║  │    LocationSelector   │     │    PAGES:        │                                    ║
║  │    ServiceCatalog     │     │  Appointments ◄──┤                                    ║
║  │    DatePicker         │     │  Calendar        │                                    ║
║  │    TimePicker         │     │  Customers       │                                    ║
║  └──────────┬───────────┘     └─────────────────┘                                     ║
║             │                                                                          ║
║             │  SAME MODULE, DIFFERENT INSTANCE                                         ║
║             │  (should share color picker, selectors, etc.)                            ║
║             │                                                                          ║
║             ▼                                                                          ║
║  ┌──────────────────────────┐     ┌──────────────────────────┐                        ║
║  │ EditAppointmentModal.tsx  │     │ AppointmentDetailsModal  │                        ║
║  │ [EDIT today's apt]        │     │ [VIEW-ONLY details]      │                        ║
║  │ ────────────────────────│     │ ────────────────────────│                        ║
║  │ ⚠️ Color picker: YES     │     │ ✅ Color: N/A (view)     │                        ║
║  │ ⚠️ Uses CUSTOM           │     │ Uses STATUS_LABELS_VI    │                        ║
║  │   SearchableSelector     │     │ (LOCAL, not shared)      │                        ║
║  │   (NOT shared comp!)     │     └──────────────────────────┘                        ║
║  │ ⚠️ Has local             │                                                          ║
║  │   APPOINTMENT_COLORS     │                                                          ║
║  │   (DUPLICATE of         │                                                          ║
║  │    constants!)           │                                                          ║
║  └──────────┬───────────────┘                                                          ║
║             │                                                                          ║
║             │  used by                                                                 ║
║             ▼                                                                          ║
║  ┌──────────────────────────┐     ┌──────────────────────────┐                        ║
║  │ TodayAppointments.tsx     │     │ PatientCheckIn.tsx        │                        ║
║  │ [LIST today's apts]       │     │ [CHECK-IN flow]           │                        ║
║  │ ──────────────────────── │     │ ──────────────────────── │                        ║
║  │ ✅ Uses APPOINTMENT_      │     │ ✅ Color: N/A             │                        ║
║  │   CARD_COLORS from       │     │ Uses own STATUS_CONFIG    │                        ║
║  │   constants (correct)    │     │ (different labels)        │                        ║
║  └──────────────────────────┘     └──────────────────────────┘                        ║
║                                                                                        ║
║  ┌──────────────────────────┐                                                        ║
║  │ AppointmentCard.tsx       │   Uses APPOINTMENT_CARD_COLORS (correct)              ║
║  │ [DISPLAY card in         │   + APPOINTMENT_TYPE_COLORS                            ║
║  │  Day/Week/Month views]   │                                                        ║
║  └──────────────────────────┘                                                        ║
║                                                                                        ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
```

### 🔴 CRITICAL FINDING 1: Color Picker Missing in AppointmentForm

| Aspect | `AppointmentForm` (Create) | `EditAppointmentModal` (Edit) |
|--------|---------------------------|-------------------------------|
| Color picker | ❌ **MISSING** | ✅ Has full color dot picker |
| Color data saved | `color` field in FormData (never set) | Saves `colorCode` to DB via `updateAppointment` |
| Color constants | None | **LOCAL duplicate** `APPOINTMENT_COLORS` (lines 33-95) |

**Impact:** When creating an appointment, you can't pick a color. When editing, you can. But the edit modal uses its OWN copy of color definitions that may diverge from `constants/index.ts`.

### 🔴 CRITICAL FINDING 2: Duplicate Color Definitions

```
╔═══════════════════════════════════════════════════════════════════╗
║  COLOR DEFINITION DUPLICATION                                     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  SOURCE OF TRUTH:                                                 ║
║  ┌────────────────────────────────────┐                          ║
║  │ constants/index.ts                 │                          ║
║  │ APPOINTMENT_CARD_COLORS (codes 0-7)│ ← CANONICAL             ║
║  │ Used by: DayView, WeekView,        │                          ║
║  │   AppointmentCard, TodayApts       │                          ║
║  └────────────────────────────────────┘                          ║
║                                                                   ║
║  ROGUE COPY:                                                      ║
║  ┌────────────────────────────────────┐                          ║
║  │ EditAppointmentModal.tsx           │                          ║
║  │ APPOINTMENT_COLORS (lines 33-95)   │ ← DUPLICATE             ║
║  │ Has DIFFERENT structure:           │                          ║
║  │   - previewGradient field          │                          ║
║  │   - Different label names          │                          ║
║  │     ("Ocean Blue" vs "Xanh dương") │                          ║
║  │   - Different bg classes           │                          ║
║  │     (bg-blue-100 vs bg-blue-50)    │                          ║
║  └────────────────────────────────────┘                          ║
║                                                                   ║
║  ⚠️  When someone updates colors in constants, they              ║
║      WON'T be reflected in EditAppointmentModal!                  ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

### 🟡 FINDING 3: Different Selector Components

| Selector | AppointmentForm | EditAppointmentModal |
|----------|----------------|---------------------|
| Customer | `CustomerSelector` (shared) | **Read-only display** (correct — edit shouldn't change patient) |
| Doctor | `DoctorSelector` (shared) | **Custom `SearchableSelector`** (local, not shared) |
| Location | `LocationSelector` (shared) | **Custom `SearchableSelector`** (local, not shared) |
| Service | `ServiceCatalogSelector` (shared) | **Custom `SearchableSelector`** (local, not shared) |

**Impact:** The EditAppointmentModal has a nicer searchable dropdown with avatars, but it's not reusable. The AppointmentForm uses simpler shared selectors. Users get a **different UX** depending on which form they open.

### 🟡 FINDING 4: STATUS_OPTIONS Duplicated

```
AppointmentForm.tsx line 50-54:
  STATUS_OPTIONS = [
    { value: 'scheduled', label: 'Đang hẹn', color: '...' },
    { value: 'arrived', label: 'Đã đến', color: '...' },
    { value: 'cancelled', label: 'Hủy hẹn', color: '...' },
  ]

EditAppointmentModal.tsx line 100-103:
  STATUS_OPTIONS = [
    { value: 'scheduled', label: 'Đang hẹn', color: '...' },  // IDENTICAL
    { value: 'arrived', label: 'Đã đến', color: '...' },       // IDENTICAL
    { value: 'cancelled', label: 'Hủy hẹn', color: '...' },    // IDENTICAL
  ]

→ Should be extracted to constants/index.ts as APPOINTMENT_STATUS_OPTIONS
```

### 🟡 FINDING 5: AppointmentDetailsModal Has Local STATUS_LABELS_VI

```
AppointmentDetailsModal.tsx line 11-17:
  const STATUS_LABELS_VI: Record<string, string> = {
    scheduled: 'Đã đặt lịch',      // Different from STATUS_OPTIONS!
    confirmed: 'Đã xác nhận',       // Extra status not in STATUS_OPTIONS
    'in-progress': 'Đang khám',     // Extra status not in STATUS_OPTIONS
    completed: 'Hoàn tất',          // Extra status not in STATUS_OPTIONS
    cancelled: 'Đã huỷ',            // Different from 'Hủy hẹn'
  }

→ Should use shared constant from constants/
→ Also imports STATUS_LABELS from mockCalendar (English labels)
```

---

## Team 2: Form Module Family Audit

### ASCII Relationship Map — Form Modules

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║                       FORM MODULE FAMILY — RELATIONSHIP MAP                        ║
╠════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                    ║
║  ALL FORMS share the DESIGN STANDARD from AppointmentForm:                         ║
║  ┌─────────────────────────────────────────────────────────────────────┐          ║
║  │  DESIGN STANDARD:                                                   │          ║
║  │  • Orange gradient header (from-orange-500 via-orange-400 to-amber) │          ║
║  │  • Dot pattern overlay on header                                    │          ║
║  │  • Icon in bg-white/20 rounded-xl box                               │          ║
║  │  • Title: text-xl font-bold text-white                              │          ║
║  │  • Subtitle: text-sm text-orange-100                                │          ║
║  │  • X button: p-2 rounded-xl bg-white/20                             │          ║
║  │  • Labels: text-xs font-semibold text-gray-500 uppercase            │          ║
║  │  • Inputs: px-4 py-3 rounded-xl border-gray-200                    │          ║
║  │  • Footer: bg-gradient-to-b from-gray-50 to-white                  │          ║
║  │  • Cancel: "Hủy bỏ" button (border-gray-200)                       │          ║
║  │  • Primary: orange gradient + shadow-lg shadow-orange-500/25        │          ║
║  └─────────────────────────────────────────────────────────────────────┘          ║
║                                                                                    ║
║  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐        ║
║  │ AppointmentForm.tsx   │  │ ServiceForm.tsx       │  │ PaymentForm.tsx  │        ║
║  │ ✅ Matches standard   │  │ ✅ Matches standard   │  │ ⚠️ max-w-[600px] │        ║
║  │ Color picker: NO ❌   │  │ Color picker: N/A     │  │ (hardcoded width)│        ║
║  └──────────────────────┘  └──────────────────────┘  └──────────────────┘        ║
║                                                                                    ║
║  ┌──────────────────────┐  ┌──────────────────────────────────────────┐          ║
║  │ EmployeeForm.tsx      │  │ AddCustomerForm.tsx                      │          ║
║  │ ✅ Matches standard   │  │ ✅ Matches standard (MODULAR CARD layout)│          ║
║  │ Uses native <select>  │  │ Has LEFT+RIGHT panel split               │          ║
║  │ (not LocationSelector)│  │ Other forms are single-column            │          ║
║  └──────────────────────┘  └──────────────────────────────────────────┘          ║
║                                                                                    ║
║  ┌──────────────────────────┐                                                     ║
║  │ EditAppointmentModal.tsx  │  ⚠️ Header layout DIFFERS:                        ║
║  │ Uses: items-start         │  Standard uses: items-center                        ║
║  │ No icon in white/20 box   │  Standard has: icon + title + subtitle              ║
║  │ Has clock subtitle        │                                                     ║
║  └──────────────────────────┘                                                     ║
║                                                                                    ║
╚════════════════════════════════════════════════════════════════════════════════════╝
```

### 🟡 FINDING 6: EmployeeForm Uses Native `<select>` Instead of LocationSelector

```typescript
// EmployeeForm.tsx — uses raw <select> element:
<select value={companyid} onChange={(e) => setCompanyid(e.target.value)}
  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl...">
  <option value="">Chọn chi nhánh</option>
  {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
</select>

// AppointmentForm.tsx — uses shared LocationSelector component:
<LocationSelector locations={locations} selectedId={locationId}
  onChange={setLocationId} excludeAll />
```

**Impact:** EmployeeForm doesn't use the shared `LocationSelector` component. Different UX for location selection across forms.

### 🟡 FINDING 7: PaymentForm Has Hardcoded Max Width

```typescript
// PaymentForm.tsx line with max-w-[600px]:
<div className="modal-content animate-in zoom-in-95 duration-200 max-w-[600px]">

// All other forms use the standard modal-content width (no override)
```

---

## Team 3: Cross-Module Consistency Audit

### Selector Usage Across All Forms

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                    SHARED SELECTOR USAGE ACROSS FORMS                             ║
╠═══════════════╦══════════════╦═══════════════╦═════════════╦═════════════════════╣
║ Component     ║ Appointment  ║ Service       ║ Payment     ║ Employee            ║
║               ║ Form         ║ Form          ║ Form        ║ Form                ║
╠═══════════════╬══════════════╬═══════════════╬═════════════╬═════════════════════╣
║ Customer      ║ ✅ shared    ║ ✅ shared     ║ ✅ shared   ║ — (N/A)            ║
║ Selector      ║              ║               ║             ║                     ║
╠═══════════════╬══════════════╬═══════════════╬═════════════╬═════════════════════╣
║ Doctor        ║ ✅ shared    ║ ✅ shared     ║ — (N/A)     ║ — (N/A)            ║
║ Selector      ║              ║               ║             ║                     ║
╠═══════════════╬══════════════╬═══════════════╬═════════════╬═════════════════════╣
║ Location      ║ ✅ shared    ║ ✅ shared     ║ ✅ shared   ║ ❌ native <select>  ║
║ Selector      ║              ║               ║             ║                     ║
╠═══════════════╬══════════════╬═══════════════╬═════════════╬═════════════════════╣
║ Service       ║ ✅ shared    ║ ✅ shared     ║ ✅ shared   ║ — (N/A)            ║
║ Catalog       ║              ║               ║             ║                     ║
╠═══════════════╬══════════════╬═══════════════╬═════════════╬═════════════════════╣
║ Date Picker   ║ ✅ shared    ║ ✅ shared     ║ — (N/A)     ║ ✅ shared           ║
╠═══════════════╬══════════════╬═══════════════╬═════════════╬═════════════════════╣
║ Time Picker   ║ ✅ shared    ║ — (N/A)       ║ — (N/A)     ║ — (N/A)            ║
╠═══════════════╬══════════════╬═══════════════╬═════════════╬═════════════════════╣
║ Color Picker  ║ ❌ MISSING   ║ — (N/A)       ║ — (N/A)     ║ — (N/A)            ║
╚═══════════════╩══════════════╩═══════════════╩═════════════╩═════════════════════╝

EditAppointmentModal uses CUSTOM SearchableSelector (not shared components)
for Doctor, Location, and Service selectors.
```

### Status Label Inconsistencies

```
╔════════════════════════════════════════════════════════════════════════╗
║              STATUS LABEL INCONSISTENCIES                              ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────┐    ║
║  │ AppointmentForm  │  │ EditAppointment  │  │ DetailsModal       │    ║
║  │ STATUS_OPTIONS   │  │ STATUS_OPTIONS   │  │ STATUS_LABELS_VI   │    ║
║  ├─────────────────┤  ├─────────────────┤  ├────────────────────┤    ║
║  │ scheduled:       │  │ scheduled:       │  │ scheduled:         │    ║
║  │   'Đang hẹn'     │  │   'Đang hẹn'     │  │   'Đã đặt lịch' ⚠️ │    ║
║  │ arrived:         │  │ arrived:         │  │ confirmed:         │    ║
║  │   'Đã đến'       │  │   'Đã đến'       │  │   'Đã xác nhận'   │    ║
║  │ cancelled:       │  │ cancelled:       │  │ in-progress:       │    ║
║  │   'Hủy hẹn'      │  │   'Hủy hẹn'      │  │   'Đang khám'     │    ║
║  │                  │  │                  │  │ completed:         │    ║
║  │                  │  │                  │  │   'Hoàn tất'       │    ║
║  │                  │  │                  │  │ cancelled:         │    ║
║  │                  │  │                  │  │   'Đã huỷ' ⚠️      │    ║
║  └─────────────────┘  └─────────────────┘  └────────────────────┘    ║
║                                                                        ║
║  ⚠️  'Đang hẹn' ≠ 'Đã đặt lịch' — same status, different label       ║
║  ⚠️  'Hủy hẹn' ≠ 'Đã huỷ' — same status, different label             ║
║  ⚠️  DetailsModal has 5 statuses, others have only 3                   ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

## ASCII Master Map — ALL Module Relationships

```
╔════════════════════════════════════════════════════════════════════════════════════════════════╗
║                              TDENTAL MODULE RELATIONSHIP MASTER MAP                            ║
╠════════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                                ║
║  ┌─ APPOINTMENT FAMILY ─────────────────────────────────────────────────────────────────┐     ║
║  │                                                                                       │     ║
║  │  AppointmentForm ◄──RELATED──► EditAppointmentModal                                  │     ║
║  │  [CREATE]                        [EDIT]                                              │     ║
║  │    ↕ same module                    ↕ same module                                    │     ║
║  │    ↕ MUST share:                    ↕                                                │     ║
║  │    • color picker                   ↕                                                │     ║
║  │    • status options                 ↕                                                │     ║
║  │    • selector components            ↕                                                │     ║
║  │                                     ↕                                                │     ║
║  │  AppointmentDetailsModal            ↕                                                │     ║
║  │  [VIEW]                             ↕                                                │     ║
║  │    ↕ MUST share status labels       ↕                                                │     ║
║  │                                     ↕                                                │     ║
║  │  TodayAppointments ──uses──► EditAppointmentModal                                    │     ║
║  │  AppointmentCard ──uses──► APPOINTMENT_CARD_COLORS (from constants)                  │     ║
║  │  PatientCheckIn (independent — check-in status only)                                 │     ║
║  └──────────────────────────────────────────────────────────────────────────────────────┘     ║
║                                                                                                ║
║  ┌─ FORM FAMILY ────────────────────────────────────────────────────────────────────────┐     ║
║  │                                                                                       │     ║
║  │  AppointmentForm ◄──RELATED──► ServiceForm ◄──RELATED──► PaymentForm                 │     ║
║  │  [standard layout]           [standard layout]           [standard layout]            │     ║
║  │                                                                                       │     ║
║  │  EmployeeForm ◄──RELATED──► AddCustomerForm                                            │     ║
║  │  [standard layout]          [MODULAR CARD layout — different pattern]                 │     ║
║  │                                                                                       │     ║
║  │  ALL MUST share:                                                                      │     ║
║  │  • Orange gradient header design                                                      │     ║
║  │  • Same shared selectors (CustomerSelector, LocationSelector, etc.)                   │     ║
║  │  • Same input styling (px-4 py-3 rounded-xl)                                         │     ║
║  │  • Same label styling (text-xs font-semibold text-gray-500 uppercase)                 │     ║
║  └──────────────────────────────────────────────────────────────────────────────────────┘     ║
║                                                                                                ║
║  ┌─ SHARED COMPONENTS ──────────────────────────────────────────────────────────────────┐     ║
║  │                                                                                       │     ║
║  │  constants/index.ts ──exports──► APPOINTMENT_CARD_COLORS (codes 0-7)                  │     ║
║  │                            ──exports──► APPOINTMENT_TYPE_COLORS                       │     ║
║  │                            ──exports──► STATUS_COLORS                                  │     ║
║  │                                                                                       │     ║
║  │  shared/                                                                               │     ║
║  │    CustomerSelector ◄──used-by── AppointmentForm, ServiceForm, PaymentForm            │     ║
║  │    DoctorSelector   ◄──used-by── AppointmentForm, ServiceForm                         │     ║
║  │    LocationSelector ◄──used-by── AppointmentForm, ServiceForm, PaymentForm            │     ║
║  │                      ✗ NOT used by EmployeeForm (uses native <select>)                │     ║
║  │    ServiceCatalog   ◄──used-by── AppointmentForm, ServiceForm, PaymentForm            │     ║
║  │    DatePicker       ◄──used-by── AppointmentForm, ServiceForm, EmployeeForm           │     ║
║  │    TimePicker       ◄──used-by── AppointmentForm, EditAppointmentModal                │     ║
║  └──────────────────────────────────────────────────────────────────────────────────────┘     ║
║                                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Prioritized Fix List

| Priority | Issue | Files | Status |
|----------|-------|-------|--------|
| 🔴 P0 | **Add color picker to AppointmentForm** | `AppointmentForm.tsx` | ✅ FIXED |
| 🔴 P0 | **Remove duplicate APPOINTMENT_COLORS from EditAppointmentModal** — import from `constants/` | `EditAppointmentModal.tsx`, `constants/index.ts` | ✅ FIXED |
| 🟡 P1 | **Extract STATUS_OPTIONS to constants** — single source of truth | `constants/index.ts`, `AppointmentForm.tsx`, `EditAppointmentModal.tsx` | ✅ FIXED |
| 🟡 P1 | **Extract STATUS_LABELS_VI to constants** — merge with STATUS_OPTIONS | `constants/index.ts`, `AppointmentDetailsModal.tsx` | ✅ FIXED |
| 🟡 P1 | **Replace EmployeeForm native `<select>` with `LocationSelector`** | `EmployeeForm.tsx` | ✅ FIXED |
| 🟢 P2 | **Extract `SearchableSelector` from EditAppointmentModal to shared/** | `EditAppointmentModal.tsx` → `shared/SearchableSelector.tsx` | ⬜ TODO |
| 🟢 P2 | **Remove hardcoded `max-w-[600px]` from PaymentForm** | `PaymentForm.tsx` | ✅ FIXED |

---

## How the @crossref System Should Link These

For each pair of related files, add/update the `@crossref` comments so future edits trigger awareness of the sibling:

### AppointmentForm.tsx:
```typescript
/**
 * @crossref:related[EditAppointmentModal] — SAME MODULE (edit variant)
 *   When changing: STATUS_OPTIONS, color handling, selectors — sync with EditAppointmentModal
 * @crossref:related[AppointmentDetailsModal] — SAME MODULE (view variant)
 *   Status labels must be consistent
 * @crossref:related[ServiceForm] — SISTER FORM (same design standard)
 *   Header/footer/label/input styling must match
 */
```

### EditAppointmentModal.tsx:
```typescript
/**
 * @crossref:related[AppointmentForm] — SAME MODULE (create variant)
 *   Color picker, STATUS_OPTIONS, selectors must be consistent
 * @crossref:color-source[constants/index.ts APPOINTMENT_CARD_COLORS]
 *   DO NOT create local color maps — import from constants
 */
```

### AppointmentDetailsModal.tsx:
```typescript
/**
 * @crossref:related[AppointmentForm] — SAME MODULE (create variant)
 * @crossref:related[EditAppointmentModal] — SAME MODULE (edit variant)
 *   Status labels MUST match STATUS_OPTIONS from constants
 */
```

---

## Validation Checklist

After fixes are applied:

- [ ] Creating an appointment → color picker visible → saves color code to DB
- [ ] Editing an appointment (TodayAppointments) → same color picker → same colors
- [ ] Editing an appointment (Calendar) → uses EditAppointmentModal → same colors
- [ ] All STATUS_OPTIONS imported from single source in constants/
- [ ] EditAppointmentModal imports `APPOINTMENT_CARD_COLORS` from constants (no local copy)
- [ ] EmployeeForm uses shared `LocationSelector` component
- [ ] All forms have matching orange gradient header design
- [ ] No `APPOINTMENT_COLORS` local definitions remain (only `constants/index.ts`)
