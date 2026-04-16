# AUDIT: Codebase vs Obsidian Notes — 2026-04-15

## Executive Summary
**Significant drift detected.** The Obsidian notes describe an earlier state of the project that has diverged in architecture, scale, and deployment setup. Several directories, ports, and data counts no longer match reality.

---

## 1. Project Scale & Data (HIGH DRIFT)

### Database Record Counts
| Entity | Obsidian Claim | **Actual** | Status |
|--------|---------------|------------|--------|
| `partners` | 56 | **370** | 🔴 **6.6× larger** |
| `appointments` | 120 | **259** | 🔴 **2.2× larger** |
| `products` (services) | ~20+ | **162** | 🔴 **8× larger** |
| `saleorders` | 0 | **47** | 🔴 Now has data |
| `customerreceipts` | 0 | **0** | 🟢 Matches |
| employees | 28 | **319** | 🔴 **11.4× larger** |

**Impact:** The notes describe "demo data" scale. Production-scale data is now present. Permissions, performance, and UX assumptions in the notes are based on a much smaller dataset.

---

## 2. Frontend Structure

### Pages — MOSTLY MATCH
Obsidian lists **14 pages**. All exist in `website/src/pages/`:
- ✅ Overview, Calendar, Customers, Appointments, Services, Payment, Employees, Locations, Website, Settings, Relationships
- Plus: Login, Commission, Reports (with 6 sub-pages), Feedback, PermissionBoard

**Discrepancy:** The actual app has **more than 14 pages**. Missing from Obsidian:
- `Login.tsx`
- `Commission.tsx`
- `Reports.tsx` + 6 sub-routes
- `Feedback.tsx`
- `PermissionBoard/` directory

### Shared Components — MOSTLY MATCH
All 7 listed shared components exist in `website/src/components/shared/`:
- ✅ SearchBar, DataTable, StatusBadge, FilterByLocation, CustomerSelector, DoctorSelector, LocationSelector

### Module Components — MATCH
All 3 listed module components exist:
- ✅ StatCardModule, RevenueChartModule, TodaySchedule

### Component Directories — PARTIAL MISMATCH
Obsidian claims these component folders exist:
- `calendar/` ✅ Exists
- `payment/` ✅ Exists
- `locations/` ✅ Exists
- `employees/` ✅ Exists
- `relationships/` ✅ Exists
- `forms/` ⚠️ **Nearly empty** (only `AddCustomerForm/MiniAddDialog.tsx`)
- `shared/` ✅ Exists and is very large (33 files)

**Missing from Obsidian:** `customer/`, `reports/`, `settings/`, `appointments/`, `ui/`, `debug/`, `website/`

---

## 3. Backend Architecture (MAJOR MISMATCH)

Obsidian describes this backend structure:
```
api/src/index.js          # Express server entry
api/src/routes/           # API routes
api/src/controllers/      # Route handlers
api/src/services/         # Business logic
api/src/models/           # Data models
api/src/db/               # Database connection
```

### Actual backend structure:
- `api/src/server.js` — **NOT** `index.js` 🔴
- `api/src/routes/` — ✅ Exists (39 route files)
- `api/src/controllers/` — **DOES NOT EXIST** 🔴
- `api/src/services/` — ✅ Exists (but small, only 3 files)
- `api/src/models/` — **DOES NOT EXIST** 🔴
- `api/src/db/` — **DOES NOT EXIST** 🔴 (`db.js` sits directly in `api/src/`)

**Impact:** The backend is **not MVC**. It's flat Express with routes + a single `db.js`. Controllers and models were never implemented as documented.

### API Endpoints — PARTIAL MISMATCH
Obsidian lists these endpoints:
| Endpoint | Status |
|----------|--------|
| `GET /api/partners` | ✅ Exists |
| `GET /api/partners/:id` | ✅ Exists |
| `POST /api/partners` | ✅ Exists |
| `PUT /api/partners/:id` | ✅ Exists |
| `GET /api/appointments` | ✅ Exists |
| `POST /api/appointments` | ✅ Exists |
| `GET /api/locations` | ⚠️ Actually `GET /api/companies` |
| `GET /api/services` | ⚠️ Actually `GET /api/products` |

**Nomenclature mismatch:** The frontend says "services" and "locations" but the API uses `/api/products` and `/api/companies`.

---

## 4. Database Schema Discrepancies

### Missing Table: `dbo.services`
Obsidian documents a `services` table. **It does not exist.** The actual table is `dbo.products` (162 records). 🔴

### Views
Obsidian documents `dbo.employees` as a view. It **does exist** in the schema, but the notes say it has 28 rows. It actually reflects all 319 employees with `employee=true`. 🔴

### Empty Tables — OUT OF DATE
Obsidian lists these as "Not Yet Used":
- `partnersources`
- `agents`
- `aspnetusers`
- `dotkhams`
- `crmteams`
- `saleorderlines`
- `accountpayments`

**Actual status:**
- `dotkhams` — **Now has a full table + steps table** (`dotkhamsteps`) 🔴
- `saleorderlines` — **Now has data** (linked to 47 saleorders) 🔴
- `crmteams` — Still a view stub ✅
- `agents` — Still a view stub ✅
- `accountpayments` — Still a view stub ✅
- `partnersources` / `aspnetusers` — Appear unused ✅

