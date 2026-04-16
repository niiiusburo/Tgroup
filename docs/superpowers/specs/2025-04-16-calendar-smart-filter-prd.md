# PRD: Calendar Smart Filter (Bộ lọc)

## 1. Objective
Replace the existing status-tab and single-doctor filter on the Calendar page with a unified **Smart Filter** that slides out from the right side as a drawer. The filter supports multi-select chips for doctors, statuses, and color labels, with live counts and summary stats computed from the currently loaded appointments.

## 2. Scope
- **In scope**: Calendar page (`/calendar`) toolbar and filter UX only.
- **Out of scope**: Appointments list page, backend schema changes, new API endpoints.

## 3. UI/UX Requirements

### 3.1 Toolbar Change
- Remove the horizontal status-tab row and the `FilterByDoctor` dropdown from the Calendar toolbar.
- Keep the **search input** in the main toolbar for quick customer/doctor/service lookup.
- Add a new **"Bộ lọc"** button to the toolbar. When clicked, it opens a right-side slide-over drawer (`fixed inset-y-0 right-0 w-full sm:w-[420px]`).
- The button shows a badge with the number of active non-default filters (e.g., "Lọc (3)").

### 3.2 Drawer Layout (top to bottom)
1. **Header** — title "Bộ lọc" + close icon (X).
2. **Summary Cards** — two cards side-by-side:
   - **Left**: Calendar icon + total matching appointments count + label "Đang hẹn" (or dynamic label based on status selection; if mixed, show "Lịch hẹn").
   - **Right**: Clock icon + total expected duration (`timeexpected`) of matching appointments formatted as `XgYp` (e.g., `38g30p`). If no `timeexpected` data, show `-`.
3. **Doctor Filter Section** — label "Bác sĩ" + horizontal scrollable chip row.
   - First chip is **"Tất cả"** (selected by default).
   - Remaining chips = unique doctors present in the loaded appointment set for the visible date range.
   - Selecting any non-"Tất cả" chip unselects "Tất cả" and adds that doctor to the active set.
   - Selecting "Tất cả" clears all other doctor selections.
   - Each chip shows the doctor name.
4. **Status Filter Section** — label "Trạng thái" + chip row.
   - First chip is **"Tất cả"** (selected by default).
   - Remaining chips = mapped statuses from `APPOINTMENT_STATUS_I18N_KEYS` that exist in the loaded data.
   - Same multi-select behavior as doctors.
   - Each chip shows status label + count in parentheses, e.g., `Đang hẹn (75)`.
5. **Color Label Section** — label "Nhãn màu" + horizontal row of color circles.
   - Always render all 8 color codes (`0`–`7`) from `APPOINTMENT_CARD_COLORS`, even if count is 0.
   - First item is a **clear/transparent circle** representing "Tất cả / no color filter".
   - Each circle shows a dot of the corresponding color and a count in parentheses.
   - Multi-select: selecting a color adds it to the active filter set; selecting "Tất cả" clears color selections.
6. **Footer** — sticky bottom bar with three buttons:
   - **Đóng** (secondary, outline) — closes drawer without changing applied filters.
   - **Xóa bộ lọc** (danger/red, outline) — resets all sections to "Tất cả" and immediately applies.
   - **Lọc (n)** (primary, solid) — applies the current selection and closes the drawer. `n` = number of non-default selections across all sections.

### 3.3 Visual States
- **Selected chip**: solid primary background (`bg-primary text-white border-primary`).
- **Unselected chip**: white background, gray border, dark text (`bg-white text-gray-700 border-gray-200`).
- **Disabled/hidden**: none — all chips are always clickable.
- Drawer animates in/out with a `translate-x` transition (200 ms ease-out).
- Backdrop overlay covers the calendar page with `bg-black/30`.

## 4. Data & State Behavior

### 4.1 Source of Truth
- `useCalendarData` hook remains the source of truth for `appointments`, `search`, `currentDate`, and `viewMode`.
- Two new state fields are added to `useCalendarData`:
  - `selectedDoctors: string[]` — array of selected doctor names.
  - `selectedStatuses: AppointmentStatus[]` — array of selected statuses.
  - `selectedColors: string[]` — array of selected color codes (`0`–`7`).

### 4.2 Filtering Logic
The existing `filteredAppointments` memo in `useCalendarData` is updated to include the new multi-select rules:

```text
matchesDoctor   = selectedDoctors.length === 0
                  OR selectedDoctors.includes(apt.dentist)

matchesStatus   = selectedStatuses.length === 0
                  OR selectedStatuses.includes(apt.status)

matchesColor    = selectedColors.length === 0
                  OR selectedColors.includes(apt.color ?? '0')

matchesSearch   = existing search logic (customerName, phone, code, dentist, serviceName)
```

