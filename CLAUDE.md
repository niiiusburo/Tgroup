# TGroup — TG Clinic Dashboard

## Release Notes (MANDATORY)

Every time you bump the version or deploy a new build, you MUST update `website/public/CHANGELOG.json`:

1. Add a new entry at the TOP of the JSON array with:
   - `version`: the new semver version
   - `date`: today's date (YYYY-MM-DD)
   - `commit`: the git commit hash
   - `highlights`: one-line summary
   - `sections`: array of `{ title, items[] }` — use titles like "New Features", "Bug Fixes", "Removed", "Testing"
2. Bump the version in `website/package.json`
3. The VersionDisplay component (dev only) shows a "Release Notes" link in the tooltip that opens a modal reading from `/CHANGELOG.json`

## Admin Login Credentials

**For Playwright E2E tests and browser testing, always use:**
- Email: `tg@clinic.vn`
- Password: `123456`

Do NOT use old admin emails or any other email. This is the only admin account.

## Obsidian Brain

At session start, read project context from local Obsidian vault:
- `./notes/📋\ TGroup\ Project\ Overview.md` — Architecture, pages, tech stack
- `./notes/🏗️\ Architecture.md` — Detailed component architecture
- `./notes/📊\ Features\ Status.md` — All features tracker
- `./notes/🚀\ Deployment\ Guide.md` — VPS deploy workflow, Docker setup
- `./notes/💾\ Database\ Schema.md` — Database tables and relationships
- `./notes/🗓️\ YYYY-MM-DD.md` — Daily session notes

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
│   ├── App.jsx                 # Reference app from original TG Clinic
│   ├── components/             # Reference component specs
│   ├── constants/              # Reference constants
│   └── data/                   # Reference data structures
│
├── frontend-truth/             # Original TG Clinic frontend (ground truth for parity)
│   ├── app/                    # Built app with all original components
│   └── tech-spec.md            # Technical specification
│
├── features.json               # Feature tracker (20 features, all done)
├── .orchestrator/              # Agent Orchestrator config and DB
│   └── config.json             # Orchestrator settings (Claude agent, tracks)
└── web.jsx.backup              # Backup of original web app
```

## Database

**⚠️ LOCAL DEVELOPMENT USES PORT 5433 (HOMEBREW POSTGRES), NOT 55433.**

| Environment | URL | Port | How to start |
|-------------|-----|------|--------------|
| **Local dev (Mac)** | `postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo` | **5433** | `pg_ctl -D /opt/homebrew/var/postgresql@15 start` |
| Docker / VPS | `postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo` | 55433 | `docker compose up db` |

**CRITICAL:** The `api/.env` file must use **port 5433** for local development. Port 55433 is the Docker-mapped port and will fail with `ECONNREFUSED` if Docker is not running.

| Field | Local Dev Value |
|-------|-----------------|
| **URL** | `postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo` |
| **Host** | `127.0.0.1` |
| **Port** | **5433** |
| **Database** | `tdental_demo` |
| **User** | `postgres` |
| **Password** | `postgres` |
| **Data dir** | `/opt/homebrew/var/postgresql@15` |
| **Connect via CLI** | `PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo` |
| **Source SQL** | `website/demo_tdental_updated.sql` |

### Local DB Setup (One-time or after wipe)

```bash
# 1. Start Homebrew PostgreSQL
pg_ctl -D /opt/homebrew/var/postgresql@15 start

# 2. Create database
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -c "CREATE DATABASE tdental_demo;"

# 3. Load schema + seed data
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -f website/demo_tdental_updated.sql

# 4. Apply required migrations (the dump is older than these)
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -f api/migrations/013_add_employee_role_fields.sql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -f api/migrations/022_add_appointment_productid.sql
# ...apply any other newer migrations

