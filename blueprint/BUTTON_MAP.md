# TG Clinic Dashboard -- Button & Component Relationship Map

> Auto-generated from source analysis. Maps every button, dropdown, filter, and interactive element across the TG Clinic Dashboard.

---

## Table of Contents

1. [Global Elements](#global-elements)
2. [Page-Specific Elements](#page-specific-elements)
3. [Component Dependency Graph](#component-dependency-graph)
4. [Form Components](#form-components)
5. [Navigation & Layout](#navigation--layout)

---

## Global Elements

### FilterByLocation (All Locations dropdown)

- **Component:** `components/shared/FilterByLocation.tsx`
- **Type:** Custom dropdown (click-to-open, click-outside-to-close)
- **Props:** `locations`, `selectedId`, `onChange`
- **Pages:** Overview, Customers
- **Effect:** Filters all data on the page by selected branch/location
- **Data source:** `data/mockDashboard.ts` -> `MOCK_LOCATIONS` (type `LocationOption`)
- **Buttons inside:** Toggle dropdown button, individual location option buttons

### SearchBar (Debounced search input)

- **Component:** `components/shared/SearchBar.tsx`
- **Type:** Text input with debounce (300ms default), search icon, clear (X) button
- **Props:** `value`, `onChange`, `placeholder`, `debounceMs`
- **Pages:** Customers
- **Effect:** Filters displayed data by search term with debounce delay
- **Note:** Many pages implement their own inline search inputs (Appointments, Services, Payment, Employees, Locations, ServiceCatalog, Website) instead of using this shared component

### StatusBadge (Colored status indicator)

- **Component:** `components/shared/StatusBadge.tsx`
- **Type:** Display-only badge with colored dot
- **Props:** `status` (StatusVariant), `label`, `size`
- **Variants:** `active` (emerald), `pending` (amber), `cancelled` (red), `completed` (blue), `inactive` (gray), `draft` (gray)
- **Pages:** Customers, Appointments, Services (via ServiceHistoryList), Calendar (via AppointmentDetailsModal), Employees (via EmployeeTable)
- **Effect:** Visual status indicator -- no interactive behavior

### DataTable (Sortable, paginated table)

- **Component:** `components/shared/DataTable.tsx`
- **Type:** Generic table with column sorting and pagination
- **Props:** `columns`, `data`, `keyExtractor`, `pageSize`, `onRowClick`, `emptyMessage`
- **Pages:** Customers
- **Interactive elements inside:**
  - Column header sort buttons (toggle asc/desc/none)
  - Pagination: Previous/Next page buttons, numbered page buttons
  - Row click handler (navigates to detail view)
- **Note:** Other pages that show tabular data (Appointments, Services, Payment) use custom list layouts instead of DataTable

### FilterByDoctor (Doctor filter dropdown)

- **Component:** `components/shared/FilterByDoctor.tsx`
- **Type:** Native `<select>` dropdown with clear button
- **Props:** `selectedDoctorId`, `onChange`
- **Pages:** Calendar
- **Effect:** Filters calendar appointments by selected doctor
- **Data source:** `data/mockEmployees.ts` -> `MOCK_EMPLOYEES` (filtered to active dentists/orthodontists)
- **Buttons inside:** `<select>` dropdown, clear (X) button

### QuickActionsBar (Shortcut action buttons)

- **Component:** `components/shared/QuickActionsBar.tsx`
- **Type:** Horizontal bar with action buttons
- **Props:** `onAction` callback
- **Pages:** Overview
- **Buttons:**
  - "New Appointment" (CalendarPlus icon)
  - "Add Customer" (UserPlus icon)
  - "Record Payment" (CreditCard icon)
  - "New Service" (Stethoscope icon)
  - "View Reports" (BarChart3 icon)
- **Data source:** `data/mockDashboard.ts` -> `QUICK_ACTIONS`

### NotificationsPanel (Alerts list)

- **Component:** `components/shared/NotificationsPanel.tsx`
- **Type:** Scrollable notification list with unread indicators
- **Props:** `notifications`, `onMarkRead`, `onViewAll`
- **Pages:** Overview
- **Interactive elements:**
  - "View All" button (top right)
  - Individual notification row buttons (mark as read on click)
  - Unread count badge

---

## Page-Specific Elements

### Overview Page (`pages/Overview.tsx`)

**Route:** `/`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| FilterByLocation | Dropdown | `shared/FilterByLocation` | Filters all dashboard data by branch |
| StatCardModule | Display cards | `modules/StatCardModule` | Shows 4 metric cards (hoverable, no click action) |
| QuickActionsBar | Action buttons | `shared/QuickActionsBar` | 5 shortcut buttons for common actions |
| RevenueChartModule | Bar chart | `modules/RevenueChartModule` | Revenue vs target visualization (hover tooltips) |
| TodaySchedule | Appointment list | `modules/TodaySchedule` | Shows today's appointments (display-only) |
| NotificationsPanel | Alert list | `shared/NotificationsPanel` | Clickable notifications with read/unread state |

---

### Calendar Page (`pages/Calendar.tsx`)

**Route:** `/calendar`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| "Today" button | Navigation | Inline | Jumps calendar to current date |
| Previous/Next arrows | Navigation | Inline (ChevronLeft/Right) | Navigate dates forward/backward |
| FilterByDoctor | Dropdown | `shared/FilterByDoctor` | Filters appointments by doctor |
| View mode tabs (Day/Week/Month) | Tab toggle | Inline | Switches between DayView, WeekView, MonthView |
| DayView | Calendar grid | `calendar/DayView` | Shows single day with time slots; supports drag-and-drop |
| WeekView | Calendar grid | `calendar/WeekView` | Shows 7-day week view; supports drag-and-drop |
| MonthView | Calendar grid | `calendar/MonthView` | Shows month grid with appointment dots |
| AppointmentCard | Clickable card | `calendar/AppointmentCard` | Click opens AppointmentDetailsModal |
| AppointmentDetailsModal | Modal | `calendar/AppointmentDetailsModal` | Shows appointment details with close button |
| TimeSlot | Drop target | `calendar/TimeSlot` | Accepts dragged appointments for rescheduling |

**Drag-and-drop:** Appointments can be dragged between time slots in Day and Week views via `useDragReschedule` hook.

---

### Customers Page (`pages/Customers.tsx`)

**Route:** `/customers`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| "Add Customer" button | Primary action | Inline (Plus icon) | Opens AddCustomerForm modal |
| SearchBar | Search input | `shared/SearchBar` | Filters customers by name, phone, email |
| FilterByLocation | Dropdown | `shared/FilterByLocation` | Filters customers by branch |
| Status filter buttons | Toggle group | Inline | Filters by: All Status, Active, Inactive, Pending |
| DataTable | Sortable table | `shared/DataTable` | Displays customer list with sorting and pagination |
| DataTable row click | Navigation | `shared/DataTable` | Opens CustomerProfile view |
| CustomerProfile | Detail view | `customer/CustomerProfile` | Full profile with back button, tabs for history |
| AddCustomerForm modal | Form modal | `forms/AddCustomerForm` | Customer creation form (see Form Components) |

---

### Appointments Page (`pages/Appointments/index.tsx`)

**Route:** `/appointments`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| "New Appointment" button | Primary action | Inline (Plus icon) | Opens AppointmentForm modal |
| Search input | Text input | Inline | Filters by name, phone, doctor, service |
| Date filter | Date picker | Inline `<input type="date">` | Filters appointments by date |
| "Clear" date button | Text button | Inline | Clears date filter |
| Status tabs | Tab group (6) | Inline | All, Scheduled, Confirmed, In Progress, Completed, Cancelled |
| Stat cards (4) | Display | Inline StatCard | Today Total, Waiting, In Treatment, Completed |
| Appointment row | Expandable button | Inline | Click expands to show detail panel |
| CheckInFlow | Workflow buttons | `appointments/CheckInFlow` | Advance check-in status step by step |
| WaitTimer | Timer display | `appointments/WaitTimer` | Shows wait duration (compact mode in row) |
| ConvertToService | Action button | `appointments/ConvertToService` | Converts completed appointment to service record |
| AppointmentForm modal | Form modal | `appointments/AppointmentForm` | Appointment creation (see Form Components) |

---

### Services Page (`pages/Services/index.tsx`)

**Route:** `/services`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| "New Service" button | Primary action | Inline (Plus icon) | Opens ServiceForm modal |
| Search input | Text input | Inline | Filters by customer, service, doctor |
| Category dropdown | `<select>` | Inline | Filters by: All Categories, Cleaning, Consultation, Treatment, Surgery, Orthodontics |
| Status tabs | Tab group (5) | Inline | All, Active, Planned, Completed, Cancelled |
| Stat cards (4) | Display | Inline StatCard | Active, Planned, Completed, Outstanding (VND) |
| ServiceHistoryList | Record list | `services/ServiceHistoryList` | Expandable service records with visit tracking |
| ServiceForm modal | Form modal | `services/ServiceForm` | Service record creation (see Form Components) |

---

### Payment Page (`pages/Payment.tsx`)

**Route:** `/payment`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| "New Payment" button | Primary action | Inline (Plus icon) | Opens PaymentForm modal (shown when Payments tab active) |
| "New Plan" button | Primary action | Inline (Plus icon) | Opens MonthlyPlanCreator (shown when Plans tab active) |
| Summary stat cards (4) | Display | Inline | Total Revenue, Wallet Balance, Outstanding, Active Plans |
| Tab switcher | Tab group (2) | Inline | "Payments & Wallets" / "Installment Plans" |
| **Payments & Wallets tab:** | | | |
| DepositWallet | Card with action | `payment/DepositWallet` | Shows wallet balance with "Top Up" button |
| OutstandingBalance | List with action | `payment/OutstandingBalance` | Shows outstanding items with "Pay Now" button |
| Payment search input | Text input | Inline | Searches payment history |
| Payment status filter | Toggle group (4) | Inline | All, Completed, Pending, Refunded |
| PaymentHistory | List | `payment/PaymentHistory` | Payment record list |
| **Installment Plans tab:** | | | |
| MonthlyPlanCreator | Form | `payment/MonthlyPlan/MonthlyPlanCreator` | Create new installment plan |
| Plan search input | Text input | Inline | Search plans |
| Plan status filter | Toggle group (4) | Inline | All Plans, Active, Completed, Defaulted |
| Plan list buttons | Selectable cards | Inline | Click selects plan to view details |
| PaymentSchedule | Detail view | `payment/MonthlyPlan/PaymentSchedule` | Shows installment schedule with "Mark Paid" buttons |
| PaymentForm modal | Form modal | `payment/PaymentForm` | Payment creation (see Form Components) |

---

### Employees Page (`pages/Employees/index.tsx`)

**Route:** `/employees`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| "Add Employee" button | Primary action | Inline | Placeholder -- not yet implemented |
| Search input | Text input | Inline | Filters by name or email |
| Status filter | Toggle group (4) | Inline | All, Active, On Leave, Inactive |
| TierSelector | Custom selector | `employees/TierSelector` | Filters by employee tier level |
| RoleMultiSelect | Multi-select | `employees/RoleMultiSelect` | Filters by role (dentist, orthodontist, etc.) |
| "Clear all filters" button | Text button | Inline | Resets all filters |
| EmployeeTable | Table | `employees/EmployeeTable` | Staff list, click selects employee |
| EmployeeProfile | Side panel | `employees/EmployeeProfile` | Detailed profile with close button |
| LinkedEmployees | Display | `employees/LinkedEmployees` | Shows related staff members |
| ScheduleCalendar | Display | `employees/ScheduleCalendar` | Employee schedule view |
| ReferralCodeDisplay | Display | `employees/ReferralCodeDisplay` | Shows employee referral code |

---

### Locations Page (`pages/Locations.tsx`)

**Route:** `/locations`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| "Add Location" button | Primary action | Inline (Plus icon) | Opens placeholder modal (not yet implemented) |
| Summary stat cards (4) | Display | Inline | Total Branches, Total Staff, Total Customers, Monthly Revenue |
| Search input | Text input | Inline | Searches by name, district, or address |
| Status filter buttons | Toggle group (4) | Inline | All, Active, Renovation, Closed |
| "Clear filters" button | Text button | Inline | Resets search and status filter |
| LocationCard | Clickable card | `locations/LocationCard` | Click navigates to LocationDetail |
| LocationDetail | Detail view | `locations/LocationDetail` | Full location view with back button |
| LocationDashboard | Dashboard | `locations/LocationDashboard` | Per-location metrics and stats |

---

### ServiceCatalog Page (`pages/ServiceCatalog.tsx`)

**Route:** `/services-catalog`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| "Mo rong tat ca" button | Action | Inline | Expands all service category groups |
| "Thu gon tat ca" button | Action | Inline | Collapses all service category groups |
| "+ Them dich vu" button | Primary action | Inline | Placeholder for adding new service |
| Stat cards (4) | Display | Inline | Total services, Categories, Average price, Lab-orderable count |
| Search input | Text input | Inline | Filters services by name or code |
| Category dropdown | `<select>` | Inline | Filters by service category group |
| ServiceGroup toggles | Expandable section | Inline component | Click header to expand/collapse category table |
| Service table | Data table | Inline | Shows service code, name, unit, price, lab order status |

---

### Website Page (`pages/Website.tsx`)

**Route:** `/website`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| "New Page" button | Primary action | Inline | Placeholder for creating new CMS page |
| Tab navigation (4) | Tab group | Inline | Pages, Editor, Services, SEO |
| PageList | List with actions | `website/PageList` | Page list with search, status filter, edit/SEO buttons |
| PageEditor | Rich editor | `website/PageEditor` | Content editing with back button |
| ServiceCatalogManager | List with filters | `website/ServiceCatalogManager` | Service catalog with search and category filter |
| SEOManager | Form/detail | `website/SEOManager` | SEO settings with page selector |

---

### Settings Page (`pages/Settings/index.tsx`)

**Route:** `/settings`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| Tab navigation (4) | Tab group | Inline | Service Catalog, Roles & Permissions, Customer Sources, System Preferences |
| ServiceCatalogSettings | Settings panel | `settings/ServiceCatalogSettings` | Manage treatment types and pricing |
| RoleConfig | Settings panel | `settings/RoleConfig` | Define roles and access control |
| CustomerSourcesConfig | Settings panel | `settings/CustomerSourcesConfig` | Manage referral/customer sources |
| SystemPreferences | Settings panel | `settings/SystemPreferences` | General app configuration |

---

### Relationships Page (`pages/Relationships.tsx`)

**Route:** `/relationships`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| Stats row (3) | Display | Inline | Roles count, Entities count, Connections count |
| Tab navigation (2) | Tab group | Inline | Permission Matrix, Entity Relationships |
| PermissionMatrix | Interactive grid | `relationships/PermissionMatrix` | Role-permission grid with role toggle buttons |
| EntityRelationshipMap | Interactive diagram | `relationships/EntityRelationshipMap` | Entity nodes with clickable selection |

---

### Reports Page (`pages/Reports.tsx`)

**Route:** `/reports`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| "Export Data" button | Primary action | Inline | Placeholder (not yet implemented) |
| Stat cards (4) | Display | Inline | Revenue MTD, Appointments, New Customers, Avg Revenue/Visit |
| Revenue Trend chart | Bar chart | Inline | Static monthly bar chart |
| Service Breakdown | Progress bars | Inline | Category distribution visualization |
| Detailed Reports section | Placeholder | Inline | "Coming soon" placeholder |

---

### Commission Page (`pages/Commission.tsx`)

**Route:** `/commission`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| "Configure Rules" button | Primary action | Inline | Placeholder (not yet implemented) |
| Stat cards (3) | Display | Inline | Total Commissions MTD, Eligible Employees, Avg Rate |
| Commission Records | Placeholder | Inline | "Coming soon" placeholder |

---

### Notifications Page (`pages/Notifications.tsx`)

**Route:** `/notifications`

| Element | Type | Component | Effect |
|---------|------|-----------|--------|
| "New Template" button | Primary action | Inline | Placeholder (not yet implemented) |
| Channel cards (3) | Display | Inline | Email, SMS, Push notification status cards |
| Notification Templates | Clickable list | Inline | Template rows with hover state (5 templates) |
| Coming soon section | Placeholder | Inline | Future notification management |

---

## Component Dependency Graph

```
Layout
  +-- Sidebar (NAVIGATION_ITEMS from constants)
  +-- Header (mobile menu toggle)
  +-- Outlet (renders page content)

Overview
  +-- FilterByLocation
  +-- StatCardModule
  +-- QuickActionsBar
  +-- RevenueChartModule
  +-- TodaySchedule
  +-- NotificationsPanel

Calendar
  +-- FilterByDoctor
  +-- DayView
  |     +-- TimeSlot
  |     +-- AppointmentCard
  +-- WeekView
  |     +-- TimeSlot
  |     +-- AppointmentCard
  +-- MonthView
  |     +-- AppointmentCard
  +-- AppointmentDetailsModal

Customers
  +-- SearchBar
  +-- FilterByLocation
  +-- StatusBadge (via column render)
  +-- DataTable (with pagination)
  +-- AddCustomerForm (modal)
  |     +-- ImageUpload
  |     +-- LocationSelector
  |     +-- CustomerSourceDropdown
  |     +-- ReferralCodeInput
  +-- CustomerProfile (detail view)
       +-- AppointmentHistory
       +-- ServiceHistory
       +-- PhotoGallery
       +-- DepositCard

Appointments
  +-- StatusBadge
  +-- AppointmentForm (modal)
  |     +-- CustomerSelector
  |     +-- DoctorSelector
  |     +-- LocationSelector
  +-- CheckInFlow
  +-- WaitTimer
  +-- ConvertToService

Services
  +-- ServiceForm (modal)
  |     +-- ServiceCatalogSelector
  |     +-- CustomerSelector
  |     +-- DoctorSelector
  |     +-- LocationSelector
  +-- ServiceHistoryList
       +-- MultiVisitTracker

Payment
  +-- DepositWallet
  +-- OutstandingBalance
  +-- PaymentHistory
  +-- PaymentForm (modal)
  +-- MonthlyPlanCreator
  +-- PaymentSchedule
       +-- InstallmentTracker

Employees
  +-- TierSelector
  +-- RoleMultiSelect
  +-- EmployeeTable
  +-- EmployeeProfile
       +-- EmployeeCard
       +-- LinkedEmployees
       +-- ScheduleCalendar
       +-- ReferralCodeDisplay

Locations
  +-- LocationCard
  +-- LocationDetail
       +-- LocationDashboard

ServiceCatalog
  +-- ServiceGroup (inline, per category)

Website
  +-- PageList
  +-- PageEditor
  +-- ServiceCatalogManager
  +-- SEOManager

Settings
  +-- ServiceCatalogSettings
  +-- RoleConfig
  +-- CustomerSourcesConfig
  +-- SystemPreferences

Relationships
  +-- PermissionMatrix
  +-- EntityRelationshipMap

Reports (all inline, no child components)
Commission (all inline, placeholder)
Notifications (all inline, placeholder)
```

---

## Form Components (used in modals/create flows)

### CustomerSelector

- **Component:** `components/shared/CustomerSelector.tsx`
- **Type:** Searchable dropdown with search input inside
- **Used in:** AppointmentForm, ServiceForm
- **Data source:** `data/mockCustomers.ts` -> `MOCK_CUSTOMERS`
- **Interactive elements:** Toggle button, search input, customer option buttons

### DoctorSelector

- **Component:** `components/shared/DoctorSelector.tsx`
- **Type:** Searchable dropdown with role filtering
- **Used in:** AppointmentForm, ServiceForm
- **Data source:** `data/mockEmployees.ts` -> `MOCK_EMPLOYEES`
- **Props:** `filterRoles` to restrict to dentist/orthodontist
- **Interactive elements:** Toggle button, search input, doctor option buttons

### LocationSelector

- **Component:** `components/shared/LocationSelector.tsx`
- **Type:** Click-to-open dropdown
- **Used in:** AddCustomerForm, AppointmentForm, ServiceForm
- **Data source:** `data/mockDashboard.ts` -> `MOCK_LOCATIONS`
- **Props:** `excludeAll` removes "All Locations" option for form use
- **Interactive elements:** Toggle button, location option buttons

### ServiceCatalogSelector

- **Component:** `components/shared/ServiceCatalogSelector.tsx`
- **Type:** Searchable dropdown with category filtering and price display
- **Used in:** ServiceForm
- **Data source:** `data/mockServices.ts` -> `MOCK_SERVICE_CATALOG`
- **Interactive elements:** Toggle button, search input, service option buttons (show name, price, visits, duration)

### CustomerSourceDropdown

- **Component:** `components/shared/CustomerSourceDropdown.tsx`
- **Type:** Click-to-open dropdown with validation error support
- **Used in:** AddCustomerForm
- **Data source:** `data/mockCustomerForm.ts` -> `CUSTOMER_SOURCES`
- **Interactive elements:** Toggle button, source option buttons

### ImageUpload

- **Component:** `components/shared/ImageUpload.tsx`
- **Type:** Drag-and-drop photo upload with preview
- **Used in:** AddCustomerForm
- **Interactive elements:** Upload button, remove (X) button, drag-and-drop zone, hidden file input

### ReferralCodeInput

- **Component:** `components/shared/ReferralCodeInput.tsx`
- **Type:** Text input with async validation indicator
- **Used in:** AddCustomerForm
- **States:** idle, validating (spinner), valid (checkmark), invalid (X)
- **Data source:** `data/mockCustomerForm.ts` -> `MOCK_REFERRAL_CODES`

---

## Navigation & Layout

### Sidebar Navigation (`components/Layout.tsx`)

**Hierarchical menu structure:**

```
Overview          -> /
Calendar          -> /calendar
Customers         -> /customers
  Appointments    -> /appointments
  Record          -> /services
  Payment         -> /payment
Employees         -> /employees
  Commission (P)  -> /commission       (Premium badge)
Locations         -> /locations
Danh muc DV       -> /website          (count: 228)
Settings          -> /settings
```

**Interactive elements:**
- NavLink items (active state: white text on dark bg, primary icon color)
- Mobile hamburger menu button (Menu icon)
- Mobile sidebar close button (X icon)
- Mobile overlay (click to close sidebar)

### Header

- Mobile menu toggle button (hamburger icon, hidden on lg+)
- "Clinic Management System" label (hidden on mobile)
