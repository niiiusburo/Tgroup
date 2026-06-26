# PRD — NK Investor Portal (Curated Client Visibility)

> **Status:** Draft for sign-off · **Owner:** TBD · **Target version:** `website` 0.38.0 (feature → minor bump, INV-020)
> **Authority stack read for this PRD:** AGENTS.md (§1, §1.1, §1.2, §3, §16), ARCHITECTURE.md, BEHAVIOR.md (F1–F9), DECISIONS.md, docs/CONTRACTS.md, docs/SECURITY.md, docs/INVARIANTS.md (INV-006/008/009/020), product-map/domains/{auth,patient-portal,customers-partners,business-unit}.yaml, product-map/contracts/{permission-registry,dependency-rules}.yaml.
> **Exemplar (Exemplar-First):** the existing **patient portal** — `api/src/middleware/patientAuth.js`, `api/src/routes/patient/auth.js`, `api/migrations/066_patient_portal_tables.sql`. The investor portal is a sibling external read-only surface and mirrors that pattern, with the deltas this PRD specifies.

---

## 1. Summary

Clinic staff tick a **per-client checkbox**; an **investor logs into a separate, read-only portal** and sees **only the clients ticked for them**, and only a **privacy-safe slice** of each client's data (no clinical, biometric, identity, or contact PII). This proves a curated "book of business" to investors without exposing patient records.

The checkbox is trivial. The real work — and the entire content of this PRD — is the **external login**, the **per-record access gate (IDOR)**, the **field-level data minimization**, and conforming to NK's **two-DB, governance, and behavior** rules so nothing existing breaks.

### Problem
The owner wants to show selected clients to an investor. Today there is **no investor identity, no per-client visibility flag, and no safe projection** — every client endpoint (`getPartnerById`) returns clinical PII, and there is no external read-only surface except the patient portal (which is per-self, not curated).

### Goals
- Staff can mark/unmark any client as visible to a specific investor.
- An investor logs in and sees exactly their visible set — nothing else, ever.
- Investors see only privacy-safe fields; clinical/biometric/identity/contact data is never exposed.
- The feature is fully governed (contracts, docs, permissions, migrations, tests) and breaks no invariant.

### Non-goals (explicitly out of scope for v1)
- Cross-LOB investors (one investor seeing both dental + cosmetic). **Deferred to V2** (requires a DECISIONS.md deviation — see DEC-2). MVP investors are **LOB-pinned**.
- Investor self-signup. Investors are **admin-provisioned only**.
- Investor write access of any kind. The portal is **strictly read-only**.
- Tiered/"premium" investor permission levels. Flat model for v1 (documented assumption).
- Bulk multi-select toggle and CSV/PDF export (V2).

---

## 2. Red-Team Verdict & Resolved Decisions

A 6-lane adversarial review (security, two-DB integrity, governance/invariants, auth/session, performance/ops, contracts/behavior) produced 73 findings (13 critical, 36 high) and a 66-row compliance matrix. The findings are folded into this PRD's **Risk Register (§16)** and design. Two architectural decisions resolve ~6 of the highest-severity findings at once:

| Decision | Resolution | Kills findings |
|---|---|---|
| **DEC-2 LOB scope (MVP)** | Each investor is **pinned to ONE LOB** (`dental` OR `cosmetic`). No cross-pool reads. | INV-002, SEC-04/05 (cross-LOB), PERF-001 (fan-out), ARK-001/002 |
| **FORK-SCOPE** | **Per-investor** allowlist via `investor_clients` join (not a global boolean). | Multi-investor leakage class |
| **DEC-1 identity** | **Separate `investor_accounts` table** + explicit DECISIONS.md deviation record. | INV-001 governance tension |
| **FORK-DATA** | **Named roster + financial aggregates only**; everything else redacted via a Zod allow-list. | SEC-04, GOV-007, DATA-001 |

---

## 3. Key Decisions (for sign-off)

