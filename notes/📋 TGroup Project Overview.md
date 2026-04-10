# TGroup — TG Clinic Dashboard

## Project Overview

TGroup is a **multi-location dental clinic management dashboard** built with React + TypeScript + Tailwind. It replaces the legacy `web.jsx` app with a modern, maintainable architecture.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite |
| **Backend** | Node.js API (Express), PostgreSQL |
| **Database** | PostgreSQL @ `127.0.0.1:55433` |
| **Container** | Docker, Docker Compose |
| **Testing** | Playwright (E2E), Vitest (unit) |

## Project Structure

```
Tgroup/
├── website/                    # Frontend (React + TypeScript + Tailwind + Vite)
│   ├── src/
│   │   ├── App.tsx             # Router + LocationProvider wrapper
│   │   ├── contexts/           # Global state (LocationContext)
│   │   ├── pages/              # 14 page components
│   │   ├── components/
│   │   │   ├── shared/         # Global reusable components
│   │   │   ├── modules/        # Dashboard modules
│   │   │   ├── forms/          # Form components
│   │   │   ├── calendar/       # Calendar views
│   │   │   ├── payment/        # Payment components
│   │   │   ├── locations/      # Location components
│   │   │   ├── employees/      # Employee components
│   │   │   └── relationships/   # Permission & entity mapping
│   │   ├── hooks/              # Custom hooks
│   │   ├── data/               # Mock data (→ real DB)
│   │   └── lib/                # Utilities
│   └── package.json
│
├── api/                        # Backend API (Express + PostgreSQL)
├── blueprint/                  # Architecture docs & reference
├── frontend-truth/             # Original TG Clinic (ground truth)
├── docs/                       # Generated documentation
└── features.json               # Feature tracker (20 features)
```

## Pages (14 total)

1. **Overview** — Dashboard with stats, today's schedule, revenue chart
2. **Calendar** — Day/Week/Month views with appointments
3. **Customers** — Patient management
4. **Appointments** — Appointment booking & management
5. **Services** — Dental services catalog
6. **Payment** — Deposits, wallets, payment plans
7. **Employees** — Staff management
8. **Locations** — Multi-branch management
9. **Website** — CMS for public pages
10. **Settings** — App configuration
11. **Relationships** — Permission matrix & entity map

## Key Components

### Shared Components (`src/components/shared/`)
- `SearchBar` — Debounced search input
- `DataTable` — Sortable, paginated tables
- `StatusBadge` — Colored status indicators
- `FilterByLocation` — Location dropdown filter
- `CustomerSelector` — Searchable customer dropdown
- `DoctorSelector` — Employee/doctor dropdown
- `LocationSelector` — Branch selector

### Module Components (`src/components/modules/`)
- `StatCardModule` — Metric display card
- `RevenueChartModule` — Revenue visualization
- `TodaySchedule` — Appointment timeline

## Database Schema

**Connection:** `postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo`

### Key Tables
| Table | Count | Purpose |
|-------|-------|---------|
| `dbo.companies` | 7 | Clinic branches/locations |
| `dbo.partners` | 56 | Customers + doctors |
| `dbo.appointments` | 120 | Patient appointments |

### Demo Credentials
- **Admin:** `tg@clinic.vn` / `123456`

## Commands

```bash
# Frontend
cd website && npm install && npm run dev

# Backend
cd api && npm install && npm run dev

# Database
docker-compose up -d  # Starts PostgreSQL

# E2E Tests
npx playwright test
```

## Status

- ✅ 20 features planned
- ✅ All features implemented
- 🔄 Active development and refinement
