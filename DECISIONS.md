# DECISIONS.md

> Accepted project decisions for TGClinic. Add entries when a rule or direction
> should remain durable across sessions.

## Decision Format

```text
DEC-YYYYMMDD-NN: Title
Status: Accepted | Superseded | Proposed
Context:
Decision:
Consequences:
```

## DEC-20260519-01 to DEC-20260519-16: Cosmetic LOB v2 Design Decisions (D1–D16)

**Status:** Accepted (from approved 2026-05-18-cosmetic-line-of-business-design-v2.md + PLAN.md specialist reviews)
**Context:** Introduction of physical two-DB isolation for Cosmetic LOB while preserving dental data integrity, one-login model, CTV dashboard as single new surface, and commission attribution engine.
**See:** `docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-design-v2.md` § Design Decisions table, `docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-governance-delta.md`, product-map/domains/*, PLAN.md
**Consequences:** All future work in feat/cosmetic-line-of-business must honor these; logged here for durability. Table-name decision (earnings) post-review overrides early diagrams.

### DEC-20260519-01 (D1): Database strategy — Two separate Postgres databases
**Decision:** `tdental_demo` (existing, additive-only) + new `tcosmetic_demo`. No cross-DB SQL JOINs; composition in API only (getDb factory + ctv aggregator).
**Consequences:** Dual pools, LOB-aware routes, tcosmetic_demo seeded empty for staff/companies per D16.

### DEC-20260519-02 (D2): Person/client identity — No shared identity table
**Decision:** Independent `clients` in cosmetic vs `partners` in dental. Same human = unrelated rows; soft phone match for admin badge only (lob.crossview).
**Consequences:** No person-merge UI; cross-LOB badge is probe only.

### DEC-20260519-03 (D3): Dental referral lock stays dental-internal
**Decision:** `referral_locks` + rules live only in dental DB; no cross-LOB locking in v1.
**Consequences:** Dental referral_locks unchanged by cosmetic work.

### DEC-20260519-04 (D4): LOB toggle UX
**Decision:** Header dropdown (mirrors LocationContext); visible only for Admin permission-group users with >=2 scopes; non-admin staff are pinned to one scoped LOB; CTV never sees it.
**Consequences:** BusinessUnitContext + keyed remount; persisted localStorage only applies when the user is Admin and allowed to select that LOB.

### DEC-20260519-05 (D5): Permission / scope model
**Decision:** Additive `users.lob_scope TEXT[]` (backfill `['dental']`) + `is_ctv BOOLEAN`. Empty scope = dental legacy. CTV has empty scope + is_ctv flag.
**Consequences:** requireLobScope hard gate + permission soft gate.

### DEC-20260519-06 (D6): Owner cross-LOB rollup
**Decision:** None (no merged reporting). "Also a X client" badge is admin-only (lob.crossview), soft phone probe.
**Consequences:** No unified views in v1.

### DEC-20260519-07 (D7): Cosmetic attribution model
**Decision:** Consultation cards (cosmetic-only) invisible to UI; auto-created on booking with consulting_staff_id; superseded on next; used only by engine.
**Consequences:** No /consultations page.

### DEC-20260519-08 (D8): Cosmetic lock TTL
**Decision:** 6 months from last related activity (engine only).

### DEC-20260519-11 (D11): Commission rate storage
**Decision:** Per-product `commission_rate_percent` (additive on products both DBs; dental defaults 0).

### DEC-20260519-12 (D12): Commission earning trigger
**Decision:** On payment collected. Refunds = negative reversal rows (append-only earnings; original untouched).

### DEC-20260519-13 (D13): Commission recipient resolution
**Decision:** Strict first-match: 1. client.referred_by_ctv_id (CTV wins), 2. cosmetic + active consultation card, 3. dental + salestaffid, 4. none.
**Consequences:** Engine in commissionEngine.js; called from payment paths.

### DEC-20260519-14 (D14): CTV role
**Decision:** `is_ctv` flag on users. CTV users redirect to /ctv on login, 403 on all admin routes. Gated by ctv.* perms.
**Consequences:** Single new UI surface; bypasses Layout/sidebar.

### DEC-20260519-15 (D15): Cosmetic staff role flags
**Decision:** Mirror dental (`isdoctor`, `isassistant`, `isreceptionist`) for v1; rename possible in v1.1.
**Consequences:** Forward compatible.

### DEC-20260519-16 (D16): Cosmetic.staff seeding
**Decision:** Ships empty. Admins add via existing Employees UI under cosmetic LOB.
**Consequences:** No seed data for staff in tcosmetic_demo.

**Additional durable naming decision (PLAN post DB review):** Transactional table named `earnings` (not `commissions`) in both DBs to avoid collision with legacy `commissions` / `commissionproductrules` / `saleorderlinepartnercommissions` (rules/config). Permissions and logical names may retain "commissions.*". Payouts table for batches. See earnings-commissions.yaml.

## DEC-20260502-01: Root Authority Stack

Status: Accepted

Context:
TGClinic had strong local docs in `AGENTS.md`, `website/agents.md`, `website/design.md`, `product-map/`, and `notes/`, but it did not have a single root authority-doc routing pattern.

Decision:
Create and use the root authority stack: `AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md`, `BEHAVIOR.md`, `DECISIONS.md`, `COORDINATION_REQUESTS.md`, `IDEA.md`, and `docs/runbooks/`.

Consequences:
Future work starts from the root authority stack, then drills into `product-map/`, `website/`, and `notes/` as needed. `notes/` remains supporting context, not the highest source of truth.

## DEC-20260502-02: Product Map Remains Mandatory

Status: Accepted

Context:
`product-map/` already tracks domain ownership, schema blast radius, dependency rules, permissions, unknowns, hooks, and tests.

Decision:
Do not replace `product-map/` with new root docs. Root docs route work; `product-map/` governs domain-specific implementation details.

Consequences:
Any schema, API, permission, or UI change must still read the affected domain YAML, `schema-map.md`, `contracts/dependency-rules.yaml`, and `unknowns.md`.

## DEC-20260502-03: Local-First Release Discipline

Status: Accepted

Context:
Production deploy issues have happened when code shipped before migrations, permissions, nginx timeouts, or local verification were complete.

Decision:
All fixes are made and verified locally before VPS changes. VPS deployment happens only after local code, data, migration, and behavior checks are complete.

Consequences:
Agents must not patch VPS files directly as the first fix path. If production is touched, the local cause and local fix path must be documented first.

## DEC-20260502-04: Generated And Secret Artifacts Stay Out Of Git

Status: Accepted

Context:
The project previously tracked local env files, Playwright MCP logs, screenshots, build output, and dependency folders.

Decision:
Generated artifacts, local auth/session files, build output, screenshots, browser logs, `node_modules`, and real env files are not source truth and must stay ignored.

Consequences:
Verification may require reinstalling dependencies locally. Secrets that were committed historically should be considered exposed and rotated or restricted.

## DEC-20260502-05: Website Version Bump For Code Changes

Status: Accepted

Context:
The frontend build exposes version metadata and production release checks rely on version/changelog sync.

Decision:
After website code changes, bump `website/package.json` according to patch/minor/major impact and keep changelog/version metadata aligned.

Consequences:
Docs-only governance changes do not require a website version bump. UI, API-client, behavior, or frontend runtime changes do.

## DEC-20260505-01: Sticky Toolbar Search Spacing

Status: Accepted

Context:
Overview needs a search bar that remains reachable while staff scan filtered appointment results. The first implementation used a fixed desktop label width, which created uneven whitespace between the label and input.

Decision:
Sticky dashboard search/toolbars follow `website/design.md`: standard white card surface, `px-4 py-3`, `gap-3` on mobile, `lg:gap-4` on desktop, content-sized `shrink-0` labels, and no fixed label column unless the page uses an aligned form layout.

Consequences:
Future sticky search bars should feel like compact toolbars, not form rows with reserved label columns. The content below must remain in normal flow so the sticky bar does not overlap panels.

## DEC-20260519-COSMETIC-V2-01: Two physical DBs + partners as identity source for LOB v2 (cosmetic-line-of-business)

Status: Accepted (post cold-audit of worktree + 4 specialist reviews)

Context:
- v2 spec (2026-05-18-design-v2.md) and early PLAN text assumed a `users` table for `lob_scope`, `is_ctv`, `recipient_user_id` FKs.
- Live system + demo + all auth paths (JWT employeeId, partners.password_hash, salestaffid/cskhid attribution, permission checks) use `partners` (single-table inheritance) exclusively. No `users` table exists.
- Commission rules already use a `commissions` table (plus commissionproductrules + saleorderlinepartnercommissions). New transactional earnings would collide on name.

Decision:
1. Physical isolation (D1): `tdental_demo` (untouched shape) + new `tcosmetic_demo` on same Postgres 5433. No cross-DB JOINs ever.
2. Identity/auth LOB fields live on `partners` (not `users`): `lob_scope TEXT[]`, `is_ctv BOOLEAN DEFAULT FALSE`, `referred_by_ctv_id UUID` (on customer rows).
3. Transactional table named `earnings` (not `commissions`) in both DBs. `payouts` for batches. `consultations` cosmetic-only (invisible). `referral_locks` dental-only.
4. Recipient resolution (D13) uses `recipient_partner_id` (FK in dental DB; soft + API-validated in cosmetic).
5. All changes additive + reversible. Feature flag + local-only until Phase 4.
6. DB factory `getDb('dental'|'cosmetic')` with separate pools (api/src/db/index.js).

Consequences:
- Every auth/redirect/permission/middleware change must read `partners.lob_scope` / `is_ctv` (deviation from literal v2 spec text must be called out in all authority docs).
- Product-map, DATA-MODEL, ARCHITECTURE, MIGRATIONS, RUNBOOKS updated.
- Commission engine writes to `earnings` only (never touches legacy commission* tables).
- CTV dashboard aggregates `earnings` from both DBs server-side.
- Bootstrap of tcosmetic_demo uses schema-only dump of dental for 1:1 table names (partners, products, etc.) so mirror routes (`/api/cosmetic/Partners` etc.) reuse handlers exactly.

References:
- PLAN.md (DB + Auth specialist reports + "Chosen Naming")
- 2026-05-18-cosmetic-line-of-business-design-v2.md (D1–D16)
- Migration 047 + bootstrap script
- .claude/memory.md (session notes on the audit finding)
