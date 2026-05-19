# Cosmetic Line of Business Design (v1 — SUPERSEDED)

> ⚠️ **SUPERSEDED** by `2026-05-18-cosmetic-line-of-business-design-v2.md` (same date).
> This v1 spec proposed 3 schemas in a single DB with a shared `persons` table.
> During brainstorm the owner pivoted to two physically separate Postgres
> databases with duplicated client rows and one new mobile CTV dashboard.
> Read v2 for the canonical design. v1 retained for decision history only.

- **Date:** 2026-05-18
- **Owner roles:** Customers & Partners, Services & Catalog, Payments & Commissions, Auth & Permissions, Frontend, Backend, DB Migrations, QA/Verification
- **Status:** SUPERSEDED — see header
- **Primary surfaces:** Top-of-app Business Unit toggle, `/customers`, `/clinic/*`, `/team/*`, new `/consultations` (cosmetic-only), new `/commissions`
- **Primary endpoints:** `GET /api/me/lob-scope`, `POST /api/cosmetic/consultations`, `GET /api/{lob}/clients`, `POST /api/dental/clients` (lock-checked), `GET /api/{lob}/commissions`

## Recap

Add Cosmetic as a sibling Line of Business (LOB) to the existing Dental application. Cosmetic and Dental data are physically separated by Postgres schema (`cosmetic.*` and `dental.*`). A tiny `shared.*` schema holds person identity and the per-user LOB access scope. A toggle at the top of the app, modeled on the existing `LocationContext`, switches the active LOB.

A person can be a client in either, both, or neither LOB. Client rows themselves do NOT cross schemas — only `shared.persons` does — so a cosmetic UI query cannot accidentally surface dental data; the dental tables are not in its `search_path`.

Two different attribution models per LOB:

- **Dental:** sticky `salestaffid` ownership on `dental.clients`. Lock fires at insert ("Referred"). Unlock rules deferred (parked in product-map/unknowns.md).
- **Cosmetic:** consultation-card model. Each service event creates a `cosmetic.consultations` row owned by the consulting staff. The newest non-superseded, non-expired card determines the active link. Cards expire 6 months after their last related activity. Commission belongs to the consulting staff on the card the service was attached to.

Commission is a first-class feature on the cosmetic side, latent on the dental side. The engine is identical; only the recipient resolution differs (dental: `clients.salestaffid`; cosmetic: `consultations.consulting_staff_id`).

## Current Context

- All current dental data lives in Postgres schema `dbo` (search_path: `dbo, public`), Homebrew Postgres `127.0.0.1:5433/tdental_demo`.
- `partners` table currently uses single-table inheritance for customers, employees, and suppliers (`customer`, `employee`, `isdoctor`, `isassistant`, `isreceptionist` flags).
- Staff ownership of customers is captured today via `partners.salestaffid` (sales rep), `partners.cskhid` (customer service), and `partners.referraluserid` (referrer text/UUID).
- `companies` is the location/branch entity. Per-user location scope is enforced via `employee_location_scope` and surfaced in UI via `LocationContext.tsx` + `FilterByLocation.tsx`.
- Permissions are wildcard strings (`customers.view`, `payment.add`) checked by `requirePermission()` middleware and `useAuth().hasPermission()` in React.
- There is no `department`, `specialty`, or `line_of_business` column anywhere today. There is no commission engine.

## Goals

- Add Cosmetic as a fully isolated LOB sharing only canonical person identity.
- Provide a global LOB toggle that mirrors the proven `LocationContext` pattern.
- Prevent any cross-LOB data leak by construction (schema isolation + per-request `search_path`), not by query-level filtering.
- Enforce the referral rule: same person can be referred to BOTH dental and cosmetic, but cannot be re-referred WITHIN one LOB while a lock is active.
- Track commissions per LOB with cosmetic-priority UI (sidebar position + homepage widget).
- Update all governance docs (AGENTS, ARCHITECTURE, DESIGN, BEHAVIOR, DECISIONS, product-map) in the same PR series.

