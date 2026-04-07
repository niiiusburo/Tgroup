# TGroup — TDental Dashboard

## Project Map

```
Tgroup/
├── website/                    # Frontend (React + TypeScript + Tailwind + Vite)
│   ├── src/
│   │   ├── App.tsx             # Router + LocationProvider wrapper
│   │   ├── contexts/           # Global state (LocationContext)
│   │   ├── pages/              # 14 page components
│   │   ├── components/
│   │   │   ├── shared/         # Global reusable (SearchBar, DataTable, StatusBadge, FilterByLocation, Selectors)
│   │   │   ├── modules/        # Dashboard modules (StatCard, RevenueChart, TodaySchedule)
│   │   │   ├── forms/          # Form components (AddCustomerForm)
│   │   │   ├── calendar/       # Calendar views (Day, Week, Month, TimeSlot)
│   │   │   ├── payment/        # Payment components (DepositWallet, PaymentForm, MonthlyPlan)
│   │   │   ├── locations/      # Location components (LocationCard, LocationDetail, LocationDashboard)
│   │   │   ├── employees/      # Employee components (EmployeeTable, EmployeeProfile, TierSelector)
│   │   │   ├── relationships/  # PermissionMatrix, EntityRelationshipMap
│   │   │   └── website/        # CMS components (PageEditor, PageList, SEOManager)
│   │   ├── hooks/              # Custom hooks (useCustomers, usePayment, useLocations, etc.)
│   │   ├── data/               # Mock data files (will be replaced by real DB queries)
│   │   ├── constants/          # App constants and theme colors
│   │   └── lib/                # Utilities
│   ├── package.json
│   └── vite.config.ts
│
├── blueprint/                  # Architecture & design docs
│   ├── BUTTON_MAP.md           # All buttons, filters, interactive elements mapped across pages
│   ├── App.jsx                 # Reference app from original TDental
│   ├── components/             # Reference component specs
│   ├── constants/              # Reference constants
│   └── data/                   # Reference data structures
│
├── frontend-truth/             # Original TDental frontend (ground truth for parity)
│   ├── app/                    # Built app with all original components
│   └── tech-spec.md            # Technical specification
│
├── features.json               # Feature tracker (20 features, all done)
├── .orchestrator/              # Agent Orchestrator config and DB
│   └── config.json             # Orchestrator settings (Claude agent, tracks)
└── web.jsx.backup              # Backup of original web app
```

## Database

**Active database:** Demo TDental PostgreSQL
- **Host:** `127.0.0.1`
- **Port:** `55433`
- **Database:** `tdental_demo`
- **User:** `postgres`
- **Password:** `postgres`
- **Docker container:** `tdental-demo`
- **Source SQL:** `/Users/thuanle/Documents/TamTMV/TamDental/demo_tdental.sql`

### Demo Data

| Table | Count | Description |
|-------|-------|-------------|
| `dbo.companies` | 7 | Dental clinic branches (locations) |
| `dbo.partners` | 37 | All partners (customers + others) |
| `dbo.partners` (customer=true) | 30 | Active dental patients |
| `dbo.appointments` | 120 | Patient appointments |

### Locations (dbo.companies)

| Branch |
|--------|
| Nha khoa Tam Dentist (HQ) |
| Tam Dentist Go Vap |
| Tam Dentist Quan 10 |
| Tam Dentist Quan 3 |
| Tam Dentist Quan 7 |
| Tam Dentist Thu Duc |
| Tam Dentist Dong Da |

### Full Production Database (available but not active)

- **Dump:** `/Users/thuanle/Documents/TamTMV/Tdental-portable-20260309/Golden/database/tdental-portable-20260309.dump` (932MB)
- **Tables:** 398
- **Schema reference:** `/Users/thuanle/Documents/TamTMV/Tdental-portable-20260309/Golden/database/table_map.md`
- **Key counts:** 214,900 appointments, 113,622 account moves, 373 employees

## Dev Server

```bash
cd website && npx vite --port 5173
# Open http://localhost:5173
```

## Database

```bash
# Start demo DB
docker start tdental-demo

# Connect
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55433 -U postgres -d tdental_demo

# Restore demo from scratch
docker run -d --name tdental-demo -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tdental_demo -p 55433:5432 postgres:16-alpine
sleep 5
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55433 -U postgres -d tdental_demo < /Users/thuanle/Documents/TamTMV/TamDental/demo_tdental.sql
```

## GitHub

- **Repo:** `niiiusburo/Tgroup`
- **Branch:** `ai-develop`
- **Push:** `git push origin ai-develop`

## Key Architecture Decisions

1. **Global LocationFilter** — `contexts/LocationContext.tsx` syncs "All Locations" dropdown across 7 pages (Overview, Customers, Calendar, Appointments, Employees, Services, Payment)
2. **@crossref comments** — Every component has `@crossref:used-in[...]` and `@crossref:uses[...]` comments tracking where it's used across the codebase
3. **Mock data → Real DB migration** — `data/mock*.ts` files will be replaced with API calls to the PostgreSQL database
4. **20 features** split across 5 categories: setup, dashboard, customers, services, admin

## Reference Sites

- **Original TDental:** `https://tamdentist.tdental.vn` (admin / 123123@)
- **Local replica:** `http://127.0.0.1:8899` (admin@tdental.vn / admin123) — requires Golden backend

## Next Steps

- [ ] Connect frontend to real PostgreSQL demo database (replace mock data)
- [ ] Map database schema columns to frontend component props
- [ ] Build API layer between React frontend and PostgreSQL
- [ ] Ensure all 7 locations from DB match the FilterByLocation dropdown
