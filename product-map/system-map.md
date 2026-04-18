# TGroup System Map

> Architecture overview and dependency governance framework for the TG Clinic dashboard.

## 1. Top-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER BROWSER                                                               │
│  (Vite React SPA)                                                           │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  VPS HOST (Docker Compose)                                                  │
│  ┌──────────────┐  nginx.conf  ┌─────────────────────────────────────────┐  │
│  │   NGINX      │──────────────►│  tgroup-web (static Vite build)       │  │
│  │   (443/80)   │               │  container                            │  │
│  └──────┬───────┘               └─────────────────────────────────────────┘  │
│         │                                                                  │
│         │ /api  ─────────────────► tgroup-api (Node/Express)               │
│         │ /uploads/feedback ─────► tgroup-api (static serve)               │
│         │                                                                  │
│         │                        ┌─────────────────────────────────────┐   │
│         └───────────────────────►│  tgroup-db (PostgreSQL 16)          │   │
│                                  │  search_path=dbo                    │   │
│                                  └─────────────────────────────────────┘   │
│                                                                            │
│  Optional: compreface-api + compreface-core + compreface-postgres-db       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Major Apps / Modules / Packages

| Package | Path | Responsibility |
|---------|------|----------------|
| **website** | `website/` | React 18 + Vite frontend. All UI, routing, hooks, API clients. |
| **api** | `api/` | Express 5 backend. 39 route modules, auth middleware, shared `db.js`. |
| **db (container)** | `docker-compose.yml` | PostgreSQL 16 with `dbo` schema. |
| **scripts** | `scripts/` | Deploy, E2E dev orchestration, one-off SQL migrations. |

### Frontend Sub-modules

| Sub-module | Path | Responsibility |
|------------|------|----------------|
| Pages | `website/src/pages/` | 14 top-level routes + nested reports |
| Shared Components | `website/src/components/shared/` | DataTable, Selectors, SearchBar, FilterByLocation |
| Domain Components | `website/src/components/{appointments,calendar,customer,payment,...}/` | Feature-specific React components |
| API Clients | `website/src/lib/api/` | Typed `apiFetch` wrappers per domain |
| Contexts | `website/src/contexts/` | AuthContext, LocationContext, TimezoneContext |
| Hooks | `website/src/hooks/` | Data-fetching and UI logic hooks |
| Types | `website/src/types/` | Shared TypeScript interfaces |
| i18n | `website/src/i18n/` | `react-i18next` with `en` + `vi` namespaces |

### Backend Sub-modules

| Sub-module | Path | Responsibility |
|------------|------|----------------|
| Routes | `api/src/routes/` | 39 Express route files (no separate controllers) |
| Middleware | `api/src/middleware/` | JWT validation (`auth.js`), permission checks |
| Services | `api/src/services/` | Only `comprefaceClient.js` (thin layer) |
| DB | `api/src/db.js` | Single `pg` Pool instance exported to all routes |

## 3. Key Integration Points

### 3.1 API Contract Surface
- **Base URL:** `VITE_API_URL` → `http://localhost:3002/api` (dev) or `/api` (production Docker)
- **Auth:** `Authorization: Bearer <JWT>` on every `/api/*` call except `/api/Auth/login`
- **Camel↔Snake:** `apiFetch` in `website/src/lib/api/core.ts` auto-converts camelCase query params to snake_case for backend compatibility.

### 3.2 Cross-Cutting Events
- **`tgclinic:auth-change`** CustomEvent dispatched by `AuthContext` on login/logout.
  - Consumer: `LocationContext` (locks filter when single-location scope).

### 3.3 Permission Enforcement
- **Frontend:** `ProtectedRoute` in `App.tsx` maps paths to permission strings.
- **Backend:** `requirePermission(permission)` middleware re-resolves effective permissions on every guarded request.

### 3.4 Shared Table Hazards
- **`dbo.partners`** stores **both customers and employees** (SMI via `customer`, `employee` boolean flags).
  - High blast radius: schema changes affect Customers, Employees, Auth, Face Recognition, Payments, Appointments.
- **`dbo.products`** stores **services catalog** (legacy name from Odoo).
  - Frontend calls them "services"; backend table is `products`.

## 4. High-Blast-Radius Modules

