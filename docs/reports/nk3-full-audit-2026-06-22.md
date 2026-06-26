# NK3 Full Multi-Dimension Audit — 2026-06-22

**Workflow:** `wf_e56d374d-9e8` (11 dimension auditors → adversarial verification → synthesis)  
**Target:** https://76-13-16-68.sslip.io (NK3 staging)  
**Local branch:** `nk3-deploy` @ `e9c304ec0` (v0.37.20, **1 commit unpushed**)  
**Live build:** v0.37.12 @ `37163f6` (built 2026-06-14)  
**Fleet status:** 11/11 dimensions complete (9 fleet + 2 manual completion 2026-06-22). Original synthesis crashed on `criticalHigh is not defined` (fixed in `.claude/workflows/nk3-full-audit.mjs`).

---

## Executive Summary

| Verdict | **Degraded / money-path broken on live** — site up, but service-card commission flag is ON without deployed reversal |
|---------|------------------------------------------------------------------------------------------------------------------------|
| Top risk | **Live reversal gap** — `CTV_SERVICE_CARD_COMMISSION=true` on NK3 but deployed `serviceReversal.js` lacks `reverseServiceCardEarnings` (36 pending orphan-risk rows on cosmetic) |
| Deploy risk | **Version drift** — live v0.37.12 vs local v0.37.20; fix exists only in uncommitted working tree |
| Deployment ladder | **🟡 Staging (degraded)** — HTTPS up, login works, API helmet headers present; tarball deploy without git forensics; 8-version drift; CTV portal E2E unproven |

**Live probes (2026-06-22):**

```text
GET https://76-13-16-68.sslip.io/version.json → v0.37.12, gitCommit 37163f6
POST /api/auth/login (t@clinic.vn) → 200, JWT valid, is_ctv=false
GET /api/health → 200 + HSTS/CSP/X-Frame-Options (helmet)
POST /api/ctv-public/join {} → 400 VALIDATION (no auth — public route works)
```

---

## §14 — Dimension Status Table

| # | Dimension | Status | Findings | Adversarial notes |
|---|-----------|--------|----------|-------------------|
| 1 | infra-deploy | **degraded** | 8 | `version-drift` **CONFIRMED CRITICAL**; `security-headers-missing` **partial** (API has headers, static nginx root does not) |
| 2 | money-commission | **broken** | 6 | Live flag on + deployed reversal missing; backfill double-pay risk |
| 3 | auth-permissions | **healthy** | 7 | tier_id CTV grant fix verified; no regressions |
| 4 | contracts-types | **degraded** | 3 | Orphan `services.js` test ref; FE Zod response validation gap |
| 5 | data-integrity | **healthy** | 4 | NK3 DBs isolated; minor schema drift (2 dental-only tables) |
| 6 | security | **degraded** | 8 | Several findings **refuted** on live repro (containers up, JWT works); XSS pattern + default DB creds remain |
| 7 | performance | **healthy** | 7 | `perf-fixes-merged-not-deployed` **REFUTED** — perf code is in live build `37163f6` |
| 8 | functional-flows | **degraded** | 10 | Login OK; CTV portal + dashboard browser proof missing |
| 9 | test-coverage | **healthy** | 10 | Strong money-path jest + TestSprite 31/31 PASS |
| 10 | dead-code-config | **healthy** | 6 | `services.js` deletion clean; husky hooks safe |
| 11 | i18n-a11y | **healthy** | 9 | `normalizeText()` OK; commission form a11y gaps MEDIUM |

**Adversarial summary:** 8 verdicts recorded — 5 confirmed, 3 refuted.

---

## §16 — NK3 Deployment Ladder

| Rung | Criteria | NK3 today |
|------|----------|-----------|
| 🔴 Broken | Site down or money-path corrupting data | **No** — login + health 200 |
| 🟡 Staging degraded | Live but drifted / unverified critical flows | **Yes** — v0.37.12 vs v0.37.20; CTV portal unverified; tarball no git trail |
| 🟢 Staging green | HEAD deployed + money E2E + CTV portal proven | **No** — push + rebuild required |

**Ladder line:** NK3 sits on **🟡 staging-degraded** until `nk3-deploy` is pushed, containers rebuilt to `e9c304ec0`, service-card reversal committed, and CTV portal verified with a real `is_ctv=true` user.

---

## Confirmed Findings (survived adversarial verification)

### P0 — CRITICAL

#### `version-drift` — Deployed v0.37.12 vs local v0.37.20

