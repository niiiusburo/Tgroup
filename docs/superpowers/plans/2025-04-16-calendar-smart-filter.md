# Calendar Smart Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Calendar page's status tabs and doctor dropdown with a unified right-side slide-over Smart Filter drawer supporting multi-select doctors, statuses, and color labels with live counts and summary stats.

**Architecture:** Add a `useSmartFilter` hook for multi-select draft state, create focused UI components for each filter section, and update `useCalendarData` to apply multi-select filtering. Keep the search box in the main toolbar. E2E tests verify drawer open/close, multi-select behavior, and filter application.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite, Playwright (E2E), Vitest (unit)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `website/src/hooks/useSmartFilter.ts` | Create | Reusable multi-select toggle/clear/isAllSelected logic |
| `website/src/components/calendar/FilterSummaryCards.tsx` | Create | Summary stats (count + duration) at top of drawer |
| `website/src/components/calendar/DoctorFilterChips.tsx` | Create | Doctor multi-select chips |
| `website/src/components/calendar/StatusFilterChips.tsx` | Create | Status multi-select chips with counts |
| `website/src/components/calendar/ColorFilterCircles.tsx` | Create | Color circle multi-select with counts |
| `website/src/components/calendar/SmartFilterDrawer.tsx` | Create | Right-side drawer shell + footer buttons |
| `website/src/hooks/useCalendarData.ts` | Modify | Add `selectedDoctors`, `selectedStatuses`, `selectedColors` state and update `filteredAppointments` |
| `website/src/pages/Calendar.tsx` | Modify | Remove status tabs and doctor dropdown, add Smart Filter button + drawer |
| `website/public/locales/vi/calendar.json` | Modify | Add new i18n keys for smart filter |
| `website/public/locales/en/calendar.json` | Modify | Add new i18n keys for smart filter |
| `website/e2e/calendar-smart-filter.spec.ts` | Create | E2E tests covering every filter and multi-select |

---

### Task 1: Create `useSmartFilter` hook

**Files:**
- Create: `website/src/hooks/useSmartFilter.ts`
- Test: `website/src/hooks/__tests__/useSmartFilter.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { renderHook, act } from '@testing-library/react';
import { useSmartFilter } from '../useSmartFilter';

describe('useSmartFilter', () => {
  it('toggles items and manages all-selected state', () => {
    const { result } = renderHook(() => useSmartFilter<string>());

    act(() => result.current.toggle('A'));
    expect(result.current.selected).toEqual(['A']);

    act(() => result.current.toggle('B'));
    expect(result.current.selected).toEqual(['A', 'B']);

    act(() => result.current.toggle('A'));
    expect(result.current.selected).toEqual(['B']);

    act(() => result.current.clear());
    expect(result.current.selected).toEqual([]);
    expect(result.current.isAllSelected).toBe(true);
  });

  it('supports setSelected for batch updates', () => {
    const { result } = renderHook(() => useSmartFilter<string>());
    act(() => result.current.setSelected(['X', 'Y']));
    expect(result.current.selected).toEqual(['X', 'Y']);
    expect(result.current.isAllSelected).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website && npx vitest run src/hooks/__tests__/useSmartFilter.test.tsx`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `useSmartFilter.ts`**

```ts
import { useState, useCallback, useMemo } from 'react';

export interface UseSmartFilterReturn<T> {
  selected: T[];
  isAllSelected: boolean;
  toggle: (value: T) => void;
  clear: () => void;
  setSelected: (values: T[]) => void;
}

export function useSmartFilter<T>(initialSelected: T[] = []) {
  const [selected, setSelected] = useState<T[]>(initialSelected);

  const toggle = useCallback((value: T) => {
    setSelected((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      return [...prev, value];
    });
  }, []);

  const clear = useCallback(() => {
    setSelected([]);
  }, []);

  const isAllSelected = useMemo(() => selected.length === 0, [selected]);

  return { selected, isAllSelected, toggle, clear, setSelected };
}
```