All conditions are combined with AND.

### 4.3 Counts & Aggregates
All counts and the summary stats are computed **client-side** from `appointments` (the unfiltered list loaded for the visible date range) so they reflect reality without extra API calls.

- **Doctor counts**: `appointments.filter(a => a.dentist === name).length`
- **Status counts**: `appointments.filter(a => a.status === status).length`
- **Color counts**: `appointments.filter(a => (a.color ?? '0') === code).length`
- **Total duration**: `sum(appointments.filter(matchesAll).map(a => a.timeexpected ?? 0))` minutes, formatted to `XgYp`.

## 5. Component Architecture

### New Components
| Component | Location | Responsibility |
|-----------|----------|----------------|
| `SmartFilterDrawer` | `website/src/components/calendar/SmartFilterDrawer.tsx` | Slide-over shell, header, footer, backdrop. |
| `SmartFilterSection` | `website/src/components/calendar/SmartFilterSection.tsx` | Reusable section wrapper with label and chip row. |
| `DoctorFilterChips` | `website/src/components/calendar/DoctorFilterChips.tsx` | Renders doctor chips with multi-select logic. |
| `StatusFilterChips` | `website/src/components/calendar/StatusFilterChips.tsx` | Renders status chips with counts. |
| `ColorFilterCircles` | `website/src/components/calendar/ColorFilterCircles.tsx` | Renders color circles with counts. |
| `FilterSummaryCards` | `website/src/components/calendar/FilterSummaryCards.tsx` | Top stats cards (count + duration). |
| `useSmartFilter` | `website/src/hooks/useSmartFilter.ts` | Encapsulates multi-select state helpers (`toggle`, `clear`, `isAllSelected`). |

### Modified Components
| Component | Changes |
|-----------|---------|
| `Calendar.tsx` | Remove `STATUS_TABS` row and `FilterByDoctor` import. Add `SmartFilterDrawer` and filter trigger button. Keep search input. |
| `useCalendarData.ts` | Add `selectedDoctors`, `selectedStatuses`, `selectedColors` state. Update `filteredAppointments` memo. Expose `clearFilters`. |

## 6. Performance & Edge Cases

### Performance
- The drawer is **lazy-rendered** (mounts only when first opened) to avoid computing chips on every calendar navigation.
- Counts are memoized inside the drawer components with `useMemo` to prevent recompute on every render.

### Edge Cases
1. **No appointments in range** — all counts are 0, summary shows 0 and `-`, drawer still functional.
2. **Doctor name is null/empty string** — group under `"Không xác định"` chip.
3. **Color code outside 0-7** — map unknown codes to the `"Tất cả"` transparent option or default to `0`.
4. **Rapid toggle** — state updates are local to the drawer; "Lọc" button commits them to `useCalendarData` in one batch to avoid flickering the calendar view.
5. **Drawer closed with unsaved changes** — if the user toggles chips but clicks "Đóng", changes are discarded. The drawer maintains its own draft state; only "Lọc" commits.

## 7. Accessibility
- Drawer has `aria-label="Bộ lọc"` and focus trap while open.
- Trigger button has `aria-expanded={isOpen}` and `aria-controls="calendar-smart-filter"`.
- Chips are rendered as `<button>` elements with `aria-pressed={isSelected}`.
- ESC key closes the drawer (reverting unsaved changes).

## 8. i18n
New translation keys to add under `calendar` namespace:
- `smartFilter.title` → "Bộ lọc"
- `smartFilter.close` → "Đóng"
- `smartFilter.clear` → "Xóa bộ lọc"
- `smartFilter.apply` → "Lọc"
- `smartFilter.doctors` → "Bác sĩ"
- `smartFilter.allDoctors` → "Tất cả"
- `smartFilter.status` → "Trạng thái"
- `smartFilter.allStatuses` → "Tất cả"
- `smartFilter.colorLabel` → "Nhãn màu"
- `smartFilter.allColors` → "Tất cả"
- `smartFilter.appointments` → "Lịch hẹn"
- `smartFilter.expectedDuration` → "Dự kiến"

## 9. Success Criteria
- [ ] Calendar toolbar no longer shows status tabs or doctor dropdown.
- [ ] Clicking "Bộ lọc" opens a right-side drawer with all specified sections.
- [ ] Multi-select works independently across doctors, statuses, and colors.
- [ ] Live counts on chips match the number of appointments for the visible date range.
- [ ] Summary cards update instantly as chips are toggled inside the drawer.
- [ ] "Xóa bộ lọc" resets everything to default and updates the calendar.
- [ ] Drawer closes on backdrop click, ESC key, or "Đóng" button without persisting unsaved changes.
- [ ] Existing search behavior remains unchanged.