# 5. Seed demo data (employees, customers, today's appointments)
node scripts/seed-demo-data.js
```

### Demo Data (After Seeding)

| Table | Count | Description |
|-------|-------|-------------|
| `dbo.companies` | 7 | Dental clinic branches (locations) |
| `dbo.partners` | 340 | All partners (40 customers + 300 employees/doctors) |
| `dbo.partners` (customer=true) | 40 | Active dental patients |
| `dbo.partners` (employee=true) | 300 | Employees including ~110 doctors |
| `dbo.appointments` | ~160 | Patient appointments |
| `dbo.appointments` (today) | 24 | Appointments seeded for the current calendar day |
| `dbo.employees` (view) | 300 | View mapping partners with employee=true |

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
cd website && npm run dev
# Open http://localhost:5175 (or http://localhost:5174 if explicitly set)
# Uses .env.development → API at localhost:3002
```

## Backend API

```bash
# Start API (connects to local dev DB on port 5433)
cd api && npm start
# Runs on http://localhost:3002
# Ensure api/.env has: DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo
```

| Endpoint | Data | Notes |
|----------|------|-------|
| `/api/Partners` | 40 customers | search, companyId filter |
| `/api/Partners/:id` | Single customer profile | All partner fields |
| `/api/Employees` | 300 employees | companyId, isDoctor filters |
| `/api/Appointments` | ~160 appointments | dateFrom/dateTo, state, partner_id, companyId |
| `/api/Companies` | 7 locations | All branches |
| `/api/SaleOrders` | Active | Real sale orders after seeding |
| `/api/Products` | Active | Service catalog |
| `/api/DashboardReports` | varies | Aggregation endpoint |

## Database

**Local development uses Homebrew PostgreSQL on port 5433. Docker port 55433 is for VPS only.**

```bash
# Start local PostgreSQL (Homebrew)
pg_ctl -D /opt/homebrew/var/postgresql@15 start

# Connect
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo

# Restore demo from scratch
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -c "CREATE DATABASE tdental_demo;"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -f website/demo_tdental_updated.sql
# Then apply migrations and seed data (see "Local DB Setup" above)
```

## GitHub

- **Repo:** `niiiusburo/Tgroup`
- **Branch:** `ai-develop`
- **Push:** `git push origin ai-develop`

## TODO: Apply Modular Card Scrolling to All Related Forms

### Status: PARTIAL (CustomerForm done)

All modular form components MUST follow the **independent card scrolling pattern** as implemented in `AddCustomerForm`.

### The Pattern

```
┌─────────────────────────────────────┐
│ Modal Container (flex, overflow-hidden, max-height)
│ ├── Header (flex-shrink-0)          │ ← Does NOT scroll
│ ├── Main Content (flex flex-1 overflow-hidden)
│ │   ├── Left Sidebar (flex flex-col gap-4 overflow-hidden)
│ │   │   ├── Card 1 (max-height: 300px, flex flex-col)
│ │   │   │   ├── Header (flex-shrink-0)  │ ← Does NOT scroll
│ │   │   │   └── Content (overflow-y-auto)│ ← Scrolls INDEPENDENTLY
│ │   │   ├── Card 2 (max-height: 320px, flex flex-col)
│ │   │   └── Card 3 (max-height: 180px, flex flex-col)
│ │   └── Right Panel (flex-1 flex flex-col overflow-hidden)
│ │       ├── Tabs (flex-shrink-0)     │ ← Does NOT scroll
│ │       └── Tab Content (overflow-y-auto) ← Scrolls INDEPENDENTLY
│ └── Footer (flex-shrink-0)          │ ← Does NOT scroll
└─────────────────────────────────────┘
```

### Key CSS Properties

| Element | Required CSS | Purpose |
|---------|-------------|---------|
| Card Container | `flex flex-col` + `max-height` | Fixed height container |
| Card Header | `flex-shrink-0` | Header stays visible |
| Card Content | `overflow-y-auto flex-1 min-h-0` | Content scrolls independently |
| Content Wrapper | `overflow-hidden` | Prevents entire panel scroll |

