# TGroup — TDental Dashboard

## Obsidian Brain

At session start, read project context from Obsidian vault:
- `~/obsidian-vault/thuan-brain/01-projects/tgroup/TGroup-Overview.md` — Architecture, pages, tech stack
- `~/obsidian-vault/thuan-brain/01-projects/tgroup/TGroup-Deployment.md` — VPS deploy workflow, Docker setup

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

**Connection URL:** `postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo`

| Field | Value |
|-------|-------|
| **URL** | `postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo` |
| **Host** | `127.0.0.1` |
| **Port** | `55433` |
| **Database** | `tdental_demo` |
| **User** | `postgres` |
| **Password** | `postgres` |
| **Docker container** | `tdental-demo` |
| **Source SQL** | `/Users/thuanle/Documents/TamTMV/TamDental/demo_tdental.sql` |
| **Connect via CLI** | `PGPASSWORD=postgres psql -h 127.0.0.1 -p 55433 -U postgres -d tdental_demo` |

### Demo Data

| Table | Count | Description |
|-------|-------|-------------|
| `dbo.companies` | 7 | Dental clinic branches (locations) |
| `dbo.partners` | 56 | All partners (30 customers + 19 doctors + 7 branches) |
| `dbo.partners` (customer=true) | 30 | Active dental patients |
| `dbo.partners` (employee=true) | 19 | Dentists reverse-engineered from appointment data |
| `dbo.appointments` | 120 | Patient appointments |
| `dbo.employees` (view) | 19 | View mapping partners with employee=true |
| 10 empty views | — | partnersources, agents, aspnetusers, dotkhams, saleorders, crmteams, customerreceipts, hrjobs, saleorderlines, accountpayments |

### Doctors (19, from dbo.partners where employee=true)

| Doctor | Location | Appointments |
|--------|----------|-------------|
| BS. Trang | Gò Vấp | 11 |
| BS. Trâm | Gò Vấp | 3 |
| BS. Ly | Gò Vấp | 2 |
| BS. Khánh | Gò Vấp | 1 |
| BS. Dương | Quận 10 | 9 |
| BS. Uyên | Quận 10 | 7 |
| BS. Ý | Quận 3 | 13 |
| BS. Duy | Quận 3 | 4 |
| BS. Dũng | Quận 3 | 1 |
| BS. Thu Thảo | Quận 7 | 15 |
| BS. Thảo | Thủ Đức | 7 |
| BS. Nga | Thủ Đức | 6 |
| BS. Quyên | Thủ Đức | 5 |
| BS. Quyên B | Thủ Đức | 3 |
| BS. Hà | Đống Đa | 5 |
| BS. Hải | Đống Đa | 4 |
| BS. Minh | Đống Đa | 2 |
| BS. Phương | Đống Đa | 1 |
| BS. Linh | Đống Đa | 1 |

### Locations (dbo.companies)

| Branch |
|--------|
| Nha khoa Tấm Dentist (HQ) |
| Tấm Dentist Gò Vấp |
| Tấm Dentist Quận 10 |
| Tấm Dentist Quận 3 |
| Tấm Dentist Quận 7 |
| Tấm Dentist Thủ Đức |
| Tấm Dentist Đống Đa |

### SQL Dump

- **Demo dump:** `website/demo_tdental_updated.sql` (includes doctors + views)
- **Original demo source:** `/Users/thuanle/Documents/TamTMV/TamDental/demo_tdental.sql`

## Environment Config

Vite loads env files by priority: `.env.{mode}.local` > `.env.{mode}` > `.env.local` > `.env`

| File | Purpose | Committed? |
|------|---------|-----------|
| `website/.env` | Shared keys (Google API key) | Yes |
| `website/.env.development` | Local dev: `VITE_API_URL=http://localhost:3002/api` | Yes |
| `website/.env.production` | VPS build: `VITE_API_URL=/api` (nginx proxies) | Yes |
| `website/.env.local` | Personal overrides (gitignored) | No |

**Rule:** Never hardcode IPs in committed env files. VPS IP is set via `docker-compose.yml` build arg `VITE_API_URL`.

## Dev Server

```bash
cd website && npx vite --port 5174
# Open http://localhost:5174
# Uses .env.development → API at localhost:3002
```

## Backend API

```bash
# Start API (connects to demo DB on port 55433)
cd /Users/thuanle/Documents/TamTMV/TamDental/tdental-api && node src/server.js
# Runs on http://localhost:3002
```

| Endpoint | Data | Notes |
|----------|------|-------|
| `/api/Partners` | 30 customers | search, companyId filter |
| `/api/Partners/:id` | Single customer profile | All 87 partner fields |
| `/api/Employees` | 19 doctors | companyId, isDoctor filters |
| `/api/Appointments` | 120 appointments | dateFrom/dateTo, state, partner_id, companyId |
| `/api/Companies` | 7 locations | All branches |
| `/api/SaleOrders` | 0 (empty view) | No sale orders in demo |
| `/api/Products` | error | productcategories table missing |
| `/api/DashboardReports` | varies | Aggregation endpoint |

