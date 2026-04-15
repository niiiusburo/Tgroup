## Problem Statement

The doctor filter on the Calendar page is broken: selecting a doctor does not actually filter appointments. Additionally, the filter UI uses a native `<select>` dropdown that looks dated, has CSS bugs (misplaced padding/icon), and provides a poor user experience with 20+ doctors in the list.

## Solution

Fix the backend query to filter on the correct column (`a.doctorid` instead of `a.employeeid`), and replace the native `<select>` with a modern, accessible custom dropdown component featuring a search input inside the dropdown, doctor avatars/initials, clear selected state, and a compact trigger button.

## User Stories

1. As a receptionist viewing the calendar, I want to filter appointments by doctor, so that I can see only one doctor's schedule at a time.
2. As a clinic manager, I want the doctor filter to actually work when I select a name, so that I can plan staffing and rooms accurately.
3. As a user with 20+ doctors in the clinic, I want to quickly search within the doctor dropdown, so that I don't have to scroll through a long list.
4. As a calendar user, I want to see which doctor is currently selected at a glance, so that I don't forget an active filter.
5. As a keyboard user, I want to navigate and select a doctor using arrow keys and Enter, so that the filter remains accessible without a mouse.
6. As a mobile/tablet user, I want the doctor filter dropdown to fit on a small screen without overflow, so that the UI remains usable.
7. As a clinician, I want to clear the doctor filter with one click, so that I can return to the full calendar view quickly.

## Implementation Decisions

- **Backend fix**: In the `GET /api/Appointments` route, change the SQL condition for `doctor_id` from `a.employeeid = $param` to `a.doctorid = $param`. The table has both columns and the filter was incorrectly targeting `employeeid`.
- **Frontend redesign**: Replace the native `<select>` in `FilterByDoctor` with a custom headless-like dropdown built with React state and refs.
  - Trigger: A button showing a stethoscope icon + selected doctor name (or "All Doctors") + chevronDown icon.
  - Dropdown panel: Searchable list with a sticky search input at the top, followed by "All Doctors" option and the list of doctor names.
  - Styling: Match the existing design system (rounded-lg, gray-100 hover, primary ring focus, shadow-card).
  - Accessibility: Add `role="listbox"`, `aria-expanded`, `aria-selected`, and keyboard navigation (ArrowUp/ArrowDown/Enter/Escape).
  - Auto-close: Close dropdown on selection or clicking outside.
- **Data contract**: No changes to props interface for `FilterByDoctor`; `selectedDoctorId` and `onChange` remain the same.
- **Count display**: Show the number of doctors in the list only when the dropdown is open (e.g. "24 doctors") to give context.
- **Placement**: Keep the component in the Calendar toolbar layout; the trigger width should be `min-w-[160px]` and expand based on content.

## Testing Decisions

- **Backend**: Verify the appointments route returns only appointments for the requested `doctor_id` by an integration test or manual curl with a known doctor UUID.
- **Frontend component**: Test `FilterByDoctor` in isolation:
  - Selecting a doctor calls `onChange` with the correct ID.
  - Typing in the search input narrows the visible options.
  - Pressing Escape closes the dropdown.
  - Clicking the clear button calls `onChange(null)`.
- **End-to-end**: On the Calendar page, select a doctor and assert that the appointment list updates to show only that doctor's appointments.
- **Prior art**: Follow the existing `FilterByDoctor.test.tsx` or doctor selector tests in `DoctorSelector.test.tsx` for patterns.

## Out of Scope

- Multi-select doctor filtering (keep single-select for now).
- Persisting the selected doctor filter in URL query params or localStorage.
- Doctor color coding or avatars from external image sources (use text initials only).

## Further Notes

- The CSS bug in the old component was caused by `pl-9` padding on the `<select>` while the `<Stethoscope>` icon was rendered as a sibling in a flex container rather than absolutely positioned inside the select. The new custom trigger eliminates this issue entirely.