### DEC-1 — Where does investor identity live? → **Separate `investor_accounts` table** *(recommended)*
- **Tension:** AGENTS.md §3 + `business-unit.yaml` state *"partners is the canonical identity/auth source; NO users table."* The patient portal stores patient creds **on `partners`** (because patients **are** customers with clinical records).
- **Resolution:** Investors are **external, non-clinical, non-LOB** actors — not partners. Putting them in `partners` pollutes the single-table-inheritance roster and the clinical/LOB identity the rule protects. Use a dedicated `dbo.investor_accounts` table, and **record the deviation in DECISIONS.md (DEC-20260625-IP-01)** so governance is explicit.
- **Alternative (rejected for v1):** `partners.is_investor` flag — keeps "one identity table" but mixes an external financial-stakeholder role into the clinical roster and complicates redaction/audit.

### DEC-2 — LOB scope → **LOB-pinned investor (v1)** *(recommended)*
- **Tension:** AGENTS.md §3:85-89 — *"CTV paths and commissionEngine are the ONLY surfaces allowed to read BOTH pools."* A cross-LOB investor would be a **new cross-pool surface** = a governance violation **and** would amplify the known NK3 connection-pool contention (`project_nk3_perf_root_cause`).
- **Resolution (v1):** each investor has a single `lob` (`dental`|`cosmetic`). All investor queries run on that one pool via `getDb(investor.lob)`. No fan-out, no cross-DB SQL, no dedupe problem.
- **V2 path (if a cross-LOB investor is required):** add an explicit DECISIONS.md entry adding the investor read-path to the allowed cross-pool surfaces, compose in the **API layer only** (parallel `getDb('dental')` + `getDb('cosmetic')`, no cross-DB JOIN), and dedupe the same human across LOBs by **phone** (reuse the `cross-lob-probe` pattern), not by `partner_id`.

### FORK-SCOPE — Visibility model → **Per-investor `investor_clients` join** *(recommended)*
Each investor logs in separately and may have a different curated set, so a single global boolean is insufficient. A join table `(investor_id, partner_id, lob, is_visible)` gives per-investor curation and clean revocation.

### FORK-DATA — What the investor sees → **Named roster + aggregates** *(recommended; confirm field list at sign-off)*
Default visible fields: `name, gender, birth_year, appointment_count, order_count, deposit_balance, outstanding_balance, status`. **Redacted (never sent):** `medicalhistory, identitynumber, healthinsurancecardnumber, phone, email, face_subject_id/embeddings, comment/notes, payment notes, staff/owner refs`. *(Open question: include `birth_year`? It is weak PII. Default = include `birth_year`; exclude full DOB.)*

---

## 4. Actors & Roles

| Actor | Capability | Identity |
|---|---|---|
| **Investor** | Read-only; sees only their visible set, safe fields only, one LOB | `investor_accounts` row, JWT `type=investor` |
| **Staff (curator)** | Toggle a client's visibility for an investor | `partners` employee + `customers.set_investor_visibility` |
| **Admin** | Provision/deactivate investors, assign their LOB, view audit | `investors.manage` permission |
| **System** | Investor-view audit logger | append-only writes |
| **Adversary** | Scrape client ids, replay tokens, harvest PII, escalate via shared secret | mitigated by §8 + §9 |

---

## 5. Data Model & Migrations

All tables created in **both** `tdental` and `tcosmetic` via **separate, reversible** migrations. No cross-DB SQL or FK. Default flag state is **OFF** (opt-in).

### 5.1 `dbo.investor_accounts` (DEC-1)
```
id                 uuid PK
email              text UNIQUE NOT NULL          -- login id (B2B)
password_hash      text NOT NULL                 -- bcrypt, never null after provisioning
investor_name      text
lob                text NOT NULL CHECK (lob IN ('dental','cosmetic'))  -- DEC-2 pin
is_active          boolean NOT NULL DEFAULT true  -- checked EVERY request
created_by_partner_id uuid                        -- which admin provisioned
last_login         timestamptz
created_at         timestamptz NOT NULL DEFAULT now()
updated_at         timestamptz
```

### 5.2 `dbo.investor_clients` (FORK-SCOPE)
```
id                 uuid PK
investor_id        uuid NOT NULL REFERENCES investor_accounts(id) ON DELETE CASCADE
partner_id         uuid NOT NULL                  -- a customer in THIS db (no cross-DB FK)
lob                text NOT NULL CHECK (lob IN ('dental','cosmetic'))
is_visible         boolean NOT NULL DEFAULT true
marked_by_partner_id uuid NOT NULL                -- staff who toggled (audit)
marked_at          timestamptz NOT NULL DEFAULT now()
UNIQUE (investor_id, partner_id, lob)
```
Index: `btree (investor_id) WHERE is_visible = true`.