## Non-Goals

- Unifying dental and cosmetic into one merged dataset for reporting (no "All Group" rollup view — explicit R1 decision).
- Automatic payroll integration for commission payouts (manual CSV export only in v1).
- Auto-release rules for dental referral locks (parked, see Open Questions).
- Customer-facing self-service across LOBs.
- Multi-tenant hosting of additional clinics under either LOB (still single tenant per deployment).
- Rebuilding the existing dental UI; only the toggle + isolated cosmetic mirror is added.

## Design Decisions

| ID | Decision | Choice |
|----|----------|--------|
| D1 | Database separation strategy | **Three Postgres schemas in one database**: `dental`, `cosmetic`, `shared` |
| D2 | Person ↔ client model | **Split**: `shared.persons` holds identity; `dental.clients` and `cosmetic.clients` are per-LOB enrollments referencing `person_id` |
| D3 | Dental referral lock trigger | **Lock at Referred** (row insert into `dental.clients` with `salestaffid`) |
| D4 | Toggle UX | **Top-of-app dropdown** mirroring `LocationContext.tsx`; hidden when user has only one LOB in scope |
| D5 | Permission model | **Generic permissions + separate LOB scope** (`shared.employee_lob_scope`); no LOB-prefixed permission strings |
| D6 | Owner cross-LOB rollup | **None.** Toggle-only access. No combined revenue/client view exists, by construction |
| D7 | Cosmetic attribution model | **Consultation-card** (`cosmetic.consultations`); each service event creates a new card that supersedes the prior active card for that person |
| D8 | Cosmetic lock TTL | **6 months** from last related activity; configurable per tenant later |
| D9 | Same-day re-consultation | **No automatic block**; manager can override via explicit close |
| D10 | Person dedup match key | **Loose match on phone OR identity_number**; admin UI provides merge tool for false splits |
| D11 | Commission rate storage | **Per-product** (`products.commission_rate_percent`) on both `dental.products` and `cosmetic.products`; dental defaults to 0 |
| D12 | Commission earning trigger | **On payment collected**, with negative-amount reversals on refund (append-only) |
| D13 | Commission recipient | **Sales staff only** (dental: `clients.salestaffid`; cosmetic: `consultations.consulting_staff_id`); single recipient in v1 |

## Schema Topology

```
postgres database: tdental_demo
├── schema: dental             (rename of current dbo)
│   ├── clients                 (was partners-where-customer; person_id FK)
│   ├── staff                   (was partners-where-employee)
│   ├── appointments
│   ├── saleorders, saleorderlines
│   ├── dotkhams                (dental-only)
│   ├── payments, payment_allocations, monthlyplans, planinstallments
│   ├── products, productcategories  (+ commission_rate_percent column)
│   ├── companies               (locations/branches within dental)
│   ├── commissions             (new; one row per earned commission)
│   └── … (all other dbo tables, renamed)
│
├── schema: cosmetic           (new; mirror of dental's relevant tables)
│   ├── clients                 (person_id FK; NO salestaffid)
│   ├── staff                   (role flags: isaesthetician, isnurse, isconsultant)
│   ├── consultations           (NEW; the cosmetic attribution unit)
│   ├── appointments            (links consultation_id)
│   ├── saleorders, saleorderlines  (saleorderlines.consultation_id NOT NULL)
│   ├── payments, payment_allocations, monthlyplans
│   ├── products, productcategories  (+ commission_rate_percent column)
│   ├── companies
│   └── commissions
│
└── schema: shared
    ├── persons                  (canonical identity; phone unique, identity_number)
    ├── referral_locks           (DENTAL-ONLY active locks; cosmetic uses consultations)
    ├── referral_audit           (every lock check + result, append-only)
    ├── employee_lob_scope       (user_id, lob); mirrors employee_location_scope
    └── person_merges            (admin merge actions; for dedup repair)
```

### Key new tables

