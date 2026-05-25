# NK release: 0.32.34 → 0.32.35 (NK2 → NK promotion)

> Authoritative delta artifact. Lists every commit, every runtime file, every user-visible behavior change, and the post-deploy verification plan.

| Field | Value |
| --- | --- |
| **Source** | NK2 staging — https://nk2.2checkin.com (web 0.32.35, api 1.2.2, built 2026-05-20 08:06 UTC) |
| **Target** | NK production — https://nk.2checkin.com (web 0.32.34, api 1.2.2, built 2026-05-19 02:56 UTC) |
| **Source commit** | `63880578` — "chore(release): pin 0.32.35 CHANGELOG.json commit hash" |
| **Target current commit** | `13acedbf` — "Fix feedback attachment persistence" |
| **Branch** | `fix/feedback-reports` (both source and target live on this branch) |
| **VPS path (prod)** | `/opt/tgroup` (git checkout, deploys via `git pull && docker compose up -d --build`) |
| **Container scope** | `tgroup-api`, `tgroup-web` (db, face-service untouched) |
| **DB migration** | None — runtime delta touches no DDL |
| **Rollback** | `git -C /opt/tgroup reset --hard 13acedbf && docker compose up -d --build api web` |

## Commits being shipped (8)

```
63880578  chore(release): pin 0.32.35 CHANGELOG.json commit hash
fb9f3884  fix(appointments): persist companyId on PUT /api/Appointments/:id (0.32.35)   *user-visible*
abd33dc3  docs(authority): cement cosmetic LOB v2 spec + authority sync
b602a34b  feat(product-map): add canonical export feature catalog
eac0270d  feat(prevent): defense-in-depth against the 5-cycle export regression
2b6e7618  fix(exports): persist Note column fixes + lock column registry                *user-visible*
1f46c549  docs(specs): add cosmetic line-of-business design + SMS research
69e96e5a  wip: revenue report fixes, payment method cleanup, doc refresh                *user-visible*
```

## User-visible feature changes

### F1 — Appointment Edit persists clinic location (`companyid`)
- **Commit:** `fb9f3884`
- **Symptom on NK today:** when a user edits an appointment and changes the `cơ sở` (clinic location) dropdown, the new value is **not saved**. After reload the appointment shows the old location.
- **Fix:**
  - `api/src/routes/appointments/mutationHandlers.js` — `PUT /api/Appointments/:id` now reads `companyId` (and `companyid` alias) from the request body, validates as UUID, FK-checks against `companies`, writes to `appointments.companyid`.
  - `website/src/.../appointmentForm.mapper` — sends `locationId` as `companyid` (plus `companyname`) in the update payload.
- **Test coverage added:**
  - `api/src/routes/appointments/__tests__/mutationHandlers.test.js` — valid UUID writes, missing-FK 404, malformed UUID 400.
  - `website/src/.../__tests__/appointmentForm.mapper.test.ts` — payload assertion vs `AppointmentUpdateSchema`.

### F2 — Revenue & Deposit exports — Note columns now persist
- **Commit:** `2b6e7618`
- **Symptom on NK today:** the `Note thanh toán` (revenue) and `Note cọc tiền` (deposit) columns were missing values in the Excel exports.
- **Fix:**
  - `api/src/routes/exports/builders/legacyFlatRevenueQuery.js` — adds the note column to the SELECT.
  - `api/src/routes/exports/builders/legacyFlatDepositQuery.js` — adds the note column to the SELECT.
  - `legacyFlatReportColumns.js` + `legacyFlatReportsExport.js` — adds the column to the registry so it gets emitted.
- **Defense added:** `eac0270d` + `b602a34b` add a canonical feature catalog at `product-map/features/exports/*.yaml` and a `allBuilderColumns.lock.test.js` that fails CI if any export builder column is removed without an explicit registry update — prevents the 5-cycle regression where this column kept getting dropped.