### Modules That Need This Pattern

| Module | File | Status |
|--------|------|--------|
| ✅ CustomerForm (Add/Edit) | `components/forms/AddCustomerForm/AddCustomerForm.tsx` | DONE |
| ⬜ AppointmentForm | `components/appointments/AppointmentForm.tsx` | TODO |
| ⬜ ServiceForm | `components/services/ServiceForm.tsx` | TODO |
| ⬜ PaymentForm | `components/payment/PaymentForm.tsx` | TODO |
| ⬜ EmployeeForm | `components/employees/EmployeeForm.tsx` | TODO |

### Reference Implementation

See: `~/Downloads/CardScrollRedesign/app/src/App.tsx`

### When Adding New Modular Forms

1. Use the `CardSection` component with `maxHeight` prop
2. Ensure headers have `flex-shrink-0`
3. Ensure content has `overflow-y-auto flex-1 min-h-0`
4. Add the `### CUSTOMER FORM MODULE` documentation block (copy from AddCustomerForm.tsx)
5. Test: Verify each card scrolls independently without affecting others

---

## Key Architecture Decisions

1. **Global LocationFilter** — `contexts/LocationContext.tsx` syncs "All Locations" dropdown across 7 pages (Overview, Customers, Calendar, Appointments, Employees, Services, Payment)
2. **@crossref comments** — Every component has `@crossref:used-in[...]` and `@crossref:uses[...]` comments tracking where it's used across the codebase
3. **tgclinic-api backend** — Express server at `/Users/thuanle/Documents/TamTMV/TamDental/tdental-api/` queries demo DB with `search_path=dbo`
4. **SQL views for missing tables** — 11 views created so the API routes work against the 3-table demo DB
5. **Auto-Update Version System** — App detects new deployments and prompts users to refresh (see `docs/VERSION_SYSTEM.md`)
6. **20 features** split across 5 categories: setup, dashboard, customers, services, admin

## Layout Locking — Protect Approved UI Decisions

### The Problem
When the user approves a UI design, future AI agents often "fix" or "improve" it, breaking what was already approved.

### The Solution
Add `⚠️ LAYOUT LOCK` comments in component files to mark approved designs. Any agent MUST NOT change locked elements without explicit user approval.

### Lock Format

```typescript
/**
 * ComponentName - Description
 * ...
 * ⚠️ LAYOUT LOCK: Do NOT change [specific element] without user approval.
 *    [Why it was locked, e.g., "User approved this exact size on 2024-04-08"]
 */
```

### Examples

#### PatientCard (PatientCheckIn.tsx)
```typescript
/**
 * ⚠️ LAYOUT LOCK: Do NOT add width/height constraints or truncate classes to PatientCard.
 *    Card content (customer name, doctor info, notes) MUST display fully without truncation.
 *    Any changes to card dimensions require explicit user approval.
 */
```

#### CardGrid (Example)
```typescript
/**
 * ⚠️ LAYOUT LOCK: Grid uses 4 columns at fixed widths.
 *    Changing grid-template-columns will break the approved card layout.
 *    User approved: "4 columns, each card min-width 180px" on 2024-04-08
 */
```

### Rules for Agents
1. **Read layout locks** — Check for `⚠️ LAYOUT LOCK` in component comments before making changes
2. **Do NOT auto-fix** — Never add `truncate`, `w-*`, `h-*`, `max-w-*`, or `min-w-*` to locked elements
3. **Ask first** — If you think a locked element needs fixing, describe the issue and ask for approval
4. **Respect final approval** — If user says "looks good" or "don't change this", add a layout lock immediately

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

- **Original TG Clinic (legacy):** `https://tamdentist.tdental.vn` (admin / 123123@)
- **Local replica:** `http://127.0.0.1:8899` (admin@tgclinic.vn / admin123) — requires Golden backend
- **VPS Deployed:** `http://76.13.16.68:5174` (admin@tgclinic.vn / admin123)

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

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
