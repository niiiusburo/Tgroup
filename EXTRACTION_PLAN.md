# Extraction Plan — Convert Top 5 Anti-Patterns into SSOT Modules

> Goal: Keep components in their current directory structure. Enforce boundaries by making shared components pure (props-driven) and extracting data-fetching into pages/hooks/containers.

---

## Candidate 1: PageHeader (new shared component)

**Problem:** Every page copy-pastes the same header layout (icon circle + title/subtitle + action button).

**Current Violations:** Customers, Employees, Appointments, Services, Calendar, Reports, Locations, Settings.

### Step-by-Step Plan

1. **Create** `website/src/components/shared/PageHeader.tsx`
   - Props interface:
     ```ts
     interface PageHeaderProps {
       icon: React.ReactNode;
       title: string;
       subtitle?: string;
       action?: {
         label: string;
         onClick: () => void;
         icon?: React.ReactNode;
         hidden?: boolean;
       };
     }
     ```
   - Render the exact layout pattern already used across pages.
   - No data fetching. No hooks except `useTranslation`.

2. **Update barrel export** in `website/src/components/shared/index.ts`:
   - Add `export { PageHeader } from './PageHeader';`

3. **Refactor pages one by one** (low risk, no logic change):
   - `pages/Customers.tsx` → replace header block with `<PageHeader ... />`
   - `pages/Employees/index.tsx` → replace header block
   - `pages/Appointments/index.tsx` → replace header block
   - `pages/Services/index.tsx` → replace header block
   - `pages/Calendar.tsx` → replace header block
   - `pages/Reports.tsx` and sub-pages → replace header blocks
   - `pages/Locations.tsx` → replace header block
   - `pages/Settings/index.tsx` → replace header block

4. **Verify:** Run type check (`tsc --noEmit`) and visual smoke test on each page.

---

## Candidate 2: StatCard (unify existing implementations)

**Problem:** `StatCard` is implemented inline in Appointments and Services, while `StatCardModule` and `KPICard` already exist as shared variants.

### Step-by-Step Plan

1. **Audit existing implementations** for feature parity:
   - `modules/StatCardModule.tsx`: supports `value` (string), `change`, `changeType`, `icon`, `color`.
   - `reports/KPICard.tsx`: supports animated count-up, currency/number/percent formatting, change indicator.
   - Inline `StatCard` (Appointments): supports `icon`, `label`, `value` (number), `bg`.
   - Inline `StatCard` (Services): same as Appointments plus optional `isText`.

2. **Enhance `modules/StatCardModule.tsx`** to cover all use cases:
   - Add `format?: 'number' | 'currency' | 'text'` prop.
   - Add `bg?: string` override prop (optional, falls back to color map).
   - Keep it lightweight; do NOT add framer-motion dependency (leave that in KPICard for reports).

3. **Deprecate inline StatCards:**
   - Delete `StatCard` function from `pages/Appointments/index.tsx`.
   - Delete `StatCard` function from `pages/Services/index.tsx`.
   - Replace usages with `<StatCardModule stats={[...]} />`.

4. **Keep `KPICard` separate** — it is reports-specific (animations, count-up, delays). Do not merge it; just document that reports should use `KPICard`, while all other pages use `StatCardModule`.

5. **Update barrel export** in `shared/index.ts`:
   - Already in `modules/`; no barrel change needed, but ensure pages import from `@/components/modules/StatCardModule`.

---

## Candidate 3: StatusFilterChips (new shared component)

**Problem:** Status filter chips are copy-pasted in Customers, Appointments, and Employees with slightly different styling each time.

### Step-by-Step Plan

1. **Create** `website/src/components/shared/StatusFilterChips.tsx`
   - Props interface:
     ```ts
     interface StatusFilterOption {
       value: string;
       label: string;
       count?: number;
     }
     interface StatusFilterChipsProps {
       options: readonly StatusFilterOption[];
       selected: string;
       onChange: (value: string) => void;
       variant?: 'solid' | 'outline' | 'muted'; // matches current page styles
     }
     ```
   - Render a horizontal row of clickable chips.
   - No data fetching. Pure presentational.

2. **Update barrel export** in `website/src/components/shared/index.ts`:
   - Add `export { StatusFilterChips } from './StatusFilterChips';`

3. **Refactor pages:**
   - `pages/Customers.tsx`: replace inline status buttons with `<StatusFilterChips options={STATUS_FILTER_OPTIONS} ... />`
   - `pages/Appointments/index.tsx`: replace `STATUS_TABS` inline buttons with `<StatusFilterChips ... />`
   - `pages/Employees/index.tsx`: replace inline status filter row with `<StatusFilterChips ... />`

4. **Verify:** Ensure visual parity before/after on each page.

---

## Candidate 4: Enforce SearchBar usage (refactor only)

**Problem:** Employees, Appointments, and Calendar pages inline their own search inputs instead of reusing `shared/SearchBar.tsx`.

### Step-by-Step Plan

1. **Audit** `shared/SearchBar.tsx` for missing features:
   - Current: debounced input, clear button, placeholder.
   - Missing in inline versions: nothing — the inline versions are strictly less functional.