### F3 — Revenue report subpages — small UX cleanup
- **Commit:** `69e96e5a` (wip)
- **Symptom on NK today:** minor revenue-report rendering nits, plus stale `useDeposits` import that did nothing.
- **Fix:**
  - `website/src/pages/reports/ReportsRevenue.tsx` — 8-line cleanup.
  - `api/src/routes/reports/revenue.js` — 28-line tweak (revenue recognition wording / grouping).
  - `website/src/hooks/useDeposits.ts` — removes 3 dead lines.
- Tests updated: `revenueRecognition.test.js`, `ReportsSubpages.test.tsx`, `useReportData.test.ts`.

### F4 — Build/observability: `/version.json` now stamps real git SHA
- **Commits:** `69e96e5a` (Dockerfile + compose), `63880578` (CHANGELOG pin)
- **Symptom on NK today:** `https://nk.2checkin.com/version.json` reports `"gitCommit": "unknown"` and `"gitBranch": "unknown"` — no way to verify what's actually deployed.
- **Fix:**
  - `Dockerfile.web` — accepts `GIT_SHA` and `GIT_BRANCH` build args, bakes them into the bundle.
  - `docker-compose.yml` — wires `${GIT_SHA:-unknown}` / `${GIT_BRANCH:-unknown}` through the build args.
  - `scripts/deploy-build-args.sh` — new helper that exports the SHA before the build (must be sourced on deploy).
  - `scripts/require-clean-tree.sh` — gate to refuse deploy from a dirty working tree.
- **Deploy implication:** the prod deploy command MUST `source scripts/deploy-build-args.sh` (or `export GIT_SHA=$(git rev-parse HEAD) GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)`) before `docker compose up -d --build web`, otherwise the SHA stays `unknown`.

## Non-runtime changes (ship-safe, no behavior impact)

| Path | Why it changed |
| --- | --- |
| `docs/CHANGELOG.md`, `docs/CONTRACTS.md`, `docs/DATA-MODEL.md`, `docs/MIGRATIONS.md`, `docs/RUNBOOK.md`, `docs/WORKFLOWS.md`, `docs/USE-CASES.md`, `docs/TEST-MATRIX.md`, `docs/SECURITY.md`, `docs/runbooks/DEPLOYMENT.md`, `docs/runbooks/VERIFICATION.md` | Documentation refresh for the cosmetic-LOB & exports work. |
| `docs/ADR/2026-05-18-cosmetic-line-of-business-design*.md`, `docs/ADR/2026-05-18-sms-messaging-system-research.md` | New ADRs (LOB v2 + SMS research). |
| `product-map/domains/*.yaml`, `product-map/contracts/*`, `product-map/schema-map.md`, `product-map/system-map.md`, `product-map/governance-delta-cosmetic-lob-v2.md` | Map expansion: new domains (`ctv`, `business-unit`, `cosmetic`, `cosmetic-clients`, `earnings-commissions`), updated `permission-registry`, dependency rules. |
| `product-map/features/exports/*.yaml` (8 new) | Canonical export feature catalog — the "lock" file the new test compares against. |
| `AGENTS.md`, `DECISIONS.md`, `COORDINATION_REQUESTS.md`, `testbright.md`, `.claude/memory.md`, `notes/🚀 Deployment Guide.md` | Agent-process & memory docs. |
| `.husky/pre-commit`, `.github/workflows/pr-checks.yml`, `.claude/settings.json`, `.gitignore`, `scripts/sync-claude-mem.sh`, `scripts/verify-docs.sh` | Tooling: pre-commit checks, PR CI, dev hygiene. |
| `website/scripts/generate-version.js`, `website/public/CHANGELOG.json`, `website/package.json` (→ 0.32.35), `website/package-lock.json` | Version stamp + changelog entry. |
| `package.json` (root) | 5-line script/version touch. |
| `website/src/components/shared/useFaceCaptureController.ts` + `FaceCaptureModal.test.tsx` | Tiny face-capture controller tweak (frontend only, NK already serves face-capture via compreface). |
| `contracts/payment.ts` + `dist/payment.{js,d.ts}` | **Comment change only** — the `method` enum value is identical (`cash, bank_transfer, deposit, mixed`) in both versions. Verified. |