| Field | Detail |
|-------|--------|
| Severity | **CRITICAL** (2/2 skeptics confirmed) |
| Evidence | Live `version.json`: v0.37.12 / `37163f6` / 2026-06-14. Local `website/package.json`: v0.37.20. `git log origin/nk3-deploy..HEAD` → `e9c304ec0` unpushed. |
| Impact | Staging users do not exercise card-based Theo dõi, per-LOB locks, viewer-only history (v0.37.20). Regressions masked before prod. |
| Fix | `git push origin nk3-deploy` then on VPS: `cd /opt/tgroup-nk3 && docker compose -f runtime/docker-compose.nk3.yml up --build --force-recreate api web`. Verify `version.json` shows `e9c304ec0`. |

#### `service-card-reversal-not-deployed` — Live NK3 flag on, deployed code lacks reversal

| Field | Detail |
|-------|--------|
| Severity | **CRITICAL** (money-commission dimension, VPS file proof) |
| Evidence | VPS `/opt/tgroup-nk3/app/api/src/services/serviceReversal.js` imports only `reverseOnRefund` (no `reverseServiceCardEarnings`). `docker exec` / `.env.nk3`: `CTV_SERVICE_CARD_COMMISSION=true`. `tcosmetic_nk3`: **36** pending service-card earnings (`payment_id IS NULL`). |
| Impact | Deleting a service line on live NK3 leaves orphan pending CTV earnings — CTVs can be paid for deleted services (INV-003C violation). |
| Fix | Commit working-tree fix, push, redeploy. Verify deployed file contains `reverseServiceCardEarnings` call. |

#### `service-card-reversal-uncommitted` — Fix exists locally only

| Field | Detail |
|-------|--------|
| Severity | **CRITICAL** (supplemental — fleet `money-commission` did not run) |
| Evidence | `git show HEAD:api/src/services/serviceReversal.js` — no `reverseServiceCardEarnings`. Working tree adds paid-out guard (`payment_id IS NULL`, `B_COMMISSION_PAID_OUT`) + reversal call + `reversedServiceCardEarningsCount`. Docs/CHANGELOG claim fix shipped; **committed code does not match**. |
| Impact | With `CTV_SERVICE_CARD_COMMISSION=true`, deleting a service line can leave orphan pending CTV earnings (`payment_id IS NULL`). |
| Fix | Commit `serviceReversal.js` + `serviceReversal.test.js`, bump version, push, redeploy. Run `JWT_SECRET=test-secret npx jest src/services/__tests__/serviceReversal.test.js --runInBand`. |

---

### P1 — HIGH

#### `ctv-portal-unverified-no-ctv-user` — No real CTV E2E proof

| Field | Detail |
|-------|--------|
| Severity | **HIGH** (2/2 skeptics confirmed) |
| Evidence | `t@clinic.vn` login → `is_ctv=false`. Tests mock `is_ctv:true` only (`CtvDashboard.test.tsx`). Code paths in `permissionService.js:133-140` and `App.tsx` CTVRouteGuard look correct but unproven live. |
| Impact | Entire CTV affiliate portal may 403 or mis-render for real users undetected. |
| Fix | Create disposable `is_ctv=true` test user on NK3; Playwright login → `/ctv/dashboard` → screenshot + console check. |

#### `tarball-not-git-tracked` — Silent revert risk

| Field | Detail |
|-------|--------|
| Severity | **HIGH** (no skeptics — 429; retained on SSH evidence) |
| Evidence | `/opt/tgroup-nk3/app` has no `.git`; deploy is tarball extraction. |
| Impact | Parallel sessions can overwrite app tree with no forensic trail. |
| Fix | Post-deploy: `git init` + tag at deployed version, or switch to git-pull deploy per runbook update. |

#### `security-headers-static-gap` — nginx static shell lacks helmet headers

| Field | Detail |
|-------|--------|
| Severity | **HIGH → MEDIUM** (downgraded on live repro) |
| Evidence | `curl -I https://76-13-16-68.sslip.io/` — no HSTS/CSP on HTML shell. `curl -I .../api/health` — full helmet headers present. |
| Impact | Static asset responses lack defense-in-depth; API layer is hardened. |
| Fix | Add security headers in `runtime/nginx.nk3.docker.conf` for the web container. |

#### `ci-workflow-orphaned` — `nk3-verify-packages.yml` untracked / unenforced

| Field | Detail |
|-------|--------|
| Severity | **MEDIUM** |
| Evidence | `?? .github/workflows/nk3-verify-packages.yml`; v0.37.20 commit bypassed matrix gates. |
| Fix | Commit workflow; add `push: branches: [nk3-deploy]`; require status check on branch protection. |

---

### P2 — MEDIUM / LOW

