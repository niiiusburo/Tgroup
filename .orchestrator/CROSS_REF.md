# Cross-Reference Documentation Pattern

This codebase uses a strict cross-reference documentation pattern to track component relationships.

## Comment Format

### For Components
```typescript
/**
 * DashboardStats - Displays key metrics cards
 * @crossref:used-in[Overview, Reports, LocationDashboard]
 * @crossref:uses[StatCard, useDashboardStats, formatCurrency]
 * @crossref:related[RevenueChart, TotalVisits]
 */
export function DashboardStats() { ... }
```

### For Hooks
```typescript
/**
 * useDashboardStats - Fetches and calculates dashboard statistics
 * @crossref:used-in[Overview, Reports, LocationDashboard]
 * @crossref:uses[useCustomers, useAppointments, useRevenue]
 * @crossref:returns[DashboardStatsData]
 */
export function useDashboardStats() { ... }
```

### For Types/Interfaces
```typescript
/**
 * Customer - Core customer data model
 * @crossref:used-in[Customers, Appointments, Services, Payment]
 * @crossref:related[Employee, Location, Appointment]
 */
interface Customer {
  id: string;
  name: string;
  // ...
}
```

### For Utility Functions
```typescript
/**
 * formatCurrency - Formats number as VND currency
 * @crossref:used-in[Payment, Services, Reports, RevenueChart]
 * @crossref:uses[Intl.NumberFormat]
 */
export function formatCurrency(amount: number): string { ... }
```

### For Mock Data
```typescript
/**
 * mockCustomers - Sample customer data for development
 * @crossref:used-in[Customers, CustomerProfile, SearchDemo]
 * @crossref:related[mockAppointments, mockServices]
 */
export const mockCustomers = [...];
```

## Cross-Reference Tags

| Tag | Purpose |
|-----|---------|
| `@crossref:used-in[PageA, PageB]` | List of pages/components where THIS is used |
| `@crossref:uses[ComponentA, HookB]` | List of dependencies THIS component uses |
| `@crossref:related[TypeA, TypeB]` | Related types/components (not direct dependencies) |
| `@crossref:returns[TypeName]` | Return type (for functions/hooks) |

## Directory Structure with Cross-References

```
src/
├── components/
│   ├── ui/                    # Base UI components (buttons, inputs, etc.)
│   │   └── Button.tsx         # @crossref:used-in[ALL_PAGES]
│   ├── forms/                 # Form components
│   │   ├── CustomerForm/      # @crossref:used-in[Customers, QuickActions]
│   │   ├── AppointmentForm/   # @crossref:used-in[Appointments, Calendar]
│   │   └── PaymentForm/       # @crossref:used-in[Payment, Services]
│   ├── shared/                # Shared business components
│   │   ├── SearchBar/         # @crossref:used-in[Customers, Employees, Services]
│   │   ├── DataTable/         # @crossref:used-in[Customers, Employees, Locations]
│   │   ├── StatusBadge/       # @crossref:used-in[Appointments, Services, Calendar]
│   │   └── FilterByLocation/  # @crossref:used-in[Overview, Calendar, Customers]
│   └── layouts/               # Layout components
│       ├── Sidebar/           # @crossref:used-in[DashboardLayout]
│       ├── Header/            # @crossref:used-in[DashboardLayout]
│       └── DashboardLayout/   # @crossref:used-in[ALL_PAGES]
├── pages/                     # Page components
│   ├── Overview/              # @crossref:uses[DashboardStats, TodaySchedule]
│   ├── Calendar/              # @crossref:uses[DayView, WeekView, MonthView]
│   ├── Customers/             # @crossref:uses[CustomerTable, CustomerProfile]
│   ├── Appointments/          # @crossref:uses[CalendarView, AppointmentForm]
│   ├── Services/              # @crossref:uses[ServiceForm, ServiceHistory]
│   ├── Payment/               # @crossref:uses[DepositWallet, PaymentForm]
│   ├── Employees/             # @crossref:uses[EmployeeTable, EmployeeProfile]
│   ├── Locations/             # @crossref:uses[LocationCard, LocationDetail]
│   ├── Website/               # @crossref:uses[PageEditor, PageList]
│   ├── Settings/              # @crossref:uses[ServiceCatalog, RoleConfig]
│   └── Relationships/         # @crossref:uses[PermissionMatrix]
├── hooks/                     # Custom hooks
│   ├── useCustomers.ts        # @crossref:used-in[Customers, Appointments, Payment]
│   ├── useAppointments.ts     # @crossref:used-in[Appointments, Calendar, Overview]
│   ├── useServices.ts         # @crossref:used-in[Services, Customers, Payment]
│   ├── usePayment.ts          # @crossref:used-in[Payment, Services, Customers]
│   ├── useEmployees.ts        # @crossref:used-in[Employees, Appointments, Calendar]
│   ├── useLocations.ts        # @crossref:used-in[Locations, Customers, Employees]
│   └── usePermissions.ts      # @crossref:used-in[ALL_PAGES]
├── types/                     # TypeScript types
│   └── index.ts               # All types with @crossref annotations
├── data/                      # Mock data
│   └── mock/                  # Mock datasets with @crossref annotations
├── lib/                       # Utilities
│   ├── utils.ts               # @crossref:used-in[ALL_COMPONENTS]
│   ├── crossref.ts            # Cross-reference validator
│   └── formatters.ts          # @crossref:used-in[Components using formatting]
└── constants/                 # Constants
    └── index.ts               # @crossref:used-in[ALL_COMPONENTS]
```

