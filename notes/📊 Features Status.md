# Features Tracker

## Summary

| Status | Count |
|--------|-------|
| ✅ Done | 28 |
| 🔄 In Progress | 0 |
| ⏳ Todo | 0 |

## Core Features (20)

### Setup (Features 1-3)
| ID | Feature | Status | Progress |
|----|---------|--------|----------|
| 1 | Project Scaffold and Core Setup | ✅ Done | Session: 2026-04-07 |
| 2 | Shared Business Components | ✅ Done | Session: 2026-04-07 |
| 3 | Shared Selectors and Form Components | ✅ Done | Session: 2026-04-07 |

### Dashboard (Features 4-5)
| ID | Feature | Status | Progress |
|----|---------|--------|----------|
| 4 | Overview Dashboard - Stats and Schedule | ✅ Done | Session: 2026-04-07 |
| 5 | Overview Dashboard - Actions and Notifications | ✅ Done | Session: 2026-04-07 |

### Calendar (Features 6-7)
| ID | Feature | Status | Progress |
|----|---------|--------|----------|
| 6 | Calendar - Day, Week, and Month Views | ✅ Done | Session: 2026-04-07 |
| 7 | Calendar - Appointment Creation and Editing | ✅ Done | Session: 2026-04-07 |

### Customer Management (Features 8-9)
| ID | Feature | Status | Progress |
|----|---------|--------|----------|
| 8 | Customer List and Search | ✅ Done | Session: 2026-04-07 |
| 9 | Customer Detail and Edit | ✅ Done | Session: 2026-04-07 |

### Appointment Management (Features 10-12)
| ID | Feature | Status | Progress |
|----|---------|--------|----------|
| 10 | Appointment List and Filters | ✅ Done | Session: 2026-04-07 |
| 11 | Appointment Creation Form | ✅ Done | Session: 2026-04-07 |
| 12 | Appointment Status Management | ✅ Done | Session: 2026-04-07 |

### Services (Features 13-14)
| ID | Feature | Status | Progress |
|----|---------|--------|----------|
| 13 | Services List and Categories | ✅ Done | Session: 2026-04-07 |
| 14 | Service Creation and Pricing | ✅ Done | Session: 2026-04-07 |

### Payment (Features 15-17)
| ID | Feature | Status | Progress |
|----|---------|--------|----------|
| 15 | Payment Overview and Deposits | ✅ Done | Session: 2026-04-07 |
| 16 | Payment Plans and Installments | ✅ Done | Session: 2026-04-07 |
| 17 | Payment History and Receipts | ✅ Done | Session: 2026-04-07 |

### Employee Management (Features 18-19)
| ID | Feature | Status | Progress |
|----|---------|--------|----------|
| 18 | Employee List and Schedules | ✅ Done | Session: 2026-04-07 |
| 19 | Employee Profile and Permissions | ✅ Done | Session: 2026-04-07 |

### Location Management (Feature 20)
| ID | Feature | Status | Progress |
|----|---------|--------|----------|
| 20 | Multi-Location Management | ✅ Done | Session: 2026-04-07 |

## Extended Features (8+)

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| 21 | **Permission System / RBAC** | ✅ Done | `permission_groups`, `employee_permissions`, location scoping |
| 22 | **Feedback System** | ✅ Done | Threads, messages, attachments, admin UI, widget |
| 23 | **Reports Module** | ✅ Done | 6 sub-reports: dashboard, revenue, appointments, doctors, customers, locations |
| 24 | **Commission Module** | ✅ Done | Commission tracking and payouts |
| 25 | **Face Recognition** | ✅ Done | Compreface integration for patient check-in |
| 26 | **Version Check / Force Update** | ✅ Done | `useVersionCheck` prompts users to refresh |
| 27 | **IP Access Control** | ✅ Done | `useIpAccessControl` restricts logins by IP whitelist |
| 28 | **Bank Settings / VietQR** | ✅ Done | Bank config, VietQR generation, payment proof upload |
| 29 | **Website CMS** | ✅ Done | Page editor, SEO manager |
| 30 | **Self-Service Password Change** | ✅ Done | Change password modal + `/Auth/change-password` API |

## Feature Details