| ID | Title | Severity | Recommendation |
|----|-------|----------|----------------|
| `dashboard-render-unverified` | Post-login Overview not browser-verified | MEDIUM (downgraded from HIGH) | Playwright: login → dashboard → console errors |
| `orphan-test-reference-services-js` | Dead `services.js` check in enterprise test | MEDIUM | Remove line 105 in `enterprise-verification.test.js` |
| `contract-drift-frontend-validation` | `apiFetch` lacks Zod response validation | MEDIUM | Implement or downgrade CONTRACTS.md to documented deferral |
| `a11y-commission-inputs` | Payout form labels missing `htmlFor`/`id` | MEDIUM | Fix `EarningsPayoutsTabs.tsx` or migrate to shared `Input` |
| `ctv-refer-persistence-unverified` | Service+notes → appointment columns | MEDIUM | Live CTV refer smoke test |
| `additional-dead-endpoints` | 7 commented routes in `server.js` | MEDIUM | Delete dead mounts |
| `outdated-testsprite-results` | Results target old URL | LOW | Point at `76-13-16-68.sslip.io` or delete stale file |

---

## Dimension 2 — Money-Commission (manual completion)

**Overall: broken** — commission engine v3 is sound in source, but live NK3 runs service-card creation (`CTV_SERVICE_CARD_COMMISSION=true`) without the matching delete reversal path.

### Verified healthy

| Area | Evidence |
|------|----------|
| Commission model v3 | `commissionEngine.js:11-19` — per-service `saleorders.ctv_id` + `commission_level_config` levels × paid amount; no `default_referral_percent` or product rate in engine |
| No double-pay on payment | `payments.js:146-151` — when service-card flag on, `createEarningsForPayment` is skipped |
| Hierarchy cycle guard | `_walkCtvChain` visited-set (`commissionEngine.js:78-88`); `buildCtvNetwork` seeds upline (`ctvNetwork.js:51-53`) |
| Explicit CTV only | `createSaleOrder.js:25-27` — no inherit from `referred_by_ctv_id` at create time |
| Paid-out guard (payment-linked) | `serviceReversal.js` blocks delete when `earnings.payment_id` rows are paid out |
| Tests | 28/28 PASS: `serviceReversal`, `commissionEngine`, `commissionEngineServiceCard` (includes uncommitted cases) |

### Findings

| ID | Sev | Title | Evidence | Recommendation |
|----|-----|-------|----------|----------------|
| `live-reversal-gap` | CRITICAL | Deployed NK3 missing service-card reversal | VPS file head: `const { reverseOnRefund } = require(...)` only; flag `true` on live | Deploy uncommitted fix immediately |
| `reversal-uncommitted` | CRITICAL | Working-tree fix not in git HEAD | `git diff serviceReversal.js` adds guard + `reverseServiceCardEarnings`; `git show HEAD:` lacks it | Commit + push in same commit as deploy |
| `backfill-double-pay-risk` | HIGH | Retroactive backfill ignores service-card flag | `customerReferrer.js:84-89` always calls `backfillEarningsForClient`; `backfill` has no `CTV_SERVICE_CARD_COMMISSION` gate (unlike `payments.js:146-151`) | Skip backfill when service-card model enabled, or make backfill service-card-aware |
| `pending-sc-earnings-live` | MEDIUM | 36 pending service-card rows on cosmetic NK3 | `SELECT count(*) ... payment_id IS NULL AND status='pending'` on `tcosmetic_nk3` | After deploy, audit/delete-test one line and confirm reversal marks `status='reversed'` |
| `docs-code-drift` | MEDIUM | CHANGELOG/CONTRACTS claim reversal shipped | `docs/CHANGELOG.md` v0.37.x entry vs HEAD/VPS code | Align docs with deployed reality or ship the code |

---

## Dimension 5 — Data-Integrity (manual completion)

**Overall: healthy** — NK3 uses isolated `*_nk3` databases on VPS; local dev uses `*_demo` only.

### Verified

| Check | Result |
|-------|--------|
| VPS env | `DATABASE_URL` → `tdental_nk3`; `COSMETIC_DATABASE_URL` → `tcosmetic_nk3` (port 55433) |
| Local Postgres :5433 | Only `tdental_demo`, `tcosmetic_demo` — **no `*_nk3` databases** |
| VPS host databases | `tdental_nk3`, `tcosmetic_nk3` present; `tdental_demo` also exists but **not wired to NK3 API** |
| Row counts | Dental NK3: 3 appts, 1 earning, 247 CTVs. Cosmetic NK3: **4846** appts, 52 earnings, 234 CTVs |
| `earnings` schema | Identical columns + indexes on both NK3 DBs (incl. `uq_earnings_service_card` partial unique) |
| Views | 8 legacy views each (`employees`, `accountpayments`, …) — symmetric dental/cosmetic |
| `search_path` | `api/src/db.js:37` — `-c search_path=dbo` on all pools |
| `services.js` deletion | No DB view references `public.services`; only orphan is jest line in `enterprise-verification.test.js` |

### Findings