### New Tables NOT in Obsidian
These 20+ tables exist but are undocumented:
- `employee_permissions`, `employee_location_scope`, `permission_groups`, `permission_overrides`, `group_permissions`
- `feedback_threads`, `feedback_messages`, `feedback_attachments`
- `monthlyplans`, `monthlyplan_items`, `planinstallments`
- `payments`, `payment_allocations`, `payment_proofs`
- `hrjobs`, `hrpayslips`
- `systempreferences`, `company_bank_settings`, `websitepages`
- `receipt_sequences`, `stockPickings`
- `face_recognition` related (via `compreface` services in docker-compose)

---

## 5. Deployment Guide — SEVERELY OUT OF DATE

### Critical Discrepancies

| Claim | Actual | Severity |
|-------|--------|----------|
| `docker-compose up -d` starts PostgreSQL on `55433` | Local dev uses **Homebrew Postgres on `5433`** | 🔴 High |
| API runs on port `3001` | API `.env` says `PORT=3002` | 🔴 High |
| Web container exposes port `3000` | **No port mapping in docker-compose** for web | 🔴 High |
| Nginx service in docker-compose | **Does NOT exist** | 🔴 High |
| `scripts/deploy-vps.sh` mandatory per AGENTS.md | **Only `scripts/deploy-tbot.sh` exists** | 🔴 High |
| SSL / Let's Encrypt instructions | No certbot or SSL automation found | 🟡 Medium |

### Docker-Compose Reality Check
Actual services in `docker-compose.yml`:
1. `db` — Postgres
2. `api` — Node backend (port 3002)
3. `compreface-postgres-db` — Face recognition DB
4. `compreface-api` — Face recognition API
5. `compreface-core` — Face recognition core
6. `web` — Vite frontend (no host port exposed!)
7. Named volumes only

**Missing:** nginx container, SSL certs, reverse proxy, VPS deploy script.

---

## 6. Tech Stack — MOSTLY ACCURATE

| Layer | Claim | Actual | Status |
|-------|-------|--------|--------|
| Frontend | React 18, TS, Tailwind, Vite | ✅ Correct | 🟢 |
| Backend | Node.js API (Express), PostgreSQL | ✅ Correct | 🟢 |
| Database | PostgreSQL | ✅ Correct | 🟢 |
| Testing | Playwright (E2E), Vitest (unit) | ✅ Correct | 🟢 |
| Container | Docker, Docker Compose | ⚠️ Partial — local dev mostly bypasses Docker | 🟡 |

---

## 7. Features Tracker — CLAIMS vs REALITY

`features.json` says **all 20 features are Done** (session 2026-04-07).

### Verified Status
- ✅ Core scaffold, shared components, selectors — Done
- ✅ Overview dashboard — Done
- ✅ Calendar day/week/month + creation — Done
- ✅ Customer list, search, detail, edit — Done
- ✅ Appointments list, filters, creation, status — Done
- ✅ Service catalog, pricing — Done (uses `/products`)
- ✅ Payment overview, deposits, plans, history — Done
- ✅ Employee list, profile — Done
- ✅ Multi-location management — Done

### Unlisted but Implemented Features
These exist in the codebase but are **not in the 20-feature tracker**:
- **Permission System** (`PermissionBoard`, `permission_groups`, RBAC) — Major feature, unlisted
- **Feedback System** (`feedback_threads`, admin UI, widget) — Unlisted
- **Face Recognition** (`compreface` integration, `faceRecognition.js`) — Unlisted
- **Reports Module** (6 sub-reports with charts) — Unlisted
- **Commission Module** — Unlisted
- **Version Check / Force Update** (`useVersionCheck.ts`) — Unlisted
- **IP Access Control** (`useIpAccessControl.ts`) — Unlisted
- **Bank Settings / VietQR** — Unlisted
- **Website CMS** (pages, SEO) — Listed as Feature 9 but not in the 20-tracker

---

## 8. Commands — PARTIALLY WRONG

| Command | Claim | Actual | Status |
|---------|-------|--------|--------|
| `cd api && npm run dev` | Starts backend | **Script does NOT exist** in `api/package.json` | 🔴 |
| `docker-compose up -d` | Starts Postgres | Starts **5 services** including Compreface face-recognition stack | 🟡 |
| `npx playwright test` | E2E tests | ✅ Works | 🟢 |

**Available API scripts:** `start`, `migrate-customer`, `test`
**How to actually run API dev:** `cd api && npm start` or `node src/server.js`

---

## 9. Auth / Security Model — NOT DOCUMENTED

Obsidian has **zero mention** of:
- JWT authentication
- `password_hash` on `partners`
- `permission_groups` / RBAC
- `employee_permissions`
- `requireAuth` middleware
- `LocationContext` scoping

These are all **major production features** that were added after the notes were written.

---

## 10. Recommendations

### Immediate (High Priority)
1. **Update Database Schema note** — Replace `services` with `products`, add all new tables, correct counts.
2. **Rewrite Deployment Guide** — Document actual `docker-compose.yml` (no nginx, Compreface added), correct ports (`5433` local, `3002` API), and create `scripts/deploy-vps.sh` if VPS deploys are needed.
3. **Fix Backend Architecture note** — Remove `controllers/`, `models/`, `db/` folders. Document flat Express structure.

### Medium Priority
4. **Expand Features Tracker** — Add Permission System, Feedback, Reports, Commission, Face Recognition, Version Check, IP Access Control, Bank/VietQR.
5. **Update Project Overview counts** — Partners (370), Employees (319), Appointments (259), Products (162).
6. **Document Auth & Permissions** — Add a dedicated note for JWT + RBAC + location scoping.

### Low Priority
7. **Clean up empty/obsolete folders** — `website/src/components/forms/` is nearly empty; either populate or remove from architecture docs.

---

*Audit generated by Pi agent on 2026-04-15*