```sql
-- shared.persons
CREATE TABLE shared.persons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  phone           TEXT,                          -- partial unique
  identity_number TEXT,                          -- CCCD / passport
  date_of_birth   DATE,
  gender          TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX persons_phone_uq ON shared.persons (lower(phone)) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX persons_id_uq ON shared.persons (lower(identity_number)) WHERE identity_number IS NOT NULL;

-- shared.referral_locks (DENTAL ONLY in v1)
CREATE TABLE shared.referral_locks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID NOT NULL REFERENCES shared.persons(id),
  lob             TEXT NOT NULL CHECK (lob IN ('dental')),  -- cosmetic uses consultations
  locked_at       TIMESTAMP NOT NULL DEFAULT now(),
  locked_by_staff_id UUID NOT NULL,
  lock_reason     TEXT NOT NULL CHECK (lock_reason IN ('referred','manual','inherited')),
  released_at     TIMESTAMP,
  released_by_user_id UUID,
  released_reason TEXT
);
CREATE UNIQUE INDEX referral_locks_open_uq
  ON shared.referral_locks (person_id, lob) WHERE released_at IS NULL;

-- shared.employee_lob_scope
CREATE TABLE shared.employee_lob_scope (
  user_id UUID NOT NULL,
  lob     TEXT NOT NULL CHECK (lob IN ('dental','cosmetic')),
  PRIMARY KEY (user_id, lob)
);

-- cosmetic.consultations
CREATE TABLE cosmetic.consultations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id                   UUID NOT NULL REFERENCES shared.persons(id),
  cosmetic_client_id          UUID NOT NULL REFERENCES cosmetic.clients(id),
  consulting_staff_id         UUID NOT NULL REFERENCES cosmetic.staff(id),
  opened_at                   TIMESTAMP NOT NULL DEFAULT now(),
  expires_at                  TIMESTAMP NOT NULL,
  status                      TEXT NOT NULL CHECK (status IN ('open','converted','superseded','expired','lost')),
  superseded_by_consultation_id UUID REFERENCES cosmetic.consultations(id),
  converted_saleorder_id      UUID REFERENCES cosmetic.saleorders(id),
  notes                       TEXT,
  created_at                  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX consultations_active_idx
  ON cosmetic.consultations (person_id)
  WHERE status IN ('open','converted') AND superseded_by_consultation_id IS NULL;

-- dental.commissions and cosmetic.commissions (identical shape)
CREATE TABLE <lob>.commissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id          UUID NOT NULL,
  saleorderline_id    UUID NOT NULL,
  staff_id            UUID NOT NULL,
  role                TEXT NOT NULL CHECK (role IN ('referrer')),  -- v1
  base_amount         NUMERIC(14,2) NOT NULL,
  rate_percent        NUMERIC(5,2) NOT NULL,
  commission_amount   NUMERIC(14,2) NOT NULL,   -- negative on refund
  earned_at           TIMESTAMP NOT NULL DEFAULT now(),
  paid_out_at         TIMESTAMP,
  payout_batch_id     UUID
);
```

## Cross-LOB Referral Rules

**Dental (sticky ownership):**

1. Before INSERT into `dental.clients`, the API executes:
   ```sql
   SELECT locked_by_staff_id FROM shared.referral_locks
   WHERE person_id = $1 AND lob='dental' AND released_at IS NULL;
   ```
2. If a row exists AND `locked_by_staff_id != current_staff_id` → reject with `B_REFERRAL_LOCKED` (typed error envelope per `BEHAVIOR.md`).
3. On successful INSERT, write the lock row (`lock_reason='referred'`).
4. Cosmetic locks have ZERO effect on dental referral attempts and vice versa.

**Cosmetic (consultation card):**

1. Before INSERT into `cosmetic.consultations`, the API executes:
   ```sql
   SELECT consulting_staff_id FROM cosmetic.consultations
   WHERE person_id = $1
     AND status IN ('open','converted')
     AND superseded_by_consultation_id IS NULL
     AND expires_at > now()
   ORDER BY opened_at DESC LIMIT 1;
   ```