| ID | Sev | Title | Evidence | Recommendation |
|----|-----|-------|----------|----------------|
| `schema-lob-drift` | LOW | 2 tables only in dental NK3 | `audit_logs`, `braces_commission_level_config` exist in `tdental_nk3` only | Document as intentional LOB split; ensure cosmetic routes never expect braces config |
| `earned-at-timestamptz` | INFO | `earnings.earned_at` is `timestamptz` on NK3 | `\d dbo.earnings` on VPS | Acceptable — engine uses `now()`; reports use naive-VN rules elsewhere |
| `write-tz-pattern` | INFO | Writes use `(NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')` | `serviceReversal.js`, `createSaleOrder.js`, etc. | Intentional VN-local naive write pattern per `reports/helpers.js` comments |
| `demo-coexists-vps` | INFO | `tdental_demo` on same Postgres host as NK3 | VPS `pg_database` listing | Ensure `.env.nk3` never points at `*_demo` — currently correct |

---

## Refuted / Withdrawn Findings

| ID | Original | Verdict | Why |
|----|----------|---------|-----|
| `perf-fixes-merged-not-deployed` | HIGH | **Refuted** | Git distance 37163f6 ↔ 11f1305e7 is ~34 commits, not 988; pool/cluster/perm-cache code present in live build |
| `cosmetic-commission-flow-unverified` | HIGH | **Refuted** | Prior live proof in `testbright.md` (ZZ_CTVCHECK disposable data, tcosmetic_nk3 earnings) |
| `jwt-secret-missing` | CRITICAL | **Refuted** | Live login returns valid JWT; empty compose env observation contradicted by running API |
| `nk3-containers-not-running` | MEDIUM | **Refuted** | Site serves v0.37.12; health/login/version all 200 |
| `ctv-public-not-actually-public` | MEDIUM | **Refuted** | Wrong probe: `GET /api/ctv-public` is authed; `POST /api/ctv-public/join` is public (400 validation, not 401) |

---

## Prioritized Remediation Plan

### P0 — Ship now (money / deploy integrity)

1. **Commit + push service-card reversal** — `api/src/services/serviceReversal.js`, tests, version bump, CHANGELOG (already documented; code must match).
2. **Gate backfill under service-card flag** — `customerReferrer.js` / `backfillEarningsForClient` should no-op when `CTV_SERVICE_CARD_COMMISSION=true` (mirror `payments.js:146-151`).
3. **Push `nk3-deploy`** — `git push origin nk3-deploy`.
4. **Redeploy NK3 to v0.37.20** — rebuild api + web on VPS; confirm `version.json` → `e9c304ec0` **and** VPS `serviceReversal.js` imports `reverseServiceCardEarnings`.
5. **Run money-path jest** — `serviceReversal.test.js`, `commissionEngineServiceCard.test.js` before declaring deploy complete.
6. **Post-deploy smoke** — delete one test service line with pending service-card earnings; expect `reversedServiceCardEarningsCount > 0`.

### P1 — This week (verification + ops)

1. **CTV portal live proof** — disposable `is_ctv=true` user + Playwright on `/ctv/dashboard`.
2. **Dashboard console check** — extend `console-check.spec.ts` or manual Overview verification.
3. **Tarball forensics** — post-deploy git tag or document tarball hash in deploy log.
4. **Commit `nk3-verify-packages.yml`** — wire CI to `nk3-deploy` pushes.
5. **nginx security headers** on static web container.

### P2 — Cleanup

1. Remove orphan `services.js` test reference and dead `website/src/lib/api/services.ts`.
2. Commission form a11y (`htmlFor`/`id`).
3. Prune commented dead routes in `server.js`.
4. Document dental-only tables (`audit_logs`, `braces_commission_level_config`) in `product-map/schema-map.md` if not already noted.

---

## Workflow Infrastructure Fix

The generated workflow script defined `critHigh` but returned `criticalHigh`, causing synthesis to crash:

```303:311:.claude/workflows/nk3-full-audit.mjs
return {
  report,
  stats: {
    dimensionsAudited: ok.length,
    dimensionsTotal: DIMENSIONS.length,
    totalFindings,
    critHigh,
    verifications: verified,
  },
```

Canonical copy: `.claude/workflows/nk3-full-audit.mjs`. Re-run with `/workflows` when API quota allows.

---

## Verification Commands (not all run this session)

| Command | Purpose |
|---------|---------|
| `npm run verify:governance` | Crossrefs + docs gates |
| `bash scripts/nk3-verify-package.sh nk3-services-money` | Money package |
| `JWT_SECRET=test-secret npx jest src/services/__tests__/serviceReversal.test.js --runInBand` | Reversal regression |
| Playwright login @ `http://127.0.0.1:5175` or live NK3 | Dashboard + CTV portal |

**Not run:** full `money-commission` / `data-integrity` fleet dimensions; VPS DB SELECT isolation checks; automated synthesis agent (429).