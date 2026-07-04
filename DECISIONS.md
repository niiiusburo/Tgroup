# DECISIONS.md

> Accepted project decisions for TGClinic. Add entries when a rule or direction
> should remain durable across sessions.

**2026-05-19 Sync Note (Documentation & Authority Sync Agent):** Cosmetic LOB v2 D1–D16 + reality alignment complete. partners table (both DBs) is the identity source for LOB/CTV flags and D13 attribution (deviation from v2 spec early text calling for users/clients); earnings (append-only) vs legacy commissions rules. See governance-delta-cosmetic-lob-v2.md, product-map split domains (business-unit, earnings-commissions etc.), MIGRATIONS.md:047, AGENTS.md LOB discipline. All listed authority files updated.

## Decision Format

```text
DEC-YYYYMMDD-NN: Title
Status: Accepted | Superseded | Proposed
Context:
Decision:
Consequences:
```

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

## DEC-20260704-01: Investors Use Same Portal With Customer Allowlist

Status: Accepted

Context:
An earlier investor implementation risked becoming a separate portal. Product policy now requires investors to use the same NK/NK2 login, app shell, JWT session, and permission system as employees/admins, while seeing only customers explicitly allowed by an admin.

Decision:
Investor access is a restricted normal-portal permission group. Customer-derived reads, reports, exports, appointments, payments, service cards, and direct profile URLs must enforce `dbo.investor_clients` server-side. Do not introduce `/investor/*`, `/api/investor/*`, investor-specific token storage, or a separate `InvestorAuthContext`.

Consequences:
Admin visibility controls stay inside the normal portal. Investor writes remain forbidden unless a future decision names the exact write permission and scope. NK/NK2 had an earlier same-portal successor table where `investor_clients.investor_id` points to `investor_accounts.id`; runtime scope resolution and admin visibility writes must preserve that existing allowlist data while still exposing the normal `partners.id` session identity. Same-portal behavior is guarded by INV-021 and the investor API tests.

## DEC-20260704-02: Deploy Candidates Must Contain Live Commit

Status: Accepted

Context:
NK/NK2 lost already-live work when a later hotfix deployed from a sibling worktree whose branch did not contain the current live `version.json.gitCommit`.

Decision:
Every NK, NK2, or NK3 deploy must run `scripts/deploy-preflight.js` through `scripts/deploy-build-args.sh` from the exact deploy worktree. The preflight requires a `DEPLOY_FEATURES` manifest and refuses candidates that do not contain the target site's live commit.

Consequences:
Old work that already exists must be re-ported or rebased onto the live baseline before deployment. Emergency bypasses must be named in the report with the bypass env var, reason, and rollback path. Worktree audits can identify stale/dirty sibling branches before release planning.