2. If a row exists AND `consulting_staff_id != current_staff_id` → reject with `B_CONSULTATION_ACTIVE` unless the request carries a manager-override header validated against `consultations.override` permission.
3. When a service is attached (INSERT into `cosmetic.saleorderlines` with `consultation_id`):
   a. Create a NEW `cosmetic.consultations` row with `consulting_staff_id = current_staff_id`, `status='converted'`, `expires_at = now() + INTERVAL '6 months'`, `converted_saleorder_id = <new order>`.
   b. UPDATE the previously active card (if any): `status='superseded'`, `superseded_by_consultation_id = <new card id>`.
   c. Link the saleorderline to the new card.
4. Nightly job (`api/jobs/expireConsultations.js`): for each card with `status='open'` and `expires_at < now()` → set `status='expired'`. For each card with `status='converted'`, recompute `expires_at` as `last_related_activity_at + 6 months`; if expired, set `status='expired'`.
5. "Active link" query (used by client search to show "currently consulting under: Linh") is the same query as step 1.

## Toggle UX & Scope Enforcement

- **Frontend:** `website/src/contexts/BusinessUnitContext.tsx` mirrors `LocationContext.tsx` exactly. State: `selectedLob`, `allowedLobs`, `isSingleLob`, `setSelectedLob()`. Persists to `localStorage('tgclinic.selectedLob')`. Dispatches `tgclinic:lob-change` event.
- **UI:** `website/src/components/shared/FilterByLob.tsx` dropdown next to `FilterByLocation` in `Layout.tsx`. Hidden when `isSingleLob`. Shows emoji + label (🦷 Dental / 💄 Cosmetic).
- **Switch behavior:** (1) update localStorage, (2) call `queryClient.clear()` (React Query) to drop cached data, (3) navigate to `/` (overview of new LOB), (4) refresh sidebar items.
- **Auth load path:** `AuthContext` already fetches user profile on login. Extend `/api/me` response with `lob_scope: string[]`. Drive `allowedLobs` from this.
- **Backend routing:** new middleware `api/src/middleware/lobContext.js` reads `X-Lob` header (or cookie fallback). Validates user has that LOB in scope (else 403). Sets `req.lob` and runs `SET LOCAL search_path TO <lob>, shared, public` on the request's Postgres client.
- **API path convention:** all per-LOB routes mounted at `/api/{lob}/<resource>` (e.g., `/api/cosmetic/clients`). Shared routes at `/api/shared/*`. Cross-LOB admin routes at `/api/admin/*` (none in v1).

## Permissions Model

- Existing permission strings unchanged (`customers.view`, `payment.add`, etc.).
- New permissions to register in `product-map/contracts/permission-registry.yaml`:
  - `commissions.view` — see own commissions
  - `commissions.view_team` — see team commissions within LOB scope
  - `commissions.edit` — adjust commissions, mark paid out
  - `referral_locks.release` — manually release a dental lock
  - `consultations.override` — open a new cosmetic consultation while another is active
  - `person_merge.execute` — admin merge of duplicate `shared.persons`
- LOB scope is data, not permissions: `shared.employee_lob_scope` rows.
- "Dental Manager" role = standard manager permission group + `employee_lob_scope (user_id, 'dental')`. Same role definition reused for "Cosmetic Manager" with `lob='cosmetic'`.
- Owner role = standard owner permission group + scope rows for BOTH LOBs.

## Commission Engine

- **Rate source:** `<lob>.products.commission_rate_percent` (numeric, default 0).
- **Trigger:** after-INSERT trigger (or API write-path) on `<lob>.payments`. Walks `payment_allocations → saleorderlines → products`, calculates `base × rate%` per line, inserts one `<lob>.commissions` row per line.
- **Recipient resolution:**
  - Dental: `<saleorderline>.saleorder_id → dental.saleorders.partnerid → dental.clients.salestaffid`
  - Cosmetic: `<saleorderline>.consultation_id → cosmetic.consultations.consulting_staff_id`
