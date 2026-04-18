# Module Registry — Shared Components Audit

> Audit Date: 2026-04-18  
> Worktree: core-pillars-infra  
> Scope: `website/src/components/shared/` + `website/src/components/modules/`

---

## Shared Components (`website/src/components/shared/`)

| # | Name | File | Pure / Stateful | Props Interface | Data Source | Pages Used By |
|---|------|------|-----------------|-----------------|-------------|---------------|
| 1 | AddressAutocomplete | `shared/AddressAutocomplete.tsx` | Stateful (internal fetch) | `AddressAutocompleteProps` | Direct API (`apiFetch` to `/Places/autocomplete`) | AddCustomerForm |
| 2 | AppointmentFormModal | `shared/AppointmentFormModal.tsx` | Pure | `AppointmentFormModalProps` | Props (parent provides `onSubmit`) | Calendar |
| 3 | BankSelector | `shared/BankSelector.tsx` | Pure | Yes (inferred) | Props | — |
| 4 | ChangePasswordModal | `shared/ChangePasswordModal.tsx` | Stateful | Yes (inferred) | Direct API (password update) | — |
| 5 | ComboboxInput | `shared/ComboboxInput.tsx` | Pure | Yes (inferred) | Props | — |
| 6 | CurrencyInput | `shared/CurrencyInput.tsx` | Pure | `CurrencyInputProps` | Props | ServiceCatalog |
| 7 | CustomerNameLink | `shared/CustomerNameLink.tsx` | Pure | `CustomerNameLinkProps` | Props (customerId) | Appointments, Customers, Calendar, TodayAppointments, TodaySchedule |
| 8 | CustomerSelector | `shared/CustomerSelector.tsx` | Pure | `CustomerSelectorProps` | Props (customers array) | AppointmentForm, ServiceForm, PaymentForm |
| 9 | CustomerSourceDropdown | `shared/CustomerSourceDropdown.tsx` | Pure | Yes (inferred) | Props | — |
| 10 | DataTable | `shared/DataTable.tsx` | Pure (internal sort/paginate state only) | `DataTableProps<T>` | Props (columns + data) | Customers, Employees, Services, Locations, Reports |
| 11 | DateRangePicker | `shared/DateRangePicker.tsx` | Stateful (UI state) | `DateRangePickerProps` | Props (no API) | Overview, Calendar |
| 12 | DoctorSelector | `shared/DoctorSelector.tsx` | Pure | `DoctorSelectorProps` | Props (employees array) | AppointmentForm, ServiceForm, CalendarFilter |
| 13 | FaceCaptureModal | `shared/FaceCaptureModal.tsx` | Pure | Yes (inferred) | Props | — |
| 14 | FeedbackWidget | `shared/FeedbackWidget.tsx` | **Stateful — fetches data** | None exported | Direct API (`fetchMyFeedback`, `fetchMyFeedbackThread`, `createFeedback`, `replyToMyFeedbackThread`) | Layout (global) |
| 15 | FilterByDoctor | `shared/FilterByDoctor.tsx` | Pure (UI state) | `FilterByDoctorProps` | Props (doctors array) | Calendar, Appointments, Employees |
| 16 | FilterByLocation | `shared/FilterByLocation.tsx` | Pure (UI state) | `FilterByLocationProps` | Props (locations array) | Overview, Calendar, Customers, Appointments, Employees, Services, Payment |
| 17 | ImageUpload | `shared/ImageUpload.tsx` | Pure | Yes (inferred) | Props | — |
| 18 | LanguageToggle | `shared/LanguageToggle.tsx` | Stateful | None | localStorage / i18n | Header |
| 19 | LocationSelector | `shared/LocationSelector.tsx` | Pure (UI state) | `LocationSelectorProps` | Props (locations array) | CustomerForm, EmployeeForm, AppointmentForm, ServiceForm |
| 20 | NotificationsPanel | `shared/NotificationsPanel.tsx` | Pure | `NotificationsPanelProps` | Props (notifications array) | Overview, Header |
| 21 | QuickActionsBar | `shared/QuickActionsBar.tsx` | **Stateful — imports mock data** | `QuickActionsBarProps` | Hard-coded import from `@/data/mockDashboard` | Overview, Sidebar |
| 22 | QuickAddAppointmentButton | `shared/QuickAddAppointmentButton.tsx` | **Stateful — fetches data** | `QuickAddAppointmentButtonProps` | Direct API (`createAppointment` lazy import) | Overview, Calendar |
| 23 | ReferralCodeInput | `shared/ReferralCodeInput.tsx` | Pure | Yes (inferred) | Props | — |
| 24 | SearchBar | `shared/SearchBar.tsx` | Pure (debounce state) | `SearchBarProps` | Props | Customers, Employees, Services, Website |
| 25 | ServiceCatalogSelector | `shared/ServiceCatalogSelector.tsx` | Pure | Yes (inferred) | Props | — |
| 26 | StatusBadge | `shared/StatusBadge.tsx` | Pure | `StatusBadgeProps` | Props (status + label) | Appointments, Services, Calendar, EmployeeTable, Customers |
| 27 | StatusDropdown | `shared/StatusDropdown.tsx` | Stateful (UI + async) | `StatusDropdownProps` | Props (options + onChange callback) | ServiceHistoryList, ServiceHistory |

**Barrel Export Gap:** Only `AddressAutocomplete` is exported from `shared/index.ts`. 26 other shared components are NOT barrel-exported and are imported via deep paths.

---

## Module Components (`website/src/components/modules/`)

| # | Name | File | Pure / Stateful | Props Interface | Data Source | Pages Used By |
|---|------|------|-----------------|-----------------|-------------|---------------|
| 1 | EditAppointmentModal | `modules/EditAppointmentModal.tsx` | **Stateful — fetches data** | `EditAppointmentModalProps` | Direct API (`fetchProducts`, `updateAppointment`) | Overview, Calendar, TodayAppointments |
| 2 | PatientCheckIn | `modules/PatientCheckIn.tsx` | Pure (UI state) | `PatientCheckInProps` | Props (appointments array) | Overview |
| 3 | RevenueChartModule | `modules/RevenueChartModule.tsx` | Pure | `RevenueChartModuleProps` | Props (data array) | Overview, Reports |
| 4 | StatCardModule | `modules/StatCardModule.tsx` | Pure | `StatCardModuleProps` | Props (stats array) | Overview, Reports, LocationDetail |
| 5 | TodayAppointments | `modules/TodayAppointments.tsx` | Pure (UI state) | `TodayAppointmentsProps` | Props (appointments array) | Overview |
| 6 | TodaySchedule | `modules/TodaySchedule.tsx` | Pure | `TodayScheduleProps` | Props (appointments array) | Overview, Calendar |
| 7 | TodayServicesTable | `modules/TodayServicesTable.tsx` | Stateful (local search) | `TodayServicesTableProps` | Props (locationId only) | Overview |

---

## Legend

- **Pure** = Receives all data via props; only manages local UI state (open/closed, hover, etc.)
- **Stateful** = Manages data-fetching lifecycle (useEffect + API calls), global state, or imports static data directly.
- **Props Interface** = Explicit TypeScript `interface` or `type` defined for the component's props.