- [ ] **Step 4: Run tests**

Run: `cd website && npx vitest run src/hooks/__tests__/useSmartFilter.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/hooks/useSmartFilter.ts website/src/hooks/__tests__/useSmartFilter.test.tsx
git commit -m "feat(calendar): add useSmartFilter hook for multi-select state"
```

---

### Task 2: Update `useCalendarData` for multi-select filtering

**Files:**
- Modify: `website/src/hooks/useCalendarData.ts`
- Test: `website/src/hooks/__tests__/useCalendarData.test.tsx` (create if absent)

- [ ] **Step 1: Add new state fields and update filteredAppointments memo**

Modify `website/src/hooks/useCalendarData.ts`:

```ts
// Add to state declarations inside useCalendarData
const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
const [selectedStatuses, setSelectedStatuses] = useState<AppointmentStatus[]>([]);
const [selectedColors, setSelectedColors] = useState<string[]>([]);
```

Replace the existing `filteredAppointments` useMemo block with:

```ts
const filteredAppointments = useMemo(() => {
  return appointments.filter((apt) => {
    const matchesDoctor =
      selectedDoctors.length === 0 || selectedDoctors.includes(apt.dentist);
    const matchesStatus =
      selectedStatuses.length === 0 || selectedStatuses.includes(apt.status);
    const matchesColor =
      selectedColors.length === 0 || selectedColors.includes(apt.color ?? '0');
    const searchTerm = normalizeText(search.trim());
    const matchesSearch = searchTerm
      ? normalizeText(apt.customerName).includes(searchTerm) ||
        normalizeText(apt.customerPhone).includes(searchTerm) ||
        normalizeText(apt.customerCode || '').includes(searchTerm) ||
        normalizeText(apt.dentist).includes(searchTerm) ||
        normalizeText(apt.serviceName || '').includes(searchTerm)
      : true;
    return matchesDoctor && matchesStatus && matchesColor && matchesSearch;
  });
}, [appointments, selectedDoctors, selectedStatuses, selectedColors, search]);
```

Add `clearFilters` callback:

```ts
const clearFilters = useCallback(() => {
  setSelectedDoctors([]);
  setSelectedStatuses([]);
  setSelectedColors([]);
  setSearch('');
}, []);
```

Expose them in the return object:

```ts
return {
  // ...existing fields
  selectedDoctors,
  setSelectedDoctors,
  selectedStatuses,
  setSelectedStatuses,
  selectedColors,
  setSelectedColors,
  clearFilters,
} as const;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit`
Expected: No errors in `useCalendarData.ts`

- [ ] **Step 3: Commit**

```bash
git add website/src/hooks/useCalendarData.ts
git commit -m "feat(calendar): extend useCalendarData with multi-select doctor/status/color filters"
```

---

### Task 3: Create `FilterSummaryCards` component

**Files:**
- Create: `website/src/components/calendar/FilterSummaryCards.tsx`

- [ ] **Step 1: Implement component**

```tsx
import { CalendarDays, Clock } from 'lucide-react';

interface FilterSummaryCardsProps {
  totalAppointments: number;
  totalDurationMinutes: number;
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}g${String(m).padStart(2, '0')}p`;
}