- **Refunds:** insert NEGATIVE-amount commission rows. Append-only. Net per-staff per-period = sum of all rows.
- **UI:**
  - New `/commissions` route. Cosmetic sidebar: positioned high under "Team". Dental sidebar: lower, default-collapsed.
  - Cosmetic-only homepage widget on overview: "Pending commission this month: X VND". Hidden on dental unless staff has at least one row.
  - Manager view (`commissions.view_team`): team rollup within LOB scope.
- **Payout (v1):** manual. Admin generates CSV export, marks `paid_out_at` on selected rows.

## Migration Plan (rollout ordering)

All steps are reversible via the feature flag (`COSMETIC_LOB_ENABLED`) until step 8.

1. **Rename `dbo` → `dental`.** Single transaction. Update `api/src/db.js` `search_path` default to `dental, shared, public`. Restart API. Existing app keeps working unchanged.
2. **Create `shared` schema + `persons` table.** Backfill from `dental.partners` where `customer=true`, dedup by `(phone, identity_number)` per D10.
3. **Add `person_id UUID` column to `dental.clients`** (alias view over `dental.partners WHERE customer=true`). Backfill.
4. **Create `cosmetic` schema with empty mirror tables.** Add `commission_rate_percent` to both `<lob>.products` tables.
5. **Create `shared.referral_locks` + backfill.** One row per existing dental client with a `salestaffid`. `lock_reason='inherited'`, `locked_at = client.created_at`.
6. **Create `shared.employee_lob_scope`** + backfill every current employee with `lob='dental'`.
7. **Add backend LOB middleware behind `COSMETIC_LOB_ENABLED` flag** (default off). When off, all routes behave as today, `search_path=dental, shared, public`.
8. **Add frontend `BusinessUnitContext` + toggle behind same flag.** Flag-off → context returns `selectedLob='dental'` always; toggle never renders.
9. **Flip flag in staging.** Manually grant cosmetic LOB scope to 1-2 test users. Smoke test isolation.
10. **Flip flag in prod** + grant cosmetic scope to designated cosmetic staff. Existing dental users see zero change because they have only `lob='dental'` scope and the toggle stays hidden.

## Testing Strategy

Per `docs/TEST-MATRIX.md`, five new test classes:

1. **Leak tests (highest priority)** — `api/src/__tests__/lob-isolation.test.js`:
   - Cosmetic-only user calls every `/api/dental/*` endpoint → 403.
   - Dental-only user calls every `/api/cosmetic/*` endpoint → 403.
   - Same person inserted in both LOBs → each LOB only sees its own client row.
2. **Lock-fire tests** — insert `dental.clients` → assert `shared.referral_locks` row created. Insert `cosmetic.consultations` → assert correct status + expires_at.
3. **Lock-block tests** — existing lock + different staff retry → `B_REFERRAL_LOCKED`. Same staff retry → success. Cross-LOB retry → success.
4. **Consultation-supersede tests** — open card → attach service → assert new card created with `status='converted'`, old card `status='superseded'` with `superseded_by_consultation_id` set. Commission lookup resolves to the consulting staff of the active card at service time.
5. **Toggle E2E (Playwright)** — single-LOB user: toggle hidden. Owner: toggle visible, switching reloads sidebar, drops dental data from cache (no flash of dental rows on cosmetic screen).
6. **Person dedup** — same phone two enrollments → same `person_id`. Different phone same `identity_number` → same `person_id`. Conflicting match → admin merge UI surfaces correctly.
7. **Commission earning** — payment insert → commission rows for each line. Refund → negative commission rows. Cosmetic commissions resolve to consultation staff; dental commissions resolve to client salestaffid.

## Documentation Updates (mandatory on implementation PR series)

