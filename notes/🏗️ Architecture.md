# TGroup Architecture

## Frontend Architecture

### Tech Stack
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **State Management:** React Context (LocationContext, AuthContext, TimezoneContext)
- **i18n:** react-i18next

### Directory Structure

```
website/src/
├── App.tsx                 # Root: Router + LocationProvider
├── main.tsx               # Entry point
├── contexts/
│   ├── LocationContext.tsx # Global location filter state
│   ├── AuthContext.tsx     # JWT auth + permissions
│   ├── TimezoneContext.tsx # Clinic timezone handling
│   └── AppointmentHoverContext.tsx
├── pages/
│   ├── Overview/
│   ├── Calendar/
│   ├── Customers/
│   ├── Appointments/
│   ├── Services/
│   ├── Payment/
│   ├── Employees/
│   ├── Locations/
│   ├── Website/
│   ├── Settings/
│   ├── Relationships/
│   ├── PermissionBoard/
│   ├── Reports/
│   ├── Commission/
│   └── Feedback/
├── components/
│   ├── shared/            # Reusable across all pages
│   ├── modules/           # Dashboard-specific modules
│   ├── appointments/      # Appointment views
│   ├── calendar/          # Calendar views
│   ├── customer/          # Customer/profile
│   ├── payment/           # Payment-related
│   ├── locations/         # Location-specific
│   ├── employees/         # Employee-specific
│   ├── relationships/     # Permission & entity
│   ├── reports/           # Report charts/tables
│   ├── settings/          # Config forms
│   ├── website/           # CMS components
│   ├── debug/             # PermissionDebugger
│   └── ui/                # Low-level UI primitives
├── hooks/                 # Custom React hooks
├── data/                  # Mock data (legacy fallback)
├── constants/             # Theme, colors, nav items
└── lib/                   # API clients + utilities
    └── api/
        ├── core.ts        # apiFetch wrapper
        ├── auth.ts
        ├── permissions.ts
        ├── employees.ts
        ├── partners.ts
        ├── appointments.ts
        ├── payments.ts
        ├── products.ts
        ├── services.ts
        ├── companies.ts
        └── ...
```

## Backend Architecture

### API Structure

```
api/
├── src/
│   ├── server.js          # Express server entry
│   ├── routes/            # 39 API route modules
│   ├── services/          # Small business-logic layer
│   ├── middleware/        # Auth, permission checks, IP access
│   │   ├── auth.js        # JWT validation + req.user injection
│   │   └── permissions.js # requirePermission middleware
│   └── db.js              # PostgreSQL pool connection
└── package.json
```

> **Note:** The backend is intentionally flat. There is no `controllers/` or `models/` layer. Route handlers live directly in `routes/` and use the shared `db.js` query helper.

### Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/Auth/login` | JWT login |
| POST | `/api/Auth/change-password` | Self-service password change |
| GET | `/api/auth/me` | Current user + permissions |
| GET | `/api/partners` | List partners (customers/doctors) |
| GET | `/api/partners/:id` | Get partner details |
| POST | `/api/partners` | Create partner |
| PUT | `/api/partners/:id` | Update partner |
| GET | `/api/appointments` | List appointments |
| POST | `/api/appointments` | Create appointment |
| GET | `/api/employees` | List employees |
| GET | `/api/products` | List services (legacy table name) |
| GET | `/api/companies` | List locations (legacy table name) |
| GET | `/api/payments` | List payments |
| GET | `/api/permissions/groups` | Permission groups |
| GET | `/api/permissions/employees` | Employee permission mappings |
| GET | `/api/reports/...` | Various report endpoints |

## Database Architecture

### PostgreSQL Schema (Selected)

```
Database: tdental_demo

Core Tables:
├── dbo.companies          # Clinic branches
├── dbo.partners           # Customers & Employees
├── dbo.appointments       # Appointments
├── dbo.products           # Services catalog (legacy name)
├── dbo.saleorders         # Treatment plans
├── dbo.saleorderlines     # Plan line items
├── dbo.payments           # Payments
├── dbo.monthlyplans       # Installment plans
├── dbo.dotkhams           # Medical records
└── dbo.dotkhamsteps       # Record steps

Permission Tables:
├── dbo.permission_groups
├── dbo.group_permissions
├── dbo.employee_permissions
├── dbo.permission_overrides
└── dbo.employee_location_scope

Feedback Tables:
├── dbo.feedback_threads
├── dbo.feedback_messages
└── dbo.feedback_attachments

Config Tables:
├── dbo.systempreferences
├── dbo.company_bank_settings
└── dbo.websitepages
```

## Component Hierarchy

```
App
├── AuthProvider
└── LocationProvider
    └── ReactRouter
        ├── Layout
        │   ├── Sidebar (collapsible)
        │   ├── Header
        │   │   ├── FilterByLocation
        │   │   ├── FeedbackWidget
        │   │   └── LanguageToggle
        │   └── Main content
        └── Routes
            ├── / → Overview
            ├── /calendar → Calendar
            ├── /customers → Customers
            ├── /customers/:id → CustomerDetail
            ├── /appointments → Appointments
            ├── /services → ServiceCatalog
            ├── /payment → Payment
            ├── /employees → Employees
            ├── /locations → Locations
            ├── /locations/:id → LocationDetail
            ├── /website → Website
            ├── /settings → Settings
            ├── /relationships → Relationships
            ├── /permissions → PermissionBoard
            ├── /commission → Commission
            ├── /reports → Reports
            └── /feedback → Feedback
```

## State Management

### AuthContext
- Stores JWT token in `localStorage`
- Provides `user`, `permissions`, `hasPermission()`, `hasLocationAccess()`
- Dispatches `tgclinic:auth-change` event on login/logout

### LocationContext
- Listens for `tgclinic:auth-change`
- Sets `allowedLocations` from auth payload
- Auto-locks `selectedLocationId` when user has exactly 1 location
- Syncs with UI dropdown (`FilterByLocation`)

### Local Component State
- Forms use local state with validation
- Tables manage their own sort/pagination state

## Design System

### Colors
```javascript
const colors = {
  primary: '#7C3AED',     // Purple-600
  secondary: '#10B981',   // Emerald-500
  accent: '#F59E0B',      // Amber-500
  danger: '#EF4444',      // Red-500
  background: '#0F172A',  // Slate-900
  surface: '#1E293B',     // Slate-800
  text: '#F8FAFC',        // Slate-50
}
```

### Status Colors
- `pending` → Yellow
- `confirmed` → Blue
- `completed` → Green
- `cancelled` → Red
- `scheduled` → Purple