### 5.3 `dbo.investor_view_audit` (append-only; reuse `exports_audit` shape)
```
id                 uuid PK
investor_id        uuid NOT NULL
action             text NOT NULL                  -- 'login' | 'list' | 'detail'
resource_id        uuid                           -- partner_id, or null for list
row_count          int
ip_address         inet
user_agent         text
created_at         timestamptz NOT NULL DEFAULT now()
```
Append-only; non-blocking write (catch-and-log); investors cannot read it; retention 1 year (configurable).

### 5.4 Migration discipline (DEPLOY-001, GOV-012, INV two-DB)
- Files: `0NN_investor_portal.sql` applied to `tdental` **and** `tcosmetic` (identical schema).
- Each migration ships its **down/rollback** block (`DROP TABLE … CASCADE`).
- Ship `api/scripts/verify-investor-migrations.js` — post-deploy, compares column sets of both DBs, exits non-zero on drift.
- Runbook: `docs/runbooks/INVESTOR_PORTAL_DEPLOY.md` (apply order, verify query `SELECT 1 FROM investor_clients WHERE 1=0`, rollback order).
- Update `product-map/schema-map.md` blast radius **before** writing migrations.

---

## 6. Contracts (Contracts-First — MANDATORY EDIT PROTOCOL)

Per CLAUDE.md MANDATORY EDIT PROTOCOL + AGENTS.md §3, **Zod schemas are written FIRST** so the type checker enumerates breakage. New file `contracts/investor.ts`:
- `InvestorAccountSchema` — id, email, investor_name, lob, is_active, created_at.
- `InvestorClientSchema` — investor_id, partner_id, lob, is_visible, marked_by_partner_id, marked_at.
- `InvestorClientResponseSchema` — **the safe projection allow-list** (`.pick()` only: id, name, gender, birth_year, appointment_count, order_count, deposit_balance, outstanding_balance, status). This schema IS the redaction boundary (§9).
- `InvestorAuthResponseSchema` — token, investor, permissions[].
- Error envelope per BEHAVIOR.md F4 (typed codes: `U_INVESTOR_NOT_FOUND`, `S_INVESTOR_DEACTIVATED`, `S_INVESTOR_ONLY`, `E_FETCH_FAILED`).

**Ripple (CON-001):** adding the toggle does **not** change `PartnerBaseSchema` (the flag lives in `investor_clients`, not on `partners`) — this avoids drift into PartnerCreate/report/export shapes. Bump `docs/CONTRACTS.md` → next version with an "Investor Portal" entry + consumer/test list.

---

## 7. API Surface