### Feature 1: Project Scaffold
- ✅ Vite + React + TypeScript + Tailwind configured
- ✅ React Router with all routes
- ✅ Constants file with theme colors
- ✅ All page placeholders created

### Feature 2: Shared Components
- ✅ SearchBar with debounce
- ✅ DataTable with sorting/pagination
- ✅ StatusBadge component
- ✅ FilterByLocation dropdown
- ✅ StatCardModule

### Feature 3: Selectors & Forms
- ✅ CustomerSelector
- ✅ DoctorSelector
- ✅ LocationSelector
- ✅ useFormValidation hook
- ✅ RevenueChartModule

### Feature 4-5: Overview Dashboard
- ✅ DashboardStats with StatCardModules
- ✅ TodaySchedule component
- ✅ QuickActionsBar
- ✅ NotificationsPanel
- ✅ RevenueChartModule integrated
- ✅ FilterByLocation integrated

### Feature 6-7: Calendar
- ✅ DayView with hourly slots
- ✅ WeekView with 7-day grid
- ✅ MonthView with calendar grid
- ✅ TimeSlot component
- ✅ Appointment creation form

### Feature 8-9: Customers
- ✅ Customer list with search
- ✅ Customer detail page
- ✅ Customer edit form
- ✅ Customer appointment history
- ✅ Face recognition capture

### Feature 10-12: Appointments
- ✅ Appointment list with filters
- ✅ Appointment creation form
- ✅ Status management
- ✅ Calendar integration
- ✅ Drag-to-reschedule

### Feature 13-14: Services
- ✅ Service catalog (using `products` table)
- ✅ Service categories
- ✅ Service creation/editing
- ✅ Price management

### Feature 15-17: Payment
- ✅ DepositWallet component
- ✅ PaymentForm
- ✅ MonthlyPlan component
- ✅ Payment history
- ✅ VietQR generation
- ✅ Payment proof upload

### Feature 18-19: Employees
- ✅ EmployeeTable
- ✅ EmployeeProfile
- ✅ TierSelector
- ✅ Schedule management
- ✅ Permission assignment

### Feature 20: Locations
- ✅ LocationDashboard
- ✅ LocationDetail
- ✅ LocationCard
- ✅ Multi-location filtering

### Feature 21: Permission System
- ✅ 5 permission tiers (Admin, Clinic Manager, Dentist, Receptionist, Dental Assistant)
- ✅ `employee_permissions` mapping
- ✅ `permission_overrides` for individual grant/revoke
- ✅ `employee_location_scope` for branch-level access
- ✅ JWT token includes permissions + locations
- ✅ Frontend `hasPermission()` and `hasLocationAccess()` guards
- ✅ PermissionBoard UI for visualization and editing

### Feature 22: Feedback System
- ✅ Feedback widget on all pages
- ✅ Threaded conversations
- ✅ Attachment uploads
- ✅ Admin moderation panel

### Feature 23: Reports
- ✅ ReportsDashboard with KPI cards
- ✅ Revenue report with charts
- ✅ Appointment analytics
- ✅ Doctor performance
- ✅ Customer reports
- ✅ Location comparison

### Feature 24: Commission
- ✅ Commission rules configuration
- ✅ Auto-calculation on payments
- ✅ Commission statements

### Feature 25: Face Recognition
- ✅ Compreface Docker services
- ✅ Face registration for customers
- ✅ Check-in verification

### Feature 26: Version Check
- ✅ `version.json` auto-generated on build
- ✅ Polling check in background
- ✅ Modal prompt when new version deployed

### Feature 27: IP Access Control
- ✅ IP whitelist configuration
- ✅ Block login from unauthorized IPs
- ✅ Admin bypass

### Feature 28: Bank / VietQR
- ✅ Bank account settings (bin, number, account name)
- ✅ Dynamic VietQR URL generation
- ✅ Upload and store payment proof images

### Feature 29: Website CMS
- ✅ Page list and editor
- ✅ SEO title/description per page
- ✅ Live preview

### Feature 30: Password Management
- ✅ Change password modal in sidebar
- ✅ Backend `/Auth/change-password` endpoint
- ✅ Old password verification + minimum length