| Module | Why High Blast Radius |
|--------|----------------------|
| `api/src/db.js` | Single Pool shared by all 39 routes. Failure here kills the entire API. |
| `api/src/middleware/auth.js` | Guards every non-public route; JWT logic and permission resolution duplicated in `auth.js` and `auth.js` route. |
| `website/src/lib/api/core.ts` | Every API call flows through here. Camel/snake conversion errors break all query params. |
| `website/src/contexts/AuthContext.tsx` | Drives login state, permission guards, and dispatches `tgclinic:auth-change`. |
| `website/src/contexts/LocationContext.tsx` | Filters every list view; consumed by hooks across all pages. |
| `website/src/constants/index.ts` | Contains `ROUTES`, `APPOINTMENT_CARD_COLORS`, `APPOINTMENT_STATUS_OPTIONS`. Changes ripple to UI, types, and tests. |
| `dbo.partners` | Shared by Customers, Employees, Auth, Face Recognition, Payments, Reports. |

## 5. Risky Coupling Areas

### 5.1 Permission Resolution Duplication
- `requirePermission()` in `api/src/middleware/auth.js` resolves effective permissions per request.
- `resolvePermissions()` in `api/src/routes/auth.js` resolves the same effective set for login/me.
- **Risk:** Divergent logic (e.g., one honors `*` wildcard, the other forgets) causes login success but route 403s.

### 5.2 CamelCase ↔ SnakeCase Translation
- `apiFetch` converts query params to snake_case using a hardcoded passthrough set (`CAMEL_CASE_PASSTHROUGH`).
- **Risk:** Adding a new query param with camelCase that is not in the passthrough set will send snake_case to the backend, which may ignore it silently.

### 5.3 Frontend Routing Mismatch
- `/website` route in `App.tsx` renders `<ServiceCatalog />`, not a website CMS page.
- The actual CMS is at `/website` in the nav label but uses `ServiceCatalog` component.
- `/services` page handles patient treatment records.
- **Risk:** Naming confusion during refactors.

### 5.4 Dead Backend Route
- `api/src/routes/services.js` mounts at `/api/Services` but queries `public.services` (non-existent table).
- Frontend uses `/api/Products` and `/api/SaleOrders` instead.
- **Risk:** Accidental revival or copy-paste from this file will cause runtime SQL errors.

### 5.5 E2E ↔ Local Port Coupling
- E2E auth-setup spec hardcodes `localhost:5174` (recently temporarily changed to `5175` for VPS sync testing).
- **Risk:** Port changes in Vite or Docker require manual E2E updates.

## 6. Stale / Duplicate / Shadow / Legacy Files

| File/Folder | Issue | Recommendation |
|-------------|-------|----------------|
| `api/src/routes/services.js` | Dead route; queries non-existent `public.services` table. | Delete or repurpose with strong validation. |
| `website/src/lib/api/services.ts` | Dead wrappers exported from `api.ts`; nothing imports them. | Delete. |
| `web.jsx.backup` | 123KB legacy React backup. | Move to `backups/` or delete. |
| `api/scripts/archive/` | One-off migration scripts (fix-two-plans, import-customers, migrate-payments). | Keep archived; do not run in production without review. |
| `website/src/data/` | Mock data files used as legacy fallbacks. | Review if still referenced; stale mocks can mask real API failures. |
| `api/src/routes/account.js` | Appears to be a stub or legacy login route (`/api/Account/Login`). | Verify if used by any external client; otherwise deprecate. |
| `website/src/components/shared/AddressAutocompleteTest.tsx` | Dev-only test page. | Ensure it is gated by `import.meta.env.DEV` (it is). |
| Duplicate names | `index.ts`, `index.tsx`, `feedback.ts`, `monthlyPlans.ts`, `permissions.ts`, `setup.ts` exist in multiple folders. | Not inherently harmful because of folder scoping, but confusing during global search. |

## 7. Deployment & Config Coupling

| File | Coupled To |
|------|-----------|
| `docker-compose.yml` | `api/`, `website/`, `nginx.conf`, `.env` (POSTGRES_USER, POSTGRES_PASSWORD, JWT_SECRET, GOOGLE_PLACES_API_KEY, HOSOONLINE_*, COMPREFACE_*) |
| `Dockerfile.api` | `api/package.json`, `api/src/` |
| `Dockerfile.web` | `website/package.json`, `website/`, `nginx.docker.conf` |
| `nginx.conf` | `nk.2checkin.com` domain, SSL cert paths, `/api` proxy to `api:3002`, `/uploads/feedback` proxy |
| `nginx.docker.conf` | Inside `Dockerfile.web`; must match `nginx.conf` proxy rules |
| `scripts/deploy-tbot.sh` | `nginx.conf`, certbot, Docker install on target VPS |

**Rule:** Any change to `docker-compose.yml`, `Dockerfile.*`, or `nginx.conf` MUST update `scripts/deploy-tbot.sh` and pass `bash -n scripts/deploy-tbot.sh`.