## Files NOT being shipped (intentionally excluded)

These commits exist on local `fix/feedback-reports` HEAD past `63880578` but were **not built into NK2 staging** and must **not** ride along to NK:

```
0cc3f9fd  test(exports): cross-check feature-catalog YAML vs builder COLUMNS
16bfe5ba  chore(scripts): add NK DB backup, NK2 regression, authority-check
d456bdff  chore(audits): archive cosmetic-LOB swarm + nk2-deeplink reports
24b4144f  feat(cosmetic-lob-v2-gap-b): LOB-aware apiFetch routing with vitest coverage
7652bcb2  feat(auth): CTV user redirect and AuthUser type extension
```

These are part of the NK3 cosmetic-LOB preview work and stay on NK3 until promoted separately.

## Deploy strategy decision

NK production is a git checkout at `/opt/tgroup` that normally pulls from `origin/<branch>`. **But the target commit `63880578` is local-only — not pushed to GitHub.** Three viable paths:

### Option A (recommended) — push a release ref to origin, NK pulls
1. Locally: `git push origin 63880578:refs/heads/release/0.32.35`
2. On NK: `cd /opt/tgroup && git fetch origin && git checkout 63880578` (detached HEAD — safe, reversible)
3. Build: `export GIT_SHA=63880578 GIT_BRANCH=release/0.32.35 && docker compose up -d --build api web`

- **Pros:** GitHub has the audit trail; standard pull mechanism; rollback = `git checkout 13acedbf`.
- **Cons:** requires a push to GitHub.

### Option B — push directly to NK as a git remote
1. Locally: `git remote add nk-prod root@76.13.16.68:/opt/tgroup` (one-time)
2. `git push nk-prod 63880578:refs/heads/release/0.32.35-staged`
3. On NK: `git checkout 63880578 && docker compose up -d --build api web`

- **Pros:** GitHub stays clean of release branches.
- **Cons:** GitHub origin diverges from prod (audit gap); needs SSH key on push side.

### Option C — bypass git, ship a tarball like staging does
Mirror the `/opt/tgroup-staging/` mechanism: tar local `app/`, scp, swap, rebuild.

- **Pros:** matches staging exactly.
- **Cons:** changes NK's deploy mechanism (breaks runbook); abandons git source-of-truth on NK.

## Post-deploy verification plan

Run these on https://nk.2checkin.com after deploy:

1. **Version stamp:** `curl https://nk.2checkin.com/version.json` → expect `"version": "0.32.35"` and `"gitCommit": "63880578"` (or first 7 chars).
2. **Container state:** `ssh root@76.13.16.68 'docker ps --filter name=tgroup --format "{{.Names}} {{.Status}}"'` — confirm `tgroup-api` and `tgroup-web` restarted within last minute.
3. **Smoke — appointment companyid (F1):** Playwright login `t@clinic.vn / 123123`, open any appointment, change `cơ sở` dropdown to a different location, save, reload page → confirm new location persists. Screenshot.
4. **Smoke — revenue/deposit Note exports (F2):** Reports → Revenue → Export Excel. Open file, confirm `Note thanh toán` column is populated for rows with notes. Repeat for Deposit → `Note cọc tiền`.
5. **Smoke — revenue report renders (F3):** Reports → Revenue page loads, totals match preview.
6. **No regression:** click through Overview, Customers, Calendar, Appointments, Employees, Services, Payment — all load, no console errors.
7. **Health probe:** confirm `/api/_health` (or equivalent) returns 200; confirm hosoonline integration (see separate ticket) is also healthy after restart.

## Rollback plan (if any smoke fails)

```bash
ssh root@76.13.16.68
cd /opt/tgroup
git checkout 13acedbf
export GIT_SHA=13acedbf GIT_BRANCH=fix/feedback-reports
docker compose up -d --build api web
```

Then post in #ops "Rolled back NK to 13acedbf — 0.32.35 promotion aborted" with the failing smoke step.