2. **Refactor pages to use `SearchBar`:**
   - `pages/Employees/index.tsx` (lines 126–135): replace inline search input with `<SearchBar value={searchQuery} onChange={setSearchQuery} placeholder={t('searchPlaceholder')} />`
   - `pages/Appointments/index.tsx` (lines 161–169): replace inline search input with `<SearchBar value={searchTerm} onChange={setSearchTerm} placeholder={t('searchPlaceholder')} />`
   - `pages/Calendar.tsx` (lines 330–377): the Calendar has a custom search-with-suggestions combobox. Keep it as-is but extract into `shared/SearchableCombobox.tsx` if it grows beyond Calendar.

3. **No new file needed** — just delete inline markup and import existing component.

4. **Update barrel export** if not already done:
   - `SearchBar` is already in the codebase but not exported from `shared/index.ts`; add it.

---

## Candidate 5: FeedbackWidget (container/presenter split)

**Problem:** `shared/FeedbackWidget.tsx` is a shared component that directly fetches feedback threads, posts new feedback, and uploads attachments. This violates the SSOT rule that shared components must be pure.

### Step-by-Step Plan

1. **Extract data-fetching hook** `website/src/hooks/useFeedback.ts`:
   - Move all `useState` for threads, detail, loading, sending into the hook.
   - Move all `useEffect` API calls (`fetchMyFeedback`, `fetchMyFeedbackThread`) into the hook.
   - Move `handleSend`, `validateAndSetFiles` into the hook.
   - Return:
     ```ts
     {
       threads, detail, loadingList, loadingDetail, sending,
       openThread, sendFeedback, validateFiles, fileError, sendError,
       files, setFiles, input, setInput,
     }
     ```

2. **Refactor `shared/FeedbackWidget.tsx` to be pure**:
   - Accept props:
     ```ts
     interface FeedbackWidgetProps {
       threads: FeedbackThread[];
       detail: { thread: FeedbackThread; messages: FeedbackMessage[] } | null;
       loadingList: boolean;
       loadingDetail: boolean;
       sending: boolean;
       onOpenThread: (id: string | null) => void;
       onSend: (content: string, files?: File[]) => void;
       onValidateFiles: (files: FileList | null) => void;
       fileError: string | null;
       sendError: string | null;
       user: User | null;
     }
     ```
   - Remove ALL `useEffect` that fetch data.
   - Keep only UI state: `open` (panel open/closed), `input` (if not moved to hook), file previews.

3. **Create container** `website/src/components/feedback/FeedbackWidgetContainer.tsx`:
   - Uses `useAuth()` to get `user`.
   - Uses `useFeedback()` hook for data.
   - Renders `<FeedbackWidget {...data} {...handlers} />`.

4. **Update `Layout.tsx`** (or wherever FeedbackWidget is mounted):
   - Replace `<FeedbackWidget />` with `<FeedbackWidgetContainer />`.

5. **Update barrel export** in `shared/index.ts`:
   - Export pure `FeedbackWidget` from shared.
   - Do NOT export container from shared; container lives in `components/feedback/`.

---

## Bonus: EditAppointmentModal (module-level fix)

**Problem:** `modules/EditAppointmentModal.tsx` fetches products directly and calls `updateAppointment` directly. It should receive catalog data and save handler from parent.

### Step-by-Step Plan

1. **Add props** to `EditAppointmentModalProps`:
   ```ts
   readonly services: readonly ApiProduct[];
   readonly servicesLoading: boolean;
   readonly onSave: (appointmentId: string, data: UpdateAppointmentData) => Promise<void>;
   ```

2. **Remove** `fetchProducts` import and the `useEffect` that loads services.

3. **Remove** direct `updateAppointment` call; replace with `await onSave(appointment.id, {...})`.

4. **Update parent pages** (`Overview.tsx`, `Calendar.tsx`):
   - Pass `services` and `onSave` into `<EditAppointmentModal />`.
   - Pages already have access to service catalog via hooks or can fetch it at page level.

---

## Execution Order (Recommended)

| Phase | Task | Risk | Estimated Time |
|-------|------|------|----------------|
| 1 | PageHeader extraction | Low | 1–2 hrs |
| 2 | SearchBar enforcement | Low | 30 min |
| 3 | StatusFilterChips extraction | Low | 1 hr |
| 4 | StatCard unification | Low | 1–2 hrs |
| 5 | FeedbackWidget split | Medium | 2–3 hrs |
| 6 | EditAppointmentModal decouple | Medium | 1–2 hrs |

**Total estimated effort:** ~1 dev-day.

---

## Enforcement Checklist (for future PRs)

- [ ] New shared component in `shared/` has a prop interface and no API imports from `@/lib/api`.
- [ ] New shared component is exported from `shared/index.ts`.
- [ ] Page-level components (in `pages/`) are allowed to fetch data via hooks.
- [ ] Module components (in `modules/`) should prefer props; if they fetch, document why in a `// @data-fetching` comment.
- [ ] No inline `StatCard`, `PageHeader`, or `SearchBar` re-implementation in new pages.
