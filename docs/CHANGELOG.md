# TGroup Clinic — Changelog

> Append-only. What changed, when, by whom (human or agent), why. Semver.

## [0.37.8] — 2026-06-14 — NK3 aesthetic LOB: pink accent theme + i18n cleanup
### Changed
- **LOB accent palette switches with business unit.** `BusinessUnitContext` sets `data-lob` on `<html>`; dental keeps warm orange, cosmetic/aesthetic uses a soft dusty-rose pink via shared `--accent-*` CSS variables wired into Tailwind `primary` and `orange` scales. — @agent — NK3 aesthetic UX
- **English LOB label "Cosmetic" → "Aesthetic".** Updated `common`, `calendar`, `customers`, `services`, `verifyDiscount` en locale keys; `FilterByBusinessUnit` fallback aligned.
### Fixed
- **Overview hardcoded English strings.** `TodayServicesTable` title/columns/empty state now use `overview.servicesTable.*` i18n keys (vi + en). `FilterByLocation` uses `common.allLocations` instead of hardcoded "All Locations". `NewClientsTab` LOB badges use `common.lob.*` instead of inline Vietnamese. — @agent — i18n / NK3 polish

## [0.37.9] — 2026-06-14 — NK3 hardening: API test fixes, docs gate, bundle split, lint deps
### Fixed
 **37 API tests repaired.** Replaced `jest.spyOn(global, 'fetch')` with `globalThis.fetch = jest.fn()` in `api/src/services/__tests__/comprefaceClient.test.js` and `api/src/services/__tests__/faceEngineClient.test.js`; Node 18+ makes `globalThis.fetch` non-configurable so `spyOn` throws. Tests restore fetch in `afterEach`. Result: API jest 1025/1025 pass. — @agent — NK3 test suite hygiene.
 **Top-10 `react-hooks/exhaustive-deps` warnings.** Added correct deps in `Calendar.tsx` (`openFilter`, `applyFilter`, `clearFilter` callbacks), `useVersionCheck.ts` (`applyUpdateRef.current`), `CtvManagementTab.tsx` (`formApi`, `handleLoad`), `DiscountCodesAdminTab.tsx` (`load`), `CtvRecruitModal.tsx` (`formApi`), and `ServiceForm.tsx` (`getToday`, `initialData`). No behavior change. — @agent — lint discipline.
### Changed
 **Vite bundle split.** Added `manualChunks` in `website/vite.config.ts` for `vendor-react`, `vendor-motion`, `vendor-icons`, `vendor-i18n`, `vendor-router`, `vendor-xlsx`, `vendor-zod`, and `@tgroup/contracts`; `chunkSizeWarningLimit` raised to 500 kB. Main chunk dropped from 577.71 kB to 341.40 kB. — @agent — NK3 web performance.
### Docs/Tooling
 **Reference library committed.** Added `library/` with 9 domain folders, 66 battle-tested open-source repositories, `INDEX.md`, `README.md`, `CODEBASE_ANALYSIS.md`, `REFACTOR_ROADMAP.md`, `HARDENING_PLAN.md`, and per-domain `README-reference.md` files. — @agent — knowledge base for NK3 hardening.
 **Doc gate compliance.** Updated `docs/CONTRACTS.md` (v1.0.35), `docs/TEST-MATRIX.md`, and `product-map/contracts/api-index.md` to document `reverseServiceCardEarnings` behavior on `DELETE /api/SaleOrderLines/:id` and `reversedServiceCardEarningsCount` in the response. — @agent — §16 documentation enforcement.

## [0.37.7] — 2026-06-14 — NK3 cleanup: break apiFetch cycle + delete dead /api/Services route
### Fixed
- **Break static import cycle between `apiFetch` and `silentFailureReporter`.** Extracted `API_URL` into a new leaf module `website/src/lib/api/apiBaseUrl.ts`; `core.ts` now imports the base URL from the leaf and re-exports it for backward compatibility, while `silentFailureReporter.ts` imports from the same leaf. Added regression test `website/src/lib/__tests__/importCycles.test.ts` to block future static cycles. — @agent — NK3 audit; no API contract change.
- **Delete dead `/api/Services` route.** Removed `api/src/routes/services.js` and all commented-out mount/import references in `api/src/server.js`. The route was already unmounted and returned 500 because it queries the non-existent `public.services` table. Updated `api/src/__tests__/enterprise-verification.test.js` to assert full removal. — @agent — `docs/CONTRACTS.md` §6; NK3 audit P1.
### Tests
- `website/src/lib/__tests__/importCycles.test.ts` (2) + apiFetch suite (19) + NK3 CTV/auth matrix (100) + website NK3 matrix (83) + `vite build` + `verify:governance` all pass.

## [Docs/Tooling] — 2026-06-12 — Blast-radius analysis and hard local gates
### Added
- **CRG + graphify anti-breakage workflow.** Registered Code Review Graph with repo-scoped MCP tool allow-list, rebuilt the SQLite graph, added staged-diff hard pre-commit gates for typecheck/lint/affected tests, and appended the mandatory edit protocol to `CLAUDE.md` + `AGENTS.md`. Docs-only governance/tooling change; no website runtime version bump. — @agent — Workflow enforcement / graph navigation truth.

## [0.37.6] — 2026-06-11 — NK3 service delete reverses service-card CTV earnings
### Fixed
- **`reverseServiceLine` now reverses INV-003C service-card earnings on delete** (`api/src/services/serviceReversal.js`): pending rows with `payment_id IS NULL` are cleared via `reverseServiceCardEarnings` before soft-delete; paid-out service-card earnings block delete with `B_COMMISSION_PAID_OUT` (same guard as payment-linked commissions). — @agent — earnings-commissions.yaml :67/:89; NK3 audit P0
### Tests
- Extended `serviceReversal.test.js` (+2): service-card reversal call + paid-out guard. `nk3-services-money` / `nk3-ctv-commission` verify packages via `scripts/nk3-verify-package.sh` + `.github/workflows/nk3-verify-packages.yml`.