## Shared Components Map

### SearchBar
```typescript
/**
 * SearchBar - Universal search input with debounce
 * @crossref:used-in[Customers, Employees, Services, Website]
 * @crossref:uses[useDebounce, SearchIcon]
 */
```

### DataTable
```typescript
/**
 * DataTable - Reusable table with sorting, pagination
 * @crossref:used-in[Customers, Employees, Services, Locations, Reports]
 * @crossref:uses[Table, Pagination, SortIcon]
 */
```

### StatusBadge
```typescript
/**
 * StatusBadge - Displays status with color coding
 * @crossref:used-in[Appointments, Services, Calendar, EmployeeTable]
 * @crossref:uses[statusColors constant]
 */
```

### FilterByLocation
```typescript
/**
 * FilterByLocation - Dropdown to filter by branch/location
 * @crossref:used-in[Overview, Calendar, Customers, Appointments, Employees]
 * @crossref:uses[useLocations, SelectDropdown]
 */
```

### CustomerSelector
```typescript
/**
 * CustomerSelector - Searchable dropdown to select customer
 * @crossref:used-in[AppointmentForm, ServiceForm, PaymentForm]
 * @crossref:uses[SearchBar, useCustomers, CustomerCard]
 */
```

### DoctorSelector
```typescript
/**
 * DoctorSelector - Dropdown to select doctor/employee
 * @crossref:used-in[AppointmentForm, ServiceForm, CalendarFilter]
 * @crossref:uses[useEmployees, Avatar]
 */
```

### LocationSelector
```typescript
/**
 * LocationSelector - Dropdown to select branch (optional)
 * @crossref:used-in[CustomerForm, EmployeeForm, AppointmentForm, ServiceForm]
 * @crossref:uses[useLocations, SelectDropdown]
 */
```

## Type Relationships

```typescript
/**
 * Customer - Central entity linked to multiple systems
 * @crossref:used-in[Customers, Appointments, Services, Payment]
 * @crossref:related[Employee (via referralCode), Location (optional)]
 */
interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  locationId?: string;  // @crossref:links-to[Location]
  referralCode?: string; // @crossref:links-to[Employee]
}

/**
 * Appointment - Links Customer, Employee, Location
 * @crossref:used-in[Appointments, Calendar, Overview]
 * @crossref:related[Customer, Employee, Location, Service]
 */
interface Appointment {
  id: string;
  customerId: string;  // @crossref:links-to[Customer]
  doctorId?: string;   // @crossref:links-to[Employee]
  locationId?: string; // @crossref:links-to[Location]
  serviceId?: string;  // @crossref:links-to[Service]
}

/**
 * Service - Treatment record linking multiple entities
 * @crossref:used-in[Services, Payment, Customers]
 * @crossref:related[Customer, Employee, Appointment, Payment]
 */
interface Service {
  id: string;
  customerId: string;     // @crossref:links-to[Customer]
  doctorId?: string;      // @crossref:links-to[Employee]
  appointmentId?: string; // @crossref:links-to[Appointment]
  payments: Payment[];    // @crossref:links-to[Payment]
}

/**
 * Payment - Financial transaction
 * @crossref:used-in[Payment, Services, Customers]
 * @crossref:related[Service, Customer, Employee (processedBy)]
 */
interface Payment {
  id: string;
  serviceId?: string;     // @crossref:links-to[Service]
  customerId: string;     // @crossref:links-to[Customer]
  processedBy: string;    // @crossref:links-to[Employee]
}

/**
 * Employee - Staff member with roles and referral tracking
 * @crossref:used-in[Employees, Appointments, Services, Customers]
 * @crossref:related[Location (assignments), Customer (referrals)]
 */
interface Employee {
  id: string;
  name: string;
  tier: 'admin' | 'manager' | 'staff';
  referralCode: string;   // @crossref:linked-from[Customer]
  locationIds: string[];  // @crossref:links-to[Location]
}

/**
 * Location - Branch/office location
 * @crossref:used-in[Locations, Customers, Employees, Appointments]
 * @crossref:related[Employee (assignments), Customer (optional link)]
 */
interface Location {
  id: string;
  name: string;
  address: string;
}
```

## Build-Time Validation

The system includes a build-time validator that checks:
1. All `@crossref:used-in` references point to existing files
2. All `@crossref:uses` references point to existing exports
3. Bidirectional references match (if A uses B, B should note A in used-in)

Run validation:
```bash
npm run validate-crossref
```

## Example Implementation

```tsx
// src/components/shared/StatusBadge.tsx

/**
 * StatusBadge - Displays a colored status indicator
 * @crossref:used-in[Appointments, Services, Calendar, EmployeeTable]
 * @crossref:uses[statusColors, cn utility]
 * @crossref:related[Badge (shadcn)]
 */

import { cn } from '@/lib/utils';
import { statusColors } from '@/constants';

interface StatusBadgeProps {
  status: 'scheduled' | 'confirmed' | 'arrived' | 'completed' | 'cancelled';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * @crossref:used-in[AppointmentCard, ServiceRow, CalendarEvent, EmployeeStatus]
 * @crossref:uses[statusColors, cn]
 */
export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span className={cn(
      'rounded-full font-medium',
      statusColors[status],
      size === 'sm' && 'px-2 py-0.5 text-xs',
      size === 'md' && 'px-3 py-1 text-sm',
      size === 'lg' && 'px-4 py-2 text-base'
    )}>
      {status}
    </span>
  );
}
```
