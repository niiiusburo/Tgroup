# Cosmetic Line of Business Design — v2

- **Date:** 2026-05-18
- **Supersedes:** `2026-05-18-cosmetic-line-of-business-design.md` (v1, same date — v1 is preserved as a brainstorm artifact only)
- **Owner roles:** Auth & Permissions, Customers, Services & Catalog, Payments, Commissions, Backend, Frontend, DB Migrations, QA
- **Status:** Approved design direction; ready for implementation planning
- **Primary surfaces:** Top-of-app LOB toggle (admin only), existing dental admin UI reused for cosmetic, NEW mobile-first CTV dashboard
- **Primary endpoints:** `GET /api/me/lob-scope`, `/api/dental/*` (existing), new `/api/cosmetic/*` (mirrors dental routes against cosmetic DB), `GET /api/ctv/commission-summary` (cross-DB aggregation)

## Why v2 exists

v1 (3 schemas, 1 DB, shared `persons` table) was rejected during brainstorm. The owner wants:

1. **Physical DB isolation** — two separate Postgres databases so production dental data stays byte-untouched
2. **No shared identity table** — same human enrolling in both LOBs gets two independent client rows, no sync
3. **One login for everyone** with role-based UI and an admin-only LOB toggle
4. **One new screen total** — the CTV (Cộng tác viên / referrer) commission dashboard. Everything else reuses the existing dental UI.

This v2 spec rewrites D1, D2, D4, D6, the migration plan, and the testing strategy to match.

## Current Context

- Production dental data lives in Postgres schema `dbo` of database `tdental_demo`, Homebrew Postgres `127.0.0.1:5433`. Live, in use, must not be disrupted.
- `partners` table uses single-table inheritance (customers + employees + suppliers, flagged by `customer`, `employee`, `isdoctor`, etc.).
- Auth lives in dental DB: `users`, `roles`, `permissions`, `employee_location_scope`. Frontend uses `useAuth().hasPermission()` + `requirePermission()` middleware on the API.
- Frontend is a Vite/React SPA with a global `LocationContext`. No business-unit context exists.
- No commission engine. No `cosmetic.*` anything yet.

## Goals

- Provision a new `tcosmetic_demo` Postgres database alongside the existing dental DB.
- Add Cosmetic LOB as a fully isolated business with its own clients, services, appointments, payments.
- Keep one login. Admin sees a header LOB dropdown and can toggle freely. DentalStaff and CosmeticStaff see only their LOB (no toggle). CTV sees neither LOB UI — their dashboard already aggregates across both.
- Ship a mobile-first CTV dashboard showing pending/paid commission, recent activity, and referred-clients list — aggregated across both DBs.
- Touch the dental DB only with **additive** changes (new nullable columns, new tables). Existing tables/rows/queries unchanged.
- Ship behind a feature flag (`COSMETIC_LOB_ENABLED`) so we can stage on nk2 and flip on nk when ready.

## Non-Goals

- Unified reporting across both LOBs.
- Real-time sync between dental and cosmetic client rows. Edits to one never propagate to the other.
- /consultations admin page. Consultation cards become a backend implementation detail of commission attribution; no UI surface in v1.
- Person-merge UI. Without a shared identity table there's nothing to merge.
- Cross-LOB referral lock checks. Dental locks remain dental-internal.
- Auto-unlock rules for dental locks. Deferred to a follow-up spec.
- Multi-tenant hosting under either LOB. Single tenant per deployment.

## Design Decisions