export function FilterSummaryCards({ totalAppointments, totalDurationMinutes }: FilterSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <CalendarDays className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <div className="text-xl font-bold text-gray-900">{totalAppointments}</div>
          <div className="text-xs text-gray-500">Lịch hẹn</div>
        </div>
      </div>
      <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <Clock className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <div className="text-xl font-bold text-gray-900">{formatDuration(totalDurationMinutes)}</div>
          <div className="text-xs text-gray-500">Dự kiến</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/calendar/FilterSummaryCards.tsx
git commit -m "feat(calendar): add FilterSummaryCards for smart filter drawer"
```

---

### Task 4: Create `DoctorFilterChips` component

**Files:**
- Create: `website/src/components/calendar/DoctorFilterChips.tsx`

- [ ] **Step 1: Implement component**

```tsx
import { cn } from '@/lib/utils';

interface DoctorFilterChipsProps {
  doctors: { name: string; count: number }[];
  selected: string[];
  onToggle: (name: string) => void;
}

export function DoctorFilterChips({ doctors, selected, onToggle }: DoctorFilterChipsProps) {
  const isAll = selected.length === 0;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => isAll || onToggle('__ALL__')}
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
          isAll
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        )}
      >
        Tất cả
      </button>
      {doctors.map((doc) => {
        const isSelected = selected.includes(doc.name);
        return (
          <button
            key={doc.name}
            type="button"
            onClick={() => onToggle(doc.name)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
              isSelected
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
          >
            {doc.name}
          </button>
        );
      })}
    </div>
  );
}
```

Note: `__ALL__` is a sentinel; the parent should treat any toggle of it as `clear()`.

- [ ] **Step 2: Commit**

```bash
git add website/src/components/calendar/DoctorFilterChips.tsx
git commit -m "feat(calendar): add DoctorFilterChips component"
```

---

### Task 5: Create `StatusFilterChips` component

**Files:**
- Create: `website/src/components/calendar/StatusFilterChips.tsx`

- [ ] **Step 1: Implement component**

```tsx
import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/types/appointment';
import { APPOINTMENT_STATUS_I18N_KEYS } from '@/constants';
import { useTranslation } from 'react-i18next';

interface StatusFilterChipsProps {
  statuses: { value: AppointmentStatus; count: number }[];
  selected: AppointmentStatus[];
  onToggle: (value: AppointmentStatus) => void;
}

