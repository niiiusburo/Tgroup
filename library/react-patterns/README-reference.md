# React Enterprise Patterns — Reference Library

> For TGClinic's React 18 + Vite + TypeScript + Tailwind frontend. Focus: folder structure, forms, tables, state management, compound components, i18n.

## 1. Repositories Downloaded

| # | Folder | Repository | License | Why It Matters |
|---|---|---|---|---|
| 1 | `bulletproof-react` | [alan2207/bulletproof-react](https://github.com/alan2207/bulletproof-react) | MIT | Enterprise React folder structure, feature-based organization, form/table abstractions, auth context patterns. |
| 2 | `react-hook-form` | [react-hook-form/react-hook-form](https://github.com/react-hook-form/react-hook-form) | MIT | Headless form state management, `useForm`, `Controller`, field arrays. |
| 3 | `tanstack-form` | [TanStack/form](https://github.com/TanStack/form) | MIT | Next-gen headless forms with `Field` compound component and `Subscribe` render-prop. |
| 4 | `tanstack-table` | [TanStack/table](https://github.com/TanStack/table) | MIT | Headless table engine with modular features (sorting, filtering, pagination, selection, visibility). |
| 5 | `react-i18next` | [i18next/react-i18next](https://github.com/i18next/react-i18next) | MIT | `useTranslation`, `Trans`, `I18nextProvider`, namespace lazy loading. |
| 6 | `radix-ui-primitives` | [radix-ui/primitives](https://github.com/radix-ui/primitives) | MIT | Gold-standard compound components (`Tabs`, `Select`, `Slot`/`Slottable`), accessibility primitives. |
| 7 | `shadcn-ui` | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | MIT | Production data table example with TanStack Table v8, faceted filters, row actions, view options. |

## 2. Specific Patterns to Adopt

### 2.1 Enterprise Folder Structure
**From:** `bulletproof-react/docs/project-structure.md`

```text
src
├── app               # routes / pages / providers / router
├── assets            # static files
├── components        # shared components
├── config            # global configurations
├── features          # feature-based modules
├── hooks             # shared hooks
├── lib               # reusable libraries
├── stores            # global state stores
├── testing           # test utilities
├── types             # shared types
└── utils             # shared utility functions
```

Each feature contains:

```text
src/features/<feature>/
├── api/          # API request declarations and hooks
├── assets/       # static files
├── components/   # components scoped to the feature
├── hooks/        # hooks scoped to the feature
├── stores/       # state stores for the feature
├── types/        # TypeScript types
└── utils/        # utility functions
```

**TGClinic adaptation:**
- TGClinic already organizes components by feature (`website/src/components/{ctv,commission,customer,payment,settings,...}`).
- Move API calls from `website/src/lib/api/` into feature folders (`website/src/components/<feature>/api/`).
- Add ESLint `import/no-restricted-paths` to enforce cross-feature isolation.

### 2.2 Forms & Validation
**From:** `bulletproof-react/apps/react-vite/src/components/ui/form/form.tsx`

```tsx
const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <TFieldValues, TName>({ ...props }: ControllerProps<TFieldValues, TName>) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
);

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);
  return { id: itemContext.id, name: fieldContext.name, ...fieldState };
};
```

**TGClinic adaptation:**
- `CtvCreationForm` already uses SSOT hook + presentational `Field` component.
- Generalize into shared `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` in `website/src/components/ui/form/`.
- Replace inline validation with Zod schema + `@hookform/resolvers/zod`.

### 2.3 Data Tables with TanStack Table
**From:** `shadcn-ui/apps/v4/app/(app)/examples/tasks/components/data-table.tsx`

```tsx
const table = useReactTable({
  data, columns,
  state: { sorting, columnVisibility, rowSelection, columnFilters },
  initialState: { pagination: { pageSize: 25 } },
  enableRowSelection: true,
  onRowSelectionChange: setRowSelection,
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
  onColumnVisibilityChange: setColumnVisibility,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
});
```

**TGClinic adaptation:**
- Current `DataTable.tsx` is ~10,421 characters and lacks filtering, faceted filters, and column visibility.
- Migrate to TanStack Table with `DataTableToolbar`, `DataTablePagination`, `DataTableFacetedFilter`, `DataTableViewOptions`.
- This adds enterprise table features with ~50 lines of configuration.

### 2.4 State Management at Scale
**From:** `bulletproof-react`

Categorize state:
- **Component State:** `useState` / `useReducer`
- **Application State:** Context + hooks / zustand
- **Server Cache State:** TanStack Query
- **Form State:** React Hook Form
- **URL State:** react-router

**TGClinic adaptation:**
- Keep `AuthContext` + `TimezoneContext` as React Context (rarely changed, widely consumed).
- Migrate `BusinessUnitContext` and `LocationContext` to zustand stores (frequently toggled, cause re-renders).
- Use `useSyncExternalStore` subscription pattern from `react-i18next` for efficient re-renders.

### 2.5 Compound Components & Slots
**From:** `radix-ui-primitives/packages/react/tabs/src/tabs.tsx` + `slot/src/slot.tsx`

```tsx
const [TabsProvider, useTabsContext] = createTabsContext<TabsContextValue>(TABS_NAME);
const Tabs = React.forwardRef<TabsElement, TabsProps>((props, ref) => { ... });
const TabsList = React.forwardRef<TabsListElement, TabsListProps>((props, ref) => { ... });
const TabsTrigger = React.forwardRef<TabsTriggerElement, TabsTriggerProps>((props, ref) => { ... });
const TabsContent = React.forwardRef<TabsContentElement, TabsContentProps>((props, ref) => { ... });
```

**TGClinic adaptation:**
- Use `createContextScope` for compound components to avoid context collisions.
- Use `Slot` + `Slottable` for `asChild` behavior in shared UI primitives.

### 2.6 i18n & Locale Patterns
**From:** `react-i18next`

```tsx
const { t } = useTranslation('customers');
return <h1>{t('form.name')}</h1>;
```

**TGClinic adaptation:**
- TGClinic already uses namespace-per-feature pattern.
- Add `i18next-cli` for key extraction and missing-translation detection in CI.
- Use `Trans` component for rich text interpolation instead of string concatenation.

## 3. Recommendations for Reducing Duplication

1. **Form Duplication**
   - Extract `FormField` context wrapper from `CtvCreationForm` into `website/src/components/ui/form/`.
   - Update `EmployeeForm`, `ServiceForm`, `PaymentForm`, `BankSettingsForm` to use shared form primitives.

2. **Table Duplication**
   - Replace custom `DataTable` with TanStack Table + shadcn-ui toolbar pattern.
   - Add column definitions as `ColumnDef<TData>[]` with custom cell renderers.

3. **Context Splitting**
   - Move `BusinessUnitContext` and `LocationContext` to zustand stores.
   - Keep `AuthContext` as Context but adopt `react-query-auth` loading patterns.

4. **API Layer Colocation**
   - Move API calls into feature folders.
   - Export `getXQueryOptions`, `useX`, `useCreateX` with automatic cache invalidation.

5. **Module Size Rule Enforcement**
   - Split oversized files:
     - `CtvManagementTab.tsx` (33.4KB)
     - `EarningsPayoutsTabs.tsx` (25.4KB)
     - `ServiceForm.tsx` (24.7KB)
     - `FeedbackAdminContent.tsx` (22.2KB)
   - Split into `components/`, `hooks/`, `types/` subfolders per feature.

## 4. Key Files to Study

### bulletproof-react
- `docs/project-structure.md`
- `apps/react-vite/src/components/ui/form/form.tsx`
- `apps/react-vite/src/components/ui/notifications/notifications-store.ts`
- `apps/react-vite/src/lib/auth.tsx`
- `apps/react-vite/src/features/discussions/api/get-discussions.ts`

### react-hook-form
- `src/useForm.ts`
- `src/useController.ts`
- `src/controller.tsx`

### tanstack-form
- `packages/react-form/src/useForm.tsx`
- `packages/react-form/src/useField.tsx`
- `packages/react-form/src/createFormHook.tsx`

### tanstack-table
- `packages/table-core/src/features/row-sorting/rowSortingFeature.ts`
- `packages/table-core/src/features/row-filtering/rowFilteringFeature.ts`
- `packages/react-table/src/index.tsx`

### react-i18next
- `src/useTranslation.js`
- `src/Trans.js`
- `src/I18nextProvider.js`

### radix-ui-primitives
- `packages/react/tabs/src/tabs.tsx`
- `packages/react/select/src/select.tsx`
- `packages/react/slot/src/slot.tsx`

### shadcn-ui
- `apps/v4/app/(app)/examples/tasks/components/data-table.tsx`
- `apps/v4/app/(app)/examples/tasks/components/data-table-toolbar.tsx`
- `apps/v4/app/(app)/examples/tasks/components/data-table-pagination.tsx`
- `apps/v4/app/(app)/examples/tasks/components/data-table-faceted-filter.tsx`
- `apps/v4/app/(app)/examples/tasks/components/data-table-view-options.tsx`
- `apps/v4/app/(app)/examples/tasks/components/data-table-row-actions.tsx`

## 5. License

All downloaded repositories are MIT-licensed and safe for study, adaptation, and pattern reuse.

## 6. Note on Repository Size

Some reference folders (e.g., `shadcn-ui`, `tanstack-table`) are large because they are monorepos containing source code for many packages. Only the relevant source files and documentation were retained; `node_modules`, `.git`, build artifacts, and lockfiles were removed.