## Database

```bash
# Start demo DB
docker start tdental-demo

# Connect
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55433 -U postgres -d tdental_demo

# Restore demo from scratch (includes 19 doctors + 11 SQL views)
docker run -d --name tdental-demo -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tdental_demo -p 55433:5432 postgres:16-alpine
sleep 5
docker exec -i tdental-demo psql -U postgres -d tdental_demo < website/demo_tdental_updated.sql
```

## GitHub

- **Repo:** `niiiusburo/Tgroup`
- **Branch:** `ai-develop`
- **Push:** `git push origin ai-develop`

## Key Architecture Decisions

1. **Global LocationFilter** — `contexts/LocationContext.tsx` syncs "All Locations" dropdown across 7 pages (Overview, Customers, Calendar, Appointments, Employees, Services, Payment)
2. **@crossref comments** — Every component has `@crossref:used-in[...]` and `@crossref:uses[...]` comments tracking where it's used across the codebase
3. **tdental-api backend** — Express server at `/Users/thuanle/Documents/TamTMV/TamDental/tdental-api/` queries demo DB with `search_path=dbo`
4. **SQL views for missing tables** — 11 views created so the API routes work against the 3-table demo DB
5. **Auto-Update Version System** — App detects new deployments and prompts users to refresh (see `docs/VERSION_SYSTEM.md`)
6. **20 features** split across 5 categories: setup, dashboard, customers, services, admin

## Version System

**Current Version:** `0.1.6` - Fixed React hooks error in VersionDisplay, version update working correctly

Auto-update notification system solves browser cache issues:

| Component | Location | Purpose |
|-----------|----------|---------|
| `VersionDisplay` | `components/shared/VersionDisplay.tsx` | Shows version in sidebar + update notifications |
| `useVersionCheck` | `hooks/useVersionCheck.ts` | Polls for updates every 5 minutes |
| `version.json` | `public/version.json` | Build metadata (version, git commit, build time) |
| `generate-version.js` | `scripts/generate-version.js` | Creates version.json at build time |

**CRITICAL: Update Version on Every Change**

To ensure the auto-update system works and users get the latest code, you MUST update the version number in `website/package.json` every time you make changes:

```bash
# Before building, update the version
# Open website/package.json and change:
# "version": "0.0.0" → "version": "0.0.1" (or higher)

# Semantic versioning guide:
# - Patch (0.0.1 → 0.0.2): Bug fixes, small tweaks
# - Minor (0.0.2 → 0.1.0): New features, components
# - Major (0.1.0 → 1.0.0): Breaking changes, architecture shifts
```

**Build Process:**
```bash
cd website

# 1. Update version in package.json
# 2. Build (automatically generates version.json with git info)
npm run build

# 3. Deploy dist/ folder
```

**How Users Get Updates:**
1. User has version `v0.0.1 (abc1234)` running
2. You deploy version `v0.0.2 (def5678)`
3. App detects version change within 5 minutes
4. Sidebar shows: "Update Available" + "Update Now" button
5. User clicks button → page reloads with new code
6. No more "hard refresh" or "clear cache" needed!

**Features:**
- Version shows as `v0.0.0 (abc1234)` in sidebar footer
- Green checkmark = up to date
- Orange notification = update available
- Hover for detailed build info (timestamp, git branch)
- Click version to manually check for updates

## VPS Access (TEMPORARY - REMOVE AFTER FIX)

**SSH Credentials for 76.13.16.68:**
```
ssh root@76.13.16.68
Password: Tamyeu@234@234
```

**Backend Location:** `/root/tdental-api/`
**Start Command:** `cd /root/tdental-api && pm2 start src/server.js --name tdental-api`

---

## Reference Sites

- **Original TDental:** `https://tamdentist.tdental.vn` (admin / 123123@)
- **Local replica:** `http://127.0.0.1:8899` (admin@tdental.vn / admin123) — requires Golden backend
- **VPS Deployed:** `http://76.13.16.68:5174` (admin@tdental.vn / admin123)

## What's Connected vs Mock

### Connected to real DB
- Customer list, search, create, profile view
- Appointment list, search, create, calendar views
- Employee/doctor list with location filter
- Dashboard stats (patient count, appointment count)
- Revenue chart (real appointment counts by month)
- Location list and global location filter on all 7 pages
- FilterByDoctor uses real doctors from API

### Still using mock data (no DB tables)
- Customer photos, deposits, service history
- Payment wallets and installment plans
- Service Catalog (Products table missing)
- Settings (all 4 tabs)
- Relationships / Permission matrix
- Commission, Reports, Notifications (placeholder pages)
- Notification panel on dashboard