- `AGENTS.md` — three-schema topology, per-request `search_path` discipline, agents must specify LOB when touching cosmetic code.
- `ARCHITECTURE.md` — schema diagram, cross-LOB referral check path, consultation card flow.
- `DESIGN.md` — toggle UX, `BusinessUnitContext` pattern.
- `BEHAVIOR.md` — register `B_REFERRAL_LOCKED` and `B_CONSULTATION_ACTIVE` error envelopes.
- `DECISIONS.md` — log D1–D13.
- `docs/CONTRACTS.md` — add `Lob`, `BusinessUnitScope`, `ReferralLock`, `Consultation`, `Commission` contracts.
- `docs/DATA-MODEL.md` — three-schema breakdown table-by-table.
- `docs/MIGRATIONS.md` — record migration steps 1–10 with reversal notes.
- `docs/SECURITY.md` — leak-prevention guarantee (schema isolation + per-request `search_path` + LOB middleware).
- `docs/RUNBOOK.md` + `docs/runbooks/DEPLOYMENT.md` — feature flag rollout ordering.
- `docs/TEST-MATRIX.md` — register the seven new test classes.
- `docs/CHANGELOG.md` — entry per phase.
- `testbright.md` — acceptance scenarios (toggle, dental lock, cosmetic consultation, commission earn/refund).
- `product-map/schema-map.md` — re-render with three schemas.
- `product-map/domains/` — split `customers-partners.yaml` → `dental-clients.yaml` + `cosmetic-clients.yaml` + `shared-persons.yaml`. Add `commissions.yaml`, `business-unit.yaml`, `cosmetic-consultations.yaml`.
- `product-map/contracts/api-index.md` — add new endpoints.
- `product-map/contracts/permission-registry.yaml` — register six new permissions listed above.
- `product-map/unknowns.md` — record the deferred unlock-rule questions and the dental commission rate strategy.
- `.claude/memory.md` — note the LOB toggle convention so future Claude sessions don't accidentally write cross-schema queries.

## Open Questions / Parked

Captured to `product-map/unknowns.md` on the implementation PR:

1. **Dental lock auto-unlock rules** — eight candidate rules captured in task #10. Suggested for follow-up spec:
   - Time-based: 6 months of zero activity → release
   - Stalled-funnel: 30 days referred-but-no-booking → release
   - Completed-and-cold: last completed service + 6 months
   - Client-initiated switch
   - Inactive-staff release / transfer to manager
   - Refund/cancellation
   - "Preferred" status after unlock (soft vs hard release)
   - Audit notifications on auto-release
2. **Dental commission policy** — do dental services ever earn commission, or stay at 0% forever? If yes, do we adopt the consultation-card model on dental too, or extend the sticky-salestaffid model?
3. **Provider commission split (Knob 3-B)** — when (if ever) do we want to split commission between sales/referrer and the actual procedure provider?
4. **Cross-LOB person profile** — should the customer detail screen show "this person is also a client in <other LOB>" even though the data lives in a different schema? Privacy tradeoff for owner-tier users.
5. **Cosmetic role flags** — finalize the cosmetic.staff role flag list with the cosmetic business owner before migration step 4.
6. **Existing `partners.referraluserid`** — what to do with the text-typed referrer column from the legacy schema during the dental rename. Drop? Keep? Migrate to `referral_locks.lock_reason='inherited-text'`?

## Verification

- `psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -c "\dn"` after migration step 1 shows `dental`, `shared`, `cosmetic` schemas.
- `curl -H 'X-Lob: dental' -H 'Cookie: …' http://localhost:3002/api/dental/clients` returns dental client list. Same with cosmetic. Cross-call (cosmetic user → dental endpoint) returns 403.
- Playwright: log in as `t@clinic.vn`, confirm toggle is visible (owner has both scopes), switch to cosmetic, confirm sidebar updates and `/customers` shows zero clients (fresh cosmetic schema). Screenshot evidence.
- Insert a dental client for Mai → attempt insert with different staff → expect `B_REFERRAL_LOCKED`. Insert a cosmetic client for Mai with any staff → succeeds.
- Open cosmetic consultation for Mai under Linh → attach service → assert new card `status='converted'`, old card `status='superseded'`. Insert payment → assert `cosmetic.commissions` row with `staff_id = Linh`.
- Run full Jest suite + the seven new test classes from the Testing Strategy section. All green.