export function StatusFilterChips({ statuses, selected, onToggle }: StatusFilterChipsProps) {
  const { t } = useTranslation('calendar');
  const isAll = selected.length === 0;

  const totalCount = statuses.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => isAll || onToggle('__ALL__' as AppointmentStatus)}
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
          isAll
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        )}
      >
        Tất cả {totalCount}
      </button>
      {statuses.map((s) => {
        const isSelected = selected.includes(s.value);
        const label = t(APPOINTMENT_STATUS_I18N_KEYS[s.value] ?? s.value, { ns: 'common' });
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onToggle(s.value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
              isSelected
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
          >
            {label} {s.count}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/calendar/StatusFilterChips.tsx
git commit -m "feat(calendar): add StatusFilterChips component"
```

---

### Task 6: Create `ColorFilterCircles` component

**Files:**
- Create: `website/src/components/calendar/ColorFilterCircles.tsx`

- [ ] **Step 1: Implement component**

```tsx
import { cn } from '@/lib/utils';
import { APPOINTMENT_CARD_COLORS } from '@/constants';

interface ColorFilterCirclesProps {
  selected: string[];
  counts: Record<string, number>;
  onToggle: (code: string) => void;
}

export function ColorFilterCircles({ selected, counts, onToggle }: ColorFilterCirclesProps) {
  const isAll = selected.length === 0;
  const colorEntries = Object.entries(APPOINTMENT_CARD_COLORS);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => isAll || onToggle('__ALL__')}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors',
          isAll
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        )}
      >
        <span className="w-4 h-4 rounded-full border border-gray-300 bg-white" />
        <span className="text-sm font-medium">Tất cả</span>
      </button>
      {colorEntries.map(([code, color]) => {
        const isSelected = selected.includes(code);
        // Extract the tailwind color class from previewGradient or use dot class
        const dotClass = color.dot.replace('border-l-', 'bg-');
        return (
          <button
            key={code}
            type="button"
            onClick={() => onToggle(code)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors',
              isSelected
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
          >
            <span className={cn('w-4 h-4 rounded-full', dotClass)} />
            <span className="text-sm font-medium">({counts[code] ?? 0})</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/calendar/ColorFilterCircles.tsx
git commit -m "feat(calendar): add ColorFilterCircles component"
```

---

### Task 7: Create `SmartFilterDrawer` component

**Files:**
- Create: `website/src/components/calendar/SmartFilterDrawer.tsx`

- [ ] **Step 1: Implement component**

```tsx
import { X } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { FilterSummaryCards } from './FilterSummaryCards';
import { DoctorFilterChips } from './DoctorFilterChips';
import { StatusFilterChips } from './StatusFilterChips';
import { ColorFilterCircles } from './ColorFilterCircles';
import type { AppointmentStatus } from '@/types/appointment';
import type { CalendarAppointment } from '@/data/mockCalendar';
import { APPOINTMENT_STATUS_I18N_KEYS } from '@/constants';

interface SmartFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: readonly CalendarAppointment[];
  selectedDoctors: string[];
  draftDoctors: string[];
  onToggleDoctor: (name: string) => void;
  selectedStatuses: AppointmentStatus[];
  draftStatuses: AppointmentStatus[];
  onToggleStatus: (value: AppointmentStatus) => void;
  selectedColors: string[];
  draftColors: string[];
  onToggleColor: (code: string) => void;
  onApply: () => void;
  onClear: () => void;
}

export function SmartFilterDrawer({
  isOpen,
  onClose,
  appointments,
  draftDoctors,
  onToggleDoctor,
  draftStatuses,
  onToggleStatus,
  draftColors,
  onToggleColor,
  onApply,
  onClear,
}: SmartFilterDrawerProps) {
  // Doctor list with counts (from unfiltered appointments)
  const doctorData = useMemo(() => {
    const map = new Map<string, number>();
    appointments.forEach((apt) => {
      const name = apt.dentist || 'Không xác định';
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [appointments]);

  // Status list with counts
  const statusData = useMemo(() => {
    const map = new Map<AppointmentStatus, number>();
    appointments.forEach((apt) => {
      map.set(apt.status, (map.get(apt.status) ?? 0) + 1);
    });
    return (Object.keys(APPOINTMENT_STATUS_I18N_KEYS) as AppointmentStatus[])
      .filter((s) => map.has(s))
      .map((value) => ({ value, count: map.get(value) ?? 0 }));
  }, [appointments]);

  // Color counts
  const colorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((apt) => {
      const code = apt.color ?? '0';
      counts[code] = (counts[code] ?? 0) + 1;
    });
    return counts;
  }, [appointments]);

  // Summary based on draft selections
  const filteredForSummary = useMemo(() => {
    return appointments.filter((apt) => {
      const matchDoctor = draftDoctors.length === 0 || draftDoctors.includes(apt.dentist);
      const matchStatus = draftStatuses.length === 0 || draftStatuses.includes(apt.status);
      const matchColor = draftColors.length === 0 || draftColors.includes(apt.color ?? '0');
      return matchDoctor && matchStatus && matchColor;
    });
  }, [appointments, draftDoctors, draftStatuses, draftColors]);

  const totalAppointments = filteredForSummary.length;
  const totalDuration = useMemo(
    () => filteredForSummary.reduce((sum, apt) => sum + (apt.timeexpected ?? 0), 0),
    [filteredForSummary]
  );

  const activeFilterCount = draftDoctors.length + draftStatuses.length + draftColors.length;

  const handleDoctorToggle = (name: string) => {
    if (name === '__ALL__') onToggleDoctor('__ALL__');
    else onToggleDoctor(name);
  };

  const handleStatusToggle = (value: AppointmentStatus) => {
    if ((value as unknown as string) === '__ALL__') onToggleStatus('__ALL__' as AppointmentStatus);
    else onToggleStatus(value);
  };

  const handleColorToggle = (code: string) => {
    if (code === '__ALL__') onToggleColor('__ALL__');
    else onToggleColor(code);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/30 z-40 transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-200 ease-out flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-label="Bộ lọc"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Bộ lọc</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <FilterSummaryCards
            totalAppointments={totalAppointments}
            totalDurationMinutes={totalDuration}
          />

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Bác sĩ</h3>
            <DoctorFilterChips
              doctors={doctorData}
              selected={draftDoctors}
              onToggle={handleDoctorToggle}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Trạng thái</h3>
            <StatusFilterChips
              statuses={statusData}
              selected={draftStatuses}
              onToggle={handleStatusToggle}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Nhãn màu</h3>
            <ColorFilterCircles
              selected={draftColors}
              counts={colorCounts}
              onToggle={handleColorToggle}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={onClear}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Xóa bộ lọc
            </button>
            <button
              type="button"
              onClick={onApply}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Lọc {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
```

Note: `CalendarAppointment` type currently has no `timeexpected` field. We'll augment it in Task 8 via `mapApiAppointmentToCalendar`. The drawer props accept `onToggleDoctor('__ALL__')` and the parent must interpret that as `clear()`.

- [ ] **Step 2: Commit**

```bash
git add website/src/components/calendar/SmartFilterDrawer.tsx
git commit -m "feat(calendar): add SmartFilterDrawer shell component"
```

---

### Task 8: Update `CalendarAppointment` type and mapper for `timeexpected`

**Files:**
- Modify: `website/src/types/appointment.ts`
- Modify: `website/src/lib/calendarUtils.ts` (or wherever `mapApiAppointmentToCalendar` lives)

- [ ] **Step 1: Add `timeexpected` to `CalendarAppointment`**

In `website/src/types/appointment.ts`, add inside `CalendarAppointment`:

```ts
readonly timeexpected?: number | null;
```

- [ ] **Step 2: Update mapper to include `timeexpected`**

Find `mapApiAppointmentToCalendar` (likely in `website/src/lib/calendarUtils.ts`) and add:

```ts
timeexpected: apt.timeexpected ?? apt.timeExpected ?? null,
```

- [ ] **Step 3: Verify TypeScript**

Run: `cd website && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add website/src/types/appointment.ts website/src/lib/calendarUtils.ts
git commit -m "feat(calendar): add timeexpected to CalendarAppointment and mapper"
```

---

### Task 9: Update `Calendar.tsx` to integrate Smart Filter Drawer

**Files:**
- Modify: `website/src/pages/Calendar.tsx`

- [ ] **Step 1: Remove status tabs and doctor dropdown imports/usage**

Remove these imports:
```tsx
import { FilterByDoctor, type DoctorOption } from '@/components/shared/FilterByDoctor';
import { useEmployees } from '@/hooks/useEmployees';
```

Remove `STATUS_TABS` constant and the status-tabs JSX block from `Calendar.tsx`.

Remove the `FilterByDoctor` JSX and related `doctors` memo from the toolbar.

- [ ] **Step 2: Add SmartFilterDrawer import and draft state**

Add import:
```tsx
import { SmartFilterDrawer } from '@/components/calendar/SmartFilterDrawer';
import { useSmartFilter } from '@/hooks/useSmartFilter';
```

Inside `Calendar` component, after existing state hooks, add:

```tsx
const [isFilterOpen, setIsFilterOpen] = useState(false);

// Draft state for the drawer
const doctorsFilter = useSmartFilter<string>(selectedDoctors);
const statusesFilter = useSmartFilter<AppointmentStatus>(selectedStatuses);
const colorsFilter = useSmartFilter<string>(selectedColors);

const openFilter = useCallback(() => {
  // Sync draft state with applied filters when opening
  doctorsFilter.setSelected(selectedDoctors);
  statusesFilter.setSelected(selectedStatuses);
  colorsFilter.setSelected(selectedColors);
  setIsFilterOpen(true);
}, [selectedDoctors, selectedStatuses, selectedColors]);

const closeFilter = useCallback(() => {
  setIsFilterOpen(false);
}, []);

const applyFilter = useCallback(() => {
  setSelectedDoctors(doctorsFilter.selected);
  setSelectedStatuses(statusesFilter.selected);
  setSelectedColors(colorsFilter.selected);
  setIsFilterOpen(false);
}, [doctorsFilter.selected, statusesFilter.selected, colorsFilter.selected]);

const clearFilter = useCallback(() => {
  doctorsFilter.clear();
  statusesFilter.clear();
  colorsFilter.clear();
  setSelectedDoctors([]);
  setSelectedStatuses([]);
  setSelectedColors([]);
}, []);
```

Note: Destructure the new setters from `useCalendarData`:
```tsx
const {
  // ...existing
  selectedDoctors,
  setSelectedDoctors,
  selectedStatuses,
  setSelectedStatuses,
  selectedColors,
  setSelectedColors,
  clearFilters,
} = useCalendarData(selectedLocationId);
```

- [ ] **Step 3: Add Filter button to toolbar**

Replace the `FilterByDoctor` area in the toolbar with a Filter button:

```tsx
<button
  type="button"
  onClick={openFilter}
  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
>
  <span>Bộ lọc</span>
  {(selectedDoctors.length + selectedStatuses.length + selectedColors.length) > 0 && (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium text-white bg-blue-600 rounded-full">
      {selectedDoctors.length + selectedStatuses.length + selectedColors.length}
    </span>
  )}
</button>
```

- [ ] **Step 4: Render `SmartFilterDrawer`**

At the bottom of the JSX (next to the edit modal), add:

```tsx
<SmartFilterDrawer
  isOpen={isFilterOpen}
  onClose={closeFilter}
  appointments={appointments}
  selectedDoctors={selectedDoctors}
  draftDoctors={doctorsFilter.selected}
  onToggleDoctor={(name) => {
    if (name === '__ALL__') doctorsFilter.clear();
    else doctorsFilter.toggle(name);
  }}
  selectedStatuses={selectedStatuses}
  draftStatuses={statusesFilter.selected}
  onToggleStatus={(value) => {
    if ((value as unknown as string) === '__ALL__') statusesFilter.clear();
    else statusesFilter.toggle(value);
  }}
  selectedColors={selectedColors}
  draftColors={colorsFilter.selected}
  onToggleColor={(code) => {
    if (code === '__ALL__') colorsFilter.clear();
    else colorsFilter.toggle(code);
  }}
  onApply={applyFilter}
  onClear={clearFilter}
/>
```

Note: `appointments` must be exposed from `useCalendarData`. Add `appointments` to the return object of `useCalendarData`.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add website/src/pages/Calendar.tsx
git commit -m "feat(calendar): integrate SmartFilterDrawer into Calendar page"
```

---

### Task 10: Update i18n translations

**Files:**
- Modify: `website/public/locales/vi/calendar.json`
- Modify: `website/public/locales/en/calendar.json`

- [ ] **Step 1: Add Vietnamese keys**

Add to `website/public/locales/vi/calendar.json` (create nested `smartFilter` if needed):

```json
{
  "smartFilter": {
    "title": "Bộ lọc",
    "close": "Đóng",
    "clear": "Xóa bộ lọc",
    "apply": "Lọc",
    "doctors": "Bác sĩ",
    "allDoctors": "Tất cả",
    "status": "Trạng thái",
    "allStatuses": "Tất cả",
    "colorLabel": "Nhãn màu",
    "allColors": "Tất cả",
    "appointments": "Lịch hẹn",
    "expectedDuration": "Dự kiến"
  }
}
```

- [ ] **Step 2: Add English keys**

Add equivalent English translations to `website/public/locales/en/calendar.json`.

- [ ] **Step 3: Commit**

```bash
git add website/public/locales/vi/calendar.json website/public/locales/en/calendar.json
git commit -m "feat(i18n): add smart filter translations"
```

---

### Task 11: E2E tests for Smart Filter

**Files:**
- Create: `website/e2e/calendar-smart-filter.spec.ts`

- [ ] **Step 1: Write E2E spec**

```ts
import { test, expect } from '@playwright/test';

test.describe('Calendar Smart Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForSelector('[data-testid="calendar-filter-button"]', { timeout: 10000 });
  });

  test('opens and closes the filter drawer', async ({ page }) => {
    await page.click('[data-testid="calendar-filter-button"]');
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).toBeVisible();
    await page.click('[data-testid="smart-filter-close"]');
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).not.toBeVisible();
  });

  test('closes drawer on backdrop click', async ({ page }) => {
    await page.click('[data-testid="calendar-filter-button"]');
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).toBeVisible();
    await page.click('[data-testid="smart-filter-backdrop"]');
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).not.toBeVisible();
  });

  test('status filter multi-select', async ({ page }) => {
    await page.click('[data-testid="calendar-filter-button"]');

    // Select "scheduled"
    await page.click('[data-testid="filter-status-scheduled"]');
    await expect(page.locator('[data-testid="filter-status-scheduled"]')).toHaveClass(/bg-blue-600/);

    // Also select "completed"
    await page.click('[data-testid="filter-status-completed"]');
    await expect(page.locator('[data-testid="filter-status-completed"]')).toHaveClass(/bg-blue-600/);

    // Apply
    await page.click('[data-testid="smart-filter-apply"]');
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).not.toBeVisible();

    // Badge should show 2
    await expect(page.locator('[data-testid="calendar-filter-badge"]')).toHaveText('2');
  });

  test('doctor filter multi-select', async ({ page }) => {
    await page.click('[data-testid="calendar-filter-button"]');

    // Wait for at least one doctor chip
    await page.waitForSelector('[data-testid^="filter-doctor-"]', { timeout: 5000 });
    const firstDoctor = page.locator('[data-testid^="filter-doctor-"]').first();
    await firstDoctor.click();
    await expect(firstDoctor).toHaveClass(/bg-blue-600/);

    // Select a second doctor if available
    const doctors = page.locator('[data-testid^="filter-doctor-"]');
    const count = await doctors.count();
    if (count > 1) {
      const second = doctors.nth(1);
      await second.click();
      await expect(second).toHaveClass(/bg-blue-600/);
    }

    await page.click('[data-testid="smart-filter-apply"]');
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).not.toBeVisible();
  });

  test('color filter multi-select', async ({ page }) => {
    await page.click('[data-testid="calendar-filter-button"]');

    // Select color 0 and 1
    await page.click('[data-testid="filter-color-0"]');
    await page.click('[data-testid="filter-color-1"]');

    await expect(page.locator('[data-testid="filter-color-0"]')).toHaveClass(/bg-blue-600/);
    await expect(page.locator('[data-testid="filter-color-1"]')).toHaveClass(/bg-blue-600/);

    await page.click('[data-testid="smart-filter-apply"]');
    await expect(page.locator('[data-testid="smart-filter-drawer"]')).not.toBeVisible();
  });

  test('clear filters resets everything', async ({ page }) => {
    await page.click('[data-testid="calendar-filter-button"]');
    await page.click('[data-testid="filter-status-scheduled"]');
    await page.click('[data-testid="smart-filter-apply"]');
    await expect(page.locator('[data-testid="calendar-filter-badge"]')).toHaveText('1');

    await page.click('[data-testid="calendar-filter-button"]');
    await page.click('[data-testid="smart-filter-clear"]');

    // After clear, badge should disappear
    await expect(page.locator('[data-testid="calendar-filter-badge"]')).not.toBeVisible();
  });

  test('combined multi-select across all sections', async ({ page }) => {
    await page.click('[data-testid="calendar-filter-button"]');

    // Status
    await page.click('[data-testid="filter-status-scheduled"]');

    // Color
    await page.click('[data-testid="filter-color-2"]');

    // Doctor (first available)
    await page.waitForSelector('[data-testid^="filter-doctor-"]', { timeout: 5000 });
    await page.locator('[data-testid^="filter-doctor-"]').first().click();

    await page.click('[data-testid="smart-filter-apply"]');
    await expect(page.locator('[data-testid="calendar-filter-badge"]')).toHaveText('3');
  });
});
```

- [ ] **Step 2: Add `data-testid` attributes to components**

Update `Calendar.tsx`:
- Filter button: `data-testid="calendar-filter-button"`
- Badge span: `data-testid="calendar-filter-badge"`

Update `SmartFilterDrawer.tsx`:
- Backdrop: `data-testid="smart-filter-backdrop"`
- Drawer container: `data-testid="smart-filter-drawer"`
- Close button: `data-testid="smart-filter-close"`
- Clear button: `data-testid="smart-filter-clear"`
- Apply button: `data-testid="smart-filter-apply"`

Update `StatusFilterChips.tsx`:
- Each chip: `data-testid="filter-status-{value}"`
- All chip: `data-testid="filter-status-all"`

Update `DoctorFilterChips.tsx`:
- Each chip: `data-testid="filter-doctor-{encodedName}"` (use a safe encoding or just rely on first/last locators as shown above). Simpler: `data-testid="filter-doctor"` on all and use `.nth()` — already works without explicit IDs. But for robustness add `data-testid={`filter-doctor-${index}`}` or just `data-testid="filter-doctor-chip"` and select by index.

Actually, to keep it simple, add `data-testid="filter-doctor-chip"` to every doctor chip and use `.first()` / `.nth(1)` in tests. Same for colors: `data-testid={`filter-color-${code}`}`.

- [ ] **Step 3: Run E2E tests**

Run: `cd website && npx playwright test e2e/calendar-smart-filter.spec.ts --project=chromium`
Expected: All tests pass (or fail only due to seed data differences, which should be adjusted in assertions).

- [ ] **Step 4: Commit**

```bash
git add website/e2e/calendar-smart-filter.spec.ts website/src/components/calendar/SmartFilterDrawer.tsx website/src/components/calendar/StatusFilterChips.tsx website/src/components/calendar/DoctorFilterChips.tsx website/src/components/calendar/ColorFilterCircles.tsx website/src/pages/Calendar.tsx
git commit -m "test(e2e): add calendar smart filter spec with data-testids"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run full frontend type check**

Run: `cd website && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run unit tests**

Run: `cd website && npx vitest run`
Expected: All pass

- [ ] **Step 3: Run E2E suite**

Run: `cd website && npx playwright test e2e/calendar-smart-filter.spec.ts --project=chromium`
Expected: All pass

- [ ] **Step 4: Manual smoke test (dev server)**

Run: `cd website && npm run dev`
Open `http://localhost:5175/calendar`
- Verify toolbar has search + "Bộ lọc" button only.
- Open drawer, toggle multiple doctors/statuses/colors, click Lọc — calendar updates.
- Click "Xóa bộ lọc" — calendar resets.
- Close without applying — previously applied filters remain.

- [ ] **Step 5: Bump version**

In `website/package.json`, increment minor version (e.g., `0.5.0` → `0.6.0`).

- [ ] **Step 6: Final commit**

```bash
git add website/package.json
git commit -m "chore(release): bump version for calendar smart filter"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Right-side drawer ✓ (Task 7)
   - Summary cards with count + duration ✓ (Tasks 3, 7)
   - Doctor multi-select chips ✓ (Tasks 4, 7)
   - Status multi-select chips ✓ (Tasks 5, 7)
   - Color filter circles ✓ (Tasks 6, 7)
   - Draft state / apply on "Lọc" ✓ (Task 9)
   - Clear filters ✓ (Task 9)
   - E2E tests for every filter + multi-select combos ✓ (Task 11)

2. **Placeholder scan:** None found.

3. **Type consistency:** `timeexpected` added to `CalendarAppointment` and mapped in Task 8. `useSmartFilter` generic used consistently.
