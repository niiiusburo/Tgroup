# Smart Filter Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Calendar Smart Filter drawer to match the website's orange-primary design system, ensure color chips always show their dot even when count is zero, and update summary cards to match the dashboard stat-card vibe.

**Architecture:** Update five presentational components inside `src/components/calendar/` to use the site's `primary` (orange) color tokens instead of hardcoded blue. The `ColorFilterCircles` component needs a logic tweak to render chips for all colors (including zero counts) with visible dots. We will also add lightweight component tests and bump the patch version.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest, React Testing Library

---

### Task 1: Update ColorFilterCircles

**Files:**
- Modify: `website/src/components/calendar/ColorFilterCircles.tsx`
- Test: `website/src/components/calendar/__tests__/ColorFilterCircles.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `website/src/components/calendar/__tests__/ColorFilterCircles.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorFilterCircles } from '../ColorFilterCircles';

describe('ColorFilterCircles', () => {
  it('renders all color chips including zero counts', () => {
    render(
      <ColorFilterCircles
        selected={[]}
        counts={{ '0': 0, '1': 4, '2': 1, '3': 1 }}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByTestId('filter-color-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-color-0')).toHaveTextContent('0');
    expect(screen.getByTestId('filter-color-1')).toHaveTextContent('4');
    expect(screen.getByTestId('filter-color-2')).toHaveTextContent('1');
    expect(screen.getByTestId('filter-color-3')).toHaveTextContent('1');
    expect(screen.getByTestId('filter-color-4')).toHaveTextContent('0');
    expect(screen.getByTestId('filter-color-5')).toHaveTextContent('0');
    expect(screen.getByTestId('filter-color-6')).toHaveTextContent('0');
    expect(screen.getByTestId('filter-color-7')).toHaveTextContent('0');
  });

  it('applies primary selected styling when a color is selected', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ColorFilterCircles
        selected={['1']}
        counts={{ '1': 4 }}
        onToggle={onToggle}
      />
    );

    const chip = screen.getByTestId('filter-color-1');
    expect(chip.className).toMatch(/bg-primary/);
    await user.click(chip);
    expect(onToggle).toHaveBeenCalledWith('1');
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
cd website && npx vitest run src/components/calendar/__tests__/ColorFilterCircles.test.tsx
```

Expected: FAIL because `userEvent` may not be installed or the component classes don't match yet.

- [ ] **Step 3: Implement ColorFilterCircles redesign**

Modify `website/src/components/calendar/ColorFilterCircles.tsx` to:
1. Always render all 8 color entries regardless of count.
2. Use `bg-primary text-white border-primary` for selected state.
3. Keep the color dot visible by mapping `dot` class to a `bg-*` class.

Replace the file with:

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
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-testid="filter-color-all"
        onClick={() => isAll || onToggle('__ALL__')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors',
          isAll
            ? 'bg-primary text-white border-primary'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        )}
      >
        <span className="w-4 h-4 rounded-full border border-gray-300 bg-white" />
        <span className="text-sm font-medium">Tất cả</span>
      </button>
      {colorEntries.map(([code, color]) => {
        const isSelected = selected.includes(code);
        // Map border-l-* dot class to a bg-* class for the visible dot
        const dotClass = color.dot.replace('border-l-', 'bg-');
        return (
          <button
            key={code}
            type="button"
            data-testid={`filter-color-${code}`}
            onClick={() => onToggle(code)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors',
              isSelected
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
          >
            <span className={cn('w-4 h-4 rounded-full', dotClass)} />
            <span className="text-sm font-medium">{counts[code] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd website && npx vitest run src/components/calendar/__tests__/ColorFilterCircles.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/components/calendar/ColorFilterCircles.tsx website/src/components/calendar/__tests__/ColorFilterCircles.test.tsx
git commit -m "feat(calendar): redesign ColorFilterCircles with primary orange and visible zero-count dots"
```

---

### Task 2: Update DoctorFilterChips

**Files:**
- Modify: `website/src/components/calendar/DoctorFilterChips.tsx`
- Test: `website/src/components/calendar/__tests__/DoctorFilterChips.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `website/src/components/calendar/__tests__/DoctorFilterChips.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DoctorFilterChips } from '../DoctorFilterChips';

describe('DoctorFilterChips', () => {
  it('renders doctors and applies primary selected style', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <DoctorFilterChips
        doctors={[{ name: 'Admin', count: 2 }, { name: 'BS. Duy', count: 3 }]}
        selected={['Admin']}
        onToggle={onToggle}
      />
    );

    const adminChip = screen.getByText('Admin');
    expect(adminChip.className).toMatch(/bg-primary/);

    await user.click(adminChip);
    expect(onToggle).toHaveBeenCalledWith('Admin');
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
cd website && npx vitest run src/components/calendar/__tests__/DoctorFilterChips.test.tsx
```

Expected: FAIL because the component still uses blue classes.

- [ ] **Step 3: Implement DoctorFilterChips redesign**

Replace the selected-state classes in `website/src/components/calendar/DoctorFilterChips.tsx`:

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
            ? 'bg-primary text-white border-primary'
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
            data-testid="filter-doctor-chip"
            onClick={() => onToggle(doc.name)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
              isSelected
                ? 'bg-primary text-white border-primary'
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

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd website && npx vitest run src/components/calendar/__tests__/DoctorFilterChips.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/components/calendar/DoctorFilterChips.tsx website/src/components/calendar/__tests__/DoctorFilterChips.test.tsx
git commit -m "feat(calendar): redesign DoctorFilterChips with primary orange selected state"
```

---

### Task 3: Update StatusFilterChips

**Files:**
- Modify: `website/src/components/calendar/StatusFilterChips.tsx`
- Test: `website/src/components/calendar/__tests__/StatusFilterChips.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `website/src/components/calendar/__tests__/StatusFilterChips.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusFilterChips } from '../StatusFilterChips';

describe('StatusFilterChips', () => {
  it('renders statuses and applies primary selected style', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <StatusFilterChips
        statuses={[{ value: 'scheduled', count: 2 }, { value: 'confirmed', count: 3 }]}
        selected={['confirmed']}
        onToggle={onToggle}
      />
    );

    const confirmedChip = screen.getByTestId('filter-status-confirmed');
    expect(confirmedChip.className).toMatch(/bg-primary/);

    await user.click(confirmedChip);
    expect(onToggle).toHaveBeenCalledWith('confirmed');
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
cd website && npx vitest run src/components/calendar/__tests__/StatusFilterChips.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement StatusFilterChips redesign**

Replace the selected-state classes in `website/src/components/calendar/StatusFilterChips.tsx`:

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
        data-testid="filter-status-all"
        onClick={() => isAll || onToggle('__ALL__' as AppointmentStatus)}
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
          isAll
            ? 'bg-primary text-white border-primary'
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
            data-testid={`filter-status-${s.value}`}
            onClick={() => onToggle(s.value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
              isSelected
                ? 'bg-primary text-white border-primary'
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

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd website && npx vitest run src/components/calendar/__tests__/StatusFilterChips.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/components/calendar/StatusFilterChips.tsx website/src/components/calendar/__tests__/StatusFilterChips.test.tsx
git commit -m "feat(calendar): redesign StatusFilterChips with primary orange selected state"
```

---

### Task 4: Update FilterSummaryCards

**Files:**
- Modify: `website/src/components/calendar/FilterSummaryCards.tsx`
- Test: `website/src/components/calendar/__tests__/FilterSummaryCards.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `website/src/components/calendar/__tests__/FilterSummaryCards.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilterSummaryCards } from '../FilterSummaryCards';

describe('FilterSummaryCards', () => {
  it('displays appointment count and formatted duration', () => {
    render(
      <FilterSummaryCards totalAppointments={6} totalDurationMinutes={175} />
    );

    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Lịch hẹn')).toBeInTheDocument();
    expect(screen.getByText('2g55p')).toBeInTheDocument();
    expect(screen.getByText('Dự kiến')).toBeInTheDocument();
  });

  it('shows dash for zero or negative duration', () => {
    render(
      <FilterSummaryCards totalAppointments={0} totalDurationMinutes={0} />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
cd website && npx vitest run src/components/calendar/__tests__/FilterSummaryCards.test.tsx
```

Expected: FAIL because the component styling classes may not match what the test asserts (the test checks text content, so it should actually pass unless there's an issue — the main change is visual).

- [ ] **Step 3: Implement FilterSummaryCards redesign**

Modify `website/src/components/calendar/FilterSummaryCards.tsx` to use `text-primary` and `bg-primary/10` (or `bg-orange-50`) for the icon containers, matching the StatCardModule vibe:

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
      <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
        <div className="p-2 bg-primary/10 rounded-lg">
          <CalendarDays className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="text-xl font-bold text-gray-900">{totalAppointments}</div>
          <div className="text-xs text-gray-500">Lịch hẹn</div>
        </div>
      </div>
      <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Clock className="w-5 h-5 text-primary" />
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

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd website && npx vitest run src/components/calendar/__tests__/FilterSummaryCards.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/components/calendar/FilterSummaryCards.tsx website/src/components/calendar/__tests__/FilterSummaryCards.test.tsx
git commit -m "feat(calendar): redesign FilterSummaryCards to match site stat-card vibe"
```

---

### Task 5: Update SmartFilterDrawer footer and badge

**Files:**
- Modify: `website/src/components/calendar/SmartFilterDrawer.tsx`
- Modify: `website/src/pages/Calendar.tsx` (filter badge on toolbar button)

- [ ] **Step 1: Update SmartFilterDrawer footer button colors**

In `website/src/components/calendar/SmartFilterDrawer.tsx`, change:
1. The "Lọc" apply button from `bg-blue-600` / `hover:bg-blue-700` to `bg-primary` / `hover:bg-primary/90`.
2. The filter badge in the footer from `bg-blue-600` to `bg-primary`.
3. The "Đóng" button can stay as-is (white/gray).

Find and replace these class strings inside the file:

Old:
```
bg-blue-600 rounded-lg hover:bg-blue-700
```
New:
```
bg-primary rounded-lg hover:bg-primary/90
```

Old:
```
text-white bg-blue-600 rounded-full
```
New:
```
text-white bg-primary rounded-full
```

- [ ] **Step 2: Update Calendar page filter badge**

In `website/src/pages/Calendar.tsx`, find the filter button badge and change `bg-blue-600` to `bg-primary`:

Old:
```
text-white bg-blue-600 rounded-full
```
New:
```
text-white bg-primary rounded-full
```

- [ ] **Step 3: Verify no remaining blue-600 references in these files**

```bash
grep -n "blue-600" website/src/components/calendar/SmartFilterDrawer.tsx website/src/pages/Calendar.tsx
```

Expected: no output

- [ ] **Step 4: Run existing calendar-related tests**

```bash
cd website && npx vitest run src/hooks/__tests__/useSmartFilter.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/components/calendar/SmartFilterDrawer.tsx website/src/pages/Calendar.tsx
git commit -m "feat(calendar): switch SmartFilterDrawer and toolbar badge to primary orange"
```

---

### Task 6: Bump patch version

**Files:**
- Modify: `website/package.json`

- [ ] **Step 1: Bump version from 0.15.2 to 0.15.3**

```bash
sed -i '' 's/"version": "0.15.2"/"version": "0.15.3"/' website/package.json
```

- [ ] **Step 2: Verify**

```bash
grep '"version"' website/package.json
```

Expected: `"version": "0.15.3"`

- [ ] **Step 3: Commit**

```bash
git add website/package.json
git commit -m "chore: bump version to 0.15.3"
```

---

## Self-Review Checklist

- [ ] Spec coverage: All five components and the toolbar badge are updated to use the orange primary color.
- [ ] Zero-count colors: `ColorFilterCircles` always renders all 8 color chips with visible dots.
- [ ] No placeholders: Every step includes exact file paths, code snippets, and commands.
- [ ] Type consistency: All chip components keep their existing props and types; only Tailwind classes change.