## [0.37.5] — 2026-06-11 — Hardening: both test suites fully green + CTV pending-reversal visibility fix
### Fixed
- **CTV commission-summary Pending tab shows negative pending reversals again** (`api/src/routes/ctv.js`): commit `873464ca` (drill-down) added an `amount > 0` filter to `pendingList`, silently regressing the Jun-1 spec test ("a pending reversal belongs in Pending, never in Paid") — reversal rows are audit-visible per INV-003A and the CTV must see upcoming deductions. Filter removed; `ctvBookings.test.js` 17/17. Totals aggregation unchanged. — @agent — INV-003A
- **Stale-mock jest suites repaired:** `feedbackAttachments` + `authResponseShape` auth mocks gained `requireLobScope` (dentalLobGate landed after they were written); `feedbackAttachments` admin mock gained `requireFeedbackPermission`. `saleOrderLines.test.js` rewritten against the current transactional route contract (BEGIN/COMMIT/ROLLBACK + `ServiceReversalError`→HTTP mapping; business logic stays covered by `serviceReversal.test.js`) — also updated in TEST-MATRIX. — @agent
- **i18n coverage back to zero missing keys:** added real gaps (`payment`: viewDepositHistory/depositHistoryFor/selectCustomer/depositWalletHistory; `commission`: flow.next + common.emDash; `verifyDiscount`: verifyFailed) and fixed `scripts/audit-i18n.cjs` to honor ALL `useTranslation` hooks per file (it previously applied only the first hook's namespace, producing 36 false positives against VerifyDiscount.tsx). — @agent
- **Flake hardening:** `loginRateLimiter`/`authResponseShape` suites set `jest.setTimeout(20000)` (each test re-requires the full server; 5s default flaked under parallel load). `Calendar.click.test.tsx` mock appointment date made dynamic via `vi.hoisted` (hardcoded 2026-05-31 had drifted out of the visible calendar week). `CtvManagementTab.test.tsx` payload expectation updated for the deliberate `is_live` toggle field. — @agent
- **App.tsx route markers completed:** `@crossref:route[path="/ctv", component=CtvDashboard]` + `/ctv/join` markers added; `crossrefBreadcrumbs.test.ts` 2/2. — @agent
### Changed
- **`runtime/nginx.nk3.docker.conf` is now version-controlled** (pulled from the VPS, byte-identical): it already served `/version.json` with `no-store` — the post-deploy "stale version" observation was a local fetch-cache artifact, not an edge-cache bug. Verified live: `cache-control: no-store, no-cache, must-revalidate` + 0.37.4 payload. — @agent
- Dead-route audit: `commissions.js`, `crmTasks.js`, `receipts.js`, `ctvActions.js` (+ `journals.js`, `stockPickings.js`, `hrPayslips.js`) confirmed unmounted (disabled 2026-06-06 in server.js). Files retained pending owner approval — `commissions.js` intersects `product-map/unknowns.md` #12. — @agent
### Tests
- Full gates: api jest **105/105 suites, 1024/1024 tests**; website vitest **129 files, 730 tests** (0 failures, both previously-flaky suites pass under load); `tsc` + `vite build` PASS; `verify-crossrefs` PASS; `audit-i18n` 0 missing.

## [0.37.4] — 2026-06-10 — Site-wide crossref breadcrumb enrichment + behavior-preserving simplification
### Changed (258 files: website/src/{pages,lib/api,components/{modules,commission,ctv}}, api/src/{routes,services,middleware})
- **Every in-scope source file now carries an enriched `@crossref` breadcrumb with REAL code cross-references** instead of the generic auto-generated triad: `used-in` names actual consumers (pages name `App.tsx` routing, services name the route files that require them), `uses` names actual dependencies (frontend API clients name their backend Express route file, backend routes name their frontend `lib/api/*.ts` caller). An agent editing any file can now see which other layers to read. CTV-SSOT blocks and strict `@crossref:route/endpoint/function` markers preserved verbatim (append-only). 242 generic blocks enriched. — @agent
- **Behavior-preserving simplifications** per the code-simplification discipline (dead exports/imports removed after zero-consumer verification via repo import graph, no-op `useMemo`/passthrough callbacks inlined, duplicate import statements merged, one byte-identical 14-line duplicate extracted to a local helper in `lib/api/feedback.ts`). No API shapes, SQL, permission strings, i18n keys, route paths, exported signatures, or error semantics changed. Money-critical files (commissionEngine, payments, saleOrders, payouts) received breadcrumbs + trivially-safe lexical removals only. — @agent
- **`scripts/verify-crossrefs.js`: removed the generic-revert rule** that flagged (and `--apply` reverted) any breadcrumb matching the generated 3-line shape but differing from the generator text — it actively destroyed enrichment. The gate now requires a complete domain/used-in/uses triad; `--apply` only inserts into files missing it. — @agent
- **Fix during verification:** one enriched breadcrumb embedded `*/` inside the comment text (`fetchAdminFeedback*/reply...` in `api/src/routes/feedback/adminRoutes.js`), truncating the block comment and breaking the Babel parse of `server.js` (64 jest tests). Rewritten without the terminator sequence. — @agent
- **`runtime/docker-compose.nk3.yml`: web build now passes `GIT_SHA`/`GIT_BRANCH` build args** (Dockerfile.web already accepted them) so `/version.json` on NK3 reports the real deployed commit instead of "unknown". Export both before `docker compose up --build` (see `scripts/deploy-build-args.sh`). — @agent
### Tests
- Verification: `verify-crossrefs` PASS (336 files, 15 strict); api jest 1004 pass — remaining 6 failing suites reproduce identically on clean HEAD via `git stash` (pre-existing: `feedbackAttachments`/`authResponseShape` mock missing `requireLobScope`, `ctvBookings` pending-reversal, `saleOrderLines` DELETE 500) or are load/network flakes (`loginRateLimiter`, `faceServiceModelUrls`); website `tsc`+`vite build` PASS, vitest 725 pass — 4 failures pre-existing on HEAD (crossrefBreadcrumbs `/ctv` route marker, i18n-coverage 43 missing keys, CtvManagementTab phone-less edit, Calendar.click), `FaceCaptureModal` is a load flake (20/20 isolated).

## [Docs/Tests] — 2026-06-10 — TestSprite hygiene: Chromium pre-flight + NK3 TEST_SPRITE purge
- **`scripts/testsprite-detached.sh start` now pre-flights a real headless Chromium launch** and auto-runs `playwright install chromium` when the build is missing/broken — kills the recurring instant-mass-failure mode caused by external prunes of `~/Library/Caches/ms-playwright` (verified both ways: healthy cache passes through; removed headless-shell triggers reinstall + run). — @agent — FM: Playwright cache prune
- **New `scripts/nk3-only/nk3-purge-testsprite-data.sh`** — soft-deletes (isdeleted=true, active=false; mirrors the app's own delete semantics, no FK risk) marker-named TEST_SPRITE/TESTSPRITE customers + employees from `dbo.partners` in BOTH NK3 DBs via pinned `ssh root@76.13.16.68` + `docker exec tgroup-db psql`. Dry-run default; apply gated on `--confirm PURGE_NK3_TESTSPRITE`; never touches `is_ctv=true` rows. First run purged 22 rows (8 `tdental_nk3`, 14 `tcosmetic_nk3`); re-check 0. Suite unaffected — `_helpers.py` `ensure_*` recreate markers on demand. — @agent

## [Docs/Tests] — 2026-06-10 — TestSprite suite green on NK3 + MCP-decoupled detached runner
- **Rewrote the 14 stale-selector `testsprite_tests/TC*.py` scripts against the live NK3 DOM** (login `#login-identifier`, placeholder-based search inputs, text/role locators, direct route navigation) on a new shared `testsprite_tests/_helpers.py` (TestSession, login/logout, create/find TEST_SPRITE customer + employee). Full live sweep on `tmv.2checkin.com`: **19/19 PASS** (was 5/19). Deleted superseded `TC004_*_v2.py`/`TC015_*_v2.py` (wrong `input[type="email"]` login selector, unreferenced by the runner). Confirmed the collapsed-sidebar `lg:ml-[72px]` wrapper does NOT overlap the sidebar — the old failures were stale absolute XPaths, not an app bug. — @agent
- **TestSprite/MCP connection hardening:** long sweeps no longer run inside an MCP/agent session. New `scripts/testsprite-detached.sh` (`start|status|results|wait|stop`) runs the suite under `nohup` with file-based handoff — `run_testsprite_suite.py` now also writes stable `testsprite_tests/testsprite-results.json` for polling. `.claude/settings.json` sets `MCP_TIMEOUT=300000`/`MCP_TOOL_TIMEOUT=600000`. TestSprite MCP key verified valid (Starter, 146 credits, unchanged — sweeps run locally); connection confirmed alive before and after both full sweeps. Root cause of today's 18-fail fast run was a missing Playwright Chromium build (v1208) after a package update, reinstalled twice (cache was pruned mid-session by an external process). — @agent

## [0.37.3] — 2026-06-10 — Remember me (30 days)
- **Login page adds a “Remember me for 30 days” checkbox.** Checked logins issue a `30d` JWT (`remember: true` in payload) and store the token in `localStorage`; unchecked logins stay `24h` and use `sessionStorage` so closing the browser ends the session. Preference is restored on the login form via `tgclinic_remember_pref`. — @agent — UC-AUTH-001

## [0.37.2] — 2026-06-10 — NK3 auth session parity fix
- **Login and `/api/Auth/me` now share one `resolveEffectiveLobScope` helper** so cosmetic-only staff with empty `lob_scope` keep `['cosmetic']` after page refresh instead of dropping to `[]` and losing LOB access (INV-008D). `change-password` updates the auth-source DB via `getQuery(authLob)`. Login UI maps 429 rate-limit responses separately from 401 invalid credentials. — @agent — FM-20260610-03

## [0.37.1] — 2026-06-09 — CTV portal recent-activity drill-down
- **CTV home “Recent activity” rows now explain and link to the client.** `GET /api/ctv/commission-summary` returns `client_id`, `service_line_id`, and `service_name`; home + commission rows are tappable and open Tracking with the client card flipped to the matching service (INV-003C commission breadcrumb). — @agent

## [Docs] — 2026-06-10 — CTV commission attribution audit (NK3 live)
- **Verified the no-CTV-no-commission invariant end-to-end on NK3** (code: engine guards + `_linesForPayment` filter + update-clear reversal; 21/21 engine unit tests; live A/B/C scenarios on cosmetic LOB with disposable ZZ_CTVCHECK data). Documented fallback (service created with no CTV for a referred client auto-attaches the referrer) confirmed working as specified in `earnings-commissions.yaml`. Cleaned 5 stale pre-cutover legacy rows (2026-05-20→24, pay-as-paid D13 fallback on no-CTV services, demo clients) by flipping to `status='reversed'`; final audit: 0 active no-CTV earnings lines in both `tdental_nk3` and `tcosmetic_nk3`. Details in testbright.md. — @agent

## [Docs/Tests] — 2026-06-10 — Full-site TestSprite live PRD + suite hardening
- Rewrote `website/testsprite_tests/standard_prd.json` as the full-site live-test PRD for `tmv.2checkin.com` @ 0.37.0 (14 feature areas, safety lanes A/B/C, evidence rules, corrected routes, strict-commission + QR-voucher regressions). Converted all 39 `testsprite_tests/TC*.py` to `TESTSPRITE_BASE_URL` env targeting (repaired TC011 syntax corruption), fixed `run_testsprite_suite.py` live target (NK3, was NK production) + env passing. Live run: 5/19 pass; 14 failures classified as stale-selector test brittleness — independent browser sweep confirmed all surfaces healthy. Cloud MCP lane blocked on an invalid TestSprite API key (all local configs share the dead key). — @agent

## [0.37.0] — 2026-06-10
### Changed (NK3 — strict CTV commission attribution, DEC-20260610-01)
- **A service card with no explicitly selected CTV no longer earns commission.** Removed the create-time fallback in `api/src/routes/saleOrders/createSaleOrder.js` that inherited the customer's active `referred_by_ctv_id` onto `saleorders.ctv_id` and paid the referrer automatically. Strict rule: no CTV picked on the card ⇒ `ctv_id` NULL ⇒ zero earnings. `referred_by_ctv_id` remains referral bookkeeping only. INV-003C rewritten; earnings-commissions.yaml, ctv.yaml, ctv-referral-commission.md updated. — @agent — DEC-20260610-01
### Added (NK3 — commission night guard, DEC-20260610-02)
- `scripts/nk3-commission-audit.sh` — nightly VPS cron (01:00 ICT) audits both NK3 DBs for: ACTIVE earnings on no-CTV services, ACTIVE earnings to non-CTV recipients, ACTIVE earnings with no service line. Violations (or audit failure) alert the project Telegram chat; silent when clean. Installed + cron added + clean run + test alert verified. Token lives only in `/opt/tgroup/scripts/telegram.env` (600). — @agent — DEC-20260610-02
### Tests
- `createSaleOrderReferralCtv.test.js` rewritten for strict mode: blank `ctv_id` ⇒ NULL card CTV + `createEarningsForServiceCard` never called + the referrer lookup query now throws if ever issued; explicit `ctv_id` path unchanged. 26/26 saleOrders+engine tests pass.

## [0.36.3] — 2026-06-10
### Fixed (NK3 — QR scan-path live walkthrough found a completion-step bug)
- **Completing a checked-in code 400'd when the completion screen had the wrong LOB selected.** Live QR walkthrough (decoded QR → staff scan → check-in → reload → "Hoàn tất mã") repro'd it: the verify page defaults LOB to dental, the bound client was cosmetic, so the phone lookup said "new client" and the UI sent `createIfMissing: true` without a name → 400 `customerName is required`. The bound-customer fallback sat *after* the `createIfMissing` branch. Moved it *before* client re-resolution: completion of a `checked_in` code now always prefers `row.customer_partner_id` + `row.customer_lob` and never creates or rebinds a different client (`api/src/routes/discountCodes.js`). — @agent — FM-20260610-02.
### Tests
- `api/src/routes/__tests__/discountCodes.test.js` +1 (10 passed) — completion with wrong LOB + `createIfMissing` + no name must 200 with the bound cosmetic customer and never call `createCustomerForCtv`.
- Live QR scan-path verified end-to-end on `tmv.2checkin.com`: QR pixels decode to `https://tmv.2checkin.com/verify-discount?code=…`, anonymous scan → `/login?returnTo=…` → staff login bounces back with the code, lookup valid, check-in 200, completion (post-fix) 200 → `used`.

## [0.36.2] — 2026-06-10
### Fixed (NK3 — CTV QR discount generation + staff verify, live-reproduced)
- **CTV portal "Tạo mã & tải ảnh" silently failed (the reported QR-generation bug).** `generateCtvDiscountCode`, `verifyDiscountCode`, and `ensureCtvDiscountCode` passed pre-stringified bodies to `apiFetch`, which stringifies again — the server received a double-encoded JSON *string* and `express.json` (strict) rejected it with 400 (`Unexpected token '"' … is not valid JSON`). Reproduced live on `tmv.2checkin.com` via instrumented browser click. Fixed by passing plain objects (`website/src/lib/api/discountCodes.ts`). — @agent — INV: CTV QR voucher flow must be generatable from the portal.
- **Staff lookup/verify always answered "Mã không tồn tại".** `fetchCodeRow` called `safeQueryRows(sql, params)` without the `db` first argument; the helper swallowed the TypeError and returned `[]`, so every staff `GET /lookup` and `POST /verify` reported the code missing even right after generation. Fixed in `api/src/services/ctvDiscountCodes.js`. — @agent
- **Staff verify 500: `inconsistent types deduced for parameter $9`.** The verify UPDATE used `$9` both as the `status` assignment (varchar) and in `CASE WHEN $9 = 'used'` comparisons (text); Postgres refused the statement, so check-in/complete could never persist. Cast `$9::varchar` consistently (`api/src/routes/discountCodes.js`). — @agent
- **Completing a checked-in code no longer requires re-resolving the customer.** `POST /verify` with `markAsUsed` now falls back to the `customer_partner_id`/`customer_lob` bound at check-in when the caller does not resend `customerPartnerId` (phone-format/LOB drift safe). — @agent
- **QR panel now surfaces generation failures.** `CtvQrDiscountPanel.handleDownloadImage` had no `catch`, so any API failure was an unhandled rejection with zero user feedback. Added error state + `role="alert"` banner with new `ctv:qrDiscount.generateError` key (vi/en). — @agent
- Removed dead `DEFAULT_EXPIRY_DAYS`/`DEFAULT_NON_LIVE_PERCENT` route imports (`DEFAULT_EXPIRY_DAYS` was never exported by the service — destructured to `undefined`). — @agent
### Tests
- New `website/src/lib/api/__tests__/discountCodes.body.test.ts` (3 passed) — locks single-encoded POST bodies.
- New `api/src/services/__tests__/ctvDiscountCodes.fetchCodeRow.test.js` (2 passed) — locks the `db` argument via the real `safeQueryRows`.
- Extended `api/src/routes/__tests__/discountCodes.test.js` (+1, 9 passed) — checked-in completion fallback + `$9::varchar` cast lock.
- E2E verified locally (Vite 5175 + API 3002): CTV login → Giới thiệu/QR → Mã QR → generate (`CTVDEMOREF-TS5B5A`, QR canvas rendered) → staff lookup (`found:true`) → check-in (auto-created client) → complete (`status='used'`, staff name stamped).
### Docs
- **NK3 physical DB names recorded.** NK3 (`tmv.2checkin.com`) runs `tdental_nk3` + `tcosmetic_nk3` (per `/opt/tgroup-nk3/.env.nk3`), not `tdental_demo`; documented per-environment names in `product-map/schema-map.md` and an NK3-specific migration loop in `docs/runbooks/DEPLOYMENT.md`. Verified live: `tdental_nk3.dbo.ctv_discount_codes` exists with `generation_source` + `payment_id` and `partners.is_live` (migrations 062–065 already applied) — deploy of 0.36.2 needs no NK3 migration step. — @agent
- **Deployed 0.36.2 to NK3 only (commit `a22b1b80`) and live-verified.** File-sync deploy to `/opt/tgroup-nk3/app` (pre-deploy backup `app-backup-pre-v0.36.2-qrfix-a22b1b80-20260610T000304Z.tgz`; VPS files checksum-matched `HEAD~1`, no drift), rebuilt `tgroup-nk3-api`/`tgroup-nk3-web`. Live proof on `tmv.2checkin.com`: portal generate 200 + QR rendered (`CTVC0531DE-BJ6SD9`), staff lookup `found:true`, check-in 200, complete-without-customerPartnerId → `used`. NK (0.32.44) and NK2 untouched. Disposable verify record: cosmetic client `ZZ_QRFIX_VERIFY_20260610` / `0900777001`. — @agent

## [Docs] — 2026-06-09
### Added
- **TestSprite live-site debugging PRD for NK3/TMV.** Added `docs/PRD-TestSprite-Live-Site-Debugging.md` as a Web Portal handoff spec for `https://tmv.2checkin.com`, separating read-only live exploration from approved disposable mutations and prohibited money/destructive flows. Documentation-only change; no runtime version bump. — @agent — TestSprite live debugging handoff / production safety lanes.
- **CTV QR generation added to the live TestSprite PRD.** Added explicit `TS-LIVE-014` coverage for `/ctv` → `Giới thiệu/QR` → `Mã QR` → `Tạo mã & tải ảnh`, `POST /api/discount-codes/generate`, voucher QR canvas, and `Mã của tôi` history as a Lane B disposable-CTV mutation test. — @agent — QR generation must be visible in the TestSprite Web Portal plan.
- **TestSprite target rerouted to the reachable TMV host.** The first Web Portal run against `ctv.2checkin.com` reproduced the local DNS/setup blocker and created no test data; rerouted the PRD, `testbright.md`, and temporary upload handoff to `tmv.2checkin.com`, which resolves to `76.13.16.68` and returns HTTP 200. — @agent — Live TestSprite target routing.


## [0.36.1] — 2026-06-09
### Fixed (NK3 — Auto-detected errors triage)
- **Bulk-triaged 82 TMV auto-detected feedback threads** (`27 resolved`, `55 ignored`) via `scripts/resolve-auto-feedback-errors.js`; verified live API queue has `0 pending` on `tmv.2checkin.com`. — @agent — INV: telemetry dedup + feedback hygiene.
- **Stale deploy chunk recovery:** `errorReporter` now auto-reloads once per tab when a dynamic-import chunk 404s after deploy, and suppresses MetaMask / React DOM reconciliation noise from the auto-error pipeline. — @agent
### Tests
- `website/src/lib/errorReporter.test.ts` (3 passed). — @agent

## [0.36.0] — 2026-06-09
### Added (NK3 — CTV QR discount Phase 2)
- **Auto-refresh monitor for CTV "Mã của tôi" panel.** `CtvDiscountCodesHistory` now silently polls every 30 seconds (`setInterval`) so CTVs see status updates (claimed → checked_in → used) without manual refresh. — @agent — Kien interview v6: "auto_poll" for monitor.
- **Checked-in step tracking in code status flow.** Staff verify now transitions codes through a two-step lifecycle: first verify marks `checked_in`, second "Complete" action marks `used`. Backend `POST /api/discount-codes/verify` accepts `markAsUsed`; returns specific message when code is already checked-in. Frontend `VerifyDiscount` shows "Đã check-in — chỉ cần hoàn tất" badge and "Hoàn tất mã" button. Status badge colors: orange (claimed), blue (checked_in), green (used), gray (expired). — @agent — Kien interview v6: claimed → checked_in → used.
- **Admin discount codes page (`/commission?tab=discountCodes`).** New admin-only tab in Commission page shows all discount codes across all CTVs in a sortable/filterable table with: code, CTV name, discount %, status badge, customer name/phone, creation date. Supports status filter (all/claimed/checked_in/used/expired) and search by code/CTV/customer. Paginated (20 per page). Reuses `CtvDiscountCodesHistory` styling patterns. — @agent — Kien interview v6: "admin_codes_page" priority.
- **Backend admin list endpoint.** `GET /api/discount-codes/admin` (staff-only) returns all codes with CTV name join, status/search filters, and pagination via `listAllDiscountCodes()` service. — @agent
- **Earnings integration: payment hook auto-completes QR codes.** When a customer with a `checked_in` discount code makes a payment (`POST /api/Payments`), the payment transaction now also updates the matching `ctv_discount_codes` row to `status='used'` and records `payment_id`. This bridges the QR discount flow to the existing commission engine: `referred_by_ctv_id` is set at verify time, and `createEarningsForPayment` creates earnings at payment time — no duplicate earnings logic needed. — @agent — Kien interview v6: "earnings_on_used" + "on_payment" trigger.
- **Migration 065:** Adds `payment_id` to `ctv_discount_codes` for payment-to-code linkage. — @agent
### Backend
- **`api/src/services/ctvDiscountCodes.js`** now exports `listAllDiscountCodes()` for admin queries with CTV name join + search across code/visitor/CTV name. — @agent
- **`api/src/routes/payments.js`** QR discount code auto-complete hook runs inside the payment transaction after earnings engine. — @agent
### Frontend
- **`CommissionFlowTabs`** expanded to 6 tabs including new `discountCodes` (violet Tag icon). — @agent
- **`DiscountCodesAdminTab`** new component with table, filters, search, pagination. — @agent
- **`VerifyDiscount`** now supports two-step verify/complete flow with `isCheckedIn` state detection and `confirmComplete` i18n key. — @agent
- **i18n:** Added `discountCodes.*` keys to `vi/commission.json` and `en/commission.json`; added `verifyDiscount.statusCheckedIn` and `confirmComplete` keys. — @agent
### Tests
- `api/src/routes/__tests__/discountCodes.test.js` (8 passed), `api/tests/ctvsEdit.test.js` (19 passed). — @agent

## [0.35.0] — 2026-06-09
### Added (NK3 — CTV QR discount live tier toggle)
- **CTV `is_live` flag — admin toggle for QR discount tier.** Admin CTV management (`/commission?tab=ctvs`) now shows a **"CTV nổi bật (Live)"** toggle in the Edit CTV modal. Turning it on marks the CTV as a "live" tier CTV, which receives a higher QR discount percentage and longer expiry (configured via `systempreferences` keys `discount.live_percent`, `discount.live_expiry_days`, etc.). Turning it off returns the CTV to the default non-live tier. The toggle syncs to both Dental and Cosmetic DB mirror rows. — @agent — Kien interview v6: "CTV nổi bật" tier for high-value partners.
- **Admin CTV list shows Live badge.** Each CTV row now has a "Live" column with an amber badge when `is_live = true`. — @agent
### Backend
- **Migration 064:** Adds `partners.is_live` (default `false`) and seeds 7 `systempreferences` keys for live vs non-live QR discount settings (`discount.live_percent`, `discount.nonlive_percent`, `discount.live_expiry_days`, `discount.nonlive_expiry_days`, `discount.live_slogan`, `discount.nonlive_slogan`, `discount.live_enabled_default`). — @agent
- **`PUT /api/Ctvs/:id`** now accepts `is_live: boolean` and updates both DB mirror rows. — @agent
- **`GET /api/Ctvs`** now returns `is_live` in the list. — @agent
- **`GET /api/ctv/me`** and CTV profile services now return `isLive` in the profile. — @agent
- **`POST /api/discount-codes/ensure`** and **`GET /api/discount-codes/landing/*`** now derive `discountValue` and `expiryDays` from the CTV's `is_live` tier + `systempreferences` settings instead of hardcoded defaults. — @agent
### Frontend
- **`CtvQrDiscountPanel`** now reads `profile.isLive` instead of hardcoded `false`. — @agent
- **`CtvDiscountLanding`** already consumed `landing.ctv.isLive`; now the backend actually provides it. — @agent
- **i18n:** Added `ctv.isLive` and `ctv.isLiveHint` keys to `vi/commission.json` and `en/commission.json`. — @agent
### Tests
- `api/src/routes/__tests__/discountCodes.test.js` (8 passed), `api/tests/ctvsEdit.test.js` (19 passed), `api/src/services/__tests__/ctvSelfProfile.test.js` (4 passed). — @agent

## [0.34.0] — 2026-06-09
### Added (NK3 — CTV login recovery, admin-driven)
- **Login page "Quên mật khẩu?" affordance.** `/login` now shows a "Quên mật khẩu?" / "Forgot Password?" link below the password field. Clicking reveals "Vui lòng liên hệ quản trị viên để được hỗ trợ đặt lại mật khẩu." — no self-service reset exists because nk3 has zero SMS/email/Zalo send infrastructure today. Reduces the "I can't login" confusion by telling users exactly what to do. — @agent — 86% of active CTVs (211/244) have never logged in; no recovery path existed.
- **Admin CTV create — credential reveal on success.** After admin "Add CTV" succeeds, the modal now shows a credential card with the CTV's name, phone, email (if any), and the password the admin just set, plus a "Copy all" button so the admin can immediately hand off login info to the new CTV. Prevents the silent "created but never told credentials" gap that leaves 29 admin-created CTVs locked out. — @agent
- **Admin per-CTV "Đặt lại mật khẩu" reset action.** Each CTV row in the admin CTV management table now has an amber "Đặt lại mật khẩu" button. Clicking opens a confirmation → generates an 8-character temp password → calls `PUT /api/Ctvs/:id {password}` (bcrypt, works for legacy SHA-256 CTVs too) → reveals the temp password with a copy button. This is the only recovery path for the 182 legacy-imported CTVs who need their old-portal password reset. — @agent
### Fixed
- **Pre-existing `setIsLive` unused-variable in EditCtvModal.** Changed from `useState` to a plain `const` since the UI has no live toggle control; quiets the TS6133 diagnostic without behavior change. — @agent
- **CTV portal full i18n pass:** Replaced user-facing Cosmetic → **Aesthetic** (EN) / **Thẩm mỹ** (VI); Dental / Nha khoa unchanged. Removed `isVietnamese` branches, inline EN/VI fallbacks, and hardcoded copy across portal tabs, modals, JoinCtv, CtvCreationForm SSOT, QR voucher canvas, and discount history. All strings now live in `ctv` namespace (`en/ctv.json`, `vi/ctv.json`). — @agent — CTV portal mixed languages and hardcoded LOB labels.

## [0.35.1] — 2026-06-09
### Added
- **Bảng giá live Google Sheet sync (30s).** API worker pulls legacy pricing sheet `19YZB-SgpqvI3-hu93xOk0OCDWtUPxrAAfR6CiFpU4GY` every 30s, writes `website/public/bang-gia/data/pricing.json` + `index.html`. NK3 mounts the directory into `tgroup-nk3-web` so `/bang-gia` updates without rebuild. Status: `GET /api/public/bang-gia/status`. Runbook: `docs/runbooks/BANG_GIA_SYNC.md`. — @agent — static snapshot did not track sheet edits.

## [0.33.4] — 2026-06-09
- **Bảng giá (`/bang-gia`)** — static pricing page from legacy `ctv2checkin` (`pricing.json`, 16 categories, VND list prices). CTV portal header adds tag icon beside catalog book icon. `/catalogue` remains the visual flipbook only (no prices). — @agent — CTV portal catalog shortcut lacked pricing.

## [0.33.2] — 2026-06-08
### Docs (NK3 — CTV discount QR governance)
- **DATA-MODEL + TEST-MATRIX:** Documented `dbo.ctv_discount_codes` (062–063 columns, dental-only store, status lifecycle). Added regression mapping for discount QR routes, public API whitelist, fan landing, and Playwright `public` project. — @agent — §16 doc gate for discount QR fix.

### Fixed (NK3 — CTV discount QR link / fan landing)
- **Fan discount link now opens landing + QR instead of Overview or blank loader:** Public `/api/discount-codes/landing/*`, `check-existing`, and fan `POST /generate` bypass global auth (`isPublicApiPath`); frontend public fetches use `API_URL` not Vite-relative `/api` (was returning HTML 200). Nested `/ctv/discount/:shortCode` routes + admin splat guard. Fixed `CtvDiscountLanding` useEffect re-fetch loop (`t` dep removed). CTV portal link is clickable with open-preview button. — @agent — pressing QR share link went to Overview / QR never populated.

## [0.33.1] — 2026-06-08
### Release (NK3 — CTV discount QR minor)
- **NK3 promoted to 0.33.1** — bundles CTV Giới thiệu/QR tab (KOL-parity voucher UI), multi-code generation + **Mã của tôi** tracking, public fan landing `/ctv/discount/:shortCode`, staff `/verify-discount` flow with LOB-first client checks matching CTV refer/booking rules. Migrations 062–063 (`ctv_discount_codes`). Target: https://tmv.2checkin.com — @agent — NK3 minor version after KOL portal parity + staff verify hardening.

## [0.32.124] — 2026-06-08
### Fixed (NK3 — staff discount verify client rules)
- **Staff verify discount now mirrors CTV refer/booking client checks:** LOB picker first (dental or cosmetic), then phone lookup in that LOB only; claim gate vs issuing CTV; `hasService` flag for appointment/saleorder history; reclaim `referred_by_ctv_id` on verify. — @agent — existing-client verify must follow CTV portal booking rules per LOB.

## [0.32.123] — 2026-06-08
### Added (NK3 — CTV discount QR KOL parity)
- **KOL-style multi-code generation + tracking:** CTV portal Mode B creates a new code per “Tạo mã & tải ảnh” click; Mode A public landing `/ctv/discount/:shortCode` lets fans claim codes on button press. CTV **Mã của tôi** history panel lists all codes with stats/filters. Backend: migration 063, `POST /generate`, `GET /mine`, `GET /stats`, `GET /landing/:shortCode`, `GET /check-existing`; staff verify can `createIfMissing` to register client under issuing CTV. — @agent — match KOL portal: generate QR, track codes, check-in → client.

## [0.32.122] — 2026-06-08
### Added (NK3 — CTV discount QR staff verify)
- **Staff verify flow for CTV voucher QR:** QR now encodes `/verify-discount?code=…` (not a dead landing URL). Staff scan → login gate (CTV must log out first) → enter client phone → search dental + cosmetic customers → confirm verify. Backend: `ctv_discount_codes` table (migration 062), `/api/discount-codes/{lookup,client-search,verify,ensure}`. — @agent — QR scan only opened homepage; staff could not verify codes.

## [0.32.121] — 2026-06-08
### UI (NK3 — CTV portal QR voucher)
- **CTV Mã QR tab redesigned to match KOL referral voucher UX:** warm gradient background, red heartbeat discount banner with gift sparkles, glass “ticket” card with punch holes, monospace code, canvas QR, and animated purple–pink gradient “Lưu mã ngay!” download button. PNG export uses KOL-style composite (blue–pink bg, red banner, code + QR); mobile uses native share-with-file when available. — @agent — CTV portal QR looked too plain vs KOL app.

## [0.32.120] — 2026-06-08
### Added (NK3 — CTV portal Referral/QR)
- **CTV portal “Giới thiệu/QR” tab** now has sub-tabs: **Mạng lưới** (existing hierarchy) and **Mã QR** (discount link share + voucher PNG download). Bottom nav label renamed from “Mạng lưới” / “Network” to **Giới thiệu/QR** / **Referral/QR**. QR UI shows tier % preview, copy/share landing link (`/ctv/discount/{code}`), and downloadable voucher image — backend discount settings API pending. — @agent — CTV portal distribution modes (link vs image) per partner interview v5.

## [0.32.119] — 2026-06-07
### Added (NK3 — Face ID cross-LOB chooser)
- **Face ID recognition now lets the employee choose the LOB when a customer exists in both.** After `/api/face/recognize` matches in the active LOB, `GlobalFaceIdButton` probes the other physical DB by phone (`GET /api/cross-lob-probe`, `lob.crossview`-gated). When the same customer also exists in the other LOB, the quick-scan popover shows a chooser — open the current-LOB record (in-app navigate) or the other-LOB record (`?lob=` deep link, new tab) — instead of auto-navigating. Non-crossview employees and phone-less matches keep the previous straight-to-record behavior. — @agent — staff working a customer present in both dental and cosmetic could silently land on the wrong record.

### Fixed (NK3 — cross-LOB)
- **Restored `GET /api/cross-lob-probe`**, which had been dropped in the cosmetic-LOB merge (frontend `probeCrossLob` + `ProfileHeader` badge were calling a 404). Re-implemented in `api/src/server.js` gated by `requirePermission('lob.crossview')`, reading only the other LOB pool via `getDb(otherLob)` with a SQL last-9-digit phone-key match (replaces the original `LIMIT 300` + JS-loop scan that silently missed matches past the 300th customer). Cross-cutting route — passes through `dentalLobGate`.

### Docs / Tests
- Added `api/tests/crossLobProbe.test.js` (5: 400s, matched/not-matched other-pool probe, `PROBE_FAILED`) and a `GlobalFaceIdButton` chooser test (probe + new-tab deep link, no auto-navigate). Added `customers:face.crossLob.*` vi/en keys. Updated `docs/CONTRACTS.md` (v1.0.30) and `product-map/domains/integrations.yaml`.

## [0.32.118] — 2026-06-07
### Fixed (NK3 — CTV auth)
- **CTV login now works for admin- and public-created CTVs.** `api/src/services/loginIdentifier.js` no longer gates the phone/ref-code login *lookup* to `legacy_ctv_import` rows — it now resolves any active `is_ctv = true` partner by phone/ref. CTVs are created with phone + bcrypt password and an **optional** email (AGENTS.md §5.1), so the old gate made every admin "Add CTV" and public `/ctv/join` account unable to authenticate (401), blocking the entire `/ctv` portal. Auth boundary preserved: `bcrypt.compare` still runs first for every account, and the salted SHA-256 legacy-password fallback stays restricted to `legacy_ctv_import` rows via `canUseLegacyCtvPassword`. — @agent — fixes the INV-008C contradiction (phone+password creation vs email-only login); verified e2e (admin_create CTV → 200 + token; wrong password → 401).

### Docs / Tests
- Amended **INV-008C** to split the (widened) CTV phone/ref *lookup* from the (still import-marker-gated) legacy SHA-256 *password* fallback; updated `product-map/domains/ctv.yaml` (sources, affected_by, impact_tests) and `api/src/services/__tests__/loginIdentifier.test.js`. Backend auth/CTV suite green (loginIdentifier, legacyCtvPassword, authLobHardening, ctvCreateLobScope, ctvPublicJoin — 31 tests).

## [0.32.117] — 2026-06-07
### Added (NK3 — Face ID security)
- **Face ID passive liveness / anti-spoofing** — added MiniFASNet (source-verified Silent-Face) to the **local** face engine, run via OpenCV `cv2.dnn` (no new dependency). New `face-service/liveness.py` gates `POST /embed`: when `FACE_LIVENESS_ENABLED=true`, a printed/screen-photo spoof returns `SPOOF_DETECTED` (HTTP 422) from `/api/face/recognize` and `/api/face/register`, so a spoof never matches or enrolls. **Default off** and **fail-open** — a missing/unloadable model or inference error never blocks check-in (Face ID spec: "engine failures must not block normal workflows"). Enable only after calibrating `FACE_LIVENESS_THRESHOLD` (default 0.5) with real clinic captures. — @agent — closes the "no liveness" gap where a printed/on-screen photo matched a real customer; spec Non-Goals (payment auth, legal ID verification) unchanged.
- Liveness models bake into the face-service image as a best-effort build-time download (`QingHeYang/Silent-Face-Anti-Spoofing-onnx`); `/health` and `/embed` now report liveness availability; the Node face client surfaces `liveness`; frontend shows localized `customers:faceRecognition.spoofDetected`.

### Docs / Tests
- Added `face-service/tests/test_liveness.py` (13 passing: crop geometry, softmax aggregation, threshold, fail-open, and cv2-backed live/spoof verdicts) and 2 hook tests for the `SPOOF_DETECTED` mapping.
- Updated `docs/CONTRACTS.md` (v1.0.29: `liveness` on `/embed`, `SPOOF_DETECTED` 422), `product-map/domains/integrations.yaml`, the Face ID design spec addendum, `.env.example`, `docker-compose.yml`, and `face-service/Dockerfile`.

## [0.32.116] — 2026-06-08
### Fixed (NK3 — Feedback admin page)
- **Feedback admin 403 for Super Admin** — replaced legacy `requireAdmin` (`employee_permissions` table) with `requireFeedbackPermission` backed by `permissionService.resolveEffectivePermissions` (tier_id model). Super Admin and users with `feedback.view` or `permissions.view` can load `/feedback`; mutations accept scoped `feedback.reply` / `feedback.edit` / `feedback.delete` with `permissions.edit` fallback. — @agent — live NK3 bug on `tmv.2checkin.com` (403 "Admin access required").
- **Feedback load error UX** — `FeedbackAdminContent` shows a permission/load error banner instead of a silent empty table on API failure.

## [0.32.115] — 2026-06-07
### Fixed (NK3-only — gated by `COSMETIC_LOB_ENABLED` / `VITE_COSMETIC_LOB_ENABLED`)
- **Cosmetic API mirrors for commission admin** — mount `/api/cosmetic/Earnings` and `/api/cosmetic/Payouts` on the existing cosmetic router (same NK3 flag gate as other mirrors). Cosmetic mirror forces `req.lob='cosmetic'` so `?lob=all` cannot widen to dental. Top-level `/api/Earnings` and `/api/Payouts` unchanged for NK/NK2.
- **Payouts tab combined LOB filter** — when `isCosmeticEnabled` (NK3 builds only), Payouts tab shows **All** and merges dental+cosmetic payout history client-side; NK/NK2 builds without the flag keep per-LOB only.

## [0.32.114] — 2026-06-07
### Fixed
- **Cosmetic customer delete LOB routing** — `Customers.tsx` now passes `currentLOB` into `softDeletePartner` / `hardDeletePartner` so Cosmetic soft/hard delete hits `/api/cosmetic/Partners/:id/*` instead of the dental-only path (live NK3 bug: silent 404). Regression lock in `partners.lob.test.ts`. — @agent — INV-008x apiFetch LOB prefix.

## [0.32.113] — 2026-06-07
### Docs / Tests
- Added the **NK3 → NK2 pre-port smoke harness** for the cosmetic-LOB / CTV promotion. `scripts/verify-migration-additivity.js` (`npm run verify:migrations`) statically audits the migration delta (`047–061`) and fails on any destructive op against a pre-existing dental table — currently `58 SAFE · 4 REVIEW · 0 HIGH`. `scripts/nk3-to-nk2-preport-gates.py` (`npm run preport:gates`) runs all five local gates: additivity, the `049_widen` `partners.created_via` CHECK re-validation pre-check, a real-data clone re-apply (proves 0 dental columns removed), the cosmetic flag-guard jest, and the live two-DB CTV round-trip. Local run: **6 PASS / 0 FAIL**. — @agent — local-only promotion prep; no NK2/NK changes. Honors governance "local only, NK2 later".
- Added `docs/runbooks/NK3_TO_NK2_PROMOTION.md` — the NK3→NK2→NK promotion playbook (delta inventory, safety model, gate table, the one genuine `049_widen` per-target risk + pre-check query, flag-off-first NK2/NK steps, rollback, and per-target definition of done).
- Fixed a babel-jest parse regression that silently broke **all 10 API test suites** which `require('../src/server')` (Face ID route, health, auth, payments, telemetry, appointments, sale orders, feedback): the Jun-7 cluster perf change added a top-level `return` to `api/src/server.js` (valid in Node's CommonJS wrapper, but babel-jest rejects it as "'return' outside of function"). Added `api/babel.config.js` (test-only; `allowReturnOutsideFunction`) so babel-jest parses the real server bootstrap, and set `JWT_SECRET` before the server require in `api/tests/faceRecognition.test.js` per the existing repo pattern. Restores the Face ID backend suite to **322 passing** (route + integration tests runnable again) plus 34 frontend. — @agent — test infra only, no runtime/website change, no version bump.

## [0.32.111] — 2026-06-06
### Added
- Added the NK3 site-wide `@crossref` breadcrumb effect across frontend page/module/API-client surfaces, backend route/service/middleware surfaces, and canonical migration SQL files. Each covered file now carries `@crossref:domain[...]`, `@crossref:used-in[...]`, and `@crossref:uses[...]` breadcrumbs back to product-map domains, `docs/TEST-MATRIX.md`, and `testbright.md`.
- Added strict endpoint/function breadcrumbs for high-blast CTV, earnings, payment, payout, service-card, referral-claim, CTV hierarchy/profile/password, commission-engine, service-reversal, and NK3 live-repair files.

### Docs / Tests
- Added `scripts/verify-crossrefs.js`, `npm run verify:crossrefs`, and wired `verify:governance` to fail if NK3 breadcrumb coverage or strict P0 endpoint/function markers drift.
- Added `website/src/__tests__/crossrefBreadcrumbs.test.ts` to lock App route markers to reciprocal page breadcrumbs, and documented the standard in `docs/CROSSREF-BREADCRUMBS.md`, `AGENTS.md`, `website/agents.md`, `docs/TEST-MATRIX.md`, `product-map/test-matrix.md`, and `testbright.md`.

## [0.32.110] — 2026-06-06
### Fixed
- Repaired live NK3 CTV identity/referral drift for account `0972020908`: cleared the Dental CTV auth row's `customer=true`, normalized Dental/Cosmetic CTV mirror scopes/flags, inserted the missing Dental auth row for the active Cosmetic-only CTV with an existing password hash, and normalized inactive Cosmetic-only empty CTV scope rows. This preserves the CTV identity invariant in `product-map/domains/ctv.yaml` and restores the ability to add/recruit CTVs and refer clients from `/ctv`.
- Repaired live NK3 CTV earning drift: backfilled the valid Cosmetic service-card CTV earning from full service price per `INV-003C`, soft-cancelled the invalid Dental service-card gap with missing foreign-key targets instead of inventing money, and changed the orphan paid earning with a missing payout row back to pending with `payout_id=NULL`.
- Reconciled the NK3 migration ledger for already-present schema shape after fresh backups: Dental now records 055/056/057/058 and Cosmetic records 055/057 in `dbo.schema_migrations`.

### Docs / Tests
- Added `api/src/services/nk3CtvIntegrityRepair.js`, `api/src/services/__tests__/nk3CtvIntegrityRepair.test.js`, and `scripts/nk3-only/nk3-live-ctv-integrity-repair.js` for repeatable dry-run/apply planning against `tdental_nk3` and `tcosmetic_nk3`.
- Updated `docs/TEST-MATRIX.md`, `docs/MIGRATIONS.md`, `product-map/domains/ctv.yaml`, `product-map/domains/earnings-commissions.yaml`, `product-map/test-matrix.md`, `website/public/CHANGELOG.json`, `website/package.json`, and `testbright.md`.

## [0.32.109] — 2026-06-06
### Fixed
- Hardened the NK3/TMV Cosmetic route boundary: `/api/cosmetic/*` now always runs in Cosmetic DB context and ignores query/header LOB overrides such as `?lob=all` or `X-LOB: dental`, preserving `INV-008E` and keeping `/api/cosmetic/NewClients` Cosmetic-only.

### Docs / Tests
- Updated `docs/CONTRACTS.md`, `docs/INVARIANTS.md`, `docs/TEST-MATRIX.md`, `product-map/contracts/api-index.md`, `product-map/domains/business-unit.yaml`, `website/public/CHANGELOG.json`, and `testbright.md`.
- Added `api/src/middleware/__tests__/lob.test.js` to lock generic override behavior separately from the fixed Cosmetic mirror behavior.

## [0.32.108] — 2026-06-06
### Fixed
- Added the NK3/TMV Cosmetic mirror `GET /api/cosmetic/NewClients` and forced it to `lob=cosmetic` from the `/api/cosmetic/*` route context, so the documented referral revenue/COM audit endpoint is real and cannot be widened by `?lob=all`.

### Docs / Tests
- Updated `docs/CONTRACTS.md`, `docs/TEST-MATRIX.md`, `product-map/contracts/api-index.md`, `website/public/CHANGELOG.json`, and `testbright.md`.
- Added `api/src/routes/__tests__/newClientsRoute.test.js` for top-level `?lob=` behavior and Cosmetic mirror scoping.

## [0.32.107] — 2026-06-06
### Fixed
- Fixed NK3/TMV CTV referral commission loss: new service cards now inherit the customer's active recorded `referred_by_ctv_id` when staff leaves the CTV selector blank, persist that id to `saleorders.ctv_id`, and create full-service-price CTV earnings immediately per `INV-003C`.
- Expanded `/api/NewClients`, the admin `/commission?tab=newClients` table, and the New Clients Excel export from lead-only callbacks into a referral revenue/COM audit: converted referrals stay visible with service total, paid total, COM total, and a missing-COM status badge.

### Docs / Tests
- Updated `docs/business-logic/ctv-referral-commission.md`, `docs/INVARIANTS.md`, `docs/CONTRACTS.md`, `docs/TEST-MATRIX.md`, `product-map/domains/ctv.yaml`, `product-map/domains/earnings-commissions.yaml`, and `testbright.md`.
- Added targeted regression coverage: `api/src/routes/saleOrders/__tests__/createSaleOrderReferralCtv.test.js`, expanded `api/src/services/__tests__/newClientsQuery.test.js`, and updated `website/src/components/commission/NewClientsTab.test.tsx`.

## [0.32.106] — 2026-06-05
### Tests
- Added `TC060_TestSprite_MCP_CTV_commission_artifacts.py` and wired it into both TestSprite runners so NK3 TestSprite MCP config, CTV commission PRD/results/report cleanup proof, known X-LOB caveat, and screenshot artifacts are verified as a first-class regression guard. No runtime version bump: test/docs-only change.

### CTV Creation Unification + Permanent SSOT Enforcement (non-overlookable)
- Unified the three CTV/"Codex" signup/create processes (admin portal Add CTV in CtvManagementTab, unauthed public no-sign-in JoinCtv, logged-in CTV portal recruit via CtvRecruitModal) into **one reusable domain** (`website/src/components/shared/CtvCreationForm/` + `useCtvCreationForm` hook). All three now delegate (config modes + onSubmit wrappers for page extras like upline/code; beforeLobs slot for public gate; showLobs=false for public to preserve prior UX).
- **Fixed the reported image bug:** the recruit form required email + showed only generic "Vui lòng nhập đầy đủ thông tin" (no per-field). Now email optional everywhere (UI note via labels.emailOptional in public; converged with admin/public spec + backend); specific per-field errors + red `border-red-500` on the exact missing/partial field (e.g. the "thuan" email case); core form error for the group message like "Vui lòng nhập họ tên, số điện thoại và mật khẩu.". Matches the "admin does not require email" behavior.
- **Public CTV signup clarity:** `/ctv/join` now explicitly tells the CTV that only họ tên, số điện thoại, and mật khẩu are required; email is marked optional and the NK3 root-signup path is tested with no email and no CTV giới thiệu phone.
- **Portal recruit modal stability:** fixed the close/reopen reset effect so the shared form no longer loops on a closed `CtvRecruitModal`; the modal suite now passes without worker OOM.
- **Breadcrumb effect (@crossref):** Added/updated accurate `@crossref:used-in[...]`, `@crossref:uses[...]`, `@crossref:domain[ctv-creation]` in the SSOT module + all three call sites + README. Logic change in hook/form now visibly surfaces in all places.
- **Permanent enforcement so "this rule is enforced... cannot overlook" (AGENTS.md architect-level):**
  - New root `AGENTS.md` §5.1 "CTV / Identity Domain SSOT Enforcement" (mandatory shared use for any future create-CTV surface; @crossref required; atomic same-commit co-update of 3 consumers + backend validation (ctv.js + ctvPublic.js) + product-map/domains/ctv.yaml creation subsection + tests + CHANGELOG + version; violation = task failed + rollback per §16).
  - Hard block in `scripts/prompt-authority-check.sh` (rg scan for createCtv|joinCtv verbs without the shared import → exit 1 + message citing §5.1 + §16; runs on every prompt via the authority gate).
  - Frontend rules in `website/agents.md` (CTV Creation Domain SSOT subsection + "before adding a new create-CTV form or modal, import from shared...").
  - `product-map/domains/ctv.yaml` new `creation:` subsection (SSOT path, call sites, invariants, before_new_surface gate).
  - Co-located `website/src/components/shared/CtvCreationForm/README.md` (full contract, modes, examples, "cannot overlook" rules, cross-links).
  - Also enhanced shared `Field` with id + htmlFor for a11y + robust test queries (JoinCtv getByLabelText now works; tests green).
- Backend already consistent (ctv.js updated in cutover for optional email + dup guard only-if-supplied + NULL store; ctvPublic.js had the spec comment already).
- Types: `website/src/lib/api/ctv.ts` CreateCtvInput/CtvJoinInput email now `?`.
- Merge resolution for NK3 deploy preserved the no-email `/ctv/join` signup rule while retaining selected-LOB appointment-company fallback for CTV bookings, `/ctv` Me-tab invite-link share/copy actions, and admin `/commission?tab=` drilldown navigation from `origin/nk3-deploy`. Landing tests now wrap `Landing` in a router because the merged page reads `useSearchParams`.
- Version bump + both CHANGELOGs (website/public + docs/) per Claude.md + AGENTS §8 + §16.
- All per authority (read AGENTS.md + product-map/ctv + schema + 5 LOB split domains + prompt gate + Claude verification rule + shared/ SSOT + immutability + @crossref + TDD tests + local-first). Spun parallel agents for audit + enforcement drafting + breadcrumbs.

## [0.32.105] — 2026-06-05
### Added / Refactors
- **Presentational CtvCreationForm component.** Implemented `website/src/components/shared/CtvCreationForm/CtvCreationForm.tsx` (named export + `CtvCreationFormProps`). Strictly prop-driven using the prior `useCtvCreationForm` hookResult (no state/validate inside). Reuses internal `Field` (fidelity to recruit modal) + simple labels/inputs. Exact orange focus (`focus:ring-2 focus:ring-orange-500`), `rounded-xl px-4 py-3 border-gray-200` match to CtvRecruitModal/JoinCtv/CtvReferModal. Per-field `border-red-500` (spec) + error text on name/phone/email/password/lob_scope. Slots: `beforeLobs`, `children`, `afterSubmit`; `labels?` (partial), `showLobs?`, `onCancel?`, `submitLabel?`. Added subdir barrel + export in shared/index.ts. Includes basic co-located vitest (10/10 passing: values, error classes, setters, toggle, submit, slots, cancel, labels). Bumped website to 0.32.105; updated public/CHANGELOG + docs/CHANGELOG + testbright. @crossref added. — subagent (followed website/agents.md component rules, read hook+types+3 consumers+design+ctv product-map before write, authority gate + tsc + tests passed).
### Docs
- Updated `website/public/CHANGELOG.json`, `docs/CHANGELOG.md`, `testbright.md`, `website/package.json`.

## [0.32.104] — 2026-06-05
### Refactors
- **Shared CTV creation form hook (useCtvCreationForm) implemented as designed.** New config-driven hook at `website/src/components/shared/CtvCreationForm/useCtvCreationForm.ts` (co-located types + full vitest renderHook suite). Supports admin / portal-recruit / public-join modes. Email optional by default (falsy omitted from clean payload). Per-field errors for red highlights (name/phone/email/password/lobs). Immutable updates only. LOB: dental always forced/included (toggle cannot remove it), cosmetic optional. Password min 6. Reusable i18n 'ctv' errors (core "Vui lòng nhập họ tên, số điện thoại và mật khẩu." + per-field). onSubmit injected (no fetches/side effects inside). reset + success + isSubmitting exposed. Full @crossref. 12/12 tests pass. Bumped website to 0.32.104. Added keys to ctv.json (vi/en). Updated CHANGELOGs + testbright.md. — subagent (TDD, authority gate followed, product-map ctv+LOB domains read).
### Docs
- Updated `testbright.md`, `docs/CHANGELOG.md`, `website/public/CHANGELOG.json`, `website/package.json`.

## [0.32.103] — 2026-06-05 (nk3-deploy)
### Fixed
- **Admin CTV edit now exposes LOB scope choice (dental/cosmetic) for parity with create on NK3.** The Edit CTV modal was missing the `lob_scope` checkboxes present in Add CTV (and the list table already rendered per-CTV scopes), even though create always forces 'dental' (auth row) + optional cosmetic mirror, and NK3 relies on correct two-DB CTV scoping for earnings/referrals. Now `EditCtvModal` (and hardened `AddCtvModal`) shows the choice with 'dental' always required/disabled per invariant; payload includes `lob_scope`; backend `PUT /Ctvs/:id` accepts it, normalizes, and creates the cosmetic mirror row when scope is newly added. Updated `UpdateCtvInput`, adjusted payload tests (still green), bumped `website/package.json` to 0.32.103, and synced both CHANGELOGs. Addresses the direct logical error reported with the edit modal screenshot. — @grok (synthesizing parallel agent audits of NK3 CTV/LOB surfaces)

## [0.32.102] — 2026-06-05 (nk3-deploy)
### Added
- **CTV referral/commission spec — code-grounded gap analysis + Wave 1 (public signup).** Mapped all 49 rules of `docs/business-logic/ctv-referral-commission.md` against current NK3 code via an 8-cluster workflow → `docs/business-logic/ctv-referral-commission-GAP-ANALYSIS.md` (18 implemented / 17 partial / 13 missing / 1 deferred) with a prioritized 8-wave plan. **Wave 1 shipped (NK3-scoped):** public CTV signup now supports (a) **root/top-level CTVs** with no upline — gated behind `CTV_PUBLIC_ROOT_SIGNUP` (api) + `VITE_CTV_PUBLIC_ROOT_SIGNUP` (web) so NK/NK2 keep requiring an upline; (b) **optional email** (only name+phone+password required; blank email stored NULL and skips the duplicate-email check); UI clarifies email is optional and that a blank upline creates a root CTV. TDD: `ctvPublicJoin` 23/23, `JoinCtv` 6/6, `tsc` clean. **Wave 2 code done (INV-003C, flag `CTV_SERVICE_CARD_COMMISSION`, dormant by default):** `commissionEngine.createEarningsForServiceCard` creates pending CTV earnings the moment a service card with an attached CTV is created, on the **full service price** (tier-config levels, no-CTV→no-commission, disabled-level no-redistribution, cycle-guarded) + `reverseServiceCardEarnings` (status='reversed', paid-out left locked); wired into `saleOrders/createSaleOrder.js`; the payment-time path in `payments.js` is skipped when the flag is on (no double-count); `ctv.js` `paidList` now matches the aggregation's paid definition (excludes pending reversals AND service-card 'reversed'). 9 engine unit tests + full API suite 952/955 (3 pre-existing failures only). **Staged (NOT applied):** migration `055_earnings_service_card_created.sql` (makes `earnings.payment_id` nullable + service-card idempotency index) — needs approval before applying to `tdental_nk3`/`tcosmetic_nk3`. — @agent
- **Global breadcrumbs across every NK3 admin page.** New `website/src/components/shared/Breadcrumbs.tsx` renders an auto-generated, bilingual (EN/VI) navigation trail, wired once into `Layout` above the page `<Outlet/>`. The trail is derived from the existing `NAVIGATION_ITEMS` source of truth (`constants/index.ts`) so it can never drift from the real sidebar hierarchy and needs no hand-maintained route map. Handles top-level routes (Home › Calendar), sidebar group children (Home › Team › Commission), real nested routes (Home › Reports › Revenue, with Reports linked), and dynamic detail pages folded to their parent (`/customers/:id` → Home › Customers). Group containers that are not real routes render unlinked (no dead links); a11y via `<nav aria-label="Breadcrumb">` + `<ol>` + `aria-current="page"`. Labels resolve through the existing `nav` i18n namespace. — @agent
### Tested
- **Save round-trip regression guard for the CTV LOB bug class.** Added `api/src/routes/__tests__/ctvCreateLobScope.test.js` (3 cases) locking the invariant that `POST /api/ctv` ALWAYS writes the dental auth row (even when only cosmetic is selected) and mirrors cosmetic only when scoped — the exact "CTV saved to cosmetic only, no dental line" report. Added `scripts/nk3-only/nk3-save-roundtrip-smoke.py`, a local two-DB persistence harness that drives the real create endpoints, reads rows back from BOTH `tdental_demo` and `tcosmetic_demo`, asserts scope, self-cleans, and exits 0/1 for a pre-deploy gate (documented in `docs/RUNBOOK.md`). Verified it FAILS when the dental-forcing logic is removed (reproduces + catches the original bug) and PASSES on current code. Appended an idempotent, opt-in `lob_scope` backfill (section [D]) to `scripts/nk3-only/nk3-integrity-repair-2026-06-04.sql` for CTVs mirrored with empty `lob_scope` that are invisible in a LOB roster. Diagnosis: current `nk3-deploy` CTV create code is correct on all three paths (`ctv.js`, `ctvActions.js`, `ctvPublic.js`); the live symptom is VPS version drift + latent empty-scope demo rows. API CTV suites 18/18 pass; frontend Breadcrumbs 6/6 pass; `tsc --noEmit` clean; eslint clean. — @agent
### Fixed
- **NK3 CTV/booking bug-hunt — six root-caused defects fixed (TDD, RED→GREEN).** A multi-agent adversarial bug hunt (7 finders × 3-lens verification) over the NK3 CTV/booking/commission/cosmetic surface confirmed six defects; each is now fixed with a failing-test-first regression guard.
  1. **(CRITICAL) Cross-LOB split-brain on public CTV join.** `POST /api/ctv-public/join` inserted the new CTV into the dental + cosmetic DBs via `Promise.all` over error-swallowing `safeRows` but only checked the dental result — a failed cosmetic insert still returned `201`, leaving a CTV that exists in one LOB only (breaks login, referral claims, commission). Now writes sequentially and, on cosmetic failure, **rolls back the dental row** and returns `500 E_CTV_CREATE_FAILED`. (`api/src/routes/ctvPublic.js`)
  2. **(HIGH) Opaque 500 on public booking with no branch configured.** `POST /api/ctv-public/bookings` passed a null `companyid` into the NOT-NULL `appointments.companyid` column, surfacing a generic DB 500. Now returns `400 E_NO_COMPANIES` with an actionable message before inserting. (`api/src/routes/ctvPublic.js`)
  3. **(HIGH) Password-change cross-LOB takeover.** `changeCtvSelfPassword` verified the current password against only the first LOB found, then wrote the new hash to BOTH LOBs — so a caller who knew only the dental password could overwrite a diverged cosmetic credential. Now verifies the current password against **every** LOB hash before updating any. (`api/src/services/ctvSelfProfile.js`)
  4. **(HIGH) Reversals shown as Paid in the CTV commission dashboard.** `paidList` used `status !== 'pending' || amount < 0`, so pending negative reversals appeared in the Paid tab. Now `paidList = status !== 'pending'` — reversals stay in Pending only. (`api/src/routes/ctv.js`)
  5. **(MED) Dead shadowed `GET /api/ctv/me`.** `ctv.js` defined a lightweight `/me` permanently shadowed by `ctvProfileRoutes` (mounted first). Removed the dead handler (a latent landmine if mount order changed); `ctvProfile.js` is the single source. (`api/src/routes/ctv.js`)
  6. **(MED) Modals retained stale state across open/close.** `ExportDateRangeModal` + `CtvRecruitModal` kept prior preset/date/form values on reopen; added reset-on-close `useEffect`s and reset-on-reopen tests. (`website/src/components/...`)
  - Regression guards: `ctvPublicJoin.test.js`, `ctvBookings.test.js` (no-branch guard + commission paidList), `ctvSelfProfile.test.js` (all-LOB verify), `ctvRouteGating.test.js`, modal reset tests. API CTV suites green; web modal suites green; `tsc --noEmit` clean. Pre-existing/unrelated failures (commissionEngine v3 stale-mock test, saleOrderLines pool mock, cosmeticLobGuards, Landing useLocation/Router test, flaky Calendar click) left untouched and flagged. — @agent

## [Unreleased] — 2026-06-04
### Docs
- **CTV referral and commission business logic saved as durable authority.** Added `docs/business-logic/ctv-referral-commission.md` from the 2026-06-05 operator interview and cross-linked BEHAVIOR, DECISIONS, INVARIANTS, CTV product-map, earnings product-map, legacy commission rules, and TestSprite ledger. Clarifies that CTV commission is service-card-created, full-service-price, tier-config driven; payment-collected/product-rate behavior is a code gap for CTV. Documentation-only change; no runtime behavior changed. — @agent
- **NK3/TMV TestSprite PRD extracted from source code.** Added a code-grounded PRD with client/admin route inventory, backend endpoint inventory, auth and role mapping, config-as-data sources, money invariants, known-broken surfaces, explicit avatar-selection status, and open questions for `tmv.2checkin.com` TestSprite generation. Documentation-only change; no runtime behavior changed. — @agent

### Infrastructure
- **Daily database backups now cover `tdental_demo`, `tdental_smoketest`, and `tcosmetic_smoketest` with 7 retained dump sets and local download verification.** Updated the backup script default retention, root VPS cron schedule, runbook, TestSprite ledger, and Codex daily verification automation so NK production Dental, NK3 Dental smoke-test, and NK3 Cosmetic smoke-test each get a read-only `pg_dump` backup, checksum verification, archive readability check, and newest verified local copy. — @agent
- **NK3 Cosmetic database now has a daily VPS backup plus local daily download verification.** Added a second root crontab entry on `76.13.16.68` for `tcosmetic_smoketest`, scheduled after the existing Dental backup, writing to `/opt/tgroup/backups/nk3-cosmetic-db-daily/` with `TGROUP_DB_BACKUP_RETENTION=7`. Ran a manual smoke backup, verified its checksum and Postgres 16 archive TOC, downloaded the verified dump to `backups/nk3-cosmetic-db-daily/`, and updated the existing Codex daily backup verification automation to check Dental plus NK3 Cosmetic and keep only the latest 7 local Cosmetic dump sets. — @agent

### Data
- **NK3 Cosmetic CSV appointments restored with insert-only import.** Imported 4,385 reviewed CSV appointments and created 126 missing Cosmetic customer rows in live `tcosmetic_smoketest` after fresh backup, scratch rehearsal, and two user confirmations. No services, orders, payments, allocations, deposits, Dental tables, or NK production databases were written in this pass. — @agent

### Fixed
- **NK3 Cosmetic historical appointments/orders/payments restored with insert-only merge and destructive migration guardrails.** Recovered `tcosmetic_smoketest` from the May 29 full-hierarchy backup into a probe DB, rehearsed against a fresh current backup, then inserted only missing historical rows into live NK3 Cosmetic: 68 appointments, 3953 saleorders, 3952 saleorderlines, 5587 payments, 3848 payment allocations, and 5 earnings. Preserved current live rows including 4 new appointments, 119 new partners, and 11 new products. Added break-glass guards to the destructive legacy `008_data_migration_from_tdental*` SQL files and a regression test so they cannot be accidentally run on NK3/local protected DB names. Backups: `backups/recovery-20260604-133742/`. — @agent

### Changed
- **Public booking ("Giới thiệu khách") form reordered for sensible flow.** Moved the Dental/Cosmetic (`lob`) toggle to the **top** of `website/src/components/ctv/CtvReferModal.tsx`, ahead of the phone field. Since the LOB decides which database the phone lookup and service catalog query, choosing it first is the logical first step. Order is now: LOB → phone → name → CTV phone → date → service → notes. Applies to both the public landing booking sheet and the authenticated refer-client modal. `CtvReferModal.test.tsx` (8 passed); built + deployed to NK3 (tgroup-nk3-web) and verified live on ctv.thammyvientam.com. — @agent

## [Unreleased] — 2026-06-03
### Deployed / Fixed
- **NK3 (tmv.2checkin.com) deployed to v0.32.101 — public no-login CTV signup + booking now work live, surfaced through the ctv.thammyvientam.com layer.** The live NK3 containers were running a stale v0.32.97 build, so the public API (`/api/ctv-public/services`, `/ctv-lookup`) returned 401 and `/ctv/join` hard-blocked with "Liên kết giới thiệu không hợp lệ" (no form). Rebuilt `tgroup-nk3-api` + `tgroup-nk3-web` from the current working tree (rsync → `/opt/tgroup-nk3/app` → `docker compose -f runtime/docker-compose.nk3.yml up -d --build`). Applied migration `054_add_appointments_ctv.sql` (+ other pending idempotent migrations) to both NK3 smoketest DBs (`appointments.ctv_id` was missing). Fixed a public-booking 500: `POST /api/ctv-public/bookings` inserted `companyid = null` (NOT NULL violation) — now defaults to the LOB's primary `dbo.companies` row when the public form sends no branch. Added a `/welcome?book=1` deep-link so the landing "Đặt Lịch" CTA opens the booking sheet in one click (`Landing.tsx`), and pointed the static landing booking button at it. Verified live: signup form renders no-login with manual CTV referrer field; booking sheet opens 1-click with live CTV verify ("CTV hợp lệ"); test booking + signup return 201 and persist with company + CTV attribution (test rows cleaned from smoketest DBs); Login → tmv.2checkin.com. — @agent
### Fixed
- **ctv.thammyvientam.com landing buttons now point to live SPA routes (were all dead).** The static landing served at `ctv.thammyvientam.com/` (`/var/www/ctv-thammyvientam-landing/index.html`) had three CTA buttons whose hrefs (`/booking`, `/ctv/signup`, `/ctv/portal`) do not exist in the deployed `tmv.2checkin.com` SPA — verified against the live `index-Bag76hql.js` route table (only `/welcome`, `/ctv/join`, `/ctv` exist). All three 301-forwarded to the SPA then fell through React Router's catch-all `*` → redirect to `/`, so "Đăng Ký CTV" and "Đăng Nhập" silently bounced users to the app root/login instead of the signup and portal pages. Corrected the hrefs: booking `/booking`→`/welcome` (public booking modal landing), signup `/ctv/signup`→`/ctv/join`, login `/ctv/portal`→`/ctv` (CTV portal; redirects unauthenticated visitors to login). Also fixed the matching dead `/ctv/portal` link in the React port `website/src/pages/Landing/Landing.tsx` (login CTA) and its test. Corrected static landing mirrored to the tracked artifact `docs/live-artifacts/ctv-thammyvientam/landing-index.html`; VPS original backed up as `index.html.bak-buttons-20260603T223737Z`. — @agent
### Tested
- Live: `curl https://ctv.thammyvientam.com/` serves the corrected hrefs; `/welcome`, `/ctv/join`, `/ctv` each `301`→`tmv.2checkin.com` and return HTTP 200 on real routes (no catch-all bounce). `npx vitest run src/pages/Landing/Landing.test.tsx` (3 passed). In-browser click-through render not run — WebBridge had no open browser window. — @agent
- **CTV cross-LOB refer-client re-registration now blocked.** `POST /api/ctv/clients` in `api/src/routes/ctv.js` previously only checked the requested LOB's `dbo.partners` table for duplicate phone, so a client already actively claimed by CTV-A in the OTHER LOB (e.g. has CTV-A on an appointment or saleorder) could be silently re-registered as a brand-new partner row under CTV-B. The handler now cross-checks BOTH LOBs' `partners` tables by phone; if any LOB has the client and `getReferralClaimStatus` reports an active claim owned by a different CTV, the request returns `400 B_CLIENT_CLAIMED` (same shape as `/bookings` and `/ctv-public/bookings`). Same-LOB duplicates still surface as `400 U_DUPLICATE_PHONE`; cross-LOB lapsed or unclaimed matches still allow the create in the requested LOB. Also switched the handler's UUID generation from the ESM-only `uuid@13` package to `crypto.randomUUID()` (the success path was previously throwing 500 in production due to `require('uuid')` against a pure-ESM module — caught by the new tests). Preserves BEHAVIOR.md, product-map `ctv.yaml` impact_tests, and contract shape. — @agent
### Tested
- `cd api && npx jest src/routes/__tests__/ctvBookings.test.js src/routes/__tests__/ctvPublicJoin.test.js src/__tests__/ctvRouteGating.test.js --no-coverage` (20 passed; 4 new `/clients` cases covering cross-LOB active claim, same-LOB U_DUPLICATE_PHONE, cross-LOB lapsed claim, and brand-new). — @agent

## [Unreleased] — 2026-06-02
### Infrastructure
- **ctv.thammyvientam.com keeps its landing page and forwards non-root routes to NK3.** Updated the active nginx artifact (`docs/live-artifacts/ctv-thammyvientam/ctv-canonical.conf`) so `/` and `/static/` are served as static nginx files while `/booking`, `/ctv/signup`, `/ctv/portal`, and every other non-root route return `301` to `https://tmv.2checkin.com$request_uri`. This preserves the visible Tâm landing page without depending on the old CTV app upstream and moves the actionable CTV routes to the NK3 app. — @agent

## [0.32.100] — 2026-06-02 (nk3-deploy)
### Fixed
- **Mobile CTV and calendar modals keep close/actions reachable.** `/ctv` Refer Client and Recruit CTV sheets now use a constrained mobile sheet with a non-scrolling header close button and internal form scrolling. `/calendar` export date range now uses the same mobile-safe flex shell so its close/apply/cancel controls stay reachable while the custom date range body scrolls. Preserves BEHAVIOR.md mobile dialog rules, product-map `ctv.yaml` and `appointments-calendar.yaml`, and TEST-MATRIX modal-fit coverage; no API or backend data-flow changes. — @agent
### Tested
- Pending in this local change until focused Vitest/build/docs and screenshot verification finish. — @agent

## [0.32.99] — 2026-06-02 (nk3-deploy)
### Changed
- **Public CTV phone fields now verify live while typing.** Added read-only `GET /api/ctv-public/ctv-lookup?phone=...` and wired it into both public forms: `/welcome` booking `Số điện thoại CTV` and `/ctv/join` `CTV giới thiệu`. Both forms show checking/found/not-found status and block submit before writing when the typed CTV phone is missing, still checking, or not in the system. Updates contract v1.0.19, BEHAVIOR.md, product-map `ctv.yaml`, SECURITY.md, TEST-MATRIX.md, and `testbright.md`. — @agent
### Tested
- `npm --prefix website test -- src/components/ctv/CtvReferModal.test.tsx src/pages/CTV/JoinCtv.test.tsx src/lib/api/__tests__/ctv.booking.test.ts` (23 passed); `JWT_SECRET=test-secret npx jest src/routes/__tests__/ctvPublicJoin.test.js src/routes/__tests__/ctvBookings.test.js --runInBand` (14 passed); `npm --prefix website run build` (passed, existing dynamic-import/chunk-size warnings); `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/routes/ctvPublic.js website/src/lib/api/ctv.ts website/src/components/ctv/CtvReferModal.tsx website/src/pages/CTV/JoinCtv.tsx` (0 findings); local Playwright/Chrome screenshots `docs/live-artifacts/ctv-public-phone-verify/01-booking-ctv-phone-verified.png` and `docs/live-artifacts/ctv-public-phone-verify/02-signup-upline-phone-verified.png`; `npm run verify:docs` passed. — @agent

## [0.32.98] — 2026-06-02 (nk3-deploy)
### Added
- **CTV Tôi tab now has self-service name and password settings.** `/ctv` Me/Tôi adds display-name and password cards; `GET /api/ctv/me` now reads the authenticated CTV partner row, `PATCH /api/ctv/me` updates only that CTV's display name, and `POST /api/ctv/me/password` verifies the current password before writing a new bcrypt hash to mirrored CTV rows. Preserves CTV-only self-scope in BEHAVIOR.md, product-map `ctv.yaml`, SECURITY.md, TEST-MATRIX.md, and contract v1.0.18. — @agent
### Tested
- `JWT_SECRET=test-secret npx jest src/services/__tests__/ctvSelfProfile.test.js src/__tests__/ctvRouteGating.test.js --runInBand` (5 passed); `npm --prefix website test -- src/pages/CTV/CtvDashboard.test.tsx src/lib/api/__tests__/ctv.booking.test.ts` (15 passed); `npm --prefix website run build` (passed, existing dynamic-import/chunk-size warnings); `npm run verify:docs` (passed); `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/routes/ctvProfile.js api/src/services/ctvSelfProfile.js website/src/pages/CTV/CtvDashboard.tsx website/src/pages/CTV/tabs/CtvAccountSettings.tsx website/src/pages/CTV/tabs/CtvMeTab.tsx website/src/lib/api/ctvSelf.ts website/src/lib/api/ctv.ts` (0 findings); local Playwright/Chrome screenshot `docs/live-artifacts/ctv-self-settings/01-ctv-toi-account-settings.png` with overlap probe `[]`. — @agent

## [0.32.97] — 2026-06-02 (nk3-deploy)
### Changed
- **Public Tâm landing CTV signup now loads `/ctv/join` and supports manual upline phone assignment.** `/welcome` `Đăng Ký CTV` now points to the public join page instead of `/ctv/signup`; `/ctv/join` no longer blocks direct visitors without `?ref=CTV-...` and adds a final `CTV giới thiệu` phone field. `POST /api/ctv-public/join` now accepts either `code` or `uplinePhone`, resolves an active CTV parent, and creates the new CTV under that actual upline while preserving duplicate/password guards. Updates contract v1.0.17, BEHAVIOR.md, product-map `ctv.yaml`, SECURITY.md, and TEST-MATRIX.md. — @agent
### Tested
- `npm --prefix website test -- src/pages/CTV/JoinCtv.test.tsx src/pages/Landing/Landing.test.tsx src/lib/api/__tests__/ctv.booking.test.ts` (14 passed); `JWT_SECRET=test-secret npx jest src/routes/__tests__/ctvBookings.test.js src/routes/__tests__/ctvPublicJoin.test.js --runInBand` (12 passed); `npm --prefix website run build` (passed, existing chunk/dynamic-import warnings); `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/routes/ctvPublic.js website/src/lib/api/ctv.ts website/src/pages/CTV/JoinCtv.tsx website/src/pages/Landing/Landing.tsx` (0 findings); `npm run verify:docs` (passed); local Playwright/Chrome screenshot `docs/live-artifacts/ctv-public-signup/01-public-ctv-signup-upline-field.png`. — @agent

## [0.32.96] — 2026-06-02 (nk3-deploy)
### Changed
- **Public Tâm landing booking no longer requires CTV login.** `/welcome` now opens the `Giới thiệu khách` sheet in-place when visitors click `Đặt Lịch Cho Khách`; the sheet asks for customer phone first, shows `Type in the phone number to verify first.`, can prefill an available existing customer name, and requires a CTV phone number for attribution. Added public narrow endpoints `GET /api/ctv-public/client-lookup`, `GET /api/ctv-public/services`, and `POST /api/ctv-public/bookings`, which resolve an active CTV by phone, run the active-claim gate, and create/reclaim only the customer plus appointment. Preserves the appointment-only CTV booking invariant in BEHAVIOR.md, product-map `ctv.yaml`, and contract v1.0.16. — @agent
### Tested
- `npm --prefix website test -- src/components/ctv/CtvReferModal.test.tsx src/pages/Landing/Landing.test.tsx src/lib/api/__tests__/ctv.booking.test.ts` (15 passed); `JWT_SECRET=test-secret npx jest src/routes/__tests__/ctvBookings.test.js --runInBand` (9 passed). — @agent

## [0.32.95] — 2026-06-02 (nk3-deploy)
### Fixed
- **Shared calendar/date fields no longer use native mobile date popups or overlapping absolute panels.** `/ctv` `Giới thiệu khách`, `/calendar` quick-add/export date ranges, `/reports/revenue` filters, payment/deposit dates, customer health-check upload dates, and patient service dates now use the shared app `DatePicker`, which opens in normal document flow with a Monday-first calendar. Appointment and service modals reserve enough bottom scroll space for fixed footers, and the feedback login hint hides while dialogs/date pickers are open. Preserves existing date string payloads, including the CTV booking default to today's `Asia/Ho_Chi_Minh` date; no API or backend data-flow changes. — @agent
### Tested
- `npm --prefix website test -- src/components/ui/DatePicker.test.tsx src/components/ctv/CtvReferModal.test.tsx` (8 passed); `npm --prefix website run build` (passed; existing Vite dynamic/static import and chunk-size warnings only); `rg -n "type=\"date\"|type='date'" website/src --glob '!**/*.map'` (no production native date inputs remain); local Playwright/Chrome screenshot verification with mocked API for `http://127.0.0.1:5175`: `docs/live-artifacts/ctv-date-picker/01-ctv-refer-calendar-open.png`, `02-reports-revenue-date-filter-open.png`, `03-calendar-export-date-range-open.png`, `04-calendar-quick-add-date-open.png`. Scoped Semgrep: `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off <22 changed frontend/i18n/css paths>` scanned 22 files, 0 findings, 0 blocking HIGH/ERROR findings. — @agent

## [0.32.94] — 2026-06-02 (nk3-deploy)
### Changed
- **CTV portal orange menu is now a compact motion pill.** `/ctv` replaces the tall orange header block with a smaller rounded header, groups `Giới thiệu khách` and `Tuyển CTV` inside a pill action menu, and hides the header on downward scroll while returning it on upward scroll or focus. Preserves the CTV-only portal behavior in BEHAVIOR.md and product-map `ctv.yaml`; no API or backend data flow changed. — @agent
### Tested
- `npm --prefix website test -- src/pages/CTV/CtvDashboard.test.tsx` (5 passed); `npm --prefix website run lint` (0 errors, 48 existing warnings); `npm --prefix website run build`; local Playwright/Chrome visual companion against `http://127.0.0.1:5175/ctv` with mocked CTV API responses: `docs/live-artifacts/ctv-header-motion/ctv-orange-menu-scroll-companion.png`. — @agent

## [0.32.93] — 2026-06-02 (nk3-deploy)
### Added
- **CTV 6-month eligibility bar + Doctor→CTV breadcrumb.** A client's link to a CTV is now a computed, non-destructive status anchored on the most recent non-cancelled **CTV-bearing** appointment or service (service wins ties); the window is `anchor + 6 months`. Surfaced as a color-shifting countdown bar (`CtvLinkBar`) on the admin customer profile header and every CTV-portal card, plus a `BS. … › CTV: …` breadcrumb (`DoctorCtvTrail`) on appointment and service rows. When the window lapses the bar shows "Đã hết hạn — khách có thể gắn CTV khác" and the portal card surfaces an eligibility banner with the journey dimmed. — @agent (Claude)
### Backend
- New `appointments.ctv_id` column (migration `054_add_appointments_ctv.sql`) persisted on appointment create/update and portal booking, with an idempotent anchor backfill. `getCtvLinkStatus`/`computeCtvLink` derive `anchorAt → expiresAt(+6mo) → active/eligible`; the legacy `getReferralClaimStatus` now delegates to it so `/ctv/referrals`, the customer-profile `referralClaim`, `/client-lookup` and the booking gate all agree. No change to commission %, earnings rows, payouts, or `referred_by_ctv_id` (only the existing assign/claim paths mutate it). — @agent (Claude)
### Fixed
- **`useCustomerProfileData` dropped `referralClaim`**, so the countdown bar never rendered on the `/customers/:id` deep-link page. Now passed through. Caught by live Playwright verification, not unit tests. — @agent (Claude)
### Tested
- Jest (`computeCtvLink` + `getReferralClaimStatus` delegation, `getPartnerById`/`resolveHandler` referralClaim); Vitest (`CtvLinkBar`, `DoctorCtvTrail`, + 7 affected customer/ctv suites, 48 green); `tsc --noEmit` clean; `npm run build` green; Playwright live verification on `http://127.0.0.1:5175` (t@clinic.vn) of the expired bar + appointment-row breadcrumb against local NK3 demo data (5433 `tdental_demo`). CTV-portal cards covered by unit + API only (no CTV test account). — @agent (Claude)

## [0.32.92] — 2026-06-01 (nk3-deploy)
### Fixed
- **CTV bookings are appointment-only again and name lookup fills available existing clients.** `POST /api/ctv/bookings` no longer calls `createReferralStartCard()` or writes `saleorders`/`saleorderlines`; selected services or the configured Referral Start product are stored only on `appointments.productid`. The CTV refer modal also pre-fills the name after phone lookup when the existing client is available and does not overwrite manual typing. Preserves INV-021 and INV-022. — @agent
- **Service deletion now respects the CTV paid-out lock.** `DELETE /api/SaleOrderLines/:id` runs through `serviceReversal`: paid-out earnings block reversal; pending linked earnings get negative reversal rows; single-invoice payments are voided only when safe; mixed allocations or partially paid multi-line orders are rejected instead of silently corrupting residuals. New invariant INV-003B. — @agent
### Changed
- **Admin `/commission` now uses a five-step CTV workflow rail.** Config, CTVs, New Clients, Earnings, and Payouts are presented as a breadcrumb-style operational flow with clean date labels and explicit earned dates in earnings/payout tables. Website version bumped to `0.32.92`. — @agent
### Tested
- `JWT_SECRET=test-secret npx jest src/routes/__tests__/ctvBookings.test.js --runInBand`; `JWT_SECRET=test-secret npx jest src/services/__tests__/serviceReversal.test.js --runInBand`; `npm --prefix website test -- ServicePicker`; `npm --prefix website test -- CtvReferModal`; `npm --prefix website test -- EarningsPayoutsTabs`; `npm --prefix website run build`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off <changed paths>` (0 findings); `npm run verify:governance`. Live verification still to run before deploy. — @agent

## [0.32.88] — 2026-06-01 (nk3-deploy only)
### Fixed (money integrity — NK3 demo DBs only during verification)
- **Payment DELETE and /void now reverse v2 earnings attribution (no more phantom commissions).** Both paths now call `commissionEngine.reverseOnRefund` inside the transaction (exactly like the refund path). Negative reversal rows are inserted for every prior positive earnings row for that payment. Net attribution = 0. Original positive rows left untouched for audit. Prevents the exact class of bugs that caused "Trung kien 39k under downline" after deletes and "can't delete payments" leaving orphan earnings. New invariant INV-003A. One-off NK3-only cleanup script added in `scripts/nk3-only/`. All changes on nk3-deploy branch; local 5433 tdental_demo + tcosmetic_demo only for verification. Never applied to real NK or nk2. — @agent (Grok)
### Tested
- New contract test in `api/src/services/__tests__/commissionEngine.test.js` (NK3 reversal section); relevant suite reports 854 passed.
- Manual DB + browser verification planned on http://127.0.0.1:5175 (t@clinic.vn) against local NK3 demo data only.
- `npm run verify:governance` (authority gate + docs) to be re-run before any PR from this branch.

## [0.32.87] — 2026-06-01 (nk3-deploy)
### Fixed
- **CTV appointment-only bookings now default to a Referral Start appointment purpose.** If `/ctv` submits `POST /api/ctv/bookings` without a selected service, the appointment uses the selected LOB's active `commission_settings.referral_start_product_id` as `appointments.productid`; if the CTV selected a service, that selected product still wins. This keeps the booking as an appointment only and still avoids creating any saleorder/service card. Preserves WF-015, UC-022, and INV-022. — @agent
### Tested
- `JWT_SECRET=test-secret npm --prefix api test -- --runInBand src/routes/__tests__/ctvBookings.test.js src/services/__tests__/referralClaim.test.js` (project Jest runner matched all API suites: 83 suites / 903 tests passed; existing open-handles warning still appears after completion); `npm --prefix website run build`; `npm run verify:governance`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/routes/ctv.js api/src/routes/__tests__/ctvBookings.test.js` (0 findings). — @agent

## [0.32.86] — 2026-06-01 (nk3-deploy)
### Fixed
- **CTV refer-client booking is appointment-only and can prefill available existing names.** `/ctv` now fills the name field after `GET /api/ctv/client-lookup` finds an existing unclaimed client, without overwriting manual input. `POST /api/ctv/bookings` now creates/reclaims the client and inserts a `dbo.appointments` row only; selected service stays on `appointments.productid` and no Referral Start/service-card saleorder is created. Referral claims remain protected by using the booking appointment as the active-claim anchor. Preserves WF-015, UC-022, INV-021, and new INV-022. — @agent
### Tested
- `JWT_SECRET=test-secret npm --prefix api test -- --runInBand src/routes/__tests__/ctvBookings.test.js src/services/__tests__/referralClaim.test.js` (project Jest runner matched all API suites: 83 suites / 903 tests passed); `npm --prefix website test -- src/components/ctv/CtvReferModal.test.tsx` (4 tests passed); `npm --prefix website run build`; `npm run verify:governance`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/routes/ctv.js api/src/services/referralClaim.js api/src/routes/__tests__/ctvBookings.test.js api/src/services/__tests__/referralClaim.test.js website/src/components/ctv/CtvReferModal.tsx website/src/components/ctv/CtvReferModal.test.tsx` (0 findings). — @agent

## [0.32.85] — 2026-06-01 (nk3-deploy)
### Fixed
- **CTV refer-client sheet now defaults the appointment date to today in Vietnam time.** The `/ctv` `Giới thiệu khách` modal no longer opens with a blank required date field on mobile Safari, so CTVs can submit a booking without hitting `Vui lòng nhập đầy đủ thông tin` when the only missing value is the hidden/empty date input. Preserves WF-015 and UC-022. — @agent
### Tested
- `npm --prefix website test -- src/components/ctv/CtvReferModal.test.tsx` (2 tests passed). — @agent

## [0.32.84] — 2026-06-01 (nk3-deploy)
### Fixed
- **CTV bookings now make accepted existing partners visible in admin Customers.** `POST /api/ctv/bookings` now sets `dbo.partners.customer = true` when it reclaims/books an existing partner row, preserving the single partner identity while ensuring `/customers` and `GET /api/cosmetic/Partners?search=` can find portal-accepted clients such as the NK3 `thuan test` Cosmetic case. Preserves INV-001, INV-006, and new INV-021. — @agent
### Tested
- `JWT_SECRET=test-secret npm --prefix api test -- --runInBand src/routes/__tests__/ctvBookings.test.js` (project Jest runner matched all API suites: 83 suites / 901 tests passed; existing open-handles warning still appears after completion). — @agent

## [0.32.82] — 2026-06-01 (nk-feedback)
### Fixed
- **Customer profile saves no longer fail on migrated blank DOB parts.** The shared `@tgroup/contracts` partner schema now normalizes blank, `0`, and `"0"` birthday/birthmonth/birthyear values to `null` before validation, so unrelated edits on migrated customer records are not blocked while real invalid days/months still fail. — @agent
### Added
- **Revenue report now shows in-app revenue by customer source.** `/reports/revenue` calls `POST /api/Reports/revenue/by-source` and renders a `Doanh thu theo nguồn` card using the same posted service-payment recognition rules as the main revenue report, attributing by sale-order source first and customer source second. — @agent
### Tested
- `npm --prefix contracts run build`; `JWT_SECRET=test npm --prefix api test -- --runInBand src/routes/partners/__tests__/partnerValidation.test.js src/routes/reports/__tests__/revenueRecognition.test.js` (project script matched full API suite: 83 suites / 897 tests passed); `npm --prefix website test -- src/pages/reports/__tests__/ReportsSubpages.test.tsx` (23 tests passed); `npm --prefix website run build`; `npm run verify:docs`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off contracts/partner.ts api/src/routes/reports/revenueBreakdowns.js website/src/pages/reports/ReportsRevenue.tsx` (0 findings); local Playwright screenshot `output/playwright/nk-feedback-fixes-20260601/reports-revenue-by-source-local.png`. — @agent

## [0.32.81] — 2026-05-31 (nk3-deploy)
### Fixed
- **Cosmetic service catalog is visible to location-scoped staff.** `GET /api/Products` now treats `products.companyid IS NULL` as global when a branch `companyId` filter is selected, so a single-location cosmetic employee like `thuan test` can see the global cosmetic service catalog instead of an empty table. — @agent
- **Product category mutations are LOB-aware and no longer crash.** `POST/PUT/DELETE /api/ProductCategories` now uses the request-scoped `getQuery(req)` executor, fixing the pending auto-feedback crash `query is not defined` and keeping Cosmetic category writes on the Cosmetic DB. — @agent
- **Doctors report no longer 500s on branch filters.** `/api/Reports/doctors/performance` now qualifies the joined appointment company filter as `a.companyid`, fixing the live `column reference "companyid" is ambiguous` error captured by feedback. — @agent
### Tested
- Focused Jest: `JWT_SECRET=test npx jest --runInBand src/routes/__tests__/productCatalogRoutes.test.js src/routes/reports/__tests__/doctorsPerformance.test.js src/__tests__/productsNormalizeImport.test.js` → 3 suites / 4 tests passed. — @agent
- Semgrep: `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/routes/products.js api/src/routes/productCategories.js api/src/routes/reports/doctors.js` → 0 findings. — @agent
- NK3 live deploy only: backed up `/opt/tgroup-nk3/app/api/src/routes/{products.js,productCategories.js,reports/doctors.js}` to `/opt/tgroup-nk3/hotfix-backups/tmv-feedback-catalog-20260531T042418Z`, copied the patched files, forced a no-cache API rebuild, and verified `thuan test` now sees 24 services, doctors report returns 200, and a temporary Cosmetic category create/delete smoke returns 201/204. Screenshots saved under `artifacts/screenshots/`. — @agent

## [0.32.80] — 2026-05-31 (nk3-deploy)
### Fixed
- **Cosmetic employee accounts leaked dental data (LOB isolation for non-admin staff).** A newly-created cosmetic employee logged in and saw **cosmetic locations but DENTAL appointments/data**. Root cause: the employee CREATE handler (`api/src/routes/employees/mutations.js`, INSERT) never set `lob_scope` → new cosmetic staff got `lob_scope=NULL` → login `getEmployeeLobScope()` returned `[]` → JWT `lobScope:[]` → frontend `BusinessUnitContext` `availableLOBs=['dental']` → `currentLOB='dental'` → all data hooks (appointments/customers/etc., which ARE LOB-aware) fetched **dental**; meanwhile locations came from the `authLob='cosmetic'` login resolution → the split the user saw. Fixes: (1) CREATE now stamps `lob_scope = [getCurrentLob()]` (`['cosmetic']` under `/api/cosmetic/*`, `['dental']` otherwise); (2) **login fallback** — a non-admin/non-CTV employee with empty/NULL `lob_scope` is now scoped to `[authLob]` (their home DB), which repairs **already-created** accounts at login with no DB migration (admins still get both; CTVs still `[]`); (3) `EmployeeForm.tsx` now calls `fetchPermissionGroups(currentLOB)` so the tier/permission-group dropdown shows the **cosmetic** groups for a cosmetic employee (was always loading dental groups). — @agent
### Tested
- New `api/src/routes/__tests__/employeeLobScopeStamping.test.js` (9 cases: create stamps `[lob]`; login fallback non-admin→`[authLob]`, CTV→`[]`, admin→both, explicit scope preserved). Full backend suite **476/476** green. `EmployeeForm` `tsc` clean. Wide read-only LOB audit (3 parallel agents) confirmed the rest of the cosmetic data hooks (~17: appointments, calendar, customers, dashboard, services, payments, reports, …) already thread `currentLOB`, and the no-LOB API files (feedback/ipAccess/systemPreferences/websitePages) are global/admin (no leak). Refuted a workflow false-positive that `/api/Earnings`+`/Payouts` "leak dental" — they isolate via `?lob=` query param (`earnings.js` reads `req.query.lob`→`getDb(lob)`); live-proved cosmetic `?lob=cosmetic` returns cosmetic data. — @agent

## [0.32.79] — 2026-05-30 (nk3-deploy)
### Fixed
- **Cosmetic deployment (NK3/tmv) defaulted admins to the Dental LOB.** Root cause: `website/src/contexts/BusinessUnitContext.tsx` resolved the default `currentLOB` to `finalAvailable[0]` which, for admins (who get implicit `['dental','cosmetic']` scope), is always `'dental'`. On the cosmetic site a fresh admin login therefore landed on **dental** — **Báo cáo** showed the dental clinic's revenue (₫7.87B vs cosmetic ₫1.93B) and **Phân quyền nhân sự** showed dental permission groups — until the user manually flipped the LOB switcher. (Non-admin cosmetic-only staff already defaulted to cosmetic; backend authz was already correct — verified admins 200 / non-admins 403 on both `/api/cosmetic/Reports/*` and `/api/cosmetic/Permissions/*`.) Fix: added a baked **`VITE_DEFAULT_LOB`** deployment default. `BusinessUnitContext` now resolves the default LOB as **query `?lob=` > persisted localStorage > `VITE_DEFAULT_LOB` (if within available LOBs) > `finalAvailable[0]`**. `Dockerfile.web` bakes it into `.env.production.local`; NK3 compose sets `VITE_DEFAULT_LOB: "cosmetic"`, NK/NK2 leave it unset (→ dental, no regression). — @agent
### Tested
- `BusinessUnitContext.test.tsx`: +4 tests — cosmetic default applied for admins when `VITE_DEFAULT_LOB=cosmetic`; persisted choice wins; value ignored when not in available LOBs (flag off); dental deployment (flag unset) keeps admins on dental. Suite **14/14** green, `tsc --noEmit` clean, eslint clean on edited files (3 pre-existing fast-refresh/unused-import warnings only). Adversarial no-regression review confirmed all 6 cases (dental-site default, cosmetic-site default, persisted-wins, query-wins, out-of-scope-ignored, non-admin-unaffected). Live browser-verified on `https://tmv.2checkin.com` (see below). — @agent

## [0.32.78] — 2026-05-30 (nk3-deploy)
### Fixed
- **Commission config (Quản lý tab) is now LOB-aware.** `website/src/lib/api/commission.ts`: `fetchCommissionConfig(lob?)`/`saveCommissionConfig(cfg, lob?)` now pass the `lob` option (→ `/api/cosmetic/CommissionConfig` prefix); `Commission.tsx` wires `currentLOB` from `useBusinessUnit()` and reloads on LOB change. Previously the tab always hit `/api/CommissionConfig` (dental) — on Cosmetic it showed dental rates (24/4/2) and **saving overwrote the dental config**; now it correctly reads/writes the cosmetic config (33.33/14.5/7.3). Backend route was already correct. — @agent
- **Earnings/Payouts tabs default to the active LOB.** `EarningsPayoutsTabs.tsx`: both tabs initialise their LOB filter from `useBusinessUnitOptional().currentLOB` and reload on change (replaced a `setState`-during-render hack with a proper effect), instead of defaulting to `'all'` (Earnings) / hardcoded `'cosmetic'` (Payouts). — @agent
- **Bank settings graceful on unconfigured cosmetic LOB.** `api/src/routes/bankSettings.js` GET now returns HTTP 200 with empty-string fields (not 404) when no row exists, so the cosmetic LOB doesn't break. Kept the `BankSettings` FE type non-null (empty strings, not null) to avoid breaking `VietQrModal`/`BankSettingsForm` consumers. — @agent
- **Removed dead `CrmTasks` route.** `server.js`: commented out both the global and cosmetic `/CrmTasks` mounts + the require — they returned HTTP 500 `relation "crmtasks" does not exist` on both LOBs (table never provisioned, no frontend usage). Mirrors the dead `Services` route. — @agent
### Changed
- **authLob-consistent authorization for CTV/earnings/payouts.** Threaded `req.user.authLob || 'dental'` into `resolveEffectivePermissions` across `routes/ctv.js` (×3), `routes/ctvHelpers.js`, `routes/earnings.js` (`adminOrPerm`) and `routes/payouts.js` (`adminOrPayout`), matching the cosmetic-login authz fix (v0.32.77). `payouts.js` GET/PATCH now reject an **invalid** `?lob` with HTTP 400 `U_INVALID_LOB` (absent still defaults to cosmetic). — @agent
### Tested
- New backend tests: `authLobHardening.test.js` (authLob threaded + invalid `?lob` → 400), `bankSettings.test.js` (graceful empty-string GET). New frontend tests: `commission.lob.test.ts` (LOB routing), `EarningsPayoutsTabs.test.tsx` (LOB defaults). Full API suite **888/888** green (`JWT_SECRET` set); frontend `tsc --noEmit` clean, eslint clean on changed files. Audit + fixes produced by parallel workflows; results independently re-verified (incl. correcting a false-positive ALS "context loss" CRITICAL via direct DB-vs-API comparison: cosmetic API returns cosmetic DB values 33.33/14.5/7.3). — @agent

## [0.32.77] — 2026-05-30 (nk3-deploy)
### Fixed
- **Cosmetic LOB admin 403s (CTV management + Revenue reports).** Root cause: on `/api/cosmetic/*` mirror routes the AsyncLocalStorage LOB context is `cosmetic`, so `permissionService.resolveEffectivePermissions()` (which used the dynamic ALS-following `query()`) resolved the caller's permissions against the **cosmetic DB** instead of their **home/auth DB**. The cosmetic DB isn't seeded with the full admin permission model, so a real admin was under-permissioned → `GET /api/cosmetic/Ctvs` returned 403 `S_FORBIDDEN "Admin only"` and `POST /api/cosmetic/Reports/*` returned 403 `Permission denied: reports.view`. Fix: `resolveEffectivePermissions(employeeId, authLob)` now resolves explicitly against the caller's home DB via `getQuery(authLob)` (defaulting to canonical `dental`), independent of the request's data-LOB — mirroring what `routes/auth.js` already does at login. Threaded `req.user.authLob` through `middleware/auth.js requirePermission` (fixes reports + every cosmetic admin route), the inline admin checks in `routes/ctvs.js` + `routes/commissionConfig.js` (fixes CTV tab + commission config), and report location-scope (`routes/reports/helpers.js`) + CSV export gates (`routes/exports.js`, `reportSalesEmployeesExport.js`). Data queries still target the cosmetic DB (unchanged). — @agent
### Tested
- `permissionService.test.js`: added regression tests asserting resolution targets the caller's home DB (`getQuery(authLob)`) and never the ALS-following `query()` when authLob is supplied; falls back to legacy `query()` when omitted. Affected API suites green; stash-isolation confirmed no new failures (pre-existing `authResponseShape`/`enterprise-verification` failures are unrelated mock/substring issues). — @agent
- **Verified live on `https://tmv.2checkin.com` (v0.32.77, Cosmetic LOB):** API probes flipped 403→200 (`/api/cosmetic/Ctvs` → 199 rows; `/api/cosmetic/Reports/dashboard` → `success:true`); browser: CTV tab renders the 199-CTV table and the Doanh thu dashboard renders KPIs + 12-month revenue chart, 0 console errors. — @agent

## [0.32.76] — 2026-05-29 (nk3-deploy)
### Added
- **Multi-level CTV commission override is now REAL (was projection-only).** `commissionEngine.js`: new `_writeCtvOverrides()` — after the direct level-0 row, when `recipient.source === 'ctv'` it walks the direct earner's `referred_by_ctv_id` upline chain (`_walkCtvChain`) and writes an override earnings row for each enabled level = `commissionAmount × commission_level_config.share_percent[level]/100` (NK3: L1 4%, L2 2%; L3/L4 disabled → 0, no redistribution). **Additive** (direct earner's commission untouched) and **idempotent** per `(payment_id, service_line_id, recipient, level)` via `INSERT … WHERE NOT EXISTS`. Hooked into `createEarningsForPayment` (forward) and exposed via new `backfillOverridesForLob({lob})` (one-time, both DBs) + `api/scripts/backfill-ctv-overrides.js`. Because the upline chain level == the downline depth in `buildCtvHierarchy`, the realised override equals the portal's projected "potential from downline" exactly. — @agent
### Changed
- **Projection base scoped to direct earnings.** `ctvNetwork.js loadHierarchySource` earningsSql now filters `COALESCE(level,0)=0` so the new override rows (level ≥ 1) don't feed back into the "potential" projection (which would double-count a CTV's own override into their upline's base). Projection now equals the override actually received. — @agent
### Tested
- `commissionEngine.test.js`: added (a) CTV source cascades override to enabled upline levels (240k → L1 9,600 / L2 4,800, exactly 3 inserts, additive); (b) non-CTV source (salestaff) does NOT cascade. All commission suites (2 files, 21 tests) + ctvNetwork hierarchy (8) green. NK3 verify: backfill created TTK's L2 override ₫41,230 (dental); `GET /api/ctv/commission-summary` → `totals.pending: 41230` (was 0). — @agent
- ⚠️ **Promotion note:** this changes REAL payout amounts for any CTV with a downline. Verified on NK3 smoketest only; review before promoting to NK2/NK. — @agent

## [0.32.75] — 2026-05-29 (nk3-deploy)
### Changed
- **CTV Network: "Potential from downline" is now a flip card.** New `PotentialFlipCard` in `CtvHierarchyPanel.tsx` mirrors the Track tab's `ReferralFlipCard` mechanism (`[perspective]` + `[transform-style:preserve-3d]` + `[transform:rotateY(180deg)]` + `[backface-visibility:hidden]`). Front = the projected total (₫ + %, TẠM TÍNH badge, "tap to see source" hint). Back (on tap) = the earning source: a scrollable list of downline members with `overrideContribution>0 || earned>0`, sorted by contribution desc, each row showing **total paid to them** (`earned`) and **your cut** (`overrideContribution`); empty-state when none have earned yet. Frontend-only — uses the per-node `earned`/`overrideContribution` already on the hierarchy response (no API/contract change). Removed the inline per-level chips (superseded by the flip detail); the searchable collapsible downline list below is unchanged. i18n: `hierarchy.flipToSource/flipBack/paidToThem/noEarningSource` (en+vi). — @agent
### Tested
- `tsc --noEmit` + eslint clean (0 warnings) after removing the now-unused `ctv`/`levelBreakdown` from the panel body; en/vi ctv.json valid; backend unchanged (ctvNetwork rollup tests still 8/8). NK3 web build `tsc` gate passed. — @agent

## [0.32.74] — 2026-05-29 (nk3-deploy)
### Added
- **CTV Network tab: detailed, searchable, collapsible downline + override source breakdown.** `buildCtvHierarchy` (`api/src/services/ctvNetwork.js`) now attaches `earned` (the member's own earnings) and `overrideContribution` (`earned × share_percent[level]`) to **each downline node**; `CtvHierarchyNode` (`website/src/lib/api/ctv.ts`) gained the two optional fields. `CtvHierarchyPanel.tsx` rewritten: (1) the "Potential from downline" card now shows a **per-level breakdown** (chips like `Tầng 2 · ₫41,230`, derived client-side from the nodes); (2) each downline member is a **collapsible card** (`DownlineCard`) — collapsed shows name + level + the CTV's projected cut, expanded reveals that member's own earnings, the effective rate, the cut, LOB pills, email, joined date, and direct-downline count; (3) a **search bar** filters the downline by name/phone, diacritic-insensitive (`normalizeText`, NFD strip + đ→d). i18n: `hierarchy.sourceLabel/searchPlaceholder/noMatch/yourCut/theyEarned/yourPotential/clearSearch` (en+vi). Verified live on NK3 (v0.32.74): the sole contributor for Trần Trung Kiên is L2 "lý kim phụng" (earned ₫2,061,500 → cut ₫41,230 ≈ 2%). — @agent
### Tested
- `ctvNetwork.hierarchy.test.js` now 8 cases (added per-node earned/overrideContribution + sum-equals-total assertion); `tsc --noEmit` + eslint clean (0 warnings); NK3 web build `tsc` gate passed. — @agent

## [0.32.73] — 2026-05-29 (nk3-deploy)
### Fixed
- **CTV portal "Theo dõi" (Track Clients) was listing downline CTVs as clients.** Root cause: `dbo.partners.referred_by_ctv_id` is a single polymorphic column used both for *customer → referring CTV* and *CTV → upline CTV*. The `/ctv/referrals` and `/ctv/client-journeys` queries selected `WHERE referred_by_ctv_id = $1 AND (customer=true OR active=true OR employee=false)` with **no `is_ctv` guard**, so legacy-imported downline CTVs (`active=true`) leaked into the Track list (e.g. Trần Trung Kiên showed 17 "clients" that were all downline CTVs, 0 real customers). Added `AND COALESCE(is_ctv, false) = false` to both queries so Track shows only the real end-customers a CTV personally referred. — @agent
### Added
- **CTV portal "Mạng lưới" (Network): projected override-from-downline stat.** `buildCtvHierarchy` (`api/src/services/ctvNetwork.js`) now rolls up the whole downline's own earnings (`active_earnings_sum`, already merged across both LOB DBs) into `totals.downlineEarningsBase`, `totals.potentialOverride` (Σ `earned × share_percent[depth]`), and `totals.overrideRatePct` (effective blended rate, or the L1 rate when the downline has not earned yet). Shares come from `dbo.commission_level_config` (L1 14.5% / L2 7.3% / L3 3.6% / L4 1.8%), fetched in `loadHierarchySource` with a hardcoded `STANDARD_OVERRIDE_SHARES` fallback; disabled levels pay 0. `GET /api/ctv/hierarchy` now delegates to `getCtvHierarchy` (single source of fetch + rollup, shared with the admin hierarchy view). The Network tab (`CtvHierarchyPanel`) renders one "Potential from downline" card (₫ + %), labeled **Projected / Tạm tính** because multi-level override is config-defined but not yet paid out by `createEarningsForPayment` (all earnings rows are still `level 0`). No per-person breakdown. i18n: `hierarchy.potentialTitle/potentialHint/projectedBadge` (en+vi). — @agent
### Tested
- New `api/src/services/__tests__/ctvNetwork.hierarchy.test.js` (7 cases) — all green; services suite (commissionEngine + ctvNetwork) 22/22 green. `tsc --noEmit` + eslint clean on changed FE files. — @agent

## [0.32.72] — 2026-05-29 (nk3-deploy)
### Added
- **CTV portal Track Clients: shareable deep-link to the customer record.** Each `ReferralFlipCard` now has a footer with **Open customer** (`<a href="/customers/:id" target="_blank">`) + **Copy link** (clipboard → `${origin}/customers/:id`, with a transient "Copied" state). `referral.id` is the referred client's `dbo.partners.id`, so it maps directly to the existing `/customers/:id` route — a CTV can hand the link to anyone, and whoever has customer access opens the record directly. The actions are siblings of the flip `<button>` (valid HTML, don't toggle the card). i18n: `ctv.card.openCustomer/copyLink/linkCopied` (en+vi). Frontend-only — no API/contract change. — @agent
### Tested
- `tsc --noEmit` clean. NOTE: `ReferralFlipCard.test.tsx` (new, uncommitted from the 0.32.69 portal work) has 2 pre-existing failures unrelated to this change — the test renders raw i18n keys (flip button accessible name resolves to `"card.showServicesFor"` not the translated string), so `getByRole('button', {name:/Seed Client/i})` fails before reaching any footer assertion. Confirmed by inspecting the rendered accessible names; left for the test's owner to fix (async i18n init in the test harness). — @agent

## [0.32.71] — 2026-05-29 (nk3-deploy)
### Added
- **Admin CTV tab: search + hierarchy expansion** (Commission → CTV). The tab was a flat, un-searchable list (admins were using browser Ctrl+F).
  - **Search box** — client-side, diacritic-insensitive (NFD strip + đ→d), multi-term AND match across `name`, `phone`, `email`, `upline_name`, `legacy_code`. Shows a match count + a clear (×) button + a "no match" row. `normalizeText` so "kien" matches "Kiên". — @agent
  - **Click-to-expand hierarchy** — clicking a CTV's name expands the row (chevron) and lazy-loads that CTV's upline chain + flat downline, rendered by **reusing the portal's presentational `CtvHierarchyPanel`** (stat cards + current + upline + downline). Cached per row; cache cleared on suspend/reactivate so a re-expand is fresh. — @agent
  - Backend: new `getCtvHierarchy(ctvId)` + `loadHierarchySource()` in `services/ctvNetwork.js` (self-contained fetch over both LOB DBs + `buildCtvHierarchy`), exposed as admin-gated **`GET /api/Ctvs/:id/hierarchy`** (+ cosmetic mirror). The id is only ever a JS filter key (never interpolated into SQL). Existing `/api/ctv/network` and `/api/ctv/hierarchy` (self-portal) untouched. — @agent
  - Client: `fetchCtvHierarchyForCtv(id, lob?)`; i18n: `commission.ctv.searchPlaceholder/matchCount/noMatch/viewHierarchy/hierarchyError` (en+vi) + `common.clear` (en+vi). — @agent
### Tested
- `tsc --noEmit` clean; jest no new failures (9 pre-existing failing suites unchanged). Backend verified against a seeded chain (root → mid → leaf): mid returns `upline:[root]`, `downline:[leaf]`; root returns `downline:[mid L1, leaf L2]`. Browser-verified on local Cosmetic LOB: search "test" → 1 row; expand "Admin" → panel shows Direct=1/Total=1/Upline=1 + upline "CTV Demo Referrer". Adversarial review (3 reviewers + per-finding verification) run; confirmed findings fixed (silent-failure logging, ctvId guard, typed 500, stale-cache clear, placeholder copy). — @agent
### Notes
- `loadHierarchySource()` loads all CTVs per call (same as the existing self-portal endpoints) — fine at current scale; a shared TTL cache is the scaling lever if CTV counts grow. Not added now to avoid staleness divergence from the existing endpoints. — @agent

## [0.32.70] — 2026-05-29 (nk3-deploy)
### Added
- **CTV payout system** — implemented and mounted `/api/Payouts` (the route was a stub importing a non-existent `requireAdminScope` and was never mounted, so the Commission → Payouts tab failed with `API GET /Payouts failed (404)`). New `api/src/routes/payouts.js` (Express router) provides:
  - `GET /api/Payouts?lob=` — list a LOB's payout cycles (`PayoutRow[]` with `earnings_count`, `created_by_name`).
  - `POST /api/Payouts` `{ lob, earningIds[], cycleLabel, notes?, receipt_url? }` — one transaction: locks the earnings `FOR UPDATE`, requires all still `pending` (else `409 B_EARNINGS_NOT_PAYABLE`), inserts the payout (`paid_at=now()`), flips earnings to `paid` with `payout_id`.
  - `POST /api/Payouts/upload-receipt` (multipart `receipt`, ≤5 MB) — multer disk storage + sharp compression, returns `{ url }`; served via `express.static('/uploads/payouts')` (+ nginx `/uploads/payouts` proxy).
  - `PATCH /api/Payouts/:id` `{ receipt_url, lob? }` — attach a receipt to an existing cycle (`404 S_NOT_FOUND` if missing).
  - Permission gate: admin or `commissions.payout.run`. Each payout is single-LOB (row + settled earnings live in that LOB DB; no cross-DB SQL). — @agent
- Frontend: `EarningsPayoutsTabs.tsx` now renders the receipt via `getUploadUrl()` so the image resolves against the API origin in dev and prod (was a raw relative path). — @agent
- Removed the broken knex-based `api/src/services/payoutService.js` (orphaned by the rewrite; the tx now lives in the router via raw `pg`). — @agent
### Tested
- `api/src/__tests__/payouts.test.js` — 7/7 pass (gate 403, admin allow, `commissions.payout.run` allow, create+update-earnings, `B_EARNINGS_NOT_PAYABLE`, PATCH receipt, PATCH 404). Website `tsc --noEmit` clean. No new regressions vs. pre-existing failing suites. Browser-verified on **local Cosmetic LOB**: Payouts tab loads (no 404), 4 pending earnings (1,035,000đ) → created cycle "Tháng 5/2026 (verify)", earnings cleared, cycle shown; receipt upload → PATCH → static serve `HTTP 200 image/jpeg`. — @agent
### Migration
- Applied `051_add_payout_receipt.sql` (`receipt_url`/`receipt_uploaded_at`, idempotent `ADD COLUMN IF NOT EXISTS`) to local `tdental_demo` + `tcosmetic_demo`. **NK3 deploy must apply 051 to `tdental_smoketest` + `tcosmetic_smoketest`.** — @agent

## [0.32.69] — 2026-05-29 (nk3-deploy)
### Fixed
- Restored the CTV portal's **refer/booking** and **recruit-CTV** forms, which the new portal (0.32.68) dropped — the header buttons ("Giới thiệu khách" / "Tuyển CTV") now open modals instead of just switching tabs, so a CTV can again book/refer a client and recruit a sub-CTV. `createBooking`/`createCtv` existed in the client but were unwired. — @agent
### Added
- **LOB-aware phone cross-check** on the refer form. New `CtvReferModal` does a live debounced lookup as the CTV types the phone, against the **chosen LOB's database** (Dental vs Cosmetic), and shows: new client / already exists (claimable) / already held by another CTV / your client. Backed by new `GET /api/ctv/client-lookup?phone=&lob=` (read-only; the authoritative claim gate still runs on `POST /ctv/bookings`, which already resolves the phone in the chosen LOB DB). — @agent — verified on NK3: phone `0901690203` → dental `exists:true (claimedByMe)`, cosmetic `exists:false`.
### Deployed (NK3 only)
- Deployed backend `ctv.js` (+`/client-lookup`) and the FE (`CtvReferModal`, `CtvRecruitModal`, dashboard wiring, `forms.*` i18n vi+en) to NK3; rebuilt api + web. NK/NK2 untouched; `ctv.js` + `website/src` backed up to `/opt/tgroup-hotfix-backups/`. — @agent
### Data
- Reconciled the full legacy CTV hierarchy into NK3 Dental and Cosmetic after source/target backups and dry-run review: 198 active legacy CTV rows in each DB, 147 upline links, 51 root/no-upline rows, 0 orphan uplines. Kien (last4 `0908`) now exists as a root legacy CTV with 17 direct downlines and 107 total downlines through `GET /api/ctv/hierarchy`. Historical clients, services, appointments, and earnings were not rewritten. — @agent

## [0.32.68] — 2026-05-29 (nk3-deploy)
### Added
- `GET /api/ctv/hierarchy` + `ctvNetwork.buildCtvHierarchy` — returns the CTV network shaped for the new portal's Network tab (`CtvHierarchyResponse`: `{ current, upline[], downline[] (flat), totals }`, camelCase `joinedAt`/`directDownlineCount`). The refactored front-end's `CtvNetworkTab`/`CtvHierarchyPanel` calls `/ctv/hierarchy`, but only `/ctv/network` existed (legacy `{self,direct,downline-tree}` shape) — so the hierarchy page had no working endpoint. `/network` kept for back-compat. — @agent
### Deployed (NK3 only)
- Deployed the **new CTV portal front-end** to `tgroup-nk3-web` (rebuilt): 5-tab dashboard with the **flip card** (`ReferralFlipCard`, tracking tab → `/ctv/referrals`) and the **referral-hierarchy tab** (`CtvNetworkTab` → `/ctv/hierarchy`). Previously NK3 ran the old 4-tab `ClientTrackingCard` build (backend-only deploys this session never rebuilt web). Synced `website/src` (rsync `--delete` to drop branch-deleted files that broke `tsc`: `ClientTrackingCard`, `MiniTimeline`, `ProgressRing`, `StageBadge`, `Pill`, `EmptyState`, `LoadingSkeleton`) + the updated `ctv.js`/`ctvNetwork.js`, rebuilt api + web. Live-verified: `/hierarchy` 200 (`current=lý kim phụng`), `/referrals` 200 (Mai sp=4, services=1, total_earned=2,061,500). NK/NK2 untouched; `website/src` tar + files backed up to `/opt/tgroup-hotfix-backups/`. — @agent

## [0.32.67] — 2026-05-29 (nk3-deploy)
### Changed
- **Commission model: removed the "pool" + MLM level-split.** `commissionEngine.createEarningsForPayment` previously computed `pool = Σ(line × product_rate)` then split it across `commission_level_config` levels (L0 got `pool × 24%`), and the configured `default_referral_percent` (20%) was never applied — so with all products at 0%, every CTV earned 0. The referrer (L0 = the resolved recipient) now earns a **flat % of the actual service amount** = `Σ(line_amount × products.commission_rate_percent)`, written as a single earnings row at level 0 (all sources). No pool, no upline split. — @agent — per owner spec: 24% default, 7% braces.
### Added
- `api/scripts/set-referral-commission-rates.sql` — deliberate (non-auto) script setting `products.commission_rate_percent = 24` (default) and `= 7` for braces/orthodontics (niềng / mắc cài / chỉnh nha / invisalign / khay trong / aligner / brace). Applied to NK3 `tdental_smoketest` (374 @ 24%, 36 braces @ 7%). NOT auto-run, so NK/NK2 are untouched until deliberately applied. — @agent
### Deployed / Verified (NK3 only)
- Deployed the simplified engine + backfill (`commissionEngine.js`, `customerReferrer.js`) to `tgroup-nk3-api` and ran the backfill for ĐẶNG THỊ TUYẾT MAI. Live verification: her braces service (29,450,000đ) now yields a CTV earning of **2,061,500đ** (= 7%) to "lý kim phụng" — confirmed via `/api/ctv/client-journeys` (`total_earned=2061500`) and `/api/ctv/commission-summary` (`pending=2061500`). NK (`/opt/tgroup`) / NK2 (`/opt/tgroup-staging`) untouched; files backed up to `/opt/tgroup-hotfix-backups/`. — @agent
### Note
- `_getCommissionLevelConfig`, `_walkCtvChain`, `_getDefaultReferralPercent` are now unused (kept, not removed). Upline MLM levels are intentionally not paid in this model; re-introduce only if the clinic wants multi-level payout. — @agent

## [0.32.66] — 2026-05-29 (nk3-deploy)
### Fixed
- **CTV portal journey now reflects the client's REAL activity, not commission payout.** `/api/ctv/client-journeys` (the endpoint NK3's portal renders via `ClientTrackingCard` → `ProgressRing(stage_progress)`) and `/api/ctv/referrals` previously derived the 4-step stage purely from `dbo.earnings`, so a client who already came & paid but had no earning row (retroactive CTV assignment, or a paid order whose product carries no commission rate) was frozen at "referred" (1/4). Both endpoints now take the **higher** of the earnings-stage and an **activity-stage** from the operational tables — completed `appointments` → visited, active `saleorderlines` → serviced, positive `payments` → paid. Commission ($) display stays earnings-driven. Signals are batched per LOB (`partnerid = ANY`) and guarded by `safeQueryRows` (missing table ⇒ no override, never 500). — @agent — VERIFIED live on NK3: ĐẶNG THỊ TUYẾT MAI (2 payments / 30,450,000đ, 0 earnings) now returns `stage=paid, stage_progress=4/4` (was 1/4) via the authenticated endpoint.
- Frontend (`ReferralFlipCard.getProgress`, `CtvTrackingTab` filters, `CtvReferral` type) now prefer the server `stage_progress` over the services-count heuristic. — @agent
- Restored dead `routes/commissionEngine.js` (crashed on load: imported `triggerCommissionEngine` never exported + `requireAdminScope` never exported). Added `commissionEngine.triggerCommissionEngine()` (delegates to idempotent `backfillEarningsForClient`); gate switched to real `requirePermission('ctv.manage')`. Router stays unmounted (no new attack surface); stale `api/test/commissionEngine.test.js` rewritten → passes. — @agent
### Deployed
- NK3 only (`/opt/tgroup-nk3`, `*_smoketest` DBs, api on 3202): surgically patched the deployed `ctv.js` `/client-journeys` handler and rebuilt `tgroup-nk3-api`. NK (`/opt/tgroup`) and NK2 (`/opt/tgroup-staging`) untouched; pre-patch `ctv.js` backed up to `/opt/tgroup-hotfix-backups/`. The backfill + `/referrals` rewrite + #3 + FE changes remain in the working tree (not yet deployed). — @agent

## [0.32.65] — 2026-05-29 (nk3-deploy)
### Fixed
- Assigning a CTV (`partners.referred_by_ctv_id`) to a customer who **already came and paid** now retroactively attributes commission for those past payments, so the CTV portal client-journey advances past "referred" (1/4) and the collaborator sees their client paying. Previously `dbo.earnings` rows were written **only** at payment time (`POST /api/Payments`), so a customer linked to a CTV *after* paying produced no CTV earning and was frozen at stage 1 with zero commission — there was no backfill path. — @agent — surfaced from a real NK3 report (ĐẶNG THỊ TUYẾT MAI shown stuck at 1/4 after being added to a CTV post-payment).
### Added
- `commissionEngine.backfillEarningsForClient({ clientId, lob, getDb })` — re-runs the earnings engine over a client's positive `payments`, reconstructing order lines from `payment_allocations → saleorderlines` so per-product `commission_rate_percent` applies exactly as at live payment time. Idempotent: a payment that already has a `source='ctv'` earning is skipped (no double-payout); pre-existing salestaff/consultation earnings are left untouched. — @agent
- `setCustomerReferrer(q, customerId, ctvId, { lob })` now triggers the backfill after a successful assign (non-fatal — a backfill failure never blocks the assignment). Wired into the Service create/update and Appointment create/update CTV-assignment paths via `req.lob`. — @agent
### Tests
- `api/src/services/__tests__/commissionEngine.test.js` — added `backfillEarningsForClient` coverage (attribution of a past paid order, idempotent skip, no-op without a referrer, missing-arg guard). New `api/src/services/__tests__/customerReferrer.backfill.test.js` — asserts the assignment→backfill trigger contract. — @agent — docs/TEST-MATRIX.md earnings-commissions row.
### Known (pre-existing, out of scope)
- `api/src/routes/commissionEngine.js` imports `triggerCommissionEngine` from the service, which is **not exported** (never was) — that route would throw if hit, and the stale `api/test/commissionEngine.test.js` for it fails. Untouched here; flagged for a separate fix. — @agent

## [0.32.64] — 2026-05-29 (nk3-deploy)
### Fixed
- `POST /api/Auth/login` now preserves Dental-first auth but falls back to the Cosmetic identity database when `COSMETIC_LOB_ENABLED=true` and no Dental login row exists; `/api/Auth/me` refreshes the user and permissions from the JWT auth-source LOB. This fixes valid TMV Cosmetic-only employees receiving repeated 401s until the normal login rate limiter returns 429. — @agent — INV-008D Cosmetic Staff Auth Source.
### Tests
- Added focused backend coverage for cosmetic-only TMV employee login and `/api/Auth/me` refresh in `api/tests/loginRateLimiter.test.js`. — @agent — docs/TEST-MATRIX.md Auth route row.

## [0.32.61] — 2026-05-29 (nk3-deploy)
### Added
- `PUT /api/Ctvs/:id` (admin-only) lets admins edit a CTV's `name`, `phone`, `email`, and reset the login password. A non-empty password is bcrypt-hashed into `password_hash` (login tries bcrypt first, so this works for legacy CTV rows too). Duplicate phone/email guards exclude the CTV's own id and run across both physical DBs; changes mirror best-effort into the cosmetic DB. — @agent — gives admins full control of CTV accounts from `/commission` without widening other auth paths.
- `/commission` > CTV tab now renders an Edit (Sửa) action per row opening a pre-filled modal (name/phone/email + optional new password) wired to `updateCtv`. — @agent — INV CTV admin management; preserves two-DB routing and LOB scoping.
### Security
- `PUT /api/Ctvs/:id` now rejects an empty/whitespace `email` (`U_INVALID_EMAIL`). A non-legacy CTV's only login identifier is its email, so blanking it would have locked them out permanently. Surfaced by an adversarial multi-agent review of the diff. — @agent — INV-008C login-identifier integrity.
### Fixed
- CTV edit modal no longer sends empty `phone`/`email`: it submits only the fields the admin filled (plus name, always). Previously a CTV with no phone/email on record (e.g. legacy imports) could not be edited at all because the empty value tripped the API's identifier guard. Save now requires only a non-empty name. — @agent — surfaced by review (FE-1); verified a phone-less CTV is now editable.
### Tests
- Added focused Jest coverage for `PUT /api/Ctvs/:id` (field updates, password hashing, duplicate phone/email, invalid/empty/whitespace validation, empty-email lockout guard, name-only & password-only partial updates, legacy-CTV password reset preserving `created_via`, best-effort cosmetic-mirror failure, admin gate). Added a Vitest for `EditCtvModal` asserting empty phone/email are omitted from the payload and Save stays enabled for a phone-less CTV. — @agent — docs/TEST-MATRIX.md CTV admin edit row.

## [0.32.60] — 2026-05-28 (nk3-deploy)
### Fixed
- `POST /api/Auth/login` and the login form now accept email for staff/admins or phone/ref-code for imported legacy CTV rows only, preserving the `legacy_ctv_import*` gate before legacy password fallback can run. — @agent — INV-008C legacy CTV continuity without widening staff authentication.
### Tests
- Added focused Jest coverage for the imported legacy CTV login identifier lookup boundary. — @agent — docs/TEST-MATRIX.md legacy CTV auth row.

## [0.32.59] — 2026-05-28 (nk3-deploy)
### Changed
- `/commission` > CTV management is now LOB-aware and shows a visible source badge for legacy CTV imports via `source`, `legacy_code`, and `created_via` from `/api/Ctvs` and `/api/cosmetic/Ctvs`. — @agent — Cosmetic LOB CTV import visibility; preserves D14 CTV isolation and two-DB admin routing.
- Added a dry-run-first legacy CTV import runner that plans deterministic Dental + Cosmetic partner mirrors, skips ambiguous matches, maps safe CTV uplines, and preserves existing non-legacy passwords unless explicitly overridden. — @agent — INV-001 partner identity uniqueness and INV-008C legacy password fallback boundary.
- Preserved NK3 Docker web build argument materialization so `VITE_COSMETIC_LOB_ENABLED=true` is written into the container build environment during deploy. — @agent — INV-020 deploy version/build verification.
### Fixed
- Restored local server mounts for `/api/CommissionConfig`, `/api/Ctvs`, `/api/Earnings`, and their Cosmetic CTV/config mirrors; `/api/ctv` is again mounted behind `ctv.dashboard.view`. Also normalized JWT `isCtv`/`lobScope` casing in CTV and LOB gates. — @agent — docs/TEST-MATRIX.md CTV route gating and Cosmetic LOB guard rows.
- Imported legacy CTV password hashes can now be verified only for `legacy_ctv_import*` CTV rows and are migrated to bcrypt after successful login. — @agent — Legacy CTV source migration without broadening password fallback to normal staff.
- Added migration 049 to widen `partners.created_via` to `VARCHAR(64)` and allow `legacy_ctv_import*` in `partners_created_via_check` so the full legacy import marker can be stored in both Dental and Cosmetic databases. — @agent — INV-008C requires an unambiguous import marker for legacy password fallback.
### Tests
- Added focused Jest coverage for legacy CTV salted-SHA256 password verification and import-marker gating. — @agent — docs/TEST-MATRIX.md legacy CTV auth row.
- Verified the import runner dry run against the refreshed live legacy snapshot: 198 active source rows, 170 planned, 28 skipped for manual review, and no DB writes. — @agent — testbright.md legacy CTV import setup.

## [0.32.58] — 2026-05-28 (nk3-deploy)
### Fixed
- Cosmetic customer service creation no longer fails when staff select a customer source: the service modal now hides non-persisted fallback source chips, active-LOB source loading clears stale Dental/fallback rows on successful empty Cosmetic responses, and `SaleOrders` create/update payloads normalize non-UUID `sourceid` values to `null`. — @agent — preserves INV-015 and Cosmetic LOB two-DB source isolation.
- Restored the app-level `BusinessUnitProvider` and keyed route remount for the protected admin route tree so `/customers/:id?lob=cosmetic` can hydrate Cosmetic context before Layout/customer hooks run. — @agent — preserves the LOB toggle behavior locked in docs/TEST-MATRIX.md.
### Tests
- Added focused Vitest coverage for Cosmetic service source payload normalization, empty Cosmetic customer-source loading, and the existing App LOB remount regression. — @agent — docs/TEST-MATRIX.md Services Catalog and App LOB regression rows.

## [0.32.57] — 2026-05-28 (nk3-deploy)
### Fixed
- Admin users now see the Line of Business (LOB) toggle even when their `partners.lob_scope` DB column is null or empty. Backend `/api/Auth/login` and `/api/Auth/me` auto-grant `['dental', 'cosmetic']` to admins; frontend `BusinessUnitContext` defaults admins to both LOBs when the cosmetic flag is enabled. — @agent — Cosmetic LOB v2 admin parity; closes nk3-deploy LOB visibility gap for pre-migration admin accounts.
### Tests
- Added `BusinessUnitContext` Vitest coverage asserting admin with null `lob_scope` gets `dental,cosmetic` available LOBs and `multi` toggle state when `VITE_COSMETIC_LOB_ENABLED=true`. — @agent — docs/TEST-MATRIX.md LOB regression row.

## [0.32.51] — 2026-05-28 (codex/nk3-ctv-deploy)
### Fixed
- NK3 CTV portal bottom navigation now has one `Theo dõi` destination: removed the redundant Referrals tab from the dashboard shell and stopped fetching unused referrals data on page load. — @agent — CTV self-service tab clarity, product-map CTV 4-tab dashboard.
### Tests
- Added a CTV dashboard regression assertion that the bottom nav has exactly one Tracking/`Theo dõi` label and no Referrals/Giới thiệu tab. — @agent — TestSprite bottom-nav dedup check.

## [0.32.50] — 2026-05-28 (codex/nk3-ctv-deploy)
### Changed
- NK3 CTV portal is now bilingual inside the modular `/ctv` dashboard: added the shared `useCtvLocale()` helper, placed the EN/VI `LanguageToggle` in the CTV header, localized CTV currency/date/LOB/fallback display helpers, and made Tracking search accent-insensitive across referred-client and service text. — @agent — BEHAVIOR.md §9 localization, Contracts v1.0.6, CTV self-service parity.
- CTV API display fallbacks now return nullable names instead of hardcoded English service/client text so frontend i18n owns user-facing unknown-client/service labels. — @agent — CTV contract v1.0.6; preserves D14 CTV isolation and two-DB composition.
- `/ctv` route guards now preserve legacy `isCtv` auth payload compatibility while keeping CTV users out of admin routes and non-CTV users out of the CTV portal. — @agent — INV-008B CTV role isolation.
### Tests
- Added focused Vitest coverage for the CTV header language toggle and accent-insensitive Tracking search. — @agent — docs/TEST-MATRIX.md CTV locale regression row.

## [0.32.49] — 2026-05-25 (codex/nk3-ctv-deploy)
### Added
- NK3 CTV self portal refresh: `/ctv` now uses the modular CTV page set under `website/src/pages/CTV/*`, shared CTV components, and the `ctv` i18n namespace. The portal keeps Home, Commission, Referrals, and Me while adding the Tracking tab for client journey status. — @agent — UC-CTV self-service, preserves Cosmetic LOB v2 D14 CTV admin isolation.
- `GET /api/ctv/client-journeys` returns self-owned referred clients from both dental and cosmetic databases with stage/progress, visit, service, payment, and earned-commission fields. The backend CTV router was split into smaller route modules (`ctv.js`, `ctvActions.js`, `ctvClientJourneys.js`, `ctvHelpers.js`) without changing the NK3 two-DB discipline. — @agent — contract v1.0.5, CTV is the approved cross-DB composition surface.
### Changed
- `/ctv` route guarding now explicitly renders only for authenticated CTV users and redirects non-CTV users back to the admin app. `POST /api/ctv/bookings` keeps `B_CLIENT_CLAIMED` compatibility by returning both camelCase and snake_case owner/expiry fields for the refreshed sheet UI. — @agent — D14 role isolation and referral-claim eligibility.
- `vite.config.ts` now honors `GIT_SHA`/`GIT_BRANCH` build args when generating `dist/version.json`, so NK3 Docker builds can prove the exact deployed commit even though git is not installed inside the build image. — @agent — release verification invariant.
### Tests
- Targeted verification: `npm --prefix website test -- src/__tests__/ProtectedRoute.ctv.test.tsx src/lib/api/__tests__/ctv.booking.test.ts`; `npx jest --runInBand src/routes/__tests__/ctvBookings.test.js src/services/__tests__/referralClaim.test.js src/services/__tests__/referralCard.test.js src/services/__tests__/commissionEngine.test.js`; `npx tsc --noEmit` in `website`; `node --check api/src/routes/ctv*.js`; scoped Semgrep scan; local and NK3 live `/ctv` screenshot verification. — @agent — docs/test matrix sync.

## [0.32.48] — 2026-05-25 (codex/nk3-ctv-deploy)
### Added
- Admin Payouts cycle with receipt photo upload (Gap 1): migration `051_add_payout_receipt.sql` adds `receipt_url` + `receipt_uploaded_at` to `dbo.payouts`. `POST /api/Payouts` accepts optional `receipt_url`; `PATCH /api/Payouts/:id` attaches a receipt after creation; `POST /api/Payouts/upload-receipt` returns a stored image URL (multer + local disk, same pattern as feedback attachments). `EarningsPayoutsTabs.tsx` adds file picker to the payout form, thumbnail preview, and "Attach" button on past cycles. `CtvDashboard.tsx` Paid tab now shows real payout cycles with receipt thumbnails. Permission gates on `earnings.js` and `payouts.js` now accept `isAdminPermissionState` (matching `commissionConfig.js`/`ctvs.js`). 7 jest cases in `payouts.test.js`. — @agent — 2026-05-24 (0.32.46).
- Per-service referral commission % UI (Gap 2): `products.commission_rate_percent` is now exposed in `GET /api/Products`, editable in `ServiceCatalogModals.tsx` with raw-text draft pattern (decimals work, 0–100 clamp on blur), persisted through `POST/PUT /api/Products`, and shown as an "HH%" column in `ServiceCatalogTable.tsx`. The commission engine already reads this field; now admins can set it per service. — @agent — 2026-05-24 (0.32.46).
- Live payment-split proof on NK3 (Gap 3): `payments.js` wiring now maps `createdAllocations` to `dbo.saleorderlines` and passes `engineLines` to `createEarningsForPayment`, so per-product `commission_rate_percent` is applied on real payments. Verified on `tcosmetic_smoketest`: CTV-referred client → saleorder with 10% commission product → payment 500K → earnings row 145,400 (72.7% of 200K pool) at L0 for CTV Demo Referrer. Refund endpoint updated to accept `original_payment_id` and call `reverseOnRefund`, producing negative reversal row (-145,400) linked to the refund payment. — @agent — 2026-05-24 (0.32.46).
- Visual QA / polish pass (Gap 4): Removed fake stat cards from Commission page (were showing dummy data). Added full Vietnamese i18n coverage for commission UI: `commission.json` with keys for config/CTV/earnings/payouts tabs, `services.json` extended with `commissionRate`/`commissionRateShort`. Updated `Commission.tsx`, `EarningsPayoutsTabs.tsx`, `ServiceCatalogModals.tsx`, `ServiceCatalogTable.tsx` to use i18n instead of hardcoded English/Vietnamese. Build passes, all 787 tests pass. — @agent — 2026-05-24 (0.32.46).
### Changed
- NK3 canonical domain is now `https://tmv.2checkin.com` (was `https://ctv.2checkin.com`). nginx vhost `tmv.2checkin.com` proxies `/` to the NK3 web container (`:5375`) with a fresh Let's Encrypt cert; the old `ctv.2checkin.com` now 301-redirects `/` to tmv and keeps `/tbot/*` (kanban board) unchanged. API CORS allowlist drops `ctv.2checkin.com` (+ www) and adds `tmv.2checkin.com` (+ www). NK and NK2 untouched. — @agent — 2026-05-23.
### Added
- CTV-panel booking UI (`CtvDashboard.tsx` + `createBooking` in `website/src/lib/api/ctv.ts`): the `+ Client` sheet now takes a date and POSTs `/ctv/bookings`; a `B_CLIENT_CLAIMED` response shows a Vietnamese "already with another CTV until <date>" message. 3 vitest. — @agent — 2026-05-23 (0.32.41).
- Customer profile "Người giới thiệu (CTV)" block (`ProfileHeader.tsx`): shows the owning CTV + active/expired badge. `GET /api/Partners/:id` (`getPartnerById.js`) now returns `referralClaim`. 4 jest. — @agent — 2026-05-23.
- `POST /api/ctv/bookings` (in `api/src/routes/ctv.js`) — CTV/admin booking with hard eligibility gate: blocks `400 B_CLIENT_CLAIMED` when the client is actively claimed by a different CTV; otherwise creates/re-claims the client, writes a Referral Start card, and creates the appointment (canonical `dbo.appointments` insert). Uses `crypto.randomUUID()` (uuid v13 is ESM and breaks `require` under jest). `REFERRAL_PRODUCT_NOT_CONFIGURED` → 409. 2 jest cases. — @agent — 2026-05-22.
- `api/src/services/referralCard.js` — `createReferralStartCard({ clientId, lob })` creates a zero-amount saleorder + saleorderline referencing `commission_settings.referral_start_product_id`; throws `REFERRAL_PRODUCT_NOT_CONFIGURED` if unset. Mirrors `createSaleOrder.js` insert pattern. — @agent — 2026-05-22.
- `api/src/routes/partners/resolveHandler.js` — `/api/Partners/resolve` now includes `referralClaim` in the 200 response (active/lapsed status for the matched partner). — @agent — 2026-05-22.
### Docs
- `docs/superpowers/plans/2026-05-22-ctv-referral-claim.md` — 9-task TDD implementation plan for the referral-claim feature (migration 050, getReferralClaimStatus + createReferralStartCard helpers, engine active-window credit gate, POST /api/ctv/bookings eligibility gate, /resolve + profile claim display). No runtime code yet. — @agent — 2026-05-22.
- `docs/superpowers/specs/2026-05-22-ctv-referral-claim-design.md` — design for CTV referral claims: exclusive ownership via `referred_by_ctv_id`, a "Referral Start" saleorderline card as the claim anchor, a rolling 6-month expiry computed from `max(card date, last paid service)`, a hard eligibility gate that blocks booking a client actively claimed by another CTV (CTVs and admins), and crediting only while the claim is active as of payment date. No new tables; one additive column `commission_settings.referral_start_product_id`. No runtime code yet. — @agent — 2026-05-22.
### Fixed
- NK3 pre-deploy fixes: `permissions.js` migrated to `getQuery(req)` for Cosmetic DB routing (bug #5); `partners/mutationHandlers.js` now generates `TM######` prefix for Cosmetic customers (bug #1). Both align with LOB v2 two-DB discipline. — @agent — 2026-05-25.
- TMV/NK3 `/commission` no longer errors on Cosmetic LOB: the cosmetic router now exposes `/api/cosmetic/CommissionConfig` and `/api/cosmetic/Ctvs`, matching the LOB-aware frontend rewrite for the Commission Config and CTVs tabs. — @agent — 2026-05-23 (0.32.45, preserves Cosmetic LOB v2 D5 route isolation while unblocking admin commission setup).
- NK3/CTV Cosmetic LOB employee add/edit modal leaked dental branches because EmployeeForm and EmployeeProfile loaded `/api/Companies` without the active LOB. They now load branches with `lob=currentLOB`, and employee create/update sends the same LOB so Cosmetic uses `/api/cosmetic/Companies` and `/api/cosmetic/Employees`. Added form and API-client regression tests. — @agent — 2026-05-22 (0.32.40, preserves Cosmetic LOB v2 D5/D6 data isolation).
- Commission Config % inputs (global default + per-level share) were unusable: parse-and-clamp on every keystroke dropped the decimal point (typing `14.5` reverted to `14`) and clearing the field snapped to `0`. Now backed by a raw-text draft per input — type freely incl. decimals, parsed into the model on change, clamped to 0–100 on blur. — @agent — 2026-05-22 (0.32.39).
- NK3 browser login returned 500 "internal error": `https://ctv.2checkin.com` was missing from the API CORS allowlist (`api/src/server.js`). Added it (+ www). curl checks had passed because they send no Origin header. — @agent — 2026-05-22.
### Changed
- `commissionEngine.resolveRecipient` now credits a CTV only while the referral claim is **active as of the payment date** (`asOf` threaded from `createEarningsForPayment`); a lapsed claim falls through to consultation/salestaff/none and does not auto-revive. Both `resolveRecipient` and `createEarningsForPayment` accept an injectable `referralClaim` for tests. — @agent — 2026-05-22.
### Added
- `api/src/services/referralClaim.js` — `getReferralClaimStatus(clientId, lob)` + pure `computeClaim`: a client's CTV claim is active for 6 months from `max(earliest Referral Start card date, last paid-service date)`. Queries `dbo.payments(customer_id, payment_date, amount)` for the last paid service. 14 jest cases. — @agent — 2026-05-22.
- **MLM commission config + CTV signup.** Migration `049_add_commission_level_config.sql` (additive, both DBs, guarded schema_migrations insert): `commission_level_config` (per-level enabled + share_percent, seeded L0–L4 = 72.7/14.5/7.3/3.6/1.8), `commission_settings` (singleton `default_referral_percent`), and `earnings.level`. — @agent — 2026-05-22.
- `commissionEngine.js` rewritten: for `source='ctv'` it walks the `referred_by_ctv_id` upline (≤5 levels) and splits the per-line commission pool by configured level shares; disabled levels / missing upline are not paid (remainder stays with the clinic, no redistribution). `consultation`/`salestaff` keep a single full-pool row at level 0. 9 jest cases (split + salestaff + refund). — @agent — 2026-05-22.
- New endpoints: `POST /api/ctv` (create CTV — CTV-or-admin only, instant active, `employee=true` so login works, `lob_scope` bound as text[], dental row always + cosmetic mirror if scoped), `POST /api/ctv/clients` (refer a customer into one LOB), `GET/PATCH /api/Ctvs` (admin list/suspend), `GET/PUT /api/CommissionConfig` (admin level split; PUT validates enabled sum ≤ 100 → `B_LEVEL_SUM_EXCEEDS_100`). — @agent — 2026-05-22.
### Changed
- `CtvDashboard.tsx` — header gains two pills under the title: **+ Client** (refer customer) and **+ CTV** (recruit), each opening a bottom-sheet wired to `referClient`/`createCtv`. Bottom nav unchanged (4 tabs). — @agent — 2026-05-22.
- `Commission.tsx` — placeholder replaced with admin **Config** (editable level table + global default %, live ≤100% validation, surfaced save error) and **CTVs** (list + suspend + Add CTV) sub-tabs; new `website/src/lib/api/commission.ts`. — @agent — 2026-05-22.
### Security
- Registered `ctv.manage` + `commission.config.manage` in `permission-registry.yaml`. CTV creation is closed (no public signup): self-recruit gated by the `is_ctv` flag, admin by wildcard `*`. — @agent — 2026-05-22.

## [unreleased] — 2026-05-21 (feat/cosmetic-lob-nk3-phase2)
### Added
- **Phase-2 Task-1 — Admin Permission Seeding:** `api/migrations/048_grant_lob_permissions_to_admin.sql` auto-grants cosmetic.access, dental.access, and lob.crossview to Admin group (UUID 11111111-0000-0000-0000-000000000001). Migration is idempotent (ON CONFLICT DO NOTHING) and applies to both tdental_demo and tcosmetic_demo, enabling multi-scope admins to access /api/dental/* and /api/cosmetic/* routes without manual PermissionBoard steps. Paired Jest test `api/src/__tests__/adminLobPermissions.test.js` (9 assertions) verifies migration file structure, naming, permission keys, idempotency, UUID, and rollback notes. — @agent — Phase-2 critical path Task 1, per spec D5.
- **Phase-2 Task-2 — Cosmetic Transactional Seed:** `api/scripts/seed-cosmetic-lob-transactional.js` populates tcosmetic_demo with real money-flow data: 2-3 customers with referred_by_ctv_id set (D13 CTV attribution path), 3-5 appointments (mix past/today/future), 3-5 payments, earnings rows with source='ctv', and refund reversals (negative amounts for append-only ledger validation). Validates CTV referrer existence (ctv-demo@clinic.vn), gracefully handles optional consultations table, uses ON CONFLICT DO NOTHING idempotency, and supports --dry-run mode for syntax validation. Exports seedCosmeticTransactionalData function. Paired Jest test `api/src/__tests__/cosmeticTransactionalSeed.test.js` (15 assertions) verifies script structure, INSERT statements, source='ctv' attribution, refund logic, CTV validation, and --dry-run support. — @agent — Phase-2 critical path Task 2 ("Make CTV real"), per spec D12, D13, D16.

### Tests
- **adminLobPermissions.test.js** (9 jest assertions): Validates migration 048_grant_lob_permissions_to_admin.sql exists, has correct naming pattern, contains all three permission keys (cosmetic.access, dental.access, lob.crossview), is idempotent (ON CONFLICT DO NOTHING), targets the correct admin group UUID, includes rollback instructions, and groups all three permissions in a single VALUES clause for atomicity. — @agent — 2026-05-21.
- **cosmeticTransactionalSeed.test.js** (15 jest assertions): Validates seed-cosmetic-lob-transactional.js script exists, has correct shebang, contains INSERT INTO statements for appointments/payments/earnings, creates earnings with source='ctv' for D13 path, includes refund reversals (negative-amount rows), validates CTV referrer existence, uses ON CONFLICT DO NOTHING idempotency, handles consultations table gracefully (try/catch), supports --dry-run mode, exports seedCosmeticTransactionalData function, and creates per-customer earnings rows via loop structure. — @agent — 2026-05-21.

## [unreleased] — 2026-05-21 (feat/cosmetic-lob-nk3-phase1-finish)
### Tests
- Phase-1 gap B regression lock: `website/src/lib/api/__tests__/apiFetch.lob.test.ts` (5 vitest assertions). Asserts `apiFetch({ lob: 'cosmetic' })` prepends `/cosmetic` to the URL, `lob: 'dental'` and omitted lob leave the URL untouched, query params land after the LOB prefix, and `/:id` style paths stay intact under the cosmetic prefix. If anyone removes the lobPrefix line in `website/src/lib/api/core.ts`, every cosmetic data hook would silently fall back to dental endpoints — this test catches that. — @agent — 2026-05-21.
- Phase-1 gap C regression lock: `website/src/__tests__/ProtectedRoute.ctv.test.tsx` (4 vitest assertions). Asserts a user with `is_ctv === true` (or legacy `isCtv === true`) is redirected to `/ctv` instead of seeing the admin route, a non-CTV user is not redirected, and the source-level grep on `App.tsx` still finds both the `is_ctv` condition and the `<Navigate to="/ctv" replace />` JSX. Spec D14: CTV-flagged users never enter the admin tree. — @agent — 2026-05-21.
- Phase-1 gap D regression lock: `api/src/__tests__/cosmeticLobGuards.test.js` (9 jest assertions). Builds a minimal Express app mirroring the `/api/cosmetic/*` gate composition from `server.js` (~lines 367-425) and uses the REAL `requireLobScope` middleware to exercise: flag off → 503 `COSMETIC_LOB_DISABLED` on all three sampled endpoints (Partners, Appointments, Payments); flag on + dental-only user → 403 `S_LOB_FORBIDDEN`; flag on + CTV-flagged user → 403 `S_LOB_FORBIDDEN` regardless of scope; flag on + dental+cosmetic admin → 200 (gate cleared). A final structural-regex assertion catches deletion of the flag check, the 503 branch, the `requireLobScope('cosmetic')` call, or the `app.use('/api/cosmetic', ...)` mount from `api/src/server.js`. The test does not load `server.js` itself because the jest haste map collides across sibling worktrees sharing the `@tgroup/contracts` package name — a tooling limitation, not a code one. — @agent — 2026-05-21.

## [unreleased] — 2026-05-21 (feat/cosmetic-lob-nk3)
### Added
- Phase-1 gap A: `<Routes>` in `website/src/App.tsx` is now keyed by `currentLOB` from `BusinessUnitContext`, so toggling the LOB unmounts and remounts the entire route subtree. This is the spec §"LOB Toggle Behavior" requirement (line ~195 of `docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-design-v2.md`): "The React tree under `<App>` is keyed on the LOB, so toggling unmounts+remounts the subtree — this is how we prevent 'flash of dental data' without per-component cache code." App.tsx was refactored to extract an `AppRoutes` component that calls `useBusinessUnit()` and renders `<Routes key={currentLOB}>`; the `BusinessUnitProvider` now sits above `AppRoutes` so the hook resolves. Regression-locked by `website/src/__tests__/App.remount.test.tsx` (4 assertions, incl. a source-level grep for `<Routes key={currentLOB}>`). — @agent — 2026-05-21 closes the foundation UX gap for the cosmetic LOB toggle.

## [Cosmetic LOB v2 — Phase 0 Governance] — 2026-05-19 (feat/cosmetic-line-of-business worktree only)

- Product-map domains split/created: business-unit, cosmetic-clients, ctv, earnings-commissions (earnings table per PLAN); cosmetic.yaml corrected.
- permission-registry + api-index updated with 9 keys + new routes.
- schema-map, unknowns, change-checklist, system-map updated for two-DB + earnings.
- New Governance Delta spec created documenting all authority/product-map changes.
- AGENTS, ARCHITECTURE, BEHAVIOR, DECISIONS (D1–D16), DATA-MODEL, SECURITY, RUNBOOK + runbooks, TEST-MATRIX, etc. updated with LOB notes + cross-refs per v2 spec § Documentation updates and PLAN Phase 0.
- Reinforced "local only", TDD-first, product-map governance, no cross-DB SQL.
- No runtime code or migrations yet — pure governance foundation. See 2026-05-18-cosmetic-line-of-business-governance-delta.md and PLAN.md.

## Format

```
## [x.y.z] — YYYY-MM-DD
### Category
- Change description — @author — reason/ref
```

Categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`, `Docs`.

---
## [0.32.46] — 2026-05-24
### Fixed
- TMV Cosmetic feedback sweep: appointment create/update, customer create/edit selectors, employee create/edit permission selectors, payment/deposit balance reads, and payment history refreshes now pass the active Cosmetic LOB through the frontend API clients so Cosmetic screens stay on `/api/cosmetic/*`. — @agent — Staff feedback from TMV Cosmetic; preserves Cosmetic LOB v2 two-DB isolation.
- Feedback admin auto-error hygiene now filters the Auto-detected Errors tab to the current host by default while preserving the all-host cleanup toggle and manual feedback behavior. — @agent — Staff feedback from TMV feedback queue; keeps stale-host errors from obscuring current TMV defects.
- Added regression coverage for the Cosmetic `/CustomerBalance` API mirror so live payment modals do not regress to a missing balance route. — @agent — Staff feedback from Cosmetic customer payment/deposit workflows.
- NK3 web image builds now accept `GIT_SHA` and `GIT_BRANCH` build args for `/version.json` when Docker builds without `.git` in context. — @agent — Deploy verification must prove the live bundle matches the pushed commit.

## [0.32.45] — 2026-05-23
### Fixed
- TMV/NK3 Cosmetic LOB permissions board now has a request-scoped `/api/cosmetic/Permissions/*` mirror, so `/permissions` under Cosmetic no longer 404s on `/Permissions/employees`. — @agent — Staff feedback from TMV Cosmetic; preserves Cosmetic LOB v2 route isolation and permission-board parity.
- Cosmetic customer add-service failures now surface a visible form error instead of disappearing into the console; regression coverage keeps service create/update writes on the active Cosmetic LOB. — @agent — Staff feedback from TMV Cosmetic customer profile add-service flow.

## [0.32.43-nk3-cosmetic-lob] — 2026-05-23
### Fixed
- TMV/NK3 Cosmetic LOB redo: the Business Unit provider now initializes from `?lob=cosmetic` or persisted `tgclinic_lob=cosmetic` before child data effects can fire, preventing first-render Dental requests while Cosmetic is selected; additional customer, appointment, payment, service, settings, face-ID, monthly-plan, HSO/checkup, customer-source, and DotKham callers now pass the active LOB so Cosmetic screens use `/api/cosmetic/*` consistently. — @agent — User found the prior sweep was being exercised in Dental; preserves Cosmetic LOB v2 two-DB isolation and active-LOB workflow parity.
- Added missing Cosmetic mirror mounts for customer sources, DotKhams, bank settings, external checkups, face-ID, and exports so the frontend callers above have request-scoped cosmetic API routes instead of falling back to dental/global endpoints. — @agent — Closes the live Cosmetic toggle leak observed on `https://tmv.2checkin.com`.

## [0.32.42-nk3-api-hotfix] — 2026-05-23
### Fixed
- TMV/NK3 API hotfix: restored healthy CompreFace-backed `/api/health`, mounted `/api/cosmetic/CustomerBalance`, removed the duplicate unguarded `/api/ctv` mount, required `is_ctv` on CTV self-dashboard reads, and restored service-catalog create/edit by importing `normalizeVietnamese` in `api/src/routes/products.js`. — @agent — NK3/TMV full-parity sweep; preserves Cosmetic LOB v2 two-DB isolation and CTV-only dashboard gating.

### Removed
- Retired the external `ctv.2checkin.com` hostname for NK3/TMV: removed it from API CORS and disabled the VPS nginx vhost so `tmv.2checkin.com` is the only supported NK3 clinic domain. — @agent — User request to nuke the unused CTV hostname while preserving the in-app `/ctv` route gating.

## [0.32.35-cosmetic-lob] — 2026-05-22
### Fixed
- NK3 Cosmetic LOB routing now sends employee branch loads, employee creates, customer creates/updates, appointment creates/updates, customer selectors, payments, deposits, customer profile reads, customer balance, sale-order lines, and revenue report reads through the cosmetic mirror when the active business unit is Cosmetic; the web Docker build now forwards `VITE_COSMETIC_LOB_ENABLED`, and the NK3 `sslip.io` browser origin is allowed by API CORS for live verification. Revenue summary, trend, and by-location cards now include direct posted `payment_category = 'payment'` receipts without allocation rows, including imported cosmetic receipts whose `service_id` is still blank; by-location shows unassigned paid receipts instead of dropping them, customer-balance advance cards count only deposit-category rows, and revenue still excludes deposits, refunds, usage, and voided payments. — @agent — Staff feedback from NK3 `/feedback` and `/reports/revenue`; preserves INV-003/INV-004 payment classification and Cosmetic LOB v2 two-DB isolation.

## [0.31.19] — 2026-05-19
### Fixed
- Restricted Cosmetic LOB selector to Admin users only: auth responses cap non-admin visible `lob_scope` to one LOB, `BusinessUnitContext` ignores staff localStorage/query attempts to switch, and docs/tests now cite INV-008A. — @agent — User request: dental staff must not see or select Cosmetic LOB.

## [0.32.37] — 2026-05-21
### Added
- **FeedbackWidget login hint:** small dismissible bubble next to the speech-bubble icon in the header that prompts "Có vấn đề? Nhấn vào đây để báo cho chúng tôi — mọi phản hồi đều được đọc." (EN: "Any problem? Tap here to report it — we read every one."). Shows once per fresh login session — `AuthContext.login` clears `sessionStorage['tg_feedback_hint_dismissed']`, the X button on the bubble sets it. New i18n keys: `feedback.loginHintTitle`, `feedback.loginHintBody`, `feedback.loginHintDismiss` (EN + VI). — @agent — 2026-05-21 surfaces the feedback channel to staff on every login.

### Fixed
- **`Xu hướng dòng tiền` cash flow chart no longer truncates dates.** `BarChart` (`website/src/components/reports/BarChart.tsx`) gains a `labelOrientation: 'auto' | 'horizontal' | 'vertical'` prop. `'auto'` (default) rotates labels -90° when there are >= 8 bars so per-column width is no longer the constraint. `ReportsRevenue.tsx` passes `labelOrientation="vertical"` explicitly to the cash-flow chart since daily dates with month suffix are always long. The same auto-rotation applies to every other `BarChart` consumer (weekly trend, monthly summary) without per-call changes. — @agent — 2026-05-21 fixes the "4..." / "2..." mid-character truncation on /reports/revenue.

## [0.32.36] — 2026-05-21
### Added
- Frontend foundation for Cosmetic LOB v2 (Phase 0/1 per PLAN): full `BusinessUnitContext.tsx` (TDD, stable memoized, auth-event synced mirroring LocationContext), `FilterByBusinessUnit` toggle component (placed left of location filter in header, renders for isMultiLOBUser), wired `BusinessUnitProvider` + keyed remount (`key={currentLOB}` around Outlet in Layout) in App/Layout, LOB-aware `apiFetch(..., { lob })` support in core.ts for future /cosmetic/* routes. Toggle is now renderable (visible for admins with lob_scope >=2). — Frontend Foundation Agent — Follows website/agents.md + v2 spec + visual companion.

### Docs
- Added cosmetic line-of-business design specs (v1, v2, visual companion) and SMS messaging system research under `docs/superpowers/specs/`. These design documents are now present on the `feat/cosmetic-line-of-business` worktree (cherry-picked from the parking branch) to guide implementation of the new Cosmetic LOB feature — @agent — Pre-implementation design capture for feat/cosmetic-line-of-business.


## [unreleased] — 2026-05-21
### Changed
- Archived agent audit reports under `docs/audits/<date>-<topic>/`: 2026-05-19 cosmetic-LOB v2 finishing-swarm pack (brutal audit #2, cross-LOB badge, docs-sync, overall-status) and the 2026-05-16 NK2 deeplink proof report. Added `docs/audits/README.md` as the index. Added `.gitignore` entries for `output/playwright/`, `reports/feedback-extract/`, `reports/responsive-qa/`, and `reports/calendar-five-digit-proof-2026-04-29/` so future Playwright runs do not dirty the working tree (already-tracked files in those paths remain tracked). — @agent — 2026-05-21 working-tree cleanup before starting the cosmetic LOB UI build.

### Tests
- `api/src/services/exports/__tests__/featureCatalog.crosscheck.test.js` — 40-assertion Jest cross-check that walks each `product-map/features/exports/*.yaml` and compares its declared column list (key + header, order-sensitive) against the COLUMNS arrays parsed from the corresponding builder source. Additive test only; does not touch any export builder source. — @agent — 2026-05-21 carries the YAML/code contract lock onto `fix/feedback-reports`.

## [0.32.35] — 2026-05-21
### Fixed
- `PUT /api/Appointments/:id` companyId persistence now ships on `fix/feedback-reports`: handler accepts `companyId`/`companyid`, validates as UUID, checks FK against `companies`, persists `appointments.companyid`, and the unified appointment form mapper sends `companyid` + `companyname` from the selected location. Added Jest coverage in `api/src/routes/appointments/__tests__/mutationHandlers.test.js` (valid UUID, missing FK 404, malformed UUID 400) and a Vitest case in `appointmentForm.mapper.test.ts` asserting payload passes `AppointmentUpdateSchema`. Version bumped to `0.32.35` + entry in `website/public/CHANGELOG.json`. — @agent — 2026-05-21 carries the 2026-05-19 NK feedback fix onto this branch with explicit tests.

### Docs
- Cement cosmetic LOB v2 authority sync on `fix/feedback-reports`: AGENTS / DECISIONS / COORDINATION_REQUESTS get the LOB discipline + two-DB + partners-as-identity rules; `docs/CONTRACTS.md`, `DATA-MODEL.md`, `MIGRATIONS.md`, `RUNBOOK.md`, `SECURITY.md` get migration-047 / `getDb(lob)` / `getQuery(req)` / `COSMETIC_LOB_ENABLED` / `/api/cosmetic` + `/api/ctv` subsections; `product-map/contracts/{api-index,dependency-rules,permission-registry}` get LOB endpoints, `lob.*` permissions, and dep-cruise rules; `product-map/domains/appointments-calendar.yaml` records `companyId` on appointment update; `product-map/schema-map.md` gets the partners (lob_scope/is_ctv/referred_by_ctv_id) + earnings table diagram; split cosmetic domains added as `product-map/domains/{business-unit,cosmetic,cosmetic-clients,ctv,earnings-commissions}.yaml` plus `product-map/governance-delta-cosmetic-lob-v2.md`. Source-of-truth alignment only — no application code touched, no Excel export builders changed. — @agent — 2026-05-21 pre-build cementing so the cosmetic LOB UI work on this branch shares the same product-map as the nk3-deploy / Codex line.
- `testbright.md` — appended NK 2Checkin login monitor TestSprite entry (read-only auth health check, 3 non-destructive screens). — @agent — 2026-05-21.

---

## [unreleased] — 2026-05-20
### Added
- `product-map/features/exports/` — canonical feature catalog for all 8 Excel exports (appointments, customers, payments, services, service-catalog, report-sales-employees, revenue-flat, deposit-flat). Each YAML specifies columns (position, key, header_vi, style, width, source), API routes, UI entry points, permission gates, code references, and acceptance filters. Jest cross-check test (`featureCatalog.crosscheck.test.js`) validates YAML column definitions match builder code COLUMNS arrays (keys and headers, order-sensitive). — @agent — 2026-05-20 Contract-First Monorepo pattern; single source of truth for Excel export column contracts.

### Fixed
- Commit the 7 working-tree-only export fixes (paymentNote/depositNote columns, SQL aliases, mapper wiring, COALESCE customer source) that had been bypassing git across 5 fix cycles. NK2 deployed code byte-identical to working tree confirms no behavioral change to NK2. NK production will gain the Note columns on next deploy. — @agent — 2026-05-20 root cause of recurring Excel export regression; persists fix to git so fresh checkouts no longer lose Note columns.

### Added
- `api/src/services/exports/__tests__/legacyFlatReportColumns.lock.test.js` — locked source-of-truth guard for REVENUE_COLUMNS and DEPOSIT_COLUMNS. Asserts column count, key+header snapshot (order-sensitive), uniqueness, and presence of every column key in the row mapper. Future column add/remove must intentionally edit two test arrays + the data file + SQL + mapper; silent drops cannot pass review. — @agent — 2026-05-20 anti-regression structural fix.

### Added (2026-05-20 — Defense in depth)
- `scripts/require-clean-tree.sh` and `scripts/deploy-build-args.sh` — refuse to build/deploy from a working tree with uncommitted changes (Layer 1 prevention). Set `ALLOW_DIRTY_BUILD=1` to override in emergencies. — @agent — 2026-05-20 5-cycle Excel export regression root cause prevention.
- `Dockerfile.web` accepts `GIT_SHA` / `GIT_BRANCH` build args; `website/scripts/generate-version.js` prefers these env vars before falling back to `git rev-parse` (which isn't available inside the build container). `/version.json` now reports the real commit deployed instead of `"unknown"`. — @agent — 2026-05-20 Layer 2 deploy parity.
- `api/src/services/exports/__tests__/allBuilderColumns.lock.test.js` (24 assertions) — locks COLUMNS arrays in appointments / customers / payments / services / serviceCatalog / reportSalesEmployees exports. Same pattern as `legacyFlatReportColumns.lock.test.js` but file-text based since these builders don't `module.exports` their column constants. — @agent — 2026-05-20 Layer 4 extension.


## [unreleased] — 2026-05-19
### Fixed
- `revenue-flat` and `deposit-flat` Excel exports now include payment/deposit notes, use sale-order customer source before customer fallback for revenue rows, and split deposit cash vs bank-transfer values from explicit split columns or payment-method fallback — @Worker A — 2026-05-19 live feedback export defects; preserves UC-013/WF-005 report export contracts.
- Calendar appointment export now serializes the same `appointments.date` clinic-calendar value used by `/calendar` before falling back to legacy `datetimeappointment`, and appointment export search now matches customer phone numbers so phone `922403152` day exports do not use stale appointment dates or unfiltered rows — @Worker B — 2026-05-19 live feedback calendar export date correctness.
- `PUT /api/Appointments/:id` now accepts `companyId`/`companyid`, validates the company FK, persists `appointments.companyid`, and returns the refreshed clinic/location so appointment edit saves no longer drop changed cơ sở values — @agent — 2026-05-19 live feedback appointment location persistence; preserves Appointments & Calendar edit contract.

### Docs
- Added cosmetic line-of-business design specs (v1, v2, visual companion) and SMS messaging system research under `docs/superpowers/specs/`. Parked on `fix/feedback-reports` so they exist on a tracked branch ahead of starting the cosmetic LOB feature work — @agent — Pre-implementation design capture.
- Documentation & Authority Sync (Governance Delta close-out): Created the 4 missing split product-map domains in main (business-unit.yaml, cosmetic-clients.yaml, ctv.yaml, earnings-commissions.yaml); corrected all 5 + cosmetic.yaml + schema-map.md + governance-delta + permission-registry for final implemented shape (partners as canonical identity/auth table with lob_scope/is_ctv/referred_by_ctv_id in BOTH tdental_demo + tcosmetic_demo per migration 047; earnings table not commissions for D13 transactional attribution; two-DB dual-pool getDb/getQuery topology; D13 recipient_partner_id). Updated AGENTS.md (new LOB discipline subsection + must-read list), governance-delta, and CHANGELOG. All authority files (DATA-MODEL, DECISIONS, CONTRACTS, MIGRATIONS, TEST-MATRIX, SECURITY, RUNBOOK etc.) aligned to reality vs early v2 spec deviations. Swarm progress updated. Produced AGENT_FINISH_DOCS_SYNC.md with before/after. — @Documentation & Authority Sync Agent — v2 spec §262-282 + AGENT_COSMETIC drift closure.

## [0.32.34] — 2026-05-19
### Fixed
- Feedback image replies now persist message rows and attachment rows inside real transactions for `POST /api/Feedback`, `POST /api/Feedback/my/:threadId/reply`, and `POST /api/Feedback/all/:threadId/reply`; file-only replies store empty message content safely, missing-thread replies clean up uploaded files, and `DELETE /api/Feedback/all/:threadId` removes physical attachment files only after the DB delete commits. The missing revenue-resolution proof for feedback `06892fc6-5ccc-4c22-ad00-fed55199e9ad` was restored on NK production; 16 duplicate orphan files were restored, 4 unrecoverable stale attachment rows were backed up to `/opt/tgroup/backups/feedback-orphan-attachments-20260519T0249Z.csv` and pruned, and `/feedback` now has zero `feedback_attachments` rows pointing at missing `/uploads/feedback/*` files — @agent — FM-20260519-01.

## [0.32.33] — 2026-05-18
### Fixed
- `HealthCheckupEmptyState` (`website/src/components/customer/HealthCheckupEmptyState.tsx`) now consumes `patientExists` from `GET /api/ExternalCheckups/:code` and renders a distinct VN/EN guidance string instead of the generic "No health checkup images found." When the Hosoonline patient doesn't exist yet, staff see `checkupEmptyPatientMissing` pointing at the "Tạo bệnh nhân HSO" button; when it does exist but has no images, they see `checkupEmptyNoImages` pointing at "Thêm lịch khám". All Hosoonline auth/unavailable/not-configured warnings are now translated. `HealthCheckupGallery.handleCreatePatient` shows an emerald success notice (`createExternalPatientSuccess`) after creation succeeds so staff get confirmation instead of a silent refresh. Verified `tsc --noEmit` clean, `vitest run src/components/customer/` 56/56 pass — @agent — Resolves feedback `84adb3d5-d7ec-4173-9813-71121e128e1f` ("tạo được hồ sơ online nhưng chưa xem được ảnh và cũng chưa up ngược lên được").
- Feedback `7bd930b0-82b5-42a1-9137-167373f6cc38` (nk vs nk2 online-profile parity) closed without code change after live verification: `GET /api/ExternalCheckups/T6281` returns byte-identical responses on both envs; HOSO* env vars sha256-identical across containers; same git HEAD `a2a40b7d`. Issue at report time (2026-05-15) was a stale frontend bundle on the reporter's browser, resolved by the 2026-05-18 redeploys — @agent — No code change.

## [0.32.32] — 2026-05-18
### Fixed
- `/calendar` now keeps the wrapped toolbar layout through laptop widths so the date navigator, search, export, filter, and quick-add controls stay visible at `1280x720` and `1366x768`; `/employees` now bounds long role/location text and keeps the edit action column sticky on the right edge of the table. This follows the NK2 responsive population audit across iPhone, iPad, and desktop routes — @agent — Staff-reported responsive population/layout defect; preserves populated calendar and employee admin workflows.

## [0.32.30] — 2026-05-18
### Fixed
- `/calendar` toolbar now keeps iPad/tablet widths on the wrapped layout until extra-wide desktop, preventing the view tabs/date navigator from overlapping and the filter/quick-add controls from extending offscreen — @agent — Staff-reported iPad calendar population/layout issue; preserves the appointments-calendar tablet acceptance path.

## [0.32.29] — 2026-05-18
### Changed
- Face ID engine swap: `useFaceCaptureController` now uses the burst+adaptive-threshold+force-capture strategy validated in the `/face` lab. Single-shot captures (Global Face ID button, customer camera, AddCustomerForm) now grab 5 frames at 100ms intervals and ship the sharpest one to CompreFace. Adaptive threshold relaxes after ~6s and ~10s; force-capture safety net fires at ~15s using the best frame seen. `requireFaceDetection` falls back to `false` when the browser native FaceDetector is unavailable (fixes iPhone Safari/Firefox stalling at 34%). Profile-mode 3-pose capture is unchanged. The `/face` lab page and its components were deleted now that the engine ships in production — @agent — Lab validated Module D as winner; rolled into the shared engine.

## [0.32.28] — 2026-05-18
### Fixed
- `/face` lab: captured face is now preserved if the `/api/face/recognize` upload fails (e.g. mobile network timeout / HTTP 408). New "recognize-failed" phase shows the captured frame, an amber upload-failed banner, and the same Register-face panel so the user can still register without re-capturing. Camera shuts off as soon as the blob is in hand (was: only after upload completed) — @agent — User reported iPhone Safari load fail after capture, registration blocked.

## [0.32.27] — 2026-05-18
### Added
- `/face` lab: when a capture returns no_match, an inline "Register face" panel lets you search customers by name/phone/code and register the just-captured face directly — no need to leave the page. Uses the existing POST /api/face/register endpoint. Modules reordered so the recommended one (D — Burst) is first, with a RECOMMENDED badge — @agent — User wanted to register from the lab page.

## [0.32.26] — 2026-05-18
### Fixed
- `/face` lab modules no longer stall at 34% when browser's native FaceDetector is unavailable: when detector is null, requireFace falls back to false so quality scoring drives auto-capture; added adaptive threshold (relaxes after 6s/10s) and forced capture after 15s using best frame; added "Capture now" manual override beside Stop; lowered per-module thresholds to be reachable with quality-only scoring (A 0.55, B 0.42, C 0.55, D 0.50) — @agent — User-reported stall on 3 of 4 modules.

## [0.32.25] — 2026-05-18
### Changed
- `/face` lab rewritten as auto-capture with per-module Activate toggle: only one camera active at a time; each module runs a continuous detection loop and auto-captures when face is stable (no manual capture button); comparison table now shows BEST badge on highest-confidence match — @agent — Staff feedback that the lab needed bank-style automated capture.

## [0.32.24] — 2026-05-17
### Fixed
- Payment method contracts and UI labels now expose only live methods (`cash`, `bank_transfer`, `deposit`, `mixed`), with `contracts/dist` rebuilt to match source — @agent — Preserve INV-003/INV-004 money-flow consistency and remove unsupported card/e-wallet drift.

## [0.32.23] — 2026-05-17
### Fixed
- `/reports/revenue` total collected now reconciles to the Excel `Báo cáo doanh thu` collected total by using posted payment-method totals and preserving paid-only sale-order states in `/api/Reports/revenue/summary`; employee revenue Excel now applies the same deposit/refund/usage exclusions, and branch breakdowns honor the selected branch filter — @agent — Staff feedback on Revenue page vs Excel mismatch; preserves INV-003, INV-004, INV-019, and reports revenue recognition rules.

## [0.32.22] — 2026-05-17
### Fixed
- Face ID capture now keeps the camera modal open on `NO_FACE` and provider no-face errors, shows "Không phát hiện khuôn mặt" / "Face not detected", maps CompreFace no-face responses to `NO_FACE`, and sends CompreFace uploads as native multipart `FormData` so the provider receives the `file` part — @agent — Staff-reported Face ID failure; preserves UC-003, UC-007, and INV-014.

## [0.32.21] — 2026-05-17
### Changed
- Site favicon now uses a TGClinic orange butterfly mark at `/favicon.svg` instead of the default Vite icon — @agent — Align app-shell identity with `DESIGN.md` warm orange brand direction.

## [0.32.20] — 2026-05-17
### Added
- Face ID provider routing now supports `FACE_RECOGNITION_PROVIDER=compreface` while preserving the existing browser camera and `/api/face/*` contracts — @agent — User requested CompreFace for Face ID; preserves INV-005 local embedding boundary and INV-014 optional provider startup.
- `/api/health` now reports `faceProvider`, and Docker exposes CompreFace on configurable `COMPREFACE_HOST_PORT` defaulting to `8002` to avoid local port `8000` conflicts — @agent — Required provider observability and local startup safety.

## [0.32.10] — 2026-05-16
### Added
- Báo cáo doanh thu (Excel) now includes 4 additional columns: `Tên dịch vụ` (so.name), `Tổng tiền phiếu` (so.amounttotal), `Còn lại phiếu` (so.residual), `Số biên lai` (p.receipt_number) — @agent — Staff feedback: column E "Phiếu khám" only shows the SO code (e.g. `SO-2026-0644`) and lost the service name when 0.32.7 switched to so.code; restore the service name as its own column and surface useful per-SO totals + receipt number so the export is a complete read-out of the row's payment context.

## [0.32.9] — 2026-05-16
### Changed
- Reports date-range quick presets reordered to `Hôm nay / 3 ngày / 1 tuần / 1 tháng / 90 ngày / Tất cả` — @agent — Staff feedback: YTD ("Từ đầu năm") was confusing as the first option and the default; replaced with rolling windows.
- Default Reports date range is now last 30 days instead of start-of-year — @agent — Same feedback; opens the page with the most common working window.

## [0.32.8] — 2026-05-16
### Changed
- Revenue tab Excel exports consolidated into a single picker at the top of the page — @agent — Replace three separate export panels (revenue, deposit, employee revenue) with one report-type dropdown plus the existing employee filters; date range continues to come from the global Reports filter bar.

## [0.32.7] — 2026-05-16
### Fixed
- Báo cáo doanh thu (Excel) column E "Phiếu khám" now uses `saleorders.code` (e.g. `SO-2026-0644`) instead of `saleorders.name` — @agent — Match the SO reference shown on the customer detail page; falls back to `name` only when `code` is blank.
- Phiếu điều trị export "Số phiếu" column likewise prefers `saleorders.code` — @agent — Same SO-code source as customer UI.
- Revenue and treatment export search filters now match against `saleorders.code` in addition to `name` — @agent — Staff can paste `SO-...` codes into search.

## [0.32.6] — 2026-05-16
### Added
- NK production daily database backup script and VPS cron with 3-backup retention — @agent — Preserve production restore points for `tdental_demo` before future data operations.

### Fixed
- Hosoonline customer images on NK now use session-storage auth tokens as well as remembered tokens — @agent — Preserve INV-013 protected proxy access for non-remembered sessions.

## [0.27.27] — 2026-05-05
### Fixed
- iPhone modal height overflow in AddCustomerForm and EditCustomerForm — @agent — Prevent form fields from being unreachable on 390px viewports (FM-20260505-01).

## [0.27.26] — 2026-05-05
### Changed
- Sticky toolbar search spacing on Overview — @agent — Standardize compact toolbar layout per DESIGN.md (DEC-20260502-05).

## [0.27.25] — 2026-05-04
### Fixed
- Hosoonline mixed content blocking on production — @agent — Force HTTPS fallback for upstream image URLs (INC-20260506-02).

## [0.27.24] — 2026-05-03
### Added
- Patient v2 API with key-based authentication (`POST /api/patients/_create`, `GET /api/patients/_search`) — @agent — Enable external patient management without Caddy routing collision.

## [0.27.23] — 2026-05-02
### Added
- Revenue export Excel builder with location scope and employee-type filter — @agent — TC015 protected reports routing requirement.
- Cash flow report backend aggregation — @agent — Financial reporting accuracy.

## [0.27.22] — 2026-04-28
### Fixed
- Permission system drift: `resolveEffectivePermissions` now shared between auth middleware and login route — @agent — Prevent middleware rejecting valid tokens (INC-20260506-01).

## [0.27.21] — 2026-04-25
### Added
- IP access control per company (`ip_access_settings` + `ip_access_entries`) — @agent — Clinic network security requirement.

## [0.27.20] — 2026-04-20
### Fixed
- Login rate limiter scoped by email+IP instead of IP-only — @agent — Prevent one employee locking out entire clinic (FM-20260420-01).

## [0.27.19] — 2026-04-18
### Added
- Telemetry ingestion system (`POST /api/telemetry/errors`, error management UI) — @agent — Operational visibility into frontend crashes.

## [0.27.18] — 2026-04-15
### Fixed
- Export nginx timeout raised to 300s — @agent — Prevent 504 on large revenue/payment exports (FM-20260415-01).

## [0.27.17] — 2026-04-12
### Added
- Monthly plan installment payment flow (`PUT /api/MonthlyPlans/:id/installments/:installmentId/pay`) — @agent — Large treatment financing.

## [0.27.16] — 2026-04-10
### Fixed
- `partners` NOT NULL constraint rollback after customer create breakage — @agent — All INSERT paths must include new columns (FM-20260410-01).

## [0.27.15] — 2026-04-05
### Added
- Face embedding soft-delete (`deleted_at` on `customer_face_embeddings`) — @agent — Preserve audit history on re-registration (FM-20260405-01).

## [0.27.14] — 2026-03-25
### Changed
- Payment allocation pre-validation (`validateAllocationResidual`) — @agent — Reduce negative residual race conditions (FM-20260325-01).

## [0.27.13] — 2026-03-20
### Added
- i18n coverage test (`i18n-coverage.test.ts`) — @agent — Catch missing Vietnamese keys before merge (FM-20260228-01).

## [0.27.12] — 2026-03-15
### Removed
- Mock data fallback from production components — @agent — Prevent API failures from being masked (FM-20260310-01).

## [0.27.11] — 2026-03-10
### Added
- Root authority stack (`AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md`, `BEHAVIOR.md`, `DECISIONS.md`) — @agent — Establish durable decision routing (ADR-0001).

## [0.27.10] — 2026-03-05
### Added
- Product-map governance (`product-map/domains/*.yaml`, `schema-map.md`, `dependency-rules.yaml`) — @agent — Domain ownership and blast radius tracking (ADR-0002).

## [0.27.0] — 2026-02-01
### Added
- Enterprise domain routes (`api/src/domains/appointments`, `partners`, `auth`) — @agent — Clean architecture for new features.

## [0.26.0] — 2026-01-15
### Added
- Face recognition service (Python/OpenCV YuNet+SFace) — @agent — Local check-in accelerator.

## [0.25.0] — 2025-12-20
### Added
- Payment allocation engine (`payment_allocations` table) — @agent — Split payments across multiple invoices.

## [0.24.0] — 2025-11-10
### Added
- Deposit wallet and receipt number generation — @agent — Prepayment tracking.

## [0.23.0] — 2025-10-01
### Added
- External checkups integration (Hosoonline proxy) — @agent — Health-checkup image sync.

## [0.22.0] — 2025-09-15
### Added
- Permission tier system (`permission_groups`, `group_permissions`, `partners.tier_id`) — @agent — Replace hard-coded role checks.

## [0.21.0] — 2025-08-01
### Added
- TDental CSV import scripts — @agent — Migrate legacy clinic data.

## [0.20.0] — 2025-07-01
### Added
- React 18 + Vite 5 frontend rewrite — @human — Modern SPA replacing legacy web app.

---

## Unreleased

### Added
- Complete documentation stack (`docs/GLOSSARY.md`, `CONTRACTS.md`, `DATA-MODEL.md`, `USE-CASES.md`, `WORKFLOWS.md`, `INVARIANTS.md`, `DEPENDENCY-MAP.md`, `OWNERSHIP.md`, `TEST-MATRIX.md`, `ADR/`, `RUNBOOK.md`, `FAILURE-MODES.md`, `OBSERVABILITY.md`, `SECURITY.md`, `CHANGELOG.md`, `MIGRATIONS.md`, `ROADMAP.md`) — @agent — Anti-breakage and parallel-work safety.
- Doc-update verification script (`scripts/verify-docs.sh`) — @agent — Enforce AGENTS.md §16 pre-commit.

### Docs
- Tightened the SMS/Zalo appointment messaging research with Phase 0 readiness, provider-webhook security, authority-doc handoff, permission coverage, and branch-scope TestSprite checks — @agent — Address reviewer findings before any messaging implementation work starts.
- Researched the SMS/Zalo appointment messaging system and recorded the Vietnam-first provider, compliance, late-reminder, data-model, API, UI, and TestSprite coverage plan — @agent — Prepare Phase 5 appointment messaging roadmap work without shipping runtime behavior yet.
- Synchronized the documentation traceability spine, API/product-map coverage, migration-path authority, TestSprite ledger, and doc verification gates — @agent — Close the 2026-05-17 architecture/docs audit gap so feature work can trace use cases, workflows, contracts, data model, permissions, and tests before implementation.
- Hardened `scripts/sync-claude-mem.sh` to keep generated memory in `.claude/memory.md` and strip accidental generated-memory blocks from `AGENTS.md` — @agent — Preserve AGENTS.md §9 shared-memory boundary and prevent authority-doc pollution.
- Wired documentation governance into local pre-commit, root npm verification scripts, and PR checks; stricter `verify-docs` now requires contract/API, schema, and feature changes to update their specific authority-map artifacts — @agent — Make future feature work cross-check docs/product-map/TestSprite before it can land.
- Added a prompt-level authority gate via `scripts/prompt-authority-check.sh`, `npm run verify:prompt`, and `.claude/settings.json` `UserPromptSubmit` so each new prompt surfaces the authority docs/domains before implementation starts — @agent — Enforce AGENTS.md §1.2 and reduce prompt-by-prompt drift.
- Hardened the prompt-level authority gate to strip accidental generated-memory blocks from `AGENTS.md` before checking the authority stack — @agent — Keep every prompt gate usable even when local memory tooling appends context to the root authority file.
- Reconciled the active prompt-governance workset with `docs/CONTRACTS.md`, `product-map/contracts/api-index.md`, and `docs/TEST-MATRIX.md` so the full governance gate can evaluate payment-contract and frontend/report changes in one pass — @agent — Keep AGENTS.md §16 enforcement from depending on stale previously-applied docs.

### Fixed
- Aligned `contracts/payment.ts` method enum with actual backend/frontend support (`cash`, `bank_transfer`, `deposit`, `mixed`) — @agent — Remove `card`, `momo`, `vnpay`, `zalopay` placeholders until end-to-end wiring exists.

## [0.32.5] — 2026-05-16
### Fixed
- Deposit creation now correctly sets `payment_category = 'deposit'` when explicit `deposit_type` is provided — @agent — Staff feedback: advance receipts showing in payment list (BUG-003)
- Restored legacy flat revenue (`revenue-flat`) and deposit (`deposit-flat`) Excel exports removed in earlier refactor — @agent — Staff feedback: missing report download section (BUG-004) and previous report shape (BUG-002)

## [0.32.4] — 2026-05-16
### Fixed
- (intermediate build — handoff checkpoint)

## [0.32.3] — 2026-05-16
### Changed
- Auto-detected Errors tab on /feedback now shows structured error metadata (error type, message, occurrence count, source file, stack trace) — @agent — Richer error triage for ops team
- Backend `GET /api/Feedback/all?source=auto` now JOINs `error_events` to return full error metadata — @agent — Support frontend structured display
- Backend `GET /api/Feedback/all/:id` now JOINs `error_events` for detail view — @agent — Support modal stack trace display
- Feedback detail modal widened to max-w-3xl with dark code blocks for stack traces — @agent — Readable stack trace viewing

## [0.32.2] — 2026-05-16
### Fixed
- (intermediate build)

## [0.32.1] — 2026-05-16
### Fixed
- Payments export now includes cash, bank, deposit columns — @agent — Staff feedback: deposit report missing payment method breakdown
- Revenue employee export split "Phiếu khám" into Mã phiếu khám (so.code) and Số phiếu điều trị (so.name) — @agent — Staff feedback: column mixing exam code and service
- Calendar export modal presets now use the viewed date instead of always today — @agent — Staff feedback: export includes wrong dates when viewing non-current dates

## 0.32.0 — 2026-05-16
- TestSprite: Complete v2 automated test suite (23/23 tests passing)
- TestSprite: Parallel test runner with 5 workers, ~38s full suite
- TestSprite: MCP config fixed with correct API_KEY in ~/.claude.json
- TestSprite: Added TESTSPRITE_STATUS.md and TESTSPRITE_MCP_SETUP_GUIDE.md