| ID | Decision | v2 Choice |
|----|----------|-----------|
| **D1** | Database strategy | **Two separate Postgres databases**: existing `tdental_demo` (untouched in shape) + new `tcosmetic_demo`. No cross-DB SQL JOINs. Composition in API layer only. |
| **D2** | Person/client identity | **No shared identity table.** Each LOB has its own independent `clients` table. Same human in both = two unrelated client rows. Loose matching by phone is an admin-side hint, not a constraint. |
| **D3** | Dental referral lock | Stays exactly as designed in v1, lives entirely in `tdental_demo`. |
| **D4** | LOB toggle UX | Header dropdown mirroring `LocationContext`. Hidden when the user has only one LOB in scope. CTV users never see it (they have no LOB scope rows — see D5). |
| **D5** | Permission / scope model | Additive column on existing `users` table: `lob_scope TEXT[]` (nullable, backfilled to `ARRAY['dental']` for every existing user). Empty/null scope = legacy dental-only. Admin = `ARRAY['dental','cosmetic']`. CTV has its own role flag `is_ctv BOOLEAN`, scope can be empty. |
| **D6** | Owner cross-LOB rollup | None. There is no merged reporting surface. The cross-LOB "also a dental client" badge on cosmetic profile (and vice-versa) is a permission-gated API call (admin only). |
| **D7** | Cosmetic attribution model | Consultation cards remain the cosmetic commission attribution unit, but **invisible to UI** — auto-created when a cosmetic appointment is booked with a `consulting_staff_id` and superseded by the next active card. No /consultations page. |
| **D8** | Cosmetic lock TTL | 6 months from last related activity (engine only). |
| **D11** | Commission rate storage | Per-product. Add `commission_rate_percent` column to `cosmetic.products`. Dental products get the same nullable column (defaults to 0 / no behavior change). |
| **D12** | Commission earning trigger | On payment collected. Refunds = negative-amount reversal rows (append-only). |
| **D13** | Commission recipient resolution (in order, first match wins) | 1. If the client row has `referred_by_ctv_id`, the CTV gets it. 2. Else if cosmetic and an active consultation card exists, the consulting staff gets it. 3. Else if dental and `clients.salestaffid` is set, the salestaff gets it. 4. Else no commission row is created. |
| **D14 (new)** | CTV role | Boolean `is_ctv` on `users`. CTV-flagged users never enter the admin UI; on login they're redirected to `/ctv`. CTV permission keys gate the API: `ctv.commission.view.self`, `ctv.referrals.view.self`. |
| **D15 (new)** | Cosmetic staff role flags | Mirror dental's exactly (`isdoctor`, `isassistant`, `isreceptionist`) for v1. Rename later if business semantics demand it. Owner decision. |
| **D16 (new)** | Cosmetic.staff seeding | The cosmetic staff table ships empty after migration. Admin adds staff manually per location through the existing employees UI (cosmetic LOB selected). |

## Schema Topology

```
postgres server: 127.0.0.1:5433
├── database: tdental_demo                          (EXISTING — additive changes only)
│   └── schema: dbo                                 (NOT renamed in v2)
│       ├── ... all existing tables, untouched
│       ├── users                                   (+ lob_scope TEXT[] NULL, + is_ctv BOOLEAN NULL)
│       ├── partners                                (+ referred_by_ctv_id UUID NULL on customer rows)
│       ├── products                                (+ commission_rate_percent NUMERIC(5,2) NULL DEFAULT 0)
│       ├── commissions                             (NEW table)
│       ├── payouts                                 (NEW table)
│       └── referral_locks                          (NEW table; dental-internal)
│
└── database: tcosmetic_demo                        (NEW DB, provisioned from scratch)
    └── schema: dbo                                 (matches dental's convention)
        ├── clients                                 (independent UUID; + referred_by_ctv_id UUID NULL — SOFT ref to tdental_demo.users(id), no FK; + consulting_staff_id UUID NULL — references cosmetic.staff)
        ├── staff                                   (mirror dental's role flags; SEEDED EMPTY)
        ├── companies                               (cosmetic locations; SEEDED EMPTY)
        ├── employee_location_scope
        ├── appointments
        ├── services / products                     (+ commission_rate_percent)
        ├── saleorders / saleorderlines             (+ consultation_id FK on lines)
        ├── payments / payment_allocations / monthlyplans / planinstallments
        ├── consultations                           (NEW — invisible to admin UI; commission-attribution only)
        ├── commissions                             (NEW — same shape as dental's)
        └── payouts                                 (NEW)
```

### Key new tables (shape identical in both DBs unless noted)

