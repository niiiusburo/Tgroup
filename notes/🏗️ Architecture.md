# TGroup Architecture

## Frontend Architecture

### Tech Stack
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **State Management:** React Context (LocationContext)

### Directory Structure

```
website/src/
├── App.tsx                 # Root: Router + LocationProvider
├── main.tsx               # Entry point
├── contexts/
│   └── LocationContext.tsx # Global location state
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
│   └── Relationships/
├── components/
│   ├── shared/            # Reusable across all pages
│   ├── modules/           # Dashboard-specific modules
│   ├── forms/             # Form components
│   ├── calendar/          # Calendar views
│   ├── payment/           # Payment-related
│   ├── locations/         # Location-specific
│   ├── employees/         # Employee-specific
│   └── relationships/     # Permission & entity
├── hooks/                 # Custom React hooks
├── data/                  # Mock data (replaced by API)
├── constants/             # Theme, colors, constants
└── lib/                   # Utilities
```

## Backend Architecture

### API Structure

```
api/
├── src/
│   ├── index.js          # Express server entry
│   ├── routes/           # API routes
│   ├── controllers/      # Route handlers
│   ├── services/         # Business logic
│   ├── models/           # Data models
│   └── db/               # Database connection
└── package.json
```

### Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/partners` | List partners (customers/doctors) |
| GET | `/api/partners/:id` | Get partner details |
| POST | `/api/partners` | Create partner |
| PUT | `/api/partners/:id` | Update partner |
| GET | `/api/appointments` | List appointments |
| POST | `/api/appointments` | Create appointment |
| GET | `/api/locations` | List locations (companies) |
| GET | `/api/services` | List services |

## Database Architecture

### PostgreSQL Schema

```
Database: tdental_demo

Tables:
├── dbo.companies          # Clinic branches
│   ├── id (uuid)
│   ├── name
│   ├── address
│   └── status
├── dbo.partners           # Customers & Employees
│   ├── id (uuid)
│   ├── name
│   ├── email
│   ├── phone
│   ├── customer (bool)
│   ├── employee (bool)
│   └── company_id (FK)
├── dbo.appointments       # Appointments
│   ├── id (uuid)
│   ├── partner_id (FK)
│   ├── doctor_id (FK)
│   ├── company_id (FK)
│   ├── appointment_date
│   ├── status
│   └── notes
└── dbo.services           # Dental services
    ├── id (uuid)
    ├── name
    ├── price
    └── duration
```

## Component Hierarchy

```
App
└── LocationProvider
    └── ReactRouter
        ├── Sidebar
        ├── Header
        └── Routes
            ├── / → Overview
            ├── /calendar → Calendar
            ├── /customers → Customers
            ├── /appointments → Appointments
            ├── /services → Services
            ├── /payment → Payment
            ├── /employees → Employees
            ├── /locations → Locations
            ├── /locations/:id → LocationDetail
            ├── /website → Website
            ├── /settings → Settings
            └── /relationships → Relationships
```

## State Management

### LocationContext
- Persists selected location across pages
- Filters data by location
- Syncs with URL query param (`?location=xxx`)

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
