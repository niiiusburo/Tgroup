# TGroup Clinic — Changelog

> Append-only. What changed, when, by whom (human or agent), why. Semver.

## [0.32.90] — 2026-06-01 (nk3-deploy)
### Fixed
- **Customer outstanding balance now ignores deleted service cards.** `GET /api/CustomerBalance/:id` and its Cosmetic mirror exclude soft-deleted `dbo.saleorders` when summing residual debt, so deleting the last service line for a 6,000,000đ Cosmetic card removes that receivable from the customer profile balance instead of leaving a phantom amount owed. Preserves INV-023 and FM-20260601-03. — @agent
### Tested
- `JWT_SECRET=test-secret npx jest src/routes/__tests__/customerBalance.lob.test.js --runInBand` (3 tests passed); `npm --prefix website run build`; `npm run verify:governance`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/routes/customerBalance.js api/src/routes/__tests__/customerBalance.lob.test.js` (0 findings). — @agent

## [0.32.89] — 2026-06-01 (nk3-deploy)
### Fixed
- **CTV booking company fallback now prefers real clinic locations over QA/test rows.** The selected-LOB fallback for `/api/ctv/bookings` still handles portal payloads without `companyId`, but it deprioritizes company names that look like QA/test/verify fixtures before choosing the first active clinic location. Preserves WF-015, UC-022, INV-022, and FM-20260601-02. — @agent
### Tested
- `JWT_SECRET=test-secret npm --prefix api test -- --runInBand src/routes/__tests__/ctvBookings.test.js src/services/__tests__/ctvBookingCompany.test.js src/services/__tests__/referralClaim.test.js` (project Jest runner matched all API suites: 84 suites / 908 tests passed; existing open-handles warning still appears after completion); `npm --prefix website run build`; `npm run verify:governance`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/routes/ctv.js api/src/services/ctvBookingCompany.js api/src/routes/__tests__/ctvBookings.test.js api/src/services/__tests__/ctvBookingCompany.test.js` (0 findings). — @agent

## [0.32.88] — 2026-06-01 (nk3-deploy)
### Fixed
- **CTV referral bookings now create appointments even when the portal omits `companyId`.** `POST /api/ctv/bookings` resolves a valid selected-LOB appointment company from the request, CTV JWT, or active company fallback before mutating `dbo.partners`, preventing the live `appointments.companyid` NOT NULL failure that updated the client but left no Referral Start appointment card. Preserves WF-015, UC-022, INV-022, and FM-20260601-02. — @agent
### Tested
- `JWT_SECRET=test-secret npm --prefix api test -- --runInBand src/routes/__tests__/ctvBookings.test.js src/services/__tests__/referralClaim.test.js` (project Jest runner matched all API suites: 83 suites / 905 tests passed; existing open-handles warning still appears after completion); `npm --prefix website run build`; `npm run verify:governance`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/routes/ctv.js api/src/services/ctvBookingCompany.js api/src/routes/__tests__/ctvBookings.test.js` (0 findings). — @agent

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
