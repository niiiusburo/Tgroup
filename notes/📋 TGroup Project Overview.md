# TGroup — TG Clinic Dashboard

## Project Overview

TGroup is a **multi-location dental clinic management dashboard** built with React + TypeScript + Tailwind. It replaces the legacy `web.jsx` app with a modern, maintainable architecture.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite |
| **Backend** | Node.js API (Express), PostgreSQL |
| **Database** | PostgreSQL @ `127.0.0.1:5433` (Homebrew) |
| **Container** | Docker, Docker Compose |
| **Testing** | Playwright (E2E), Vitest (unit) |

## Project Structure

```
Tgroup/
├── website/                    # Frontend (React + TypeScript + Tailwind + Vite)
│   ├── src/
│   │   ├── App.tsx             # Router + LocationProvider wrapper
│   │   ├── contexts/           # Global state (LocationContext, AuthContext)
│   │   ├── pages/              # 14+ page components
│   │   ├── components/
│   │   │   ├── shared/         # Global reusable components
│   │   │   ├── modules/        # Dashboard modules
│   │   │   ├── appointments/   # Appointment components
│   │   │   ├── calendar/       # Calendar views
│   │   │   ├── customer/       # Customer/profile components
│   │   │   ├── payment/        # Payment components
│   │   │   ├── locations/      # Location components
│   │   │   ├── employees/      # Employee components
│   │   │   ├── relationships/  # Permission & entity mapping
│   │   │   ├── reports/        # Report components
│   │   │   ├── settings/       # Settings forms
│   │   │   ├── website/        # CMS components
│   │   │   ├── debug/          # Debug tools (PermissionDebugger)
│   │   │   └── ui/             # Low-level UI primitives
│   │   ├── hooks/              # Custom hooks
│   │   ├── data/               # Mock data (legacy)
│   │   └── lib/                # API clients + utilities
│   └── package.json
│
├── api/                        # Backend API (Express + PostgreSQL)
│   ├── src/
│   │   ├── server.js           # Express entry point
│   │   ├── routes/             # 39 API route modules
│   │   ├── services/           # Small business-logic layer
│   │   ├── middleware/         # Auth, permission, IP access
│   │   └── db.js               # PostgreSQL pool connection
│   └── package.json
│
├── blueprint/                  # Architecture docs & reference
├── frontend-truth/             # Original TG Clinic (ground truth)
├── docs/                       # Generated documentation
├── scripts/                    # Deployment & utility scripts
├── notes/                      # Obsidian knowledge base
└── features.json               # Feature tracker
```

## Pages

### Core Pages (14)
1. **Overview** — Dashboard with stats, today's schedule, revenue chart
2. **Calendar** — Day/Week/Month views with appointments
3. **Customers** — Patient management + detail view
4. **Appointments** — Appointment booking & management
5. **ServiceCatalog** — Dental services catalog (uses `/api/products`)
6. **Payment** — Deposits, wallets, payment plans, receipts
7. **Employees** — Staff management
8. **Locations** — Multi-branch management
9. **Website** — CMS for public pages
10. **Settings** — App configuration
11. **Relationships** — Permission matrix & entity map
12. **Commission** — Commission tracking
13. **Reports** — Dashboard + revenue + appointments + doctors + customers + locations
14. **Feedback** — Feedback widget admin

### Auth Pages
- **Login** — JWT-based authentication

## Key Components

### Shared Components (`src/components/shared/`)
- `SearchBar` — Debounced search input
- `DataTable` — Sortable, paginated tables
- `StatusBadge` — Colored status indicators
- `FilterByLocation` — Location dropdown filter
- `CustomerSelector` — Searchable customer dropdown
- `DoctorSelector` — Employee/doctor dropdown
- `LocationSelector` — Branch selector
- `ChangePasswordModal` — Self-service password change

### Module Components (`src/components/modules/`)
- `StatCardModule` — Metric display card
- `RevenueChartModule` — Revenue visualization
- `TodaySchedule` — Appointment timeline

## Database Schema

**Connection (local dev):** `postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo`

### Key Tables
| Table | Count | Purpose |
|-------|-------|---------|
| `dbo.companies` | 7 | Clinic branches/locations |
| `dbo.partners` | 370 | Customers + employees |
| `dbo.appointments` | 259 | Patient appointments |
| `dbo.products` | 162 | Dental services catalog |
| `dbo.saleorders` | 47 | Treatment plans |
| `dbo.saleorderlines` | ~ | Order line items |
| `dbo.payments` | ~ | Payments |
| `dbo.monthlyplans` | ~ | Payment plans |
| `dbo.employees` (view) | 319 | Active employee view |

### Permission System Tables
- `dbo.permission_groups` — Role definitions
- `dbo.group_permissions` — Role-to-permission mappings
- `dbo.employee_permissions` — User-to-role assignments
- `dbo.permission_overrides` — Individual grant/revoke exceptions
- `dbo.employee_location_scope` — User location access control

## Demo Credentials
- **Admin:** `tg@clinic.vn` / `123456`

## Commands

```bash
# Frontend dev server (port 5174)
cd website && npm install && npm run dev

# Backend dev server (port 3002)
cd api && npm install && npm start

# Database (Homebrew PostgreSQL)
brew services start postgresql@15

# Full Docker stack (includes Compreface face recognition)
docker-compose up -d

# E2E Tests
npx playwright test

# Unit Tests
cd website && npx vitest run
cd api && npm test
```

## Status

- ✅ 20 core features planned
- ✅ All core features implemented
- ✅ Permission system (RBAC) live
- ✅ Feedback system live
- ✅ Face recognition (Compreface) integrated
- 🔄 Active development and refinement