```sql
-- in DENTAL DB
-- (dental uses single-table inheritance via `partners` where customer=true,
-- so client_id references partners(id). recipient_user_id has a real FK to users
-- because auth lives in this same DB.)
CREATE TABLE commissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES partners(id),
  recipient_user_id   UUID NOT NULL REFERENCES users(id),
  payment_id          UUID NOT NULL REFERENCES payments(id),
  service_line_id     UUID NOT NULL REFERENCES saleorderlines(id),
  source              TEXT NOT NULL CHECK (source IN ('ctv','consultation','salestaff')),
  amount              NUMERIC(14,2) NOT NULL,     -- negative on refund reversal
  status              TEXT NOT NULL CHECK (status IN ('pending','paid','reversed')) DEFAULT 'pending',
  payout_id           UUID NULL REFERENCES payouts(id),
  earned_at           TIMESTAMP NOT NULL DEFAULT now(),
  created_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- in COSMETIC DB
-- (cosmetic has its own dedicated `clients` table. recipient_user_id is a SOFT
-- reference — no FK — because the users table lives in a different physical
-- database. The API enforces validity on write.)
CREATE TABLE commissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES clients(id),
  recipient_user_id   UUID NOT NULL,              -- SOFT ref to tdental_demo.users(id); validated in API
  payment_id          UUID NOT NULL REFERENCES payments(id),
  service_line_id     UUID NOT NULL REFERENCES saleorderlines(id),
  source              TEXT NOT NULL CHECK (source IN ('ctv','consultation','salestaff')),
  amount              NUMERIC(14,2) NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('pending','paid','reversed')) DEFAULT 'pending',
  payout_id           UUID NULL REFERENCES payouts(id),
  earned_at           TIMESTAMP NOT NULL DEFAULT now(),
  created_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE payouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_label         TEXT NOT NULL,               -- "2026-05"
  paid_at             TIMESTAMP NOT NULL,
  total_amount        NUMERIC(14,2) NOT NULL,
  notes               TEXT NULL,
  created_by_user_id  UUID NOT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- in COSMETIC DB only
CREATE TABLE consultations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                UUID NOT NULL REFERENCES clients(id),
  consulting_staff_id      UUID NOT NULL,             -- references tcosmetic_demo.staff.id
  opened_at                TIMESTAMP NOT NULL DEFAULT now(),
  expires_at               TIMESTAMP NOT NULL,        -- opened_at + 6mo, refreshed by activity
  status                   TEXT NOT NULL CHECK (status IN ('open','attached','converted','superseded','expired')) DEFAULT 'open',
  superseded_by_consultation_id UUID NULL REFERENCES consultations(id),
  notes                    TEXT NULL,
  created_at               TIMESTAMP NOT NULL DEFAULT now()
);

-- in DENTAL DB only (auth)
ALTER TABLE users
  ADD COLUMN lob_scope TEXT[] NULL,
  ADD COLUMN is_ctv BOOLEAN NULL DEFAULT FALSE;
UPDATE users SET lob_scope = ARRAY['dental'] WHERE lob_scope IS NULL AND is_ctv IS NOT TRUE;
```

## CTV Dashboard (the only new UI)

Mobile-first React surface at `/ctv`. Four bottom-nav tabs.

| Tab | Content |
|-----|---------|
| **Home** | Greeting, pending-commission tile with dental/cosmetic split bar, this-month stats (referrals brought in, services completed, paid out), recent-activity feed with `den`/`cos` LOB pills. |
| **Commission** | Pending vs Paid-out segmented toggle. List of every commission row with client, service, amount, LOB pill. |
| **Referrals** | List of clients the CTV has referred. Each row shows LOB pill(s) (some clients exist in both DBs), status (earning / no visit yet), total earned to date. |
| **Me** | Profile, log out. |

### Data flow

```
CTV user → /ctv → calls GET /api/ctv/commission-summary
                       ├── reads tdental_demo.commissions WHERE recipient_user_id = me
                       └── reads tcosmetic_demo.commissions WHERE recipient_user_id = me
                  Returns aggregated payload with LOB-tagged rows.
```

The CTV dashboard never queries either DB directly from the client. All aggregation happens server-side. Frontend just renders.

### Routing / role redirect

On login (`POST /api/auth/login`), if the returned user has `is_ctv = true`, the frontend hard-redirects to `/ctv`. Admin/staff users continue to the existing dashboard. CTV users hitting `/customers` or any other admin route get 403 + redirected back to `/ctv`.

## LOB Toggle Behavior

- Renders in the top header next to `LocationContext` dropdown.
- Visible only when `useAuth().user.lob_scope.length >= 2`.
- Toggling sets a `BusinessUnitContext` value. The React tree under `<App>` is keyed on the LOB, so toggling unmounts+remounts the subtree — this is how we prevent "flash of dental data" without per-component cache code.
- All API client calls read the current LOB and route to `/api/dental/*` or `/api/cosmetic/*` accordingly.
- Default LOB on first login = first item in `lob_scope` (typically `dental` for existing users).
- Last-selected LOB persists per-user in `localStorage`.

## Permissions Model