New isolated namespace `/api/investor/*` (GOV-002: owned by a new `product-map/domains/investor-portal.yaml`).

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/api/investor/auth/login` | **public** | email+password → JWT `type=investor`; rate-limited |
| POST | `/api/investor/auth/password-reset-request` | public | single-use token, 1h TTL |
| POST | `/api/investor/auth/password-reset` | public | consumes token |
| GET | `/api/investor/me` | investor | profile (safe) |
| GET | `/api/investor/clients` | investor | paginated list, **safe projection only** |
| GET | `/api/investor/clients/:partnerId` | investor | 404 if not in caller's visible set |
| PATCH | `/api/Partners/:id/investor-visibility` | staff + `customers.set_investor_visibility` | body **only** `{ investorId, isVisible }`; never accepts raw partner fields |

**Mounting (SEC-07):** mount `/api/investor` **before** the global `requireAuth` gate (copy patient pattern `server.js:166`), and add the two public auth routes to `PUBLIC_EXACT_PATHS` in `publicApiPaths.js` — else login is 403-forever.

**IDOR gate (SEC-02, IDOR-001, GOV-013) — on every investor record access:**
1. Derive `investor_id` from JWT only (never from query/body).
2. `SELECT 1 FROM investor_clients WHERE investor_id=$1 AND partner_id=$2 AND lob=$investorLob AND is_visible=true`.
3. Join `investor_accounts.is_active=true` and `partners.isdeleted=false`.
4. Return **404** (not 403) on miss, to hide existence.
5. Parameterized queries only.

**List query (Lifecycle.Delete + pagination, PERF-002):**
`… WHERE is_visible=true AND p.customer=true AND p.isdeleted=false` on `getDb(investor.lob)`, `LIMIT/OFFSET` (default 50, max 500), single pre-resolved id set (no N+1). Balance aggregates computed via bounded JOINs; consider a cached balance summary if list latency exceeds budget.

**Rate limiting (SEC-08, SECURITY.md):** login 5 failures/15min per email + per-IP; investor API ≤100 req/min per investor (anti-scrape).

---

## 8. Auth & Security

| # | Requirement | Source finding |
|---|---|---|
| A1 | **Distinct `INVESTOR_JWT_SECRET`** (mandatory; error if missing) — never fall back to `JWT_SECRET`/`PATIENT_JWT_SECRET`. A different secret makes investor tokens structurally unverifiable on staff routes. | SEC-01/02 |
| A2 | JWT payload `{ sub: investor_id, type: 'investor', lob, iat, exp }`; `requireInvestorAuth` asserts `decoded.type === 'investor'` (copy `patientAuth.js:20-23`). | SEC-02, AUTH-001 |
| A3 | **Defense-in-depth (recommended):** add `type:'staff'` to staff tokens and validate it in `requireAuth`, closing the type-less-token asymmetry confirmed at `auth.js:146-159`. | AUTH-001 (confirmed) |
| A4 | **`is_active` checked on EVERY request** in `requireInvestorAuth` (not cached in JWT) → deactivation is instant. Token TTL 7d (shorter than patient 30d). | SEC-01/SEC-10 (deactivation gap) |
| A5 | Admin-provisioned only; **no `register` endpoint**. Admin sets initial password (random, shown once). | SEC-06 |
| A6 | Password reset: single-use, hashed, 1h TTL token; unique email constraint prevents reset hijack. | SEC-06 |
| A7 | Staff/CTV/patient tokens are **rejected** on `/api/investor/*`; investor tokens are rejected on all `/api/*` non-investor routes (A1 secret isolation already enforces this). | SEC-001/SEC-05 |
| A8 | No write path from the investor surface to any operational table (read-only by construction). | SEC-001 |

---

## 9. Data Minimization (the privacy boundary)

- **Never reuse `getPartnerById`** — it returns `identitynumber, healthinsurancecardnumber, medicalhistory, face_subject_id, comment` (confirmed `getPartnerById.js`). Build a **dedicated SQL projection** for `/api/investor/clients`.
- The allow-list lives in **one place**: `InvestorClientResponseSchema` (`.pick()`); the route returns `schema.parse(row)` so an un-allowed column cannot leak even if added to the query later.
- **Mandatory test** `clientRedaction.test.js`: feed a row containing all 100+ partner columns; assert the response contains **only** the safe keys and **none** of the redacted ones.
- Document the data-minimization model in `docs/SECURITY.md` (cite as the model for external portals).

---

## 10. Permissions & RBAC (GOV-001, machinery-enforced)

- Register in `product-map/contracts/permission-registry.yaml` (pre-commit `verify:permissions` will reject otherwise):
  - `customers.set_investor_visibility` — staff toggle (assign to **Admin** tier first; delegate to Manager in a later phase).
  - `investors.manage` — provision/deactivate investors + view audit (Admin only).
- Wire `requirePermission('customers.set_investor_visibility')` on the PATCH toggle; `investors.manage` on admin investor routes.
- Investor permission model is **flat** (read-only) — documented assumption; no tier_id (SEC-06). If tiers are ever needed, add `investor_tier` config rather than ad-hoc tables.
- Update `product-map/domains/auth.yaml` per `dependency-rules.yaml: permission-change`.

---

## 11. Frontend

### 11.1 Staff checkbox (Customers page) — BEHAVIOR.md F1/F2
- Mirror the existing actions-column render pattern (`CustomerColumns.tsx`); add a "Visible to investor" control (per-investor selector if >1 investor in that LOB).
- **F1 consequence preview:** on toggle-on, confirm *"This client will be visible to investor <name>."*
- **F2 disabled-explains-itself:** disabled + tooltip when: no `customers.set_investor_visibility` permission ("You don't have permission to manage investor visibility"); client `isdeleted` ("Deleted clients can't be shared"); no investor exists in this LOB ("Create an investor first").
- **Optimistic toggle** with rollback + typed error on failure.
- Accent-insensitive search on the client list (INV-006 / AGENTS.md §1.1 `normalizeText`).

### 11.2 Investor portal — BEHAVIOR.md F4/F9
- **Four states (F9):** loading skeleton; empty ("No clients have been shared with you yet"); error (typed envelope F4 + remediation); success (DataTable of safe fields + drill-down).
- Login page, list, detail; mobile (375) + desktop (1440).
- **i18n EN + VI** for every new string (BEHAVIOR.md §9) — no hardcoded English on VI pages.
- New files carry `@crossref` breadcrumbs (AGENTS.md §5.2; `verify:crossref`).

---

## 12. Two-DB / LOB Discipline (AGENTS.md §3)
- All reads/writes via `getDb(investor.lob)` — single pool per investor (DEC-2). No cross-DB SQL or JOIN.
- Flag/tables mirrored in both DBs; schema parity verified post-deploy (§5.4).
- `customers.set_investor_visibility` writes target the LOB-local `investor_clients` row only.

---

## 13. Performance & Ops
- Pagination mandatory on the list (PERF-002).
- Index `investor_clients(investor_id) WHERE is_visible=true`.
- No cross-LOB fan-out in v1 (DEC-2) → no added pool pressure on the known NK3 bottleneck (`project_nk3_perf_root_cause`).
- Audit writes non-blocking.
- Deploy runbook + schema-sync verifier (§5.4); version bump 0.38.0 + `website/public/CHANGELOG.json` entry (INV-020 / CLAUDE.md Release Notes).

---

## 14. Governance & Docs Checklist (AGENTS.md §16 — machinery-enforced; missing = rollback)
- [ ] `contracts/investor.ts` (FIRST) + `docs/CONTRACTS.md` version entry + ripple list
- [ ] `product-map/domains/investor-portal.yaml` (new domain, ownership)
- [ ] `product-map/contracts/permission-registry.yaml` (2 new permissions)
- [ ] `product-map/contracts/api-index.md` (investor endpoints)
- [ ] `product-map/schema-map.md` (3 new tables, both DBs)
- [ ] `docs/SECURITY.md` (investor data-minimization + JWT segmentation)
- [ ] `docs/USE-CASES.md`, `docs/WORKFLOWS.md` (investor flows)
- [ ] `docs/TEST-MATRIX.md` (investor coverage rows)
- [ ] `DECISIONS.md` (DEC-1 identity table, DEC-2 LOB-pin)
- [ ] `docs/CHANGELOG.md` + `website/public/CHANGELOG.json` + `website/package.json` 0.38.0
- [ ] `testbright.md` (investor test credentials + live-debug lane)
- [ ] `@crossref` breadcrumbs on all new files

---

## 15. Testing & Verification (CLAUDE.md §12/§13 + TEST-MATRIX 80%)
- **Unit:** Zod schema validation; redaction allow-list (§9).
- **Integration (`api/src/routes/investor/__tests__/`):** login type-boundary (staff/patient token → 403); **IDOR** (investor A cannot see B's clients; unflagged client → 404); soft-deleted client filtered; deactivation instant-revoke; rate-limit.
- **E2E (Playwright, real browser — mandatory per CLAUDE.md):** staff toggles a client → investor logs in → sees exactly that client (safe fields) → un-toggle → client gone on refresh; investor blocked from `/api/Partners/:id` and admin pages. Screenshots at 375 + 1440.
- Minimum 80% coverage for `api/src/routes/investor/`.

---

## 16. Risk Register (red-team findings → mitigations)

| ID | Sev | Risk (grounded) | Mitigation (in this PRD) |
|---|---|---|---|
| SEC-01/02 | 🔥 | Staff JWTs type-less; `requireAuth` no type check (`auth.js:146-159,16-29`) → shared-secret cross-type risk | §8 A1–A3 distinct `INVESTOR_JWT_SECRET` + type assert + staff `type` |
| SEC-04/DATA-001 | 🔥 | `getPartnerById` returns clinical PII | §9 dedicated projection + Zod allow-list + redaction test |
| SEC-07 | 🔥 | Global `requireAuth` gate blocks login | §7 mount before gate + `publicApiPaths` |
| IDOR-001/SEC-02 | 🔥 | Investor reads unflagged client by id | §7 per-record gate → 404 |
| SEC-01/10 | 🔥 | Deactivated investor valid until token expiry | §8 A4 `is_active` every request + 7d TTL |
| INV-001 | 🔥 | `investor_accounts` vs partners-canonical-identity | DEC-1 + DECISIONS.md deviation |
| INV-002/PERF-001 | 🔥 | Cross-LOB = new cross-pool surface + pool pressure | DEC-2 LOB-pin (v1) |
| GOV-001 | ⚠️ | Unregistered permission → silent 403 | §10 register in permission-registry |
| GOV-005 | ⚠️ | Contracts written last | §6 contracts-first |
| GOV-011/INV-020 | ⚠️ | Missing docs + version bump → rollback | §14 checklist + 0.38.0 |
| DEPLOY-001/GOV-012 | ⚠️ | Manual two-DB migration drift | §5.4 reversible + schema-sync verifier + runbook |
| SEC-03 | ⚠️ | Mass-assignment via dynamic `PUT /Partners/:id` | §7 dedicated PATCH, body `{investorId,isVisible}` only |
| INV-004 | ⚠️ | Soft-deleted client still visible | §7 `isdeleted=false` every query |
| SEC-06 | ⚠️ | Provisioning/reset attack surface | §8 A5/A6 admin-only + single-use token |
| BEH-001/002/003 | ⚠️ | Missing disabled/four/error states | §11 F1/F2/F4/F9 |
| INV-006 | 〽️ | Accent-insensitive search | §11 `normalizeText` |
| PERF-002 | 〽️ | N+1 / unbounded list | §7/§13 pagination + index |

---

## 17. Phasing & Sequencing

**MVP (build order — contracts-first):**
1. Read authority stack + graphify blast-radius; `DECISIONS.md` DEC-1/DEC-2; new `investor-portal.yaml` domain.
2. `contracts/investor.ts` + CONTRACTS.md version.
3. Migrations (both DBs, reversible) + schema-sync verifier + permission registry.
4. `investorAuth.js` (`INVESTOR_JWT_SECRET`, type assert, `is_active` check) + mount before gate + publicApiPaths.
5. `/api/investor/auth/login`, `/api/investor/clients` (safe projection + IDOR gate + pagination) + rate-limit.
6. Staff `PATCH /Partners/:id/investor-visibility` + permission + Customers checkbox (F1/F2).
7. Investor portal UI (F9/F4, i18n) + audit logging.
8. Tests (IDOR/redaction/deactivation/E2E Playwright) + docs checklist + 0.38.0 + CHANGELOG.json.

**V1:** invite email/reset UX, session management, bulk audit views, Manager-tier delegation of the toggle.
**V2:** cross-LOB investor (DEC-2 V2 path), CSV/PDF export, bulk multi-select toggle, per-investor analytics dashboard, expiring/time-boxed access.

---

## 18. Definition of Done
- Investor logs in (real browser) and sees only their visible, non-deleted clients with safe fields only; screenshots captured.
- Negative tests pass: staff/patient token → 403 on `/api/investor/*`; unflagged/other-investor client → 404; deactivated investor → blocked within seconds; redaction test green.
- Both DBs migrated + schema-sync verifier green; rollback rehearsed.
- §14 governance checklist complete; `verify:permissions`, `verify:docs`, `verify:crossref`, typecheck, lint, tests all green; 0.38.0 + CHANGELOG.json shipped.

---

## 19. Open Decisions for Sign-off
1. **DEC-1** — separate `investor_accounts` table (recommended) vs `partners.is_investor`?
2. **DEC-2** — LOB-pinned investor for v1 (recommended) vs cross-LOB now (requires governance deviation)?
3. **FORK-DATA** — confirm the exact safe-field allow-list; include `birth_year`? expose phone/email at all?
4. **Toggle permission tier** — Admin-only first (recommended) vs Manager too?
5. **# of investors expected at launch** — confirms per-investor join is warranted (it is, unless strictly one investor forever).