New permission keys to register in `product-map/contracts/permission-registry.yaml`:

| Key | Who has it by default |
|-----|----------------------|
| `cosmetic.access` | admins, cosmetic staff |
| `dental.access` | admins, dental staff |
| `ctv.dashboard.view` | CTV-flagged users only |
| `ctv.commission.view.self` | CTV-flagged users only |
| `ctv.referrals.view.self` | CTV-flagged users only |
| `commissions.view.team` | admins, managers |
| `commissions.payout.run` | admins only |
| `commissions.export` | admins, managers |
| `lob.crossview` | admins only — enables "Also a {other LOB} client" badge |

LOB scope (in `users.lob_scope`) is the hard gate. Permission keys are the soft gate within a scope. Backend middleware enforces both:

```js
function requireLobScope(req, res, next, lob) {
  if (!req.user.lob_scope?.includes(lob)) return res.status(403).json({error:{code:'S_LOB_FORBIDDEN'}});
  next();
}
// /api/cosmetic/* routes wrap requireLobScope(..., 'cosmetic')
```

## Migration Plan (rollout ordering)

All migrations are reversible via the `COSMETIC_LOB_ENABLED` flag until step 8. **Dental DB only receives additive changes (new nullable columns, new tables).** All shape changes to dental are tested with a DROP COLUMN dry-run on staging before nk prod.

1. **Additive dental migrations** (run on staging first, then prod): add `lob_scope`, `is_ctv` to `users`; add `referred_by_ctv_id` to `partners`; add `commission_rate_percent` to `products`; create `commissions`, `payouts`, `referral_locks` tables. Backfill `lob_scope = ARRAY['dental']` for all existing users. Verify with `SELECT COUNT(*) FROM users WHERE lob_scope IS NULL` returns 0.
2. **Provision `tcosmetic_demo` DB** on the same Postgres server. Run cosmetic schema bootstrap script (creates all tables empty, including `staff` empty per D16).
3. **API: add `/api/cosmetic/*` routes** that mirror existing dental routes but query `tcosmetic_demo`. Gate all routes behind `requireLobScope('cosmetic')`. Behind `COSMETIC_LOB_ENABLED=false`, routes return 503.
4. **API: add `/api/ctv/commission-summary`** that reads both DBs and aggregates. Gate behind `is_ctv` user flag.
5. **Frontend: add `BusinessUnitContext`** + header toggle, hidden when `lob_scope.length < 2` or flag off. Wire all existing API calls to be LOB-aware via the context.
6. **Frontend: add `/ctv` mobile-first surface** with 4 tabs. On login, redirect `is_ctv` users to `/ctv`.
7. **Flag on in nk2 (stage).** Manually grant `lob_scope` += 'cosmetic' to 1-2 test admin accounts. Run full verification gates below.
8. **Flag on in nk (prod).** Grant cosmetic scope + CTV flags to designated accounts. Existing dental users see zero change.

### Pre-deploy verification gates (must pass before flipping flag in each environment)

1. Existing dental Playwright suite passes 100% (proves dental UX unchanged).
2. `SELECT COUNT(*) FROM users WHERE lob_scope IS NULL` = 0 (backfill complete).
3. Migration rollback dry-run succeeds on staging clone: each `ALTER TABLE … DROP COLUMN` and `DROP TABLE` runs without error.
4. With cosmetic LOB scope NOT granted to test user, `/api/cosmetic/clients` returns 403.
5. With cosmetic LOB scope granted, `/api/cosmetic/clients` returns the (empty) list and the LOB toggle renders in the header.
6. CTV-flagged test user lands on `/ctv` after login and cannot reach `/customers` (403).
7. Real-browser smoke on nk2: log in as `t@clinic.vn`, confirm header looks identical to today, toggle LOB to cosmetic, confirm empty cosmetic homepage, toggle back, confirm dental data intact, log out.

## Testing Strategy

Per `docs/TEST-MATRIX.md`, add these test classes:

1. **Dental-untouched regression** — full existing Jest + Playwright suite, baseline must stay green at every step.
2. **LOB isolation** — cosmetic-scoped user calls `/api/dental/*` → 403. Dental-scoped user calls `/api/cosmetic/*` → 403.
3. **CTV dashboard aggregation** — seed commissions in both DBs for one CTV, call `/api/ctv/commission-summary`, assert sum + per-LOB breakdown matches.
4. **CTV role gating** — `is_ctv=true` user trying to GET `/api/dental/customers` → 403.
5. **Commission recipient resolution** — set up a client with `referred_by_ctv_id` set AND an active consultation card. Insert a payment. Assert commission row created with `source='ctv'` (CTV wins over consultation per D13).
6. **LOB toggle unmount** — Playwright: log in as admin, view a dental customer, toggle to cosmetic, assert the dental customer data is NOT visible (the subtree remounted, no stale render).
7. **Refund reversal** — collect payment → 1 commission row. Refund → 1 negative-amount reversal row. Net = 0. Original row's `status` remains `pending` (NOT mutated to `reversed`).
8. **Migration rollback** — automated test: run all v2 migrations forward then backward against a fresh DB clone. Dental schema returns to v1 shape.

## Documentation updates (mandatory on the implementation PR series)

- `AGENTS.md` — note two-DB topology, per-route `requireLobScope` discipline, agents must specify LOB when touching cosmetic code.
- `ARCHITECTURE.md` — two-DB diagram, role model, recipient-resolution algorithm.
- `DESIGN.md` — LOB toggle UX, CTV dashboard.
- `BEHAVIOR.md` — register `S_LOB_FORBIDDEN` error envelope.
- `DECISIONS.md` — log D1–D16 (v2).
- `docs/CONTRACTS.md` — `Lob`, `BusinessUnitScope`, `CommissionRow`, `Payout`, `CtvCommissionSummary`.
- `docs/DATA-MODEL.md` — two-DB breakdown, additive-only dental changes called out explicitly.
- `docs/MIGRATIONS.md` — migration steps 1–8 with reversal SQL for each dental change.
- `docs/SECURITY.md` — LOB gate, CTV role gate, scope=empty behavior.
- `docs/RUNBOOK.md` + `docs/runbooks/DEPLOYMENT.md` — feature-flag rollout, `tcosmetic_demo` backup/restore steps.
- `docs/TEST-MATRIX.md` — register the 8 new test classes.
- `docs/CHANGELOG.md` — entry per migration step.
- `testbright.md` — acceptance scenarios (admin toggle, dental untouched regression, CTV dashboard, refund reversal).
- `product-map/schema-map.md` — re-render with two DBs.
- `product-map/domains/` — add `cosmetic-clients.yaml`, `ctv.yaml`, `commissions.yaml`, `business-unit.yaml`.
- `product-map/contracts/api-index.md` — add cosmetic routes, `/api/ctv/*` routes.
- `product-map/contracts/permission-registry.yaml` — register the 9 new permission keys.
- `product-map/unknowns.md` — record auto-unlock-rules deferral, cosmetic role-flag rename intent.
- `.claude/memory.md` — note two-DB toggle convention so future sessions don't try to JOIN across.

## Open Questions / Parked

1. **Cosmetic role-flag rename** — owner intends to rename `isdoctor` etc. to cosmetic-appropriate names in a v1.1 spec. Schema is forward-compatible.
2. **Dental commission policy** — do dental services ever earn non-zero commission? The mechanism is in place (column exists, engine runs) but rates default to 0%.
3. **Dental auto-unlock rules** — eight candidates surveyed in v1 brainstorm; deferred to a follow-up spec.
4. **Provider commission split** — when (if ever) split commission between referrer and provider?
5. **CTV-aggregated reports for admins** — should admin /reports/commission show CTV rollup across both DBs? Out of v1 scope.

## Verification

- `psql -h 127.0.0.1 -p 5433 -U postgres -l` after migration step 2 shows both `tdental_demo` AND `tcosmetic_demo`.
- `psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -c "\d users"` shows new `lob_scope`, `is_ctv` columns.
- `curl -H "Authorization: Bearer …" http://localhost:3002/api/cosmetic/clients` with cosmetic-scoped admin returns empty list.
- Same call with dental-only user returns `{error: {code: 'S_LOB_FORBIDDEN'}}`, HTTP 403.
- Playwright on nk2: log in as `t@clinic.vn` (admin), confirm header has new LOB dropdown, toggle to Cosmetic, confirm empty state, toggle back, confirm dental data unchanged. Screenshot evidence.
- Seed a CTV-flagged user + a payment-attributed commission in each DB. Log in as that CTV, confirm `/ctv` Home shows correct dental + cosmetic split totals.
- Run full pre-existing Jest + Playwright suite. All green. New 8 test classes from the Testing Strategy section. All green.
