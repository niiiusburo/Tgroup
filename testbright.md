# TestSprite Task Ledger

When TestSprite runs, treat this file as the task list. For each relevant feature/edit below, execute the listed checks and change each execution item from `PENDING` to `PASS` or `FAIL` with one short evidence note. Use this format:

- [ ] PENDING: Check name.
- [x] PASS: Check name - evidence.
- [ ] FAIL: Check name - failure evidence or reproduction.

Do not remove failed checks until the defect is fixed and rerun.

---

# TestSprite Plan: CTV public sign-up required fields clarity 2026-06-05
Feature/edit name: Public CTV sign-up page copy + validation proof. `/ctv/join` must not require email, and NK3 root CTV sign-up must allow no CTV giới thiệu phone when the root-signup flag is enabled.
Branch: nk3-deploy. Files: `website/src/pages/CTV/JoinCtv.tsx`, `website/src/pages/CTV/JoinCtv.test.tsx`, shared CTV form domain.

Changed URLs / API routes / data flow:
- URL: `/ctv/join` on NK3 web (`https://tmv.2checkin.com/ctv/join`) and static landing redirects from `https://ctv.thammyvientam.com`.
- API route: existing `POST /api/ctv-public/join`; no schema change. Payload continues to require name, phone, password; `email` may be blank; `code` may be blank only when NK3 root sign-up is enabled.
- Merge/deploy guard: keep upstream NK3 `POST /api/ctv/bookings` selected-LOB company fallback, `/ctv` Me-tab invite-link share/copy behavior, and admin `/commission?tab=` drilldowns while preserving the `/ctv/join` no-email rule.

Affected roles and data flows:
- Role: unauthenticated CTV applicant.
- Happy path: applicant sees required-field copy, fills name + phone + password, leaves email blank, optionally leaves CTV giới thiệu blank on NK3 root sign-up, and account creation submits.
- Edge cases: email blank must not block submit; email input must not have browser `required`; no-upline still blocked when root flag is off; unknown typed CTV phone blocks submit.
- Regressions: referral-code signup, manual upline phone signup, backend duplicate-email checks only when email is supplied, portal/admin shared CTV form behavior.

Execution checks:
- [x] PASS: TDD red confirmed page did not yet show required-field copy.
- [x] PASS: `NODE_OPTIONS=--max-old-space-size=8192 npm --prefix website test -- src/pages/CTV/JoinCtv.test.tsx` — 8/8 green, including email-optional and NK3 root sign-up with no CTV giới thiệu phone.
- [x] PASS: Shared CTV frontend bundle `NODE_OPTIONS=--max-old-space-size=8192 npm --prefix website test -- src/components/shared/CtvCreationForm/useCtvCreationForm.test.tsx src/components/shared/CtvCreationForm/CtvCreationForm.test.tsx src/components/commission/CtvManagementTab.test.tsx src/components/ctv/CtvRecruitModal.test.tsx src/pages/CTV/JoinCtv.test.tsx` — 34/34 green; CtvRecruitModal close/reopen no longer OOMs.
- [x] PASS: Targeted backend CTV suites `JWT_SECRET=test-secret NODE_ENV=test npx jest src/routes/__tests__/ctvPublicJoin.test.js src/routes/__tests__/ctvCreateLobScope.test.js src/routes/__tests__/ctvBookings.test.js src/__tests__/ctvRouteGating.test.js src/services/__tests__/ctvSelfProfile.test.js src/services/__tests__/commissionEngineServiceCard.test.js --runInBand --no-coverage` — 43/43 green.
- [x] PASS: Merge-expanded frontend suite `NODE_OPTIONS=--max-old-space-size=8192 npm --prefix website test -- src/components/shared/CtvCreationForm/useCtvCreationForm.test.tsx src/components/shared/CtvCreationForm/CtvCreationForm.test.tsx src/components/commission/CtvManagementTab.test.tsx src/components/ctv/CtvRecruitModal.test.tsx src/pages/CTV/JoinCtv.test.tsx src/components/ctv/CtvReferModal.test.tsx src/pages/Landing/Landing.test.tsx src/pages/CTV/CtvDashboard.test.tsx src/components/commission/CommissionNavigation.test.ts src/components/commission/NewClientsTab.test.tsx src/components/commission/EarningsPayoutsTabs.test.tsx` — 63/63 green after wrapping `Landing` tests in `MemoryRouter`.
- [x] PASS: Merge-expanded backend suite `JWT_SECRET=test-secret NODE_ENV=test npx jest src/routes/__tests__/ctvPublicJoin.test.js src/routes/__tests__/ctvCreateLobScope.test.js src/routes/__tests__/ctvBookings.test.js src/services/__tests__/ctvBookingCompany.test.js src/__tests__/ctvRouteGating.test.js src/services/__tests__/ctvSelfProfile.test.js src/services/__tests__/commissionEngineServiceCard.test.js --runInBand --no-coverage` — 48/48 green.
- [x] PASS: Build + security gate `npm --prefix website run build` passed; scoped Semgrep `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off ...` scanned 51 tracked files with 0 findings / 0 blocking.
- [x] PASS: Live browser screenshot after NK3 redeploy shows `/ctv/join` copy and optional email state - `website/output/playwright/nk3-ctv-signup-live-20260605T122647Z/ctv-join-email-optional.png`; Playwright filled only name + phone + password, left `#ctv-email` blank, confirmed email has no `required` attribute and submit stayed enabled.
- [x] PASS: Global CTV landing CTA check - `https://ctv.thammyvientam.com/` has visible `Đăng Ký CTV` link to `/ctv/join`; screenshot `website/output/playwright/nk3-ctv-global-landing-20260605T122837Z/ctv-global-landing.png`.

# TestSprite Plan: Shared CTV creation hook (useCtvCreationForm) 2026-06-05
Feature/edit name: Extracted shared hook + types + tests for the 3 CTV creation UIs (admin AddCtvModal, portal CtvRecruitModal, public JoinCtv). TDD, per AGENTS/website/agents, immutable, config-driven (email optional default, LOB dental forced), per-field errors, clean payload, i18n ctv ns.
Branch: current. Files: website/src/components/shared/CtvCreationForm/* , i18n updates, changelogs, package bump to 0.32.104.
Execution checks:
- [x] PASS: New hook unit tests (renderHook) 12/12 green (initial, immutable sets, toggleLob invariants, validation core+per-field+email optional, pw min6, clean payload omit email, success/isSubmitting/reset, public-join lobs internal).
- [x] PASS: `npm test -- .../useCtvCreationForm.test.tsx` PASS.
- [x] PASS: `cd website && npx tsc --noEmit` (no new errors from hook/types; checked via focused run).
- [x] PASS: Authority gate (`scripts/prompt-authority-check.sh`) PASS; all required docs read (AGENTS/ARCH/DESIGN/BEHAVIOR/DECISIONS + 5 LOB/ctv product-map yamls + schema-map + unknowns + website/agents+design + ctv.json + 3 consumers + api/ctv + hooks/useFormValidation + Ctv* examples).
- [x] PASS: No new files without necessity; i18n/CHANGELOG/testbright bumped as mandatory for frontend feature; module <500 lines.
- [x] PASS: Presentational CtvCreationForm implemented + basic test (structure, border-red-500 per-field, slots beforeLobs/children/afterSubmit, labels, onCancel, submit wiring to hook, LOB checkboxes). 10/10 vitest green. tsc clean. Barrel updated. (The 3 consumers wiring + re-run of their tests is separate follow-up step.)
- [x] DONE (0.32.106): All 3 consumers (CtvManagementTab AddCtvModal, CtvRecruitModal, JoinCtv) wired to shared CtvCreationForm + useCtvCreationForm (modes + slots + labels). Email optional + specific per-field errors + red borders (fixes the reported generic "Vui lòng nhập đầy đủ thông tin" + email forced on the recruit form). @crossref + SSOT enforcement (AGENTS §5.1 + prompt gate + website/agents + ctv.yaml creation + README + CONTRACTS + TEST-MATRIX + dual CHANGELOGs + version). Backend routes + ctvHelpers have @crossref. All relevant tests green (shared/consumers 34/34, backend CTV 43/43, JoinCtv 8/8 including visible required-field guidance + no-email/root-no-referrer); tsc clean; verify:docs PASS; authority gate PASS. Breadcrumbs ensure future logic changes propagate. (Manual browser create flows on local 5175 with t@clinic.vn + live NK3/TMV verification remain per Claude.md rule.)
- [ ] PENDING: Full e2e on /ctv/join + recruit sheet + admin /commission CTV tab after wiring.

# TestSprite Plan: CTV referral/commission spec — Wave 1 (public signup) 2026-06-05
Feature/edit name: Public CTV signup — root CTV (no upline) + optional email, per `docs/business-logic/ctv-referral-commission.md` §12.
Branch: nk3-deploy. Backend `api/src/routes/ctvPublic.js` (`POST /join`); frontend `website/src/pages/CTV/JoinCtv.tsx`.
Flags (NK3 only): `CTV_PUBLIC_ROOT_SIGNUP=true` (api env), `VITE_CTV_PUBLIC_ROOT_SIGNUP=true` (web build).

Execution checks:
- [x] PASS: api `ctvPublicJoin.test.js` — root CTV (referred_by_ctv_id NULL, flag on) + email-optional (NULL, no dup-email query) + NK/NK2 upline-required regression. 23/23 green.
- [x] PASS: web `JoinCtv.test.tsx` — submits without email; existing flows intact. 6/6 green.
- [x] PASS: `tsc --noEmit` clean.
- [x] PASS: Live on https://tmv.2checkin.com — deployed api+web to /opt/tgroup-nk3, flags set, migration 055 applied to tdental_nk3+tcosmetic_nk3. Root signup (no upline) → 201 root CTV in BOTH DBs (referred_by NULL, active, scope dental+cosmetic). Email-optional passes validation.
- [x] PASS: Wave 2 (INV-003C) LIVE — service card @ full price 1,000,000 with CTV → earnings born immediately L0=240000 (24% of FULL price), status pending, payment_id NULL. Service-card model active (CTV_SERVICE_CARD_COMMISSION=true).

---

# TestSprite Plan: NK3 CTV/booking bug-hunt fixes 2026-06-05
Feature/edit name: Six root-caused NK3 defect fixes (split-brain join, no-branch booking, password cross-LOB verify, commission paidList, dead /me, modal reset).
Branch: nk3-deploy. Backend `api/src/routes/ctvPublic.js`, `api/src/routes/ctv.js`, `api/src/services/ctvSelfProfile.js`; frontend `ExportDateRangeModal.tsx`, `CtvRecruitModal.tsx`.

Changed API routes / data flow:
- `POST /api/ctv-public/join` — now all-or-nothing across dental+cosmetic; dental row rolled back on cosmetic failure (`500 E_CTV_CREATE_FAILED`).
- `POST /api/ctv-public/bookings` — returns `400 E_NO_COMPANIES` when no branch is configured (instead of opaque 500).
- `POST /api/ctv/me/password` — current password must verify against every LOB hash before any update.
- `GET /api/ctv/commission-summary` — Paid tab no longer lists pending reversals.
- `GET /api/ctv/me` — single owner (`ctvProfileRoutes`); duplicate removed from `ctv.js`.

Execution checks:
- [x] PASS: API CTV jest suites (ctvPublicJoin, ctvBookings, ctvSelfProfile, ctvRouteGating, ctvPublic, ctvCreateLobScope) — 30/30 green after fixes.
- [x] PASS: Web modal suites (ExportDateRangeModal, CtvRecruitModal) incl. reset-on-reopen — 4/4 green.
- [x] PASS: `tsc --noEmit` clean (0 errors).
- [ ] PENDING: Live read-only re-verify on https://tmv.2checkin.com that `/api/ctv-public/bookings` with a valid branch still returns 201 (do NOT exercise destructive CRUD).
- [ ] PENDING: Pre-existing failures to triage separately — commissionEngine v3 stale-mock test, saleOrderLines pool mock, cosmeticLobGuards, Landing useLocation/Router test, flaky Calendar click (NOT caused by these fixes).

---

# TestSprite Plan: Live production read-only MCP smoke run 2026-06-05
Feature/edit name: TestSprite MCP execution recovery and read-only live smoke coverage
Branch: current local dirty branch. Target is live `https://tmv.2checkin.com` through `website/.testsprite/config.json`; no live CRUD is approved for this pass.

Changed URLs / API routes / data flow:
- URLs/API routes changed: none.
- URLs to test read-only: `/login`, `/overview`, `/customers`, `/employees`, `/calendar`, `/payments`, `/settings/permissions`.
- Data flow: authenticate with admin credentials, navigate/view protected pages, use search/navigation controls only.

Affected data flows:
- Admin JWT login via `/api/auth/login`.
- Read-only page data loading for customer, employee, calendar, payment, and permission views.

User roles:
- Full admin account `t@clinic.vn` on live production; destructive tests are explicitly excluded unless separately approved.

Happy paths:
- Valid admin login reaches protected overview.
- Guarded pages render without server errors.
- Customer search and calendar date navigation work without saving records.

Edge cases:
- Invalid login remains rejected.
- Logout clears session.
- TestSprite must not create/edit/delete customers, employees, appointments, payments, permissions, services, CTV rows, bookings, or commission data.

Regressions:
- No live production database rows are created, edited, deleted, allocated, paid, or confirmed by this run.
- Existing TestSprite stale MCP processes should not cause the bound tool call to time out.

Setup data and login state:
- TestSprite account: Starter plan, account `jasonleyoutu@gmail.com`.
- Project path for MCP tools: `/Users/thuanle/Documents/TamTMV/Tgrouptest/website`.
- Config path: `website/.testsprite/config.json`.

Execution verification:
- [x] PASS: Authority gate passed before run.
- [x] PASS: TestSprite tool binding is available in the current Codex session.
- [x] PASS: TestSprite account check returned Starter plan with 400 credits.
- [x] PASS: Stale-process inspection found 34 TestSprite processes, including 12 PPID 1 orphan plugin nodes; cleanup held because no explicit process-kill approval was given.
- [x] PASS: Repaired generated TestSprite artifacts for execution: flattened `website/testsprite_tests/testsprite_frontend_test_plan.json` and used localhost preview because the runner tunnels only localhost endpoints.
- [x] PASS: Built and served `website` locally on `http://localhost:5175/` with `VITE_API_URL=https://tmv.2checkin.com/api`; TestSprite pre-flight and tunnel probes both passed.
- [x] PASS: Read-only TestSprite run executed safe IDs only; 9/10 selected cases passed in TestSprite SSE status.
- [ ] FAIL: `TS-031 Calendar date navigation` stayed `processing` with no TestSprite result URL, so the runner never wrote `website/testsprite_tests/tmp/test_results.json` or `raw_report.md`.
- [x] PASS: Partial report saved at `website/testsprite_tests/testsprite-mcp-test-report.md` with the 9 passing TestSprite result URLs and the `TS-031` blocker.

---

# TestSprite Plan: NK3 Cosmetic CSV appointment import 2026-06-04
Feature/edit name: NK3 Cosmetic CSV appointment recovery; deposits remain review-only
Branch: current local dirty branch. Planned live target is NK3 only: `https://tmv.2checkin.com`, DB `tcosmetic_smoketest`. No Dental production or `nk.2checkin.com` data write.

Changed URLs / API routes / data flow:
- URLs/API routes changed: none.
- Browser URLs verified after approval/import: `https://tmv.2checkin.com/calendar`, `https://tmv.2checkin.com/customers`.
- Data source: `/Users/thuanle/Documents/TamTMV/ctv2checkin/database/database_check_trung_khach_hang_tham_my.csv`.
- Target data flow: insert-only Cosmetic `partners` and `appointments` rows in `tcosmetic_smoketest`; deposit/payment candidates were classified for review but not imported in this pass.

Affected data flows:
- Cosmetic customer matching by canonical Vietnamese phone key.
- Cosmetic calendar appointment creation from CSV rows with valid `Ngày hẹn làm`.
- Cosmetic payment/deposit candidate creation from `Cọc` only after status classification excludes refunded/transferred/used deposits.

User roles:
- Admin/staff with Cosmetic LOB access.
- QA/Verification checking live NK3 Cosmetic after any approved import.

Happy paths:
- CSV rows with existing Cosmetic customer phone keys attach to the matching partner.
- CSV rows whose phone is missing in Cosmetic create a customer row only after dry-run review.
- Valid appointment-date rows appear on Cosmetic calendar with branch, service text, closer, and notes preserved.
- Deposit/payment candidates remain review-only until a separate approval/import pass.

Edge cases:
- Placeholder `01/01/2001`, blank, and invalid appointment dates are excluded from appointment insert.
- Refund, chargeback, transferred, and already-used deposit statuses are excluded from active deposit import.
- Duplicate phone rows create multiple appointments/payments under one customer, not duplicate customers.
- Current live June 2026 NK3 cosmetic appointments must be preserved.

Regressions:
- No Dental/NK production tables are touched.
- No existing `tcosmetic_smoketest` rows are truncated or overwritten.
- Import must be rehearsed/dry-run before live write and backed up before execution.

Setup data and login state:
- Target: `https://tmv.2checkin.com`, Cosmetic LOB.
- DB: `tcosmetic_smoketest` on VPS `dokploy/root@76.13.16.68`.
- Current target backup: `backups/db-sync/nk3-tcosmetic_smoketest-before-csv-appointments-import-20260604_174135.dump`.
- Source CSV SHA256: `3ee3109706b8b096abea48bd3f3e3acdebe9a693ec661161c0bf953757c655b6`.

Execution verification:
- [x] PASS: Preflight target backup saved locally before any import.
- [x] PASS: CSV parsed as 11,377 data rows with 4,385 valid appointment-date candidates.
- [x] PASS: Canonical phone-key comparison shows 11,120 CSV rows match existing Cosmetic partners and 246 rows need customer-create review.
- [x] PASS: Deposit candidates classified by status; refund/transfer/used statuses are excluded from active deposit import.
- [x] PASS: Read-only live comparison after recovery still targets `tcosmetic_smoketest` only; live counts are appointments=72, saleorders=3,953, saleorderlines=3,952, payments=5,587, customers=12,408, products=208.
- [x] PASS: Current CSV appointment comparison found 4,385 appointment candidates and 0 duplicates by same customer phone + appointment date/time against live; CSV has 0 appointment rows for 2026-06-04 while live already has 4.
- [x] PASS: Current stricter phone-key pass matched 11,088 CSV rows to live Cosmetic customers, with 278 rows needing customer-create review and 11 rows without a usable phone.
- [x] PASS: Service/order review found 1,045 CSV rows marked `Đã đến làm`; 1,015 match existing Cosmetic customers, but only 28 have exact/high-confidence product matches, 338 need product mapping review, and 644 are unmapped.
- [x] PASS: Deposit review found 1,908 active candidates and 105 refund/transfer/used exclusions; only 551 active candidates match an existing payment by phone + amount + entry date, while 390 do not match any existing payment by phone + amount.
- [x] PASS: First explicit user confirmation received for live NK3 appointment recovery; live write still held for the required second confirmation.
- [x] PASS: Fresh live-target backup saved locally at `backups/db-sync/nk3-tcosmetic_smoketest-before-csv-appointments-import-20260604_174135.dump`, size 3.3M, SHA256 `d9a70b1fce78275668aa78fecec6bd894a0dda2e04c2fed93f6696807f64058b`.
- [x] PASS: Rehearsal on scratch DB `codex_csv_appt_rehearsal_20260604_174135b` inserted 126 missing customer partners and 4,385 appointments, skipped 0 existing appointments, and left 0 required appointment fields null.
- [x] PASS: Rehearsal appointment state distribution was scheduled=3,249, done=1,045, cancelled=91; appointment years were 2022=182, 2023=336, 2024=408, 2025=3,421, 2026=37, 2035=1.
- [x] PASS: Second explicit user confirmation received immediately before the live write.
- [x] PASS: Live import committed to `tcosmetic_smoketest` only with insert-only SQL: inserted 126 missing customer partners and 4,385 appointments, skipped 0 existing appointments, and committed final live counts appointments=4,457 and customers=12,534.
- [x] PASS: Live validation found 0 required imported appointment fields null; imported appointment states are scheduled=3,249, done=1,045, cancelled=91.
- [x] PASS: Live validation preserved current-day data: CSV had 0 rows for 2026-06-04 and live still has 4 appointments for 2026-06-04 after import.
- [x] PASS: Adjacent DB safety check found 0 `CSV_IMPORT_NK3_APPTS_20260604` appointment markers and 0 `CSVAPPT-%` customer markers in `tdental_smoketest` and `tdental_demo`.
- [x] PASS: Live API verification returned Cosmetic appointments `totalItems=4457` from `/api/cosmetic/Appointments?startDate=2026-01-01&endDate=2026-12-31`.
- [x] PASS: Live browser screenshot verification saved `docs/live-artifacts/nk3-cosmetic-csv-appointments-import/2026-06-04T1741/01-calendar-cosmetic-after-csv-import.png` and `docs/live-artifacts/nk3-cosmetic-csv-appointments-import/2026-06-04T1741/02-customers-cosmetic-after-csv-import.png`.

---

# TestSprite Plan: TGroup daily database backup coverage 2026-06-04
Feature/edit name: Daily VPS backup and local download verification for `tdental_demo`, `tdental_smoketest`, and `tcosmetic_smoketest`
Branch: current local dirty branch. Live/smoke targets are backup-export only on `root@76.13.16.68`, container `tgroup-db`. No database restore, import, truncate, or row write.

Changed URLs / API routes / data flow:
- URLs/API routes changed: none.
- VPS scheduler changed: root crontab on `76.13.16.68` now has daily entries for `tdental_demo` at 12:00, `tdental_smoketest` at 12:15, and `tcosmetic_smoketest` at 12:30 Vietnam time.
- Data flow: `tgroup-db` `pg_dump` exports each database to its matching VPS backup directory; Codex daily verification downloads the newest verified dump and checksum to the matching local backup directory.

Affected data flows:
- Read-only database export of `tdental_demo`, `tdental_smoketest`, and `tcosmetic_smoketest`.
- VPS-side retention keeps latest 7 matching `nk-<db>-*.dump` files per database.
- Local download retention keeps latest 7 matching `nk-<db>-*.dump` sets per database.

User roles:
- Infra/Release operator verifying cron and backup health.
- QA/Verification running daily backup verification.

Happy paths:
- Cron contains exactly one backup line for each target database.
- Manual run creates a non-empty custom-format dump and `.sha256` sidecar.
- `sha256sum -c` succeeds on the newest VPS dump.
- `pg_restore -l` via Postgres 16 can read the newest VPS dump.
- Local download copy checksum matches the VPS checksum.

Edge cases:
- Retention deletes only older matching dump/checksum pairs in the same target directory and never touches `/opt/tgroup/backups/db-sync/` or `/opt/tgroup/backups/db-auto/`.
- Same-day manual backups are allowed after data recovery so the latest dump includes the recovered rows before the next cron window.
- If the VPS scheduled backup is missing or failed, the Codex daily verification reports it before creating any fallback dump.

Regressions:
- No `DROP`, `TRUNCATE`, restore, import, or live DB write is part of this backup automation.
- Backup jobs for one DB must not remove or overwrite another DB's dump files.

Setup data and login state:
- VPS: `root@76.13.16.68`.
- Container: `tgroup-db`.
- DB/directories:
  - `tdental_demo`: VPS `/opt/tgroup/backups/nk-db-daily/`, local `backups/nk-db-daily/`.
  - `tdental_smoketest`: VPS `/opt/tgroup/backups/nk3-dental-smoketest-db-daily/`, local `backups/nk3-dental-smoketest-db-daily/`.
  - `tcosmetic_smoketest`: VPS `/opt/tgroup/backups/nk3-cosmetic-db-daily/`, local `backups/nk3-cosmetic-db-daily/`.

Execution verification:
- [x] PASS: VPS crontab has exactly one active line for each target database with 7-dump retention.
- [x] PASS: Manual export created fresh non-empty dumps: `nk-tdental_demo-20260604_234526.dump` (49,910,548 bytes), `nk-tdental_smoketest-20260604_234536.dump` (4,033,899 bytes), and `nk-tcosmetic_smoketest-20260604_234538.dump` (3,924,191 bytes).
- [x] PASS: VPS checksum verification succeeded for the newest dump of each target.
- [x] PASS: `pg_restore -l` read each newest dump and listed the expected source database names `tdental_demo`, `tdental_smoketest`, and `tcosmetic_smoketest`.
- [x] PASS: Local download saved each newest dump/checksum and local checksum verification succeeded in `backups/nk-db-daily/`, `backups/nk3-dental-smoketest-db-daily/`, and `backups/nk3-cosmetic-db-daily/`.
- [x] PASS: Codex daily backup verification automation now verifies/downloads all three targets and keeps latest 7 local dump sets per target.
- [ ] PENDING: Next scheduled run confirms the 12:00/12:15/12:30 Vietnam cron jobs create fresh dumps without manual fallback.

---

# TestSprite Plan: NK3 Cosmetic insert-only historical data recovery 2026-06-04
Feature/edit name: NK3 Cosmetic appointment/order/payment recovery plus destructive legacy migration guard
Branch: current local dirty branch. Live target was NK3 only: `https://tmv.2checkin.com`, DB `tcosmetic_smoketest`. No Dental production or `nk.2checkin.com` data write.

Changed URLs / API routes / data flow:
- Browser URL to verify: `https://tmv.2checkin.com/calendar` in Cosmetic LOB.
- Browser URL to verify: `https://tmv.2checkin.com/commission` CTV/admin tabs in Cosmetic LOB.
- API routes changed: none for runtime. Data changed by insert-only live DB merge into `dbo.appointments`, `dbo.saleorders`, `dbo.saleorderlines`, `dbo.payments`, `dbo.payment_allocations`, and `dbo.earnings`.
- Migration guard changed: `api/migrations/008_data_migration_from_tdental*.sql` now aborts unless destructive break-glass session settings are explicitly supplied.

Affected data flows:
- Cosmetic historical appointments should reappear without removing new June 3/4 appointments.
- Cosmetic service/payment/allocation/earnings history should exist again for restored historical rows.
- New CTV signups and admin-created CTV rows after the May 29 backup must remain present.

User roles:
- Admin/staff with Cosmetic LOB access.
- CTV admin/manager using commission and CTV hierarchy screens.

Happy paths:
- Cosmetic calendar shows historical appointments restored from before the June 3/4 wipe.
- Cosmetic still shows the 4 newer live appointments that existed before the merge.
- Cosmetic CTV/admin views still include new CTV rows created after the May 29 backup.
- Payments/service history pages can load restored saleorders, saleorderlines, payments, allocations, and earnings without 500s.

Edge cases:
- No duplicate appointment/order/payment UUIDs should be created.
- New partners/products created after the May 29 backup must not be overwritten.
- Legacy destructive `008_data_migration_from_tdental*` files must refuse to run without the break-glass guard.

Regressions:
- Dental and NK production data must remain untouched.
- `POST /api/ctv-public/bookings` and `/ctv/join` must still create new rows after recovery.
- CTV commission reversal/delete guards must still block paid-out commission mutations.

Setup data and login state:
- Target: `https://tmv.2checkin.com`, Cosmetic LOB.
- Current backup path: `backups/recovery-20260604-133742/`.
- Source backup path: `backups/ctvlegacy/full-hierarchy-20260529-153624/vps-tcosmetic_smoketest-before-full-hierarchy-repair-20260529-153624.dump`.

Execution verification:
- [x] PASS: Fresh current backups were taken before the live merge: local `backups/recovery-20260604-133742/`.
- [x] PASS: Rehearsal DB confirmed final expected counts before live write: appointments 72, saleorders 3953, saleorderlines 3952, payments 5587, payment_allocations 3848, earnings 5.
- [x] PASS: Live merge used insert-only transaction and copied 3953 saleorders, 5587 payments, 3952 saleorderlines, 68 appointments, 3848 payment_allocations, and 5 earnings.
- [x] PASS: Live post-merge counts match expected recovery counts and old probe rows missing from live = 0 for restored tables.
- [x] PASS: New rows were preserved: 119 partners and 11 products not in the May 29 backup remain present; new CTV-related partner rows were queried after merge.
- [ ] PENDING: Browser verify Cosmetic calendar historical appointments visible on `tmv.2checkin.com`.
- [ ] PENDING: Browser verify Cosmetic CTV/admin pages still show new CTV signups and no server errors.

---

# TestSprite Plan: NK3 public no-login signup + booking live 2026-06-03
Feature/edit name: ctv.thammyvientam.com layer — book + CTV signup without login, login → tmv
Branch: nk3-deploy. NK3 redeploy (api+web v0.32.101) + migration 054 on both smoketest DBs + public-booking companyid default fix (`api/src/routes/ctvPublic.js`) + `/welcome?book=1` deep-link (`Landing.tsx`).

Checks (all verified live against tmv.2checkin.com / ctv.thammyvientam.com):
- [x] PASS: Public API live - `/api/ctv-public/services` + `/ctv-lookup` now 200 (were 401 on stale build).
- [x] PASS: CTV signup no-login - `/ctv/join` renders the full form (name/phone/email/password + manual CTV referrer); `POST /ctv-public/join` → 201, persists with upline.
- [x] PASS: Booking no-login 1-click - `/welcome?book=1` auto-opens the orange "Giới thiệu khách" sheet; live CTV verify shows "CTV hợp lệ"; UI submit succeeds.
- [x] PASS: Booking persists - `POST /ctv-public/bookings` (cosmetic+dental) → 201 with company + ctv_id attribution (AP000001 verified, test rows cleaned).
- [x] PASS: companyid default - booking no longer 500s on null companyid; defaults to LOB primary company.
- [x] PASS: Login → tmv - landing "Đăng Nhập" (/ctv) → tmv.2checkin.com/login.

# TestSprite Plan: ctv.thammyvientam.com landing CTA hrefs fixed 2026-06-03
Feature/edit name: Landing buttons point to live SPA routes (signup/login/booking no longer dead)
Branch: nk3-deploy. VPS static-landing edit (`/var/www/ctv-thammyvientam-landing/index.html`) plus matching repo fix in `website/src/pages/Landing/Landing.tsx`. No API route, backend data, or database change.

Changed URLs / API routes / data flow:
- Static landing `ctv.thammyvientam.com/`: button hrefs `/booking`→`/welcome`, `/ctv/signup`→`/ctv/join`, `/ctv/portal`→`/ctv`. All non-root paths 301-forward to `tmv.2checkin.com`.
- React port `/welcome` (Landing.tsx): login CTA href `/ctv/portal`→`/ctv`.
- API routes changed: none. Data flow changed: none.

Checks:
- [x] PASS: Live landing serves corrected hrefs - `curl https://ctv.thammyvientam.com/` shows `/welcome`, `/ctv/join`, `/ctv`.
- [x] PASS: Each CTA resolves to a real SPA route - `/welcome`,`/ctv/join`,`/ctv` each 301→tmv.2checkin.com and return HTTP 200 (no catch-all `*`→`/` bounce).
- [x] PASS: Landing unit test - `npx vitest run src/pages/Landing/Landing.test.tsx` (3 passed), login href asserts `/ctv`.
- [ ] PENDING: In-browser click-through render of all 3 buttons on a logged-out session - blocked: WebBridge had no open browser window.

# TestSprite Plan: Mobile modal scroll and close-button fit 2026-06-02
Feature/edit name: CTV and calendar mobile dialogs keep close/actions reachable
Branch: nk3-deploy. Local-first website-only change; no API route, backend data, database sync, or VPS data replacement.

Changed URLs / API routes / data flow:
- URL changed: `/ctv` CTV portal. The `Giới thiệu khách` and `Tuyển CTV` sheets now keep the X close button in a non-scrolling header while the long form body scrolls inside the mobile viewport.
- URL changed: `/calendar` export date range modal. The modal now opens as a constrained mobile sheet with internal scroll and reachable close/cancel/apply controls.
- URL covered: `/calendar` quick-add appointment form remains on the shared `FormShell` pattern with fixed header/footer and internal body scroll.
- API routes changed: none.
- Data flow changed: none; submitted payloads and date strings are unchanged.

User roles:
- Authenticated CTV using `/ctv` on mobile Safari/Chrome.
- Staff/admin with appointment export permission using `/calendar`.
- Staff/admin with appointment add permission using `/calendar` quick-add.

Happy paths:
- Opening `/ctv` `Giới thiệu khách` on a phone viewport shows the X, date field, and submit flow; after scrolling down, the X remains visible.
- Opening `/ctv` `Tuyển CTV` on a phone viewport shows the X and submit flow; after scrolling down, the X remains visible.
- Opening `/calendar` export date range on a phone viewport shows the X, cancel, and apply controls while the date range body scrolls.
- Opening `/calendar` quick-add and its appointment date picker keeps the modal header close button and footer submit/cancel reachable.

Edge cases / regressions:
- Date pickers must remain in-flow and must not render native `type=date` inputs.
- The page behind an open modal must not be the only scroll container needed to reach modal controls.
- Vietnamese labels must fit in the modal header/buttons without overlapping icons.
- Bottom browser chrome/safe-area padding must not cover submit/apply/cancel buttons.

Setup/login state:
- Use a CTV login token for live `/ctv` verification, or Playwright route mocks for local modal-fit screenshots.
- Use a staff/admin user with `appointments.add`, `appointments.edit`, and `appointments.export` for live `/calendar`, or Playwright route mocks locally.
- Capture screenshot evidence for CTV refer sheet scrolled, CTV recruit sheet scrolled, calendar export modal, and calendar quick-add date picker.

TestSprite execution items:
- [ ] PENDING: Verify `/ctv` Refer Client sheet X remains visible after scrolling the form body on a mobile viewport.
- [ ] PENDING: Verify `/ctv` Recruit CTV sheet X remains visible after scrolling the form body on a mobile viewport.
- [ ] PENDING: Verify `/calendar` export date range modal keeps X/cancel/apply reachable on a mobile viewport.
- [ ] PENDING: Verify `/calendar` quick-add appointment date picker keeps header close and footer actions reachable on a mobile viewport.
- [ ] PENDING: Verify no native `type=date` input appears in the changed mobile modal flows.

---

# TestSprite Plan: Public CTV phone live verification 2026-06-02
Feature/edit name: Public booking and signup verify CTV phone numbers while typing
Branch: nk3-deploy. Local-first website/API change; no database sync, no VPS data replacement.

Changed URLs / API routes / data flow:
- URL changed: `/welcome` public booking modal. The `Số điện thoại CTV` field now live-verifies the typed phone before submit.
- URL changed: `/ctv/join` public signup page. The `CTV giới thiệu` upline phone field now live-verifies the typed phone before direct signup.
- API route added: `GET /api/ctv-public/ctv-lookup?phone=...` returns `{ exists, name }` for active, non-deleted CTV rows.
- Data flow changed: both public forms call the lookup while typing and block submit when the typed CTV phone is missing, still checking, or not found.
- Data flow invariant: the lookup is read-only and must not create appointments, partners, payments, earnings, payouts, sessions, or permissions.

User roles:
- Public visitor on `/welcome` with no login.
- Public visitor on `/ctv/join` with no login.
- Existing active CTV whose phone number is used for booking attribution or signup upline.

Happy paths:
- Typing a valid active CTV phone in `/welcome` booking shows a verified CTV status and allows public booking submit.
- Typing a valid active CTV phone in `/ctv/join` shows a verified upline status and allows direct CTV signup.
- Referral-link signup `/ctv/join?ref=CTV-XXXXXX` still works without typing an upline phone.

Edge cases / regressions:
- Unknown CTV phone in `/welcome` booking shows not-found status and blocks `POST /api/ctv-public/bookings`.
- Unknown upline CTV phone in `/ctv/join` shows not-found status and blocks `POST /api/ctv-public/join`.
- While the lookup is still checking, both submit buttons must surface a wait/verification message instead of writing.
- Existing customer phone lookup/name prefill in the booking sheet still works.

Setup/login state:
- No login required.
- Test data needed: one active `partners.is_ctv=true` CTV phone and one unknown phone.
- Capture screenshot evidence for both `/welcome` booking modal and `/ctv/join` with verified CTV status visible.

TestSprite execution items:
- [x] PASS: Verify `/welcome` booking CTV phone shows verified status for a known active CTV - local Playwright/Chrome screenshot `docs/live-artifacts/ctv-public-phone-verify/01-booking-ctv-phone-verified.png` shows `CTV hợp lệ: CTV Parent Verified`.
- [x] PASS: Verify `/welcome` booking blocks unknown CTV phone before `POST /api/ctv-public/bookings` - `npm --prefix website test -- src/components/ctv/CtvReferModal.test.tsx` covers the no-submit block and passed.
- [x] PASS: Verify `/ctv/join` upline CTV phone shows verified status for a known active CTV - local Playwright/Chrome screenshot `docs/live-artifacts/ctv-public-phone-verify/02-signup-upline-phone-verified.png` shows `CTV hợp lệ: CTV Parent Verified`.
- [x] PASS: Verify `/ctv/join` blocks unknown upline CTV phone before `POST /api/ctv-public/join` - `npm --prefix website test -- src/pages/CTV/JoinCtv.test.tsx` covers the no-submit block and passed.
- [x] PASS: Verify existing customer phone lookup/name prefill still works in public booking mode - `npm --prefix website test -- src/components/ctv/CtvReferModal.test.tsx` kept the public client lookup/name prefill regression passing.

---

# TestSprite Plan: CTV Tôi self profile and password settings 2026-06-02
Feature/edit name: `/ctv` Tôi tab self-service account settings
Branch: nk3-deploy. Local-first website/API change; no database sync, no VPS data replacement.

Changed URLs / API routes / data flow:
- URL changed: `/ctv` CTV portal, Tôi tab. Adds two account cards: display-name save and password change.
- API route changed: `GET /api/ctv/me` now returns the DB-backed authenticated CTV partner profile instead of only JWT echo data.
- API route added: `PATCH /api/ctv/me` accepts `{ name }`, trims/collapses whitespace, and updates only the authenticated CTV partner row by UUID in Dental/Cosmetic when present.
- API route added: `POST /api/ctv/me/password` accepts `{ currentPassword, newPassword }`, verifies the current bcrypt or gated legacy CTV password, and writes a new bcrypt `password_hash` to mirrored CTV rows.
- Data flow invariant: CTV self-service routes never accept another CTV id, never expose password hashes, and stay behind JWT auth + `ctv.dashboard.view` + `is_ctv`.

User roles:
- Authenticated CTV using the `/ctv` portal.
- Admin/staff should remain blocked from CTV self routes even with broad admin permissions because they are not `is_ctv`.

Happy paths:
- CTV opens `/ctv`, taps Tôi, sees existing profile/referral code plus editable `Tên hiển thị`.
- Saving a valid display name calls `PATCH /api/ctv/me`, shows success, and refreshes the visible greeting/profile name without reload.
- Filling current password, new password, and confirm password calls `POST /api/ctv/me/password`, clears password fields, and shows success.
- Existing language toggle, notification row, referral code copy, and logout still work.

Edge cases / regressions:
- Blank display name is rejected client-side and by API `P_NAME_REQUIRED`.
- Name longer than 120 characters returns `P_NAME_TOO_LONG`.
- Missing password fields are rejected client-side and by API `P_PASSWORD_REQUIRED`.
- New password shorter than 6 chars is rejected client-side and by API `P_PASSWORD_TOO_SHORT`.
- Mismatched confirmation is rejected client-side without API call.
- Wrong current password returns `P_CURRENT_PASSWORD_INVALID`.
- Non-CTV authenticated staff hitting self routes receive `S_CTV_ONLY`.
- Mobile view must not overlap cards, fields, fixed bottom nav, or Safari browser chrome.

Setup/login state:
- Need a valid CTV login token for `/ctv` interactive verification, or Playwright route mocks that provide CTV API responses.
- No database sync or production data replacement involved.
- Capture screenshot evidence of the Tôi tab with both account cards visible.

TestSprite execution items:
- [x] PASS: Verify `/ctv` Tôi tab screenshot shows display-name and password cards without overlap on mobile - Playwright/Chrome saved `docs/live-artifacts/ctv-self-settings/01-ctv-toi-account-settings.png`; overlap probe returned `[]`.
- [x] PASS: Verify display-name save updates visible profile/greeting without reload - Playwright mocked `PATCH /api/ctv/me`, screenshot shows `CTV Local Updated` plus `Đã cập nhật tên.`; Vitest asserts the API call and state update.
- [ ] PENDING: Verify blank display name blocks before API call.
- [x] PASS: Verify password submit calls API only when current/new/confirm are valid and matching - Playwright filled all three fields and saw `Đã đổi mật khẩu.`; Vitest asserts `POST /api/ctv/me/password` payload.
- [ ] PENDING: Verify wrong current password surfaces API error.
- [ ] PENDING: Verify non-CTV staff cannot read or mutate `/api/ctv/me`.

---

# TestSprite Plan: Public landing CTV signup with manual upline phone 2026-06-02
Feature/edit name: `/welcome` Đăng Ký CTV loads `/ctv/join` public signup with `CTV giới thiệu` phone field
Branch: nk3-deploy. Local-first website/API change; no database sync, no VPS data replacement.

Changed URLs / API routes / data flow:
- URL changed: `/welcome` public Tâm landing page. `Đăng Ký CTV` now navigates to `/ctv/join` instead of `/ctv/signup`.
- URL changed: `/ctv/join` public signup page. Direct visitors without `?ref=CTV-...` can use the form and must provide a final `CTV giới thiệu` phone field.
- API route changed: `POST /api/ctv-public/join` now accepts `{ code?, uplinePhone?, name, phone, email, password }`.
- Data flow changed: public signup resolves the new CTV's parent from `uplinePhone` when present, otherwise from referral `code`, then creates the new CTV under that resolved active CTV.
- Data flow invariant: public signup must not create appointments, saleorders, payments, earnings, payouts, or session/permission state.

User roles:
- Public visitor on `/welcome` with no login.
- New CTV registering through `/ctv/join`.
- Existing active CTV whose phone number is used as the upline.
- Admin/staff verifying the new CTV appears under the correct upline later.

Happy paths:
- `/welcome` renders the Tâm landing page and clicking `Đăng Ký CTV` loads `/ctv/join`.
- `/ctv/join` without a referral link shows the signup form and final `CTV giới thiệu` phone field instead of an invalid-link stop state.
- Submitting valid signup details plus a valid active CTV phone creates the new CTV under that upline.
- `/ctv/join?ref=CTV-XXXXXX` still resolves the referral-link upline and can submit without manually typing an upline phone.

Edge cases / regressions:
- Missing referral code and missing upline phone returns `U_UPLINE_REQUIRED` and creates no partner.
- Unknown upline phone returns `U_INVALID_UPLINE` and creates no partner.
- Duplicate new CTV phone/email still returns `U_DUPLICATE_PHONE`/`U_DUPLICATE_EMAIL`.
- Weak password still returns `U_WEAK_PASSWORD`.
- Existing public booking flow on `/welcome` remains unchanged: `Đặt Lịch Cho Khách` opens the no-login booking sheet.

Setup/login state:
- No login required for `/welcome` or `/ctv/join`.
- Test data needed: one active `partners.is_ctv=true` CTV phone for the desired upline.
- Capture screenshot evidence of `/ctv/join` showing the final `CTV giới thiệu` field before deploy sign-off.

TestSprite execution items:
- [x] PASS: Verify `/welcome` `Đăng Ký CTV` navigates to `/ctv/join` - local Playwright/Chrome asserted the CTA href and clicked through successfully.
- [x] PASS: Verify `/ctv/join` no-ref page shows the final `CTV giới thiệu` phone field and does not show an invalid-link stop state - screenshot captured at `docs/live-artifacts/ctv-public-signup/01-public-ctv-signup-upline-field.png`.
- [ ] PENDING: Verify public signup with a valid upline CTV phone creates the new CTV under that existing CTV.
- [ ] PENDING: Verify missing upline input blocks with `U_UPLINE_REQUIRED`.
- [ ] PENDING: Verify unknown upline phone blocks with `U_INVALID_UPLINE`.
- [ ] PENDING: Verify referral-link signup `/ctv/join?ref=CTV-XXXXXX` still works without a manually typed upline phone.

---

# TestSprite Plan: Public landing no-login CTV booking 2026-06-02
Feature/edit name: `/welcome` Đặt Lịch Cho Khách opens public CTV booking sheet
Branch: nk3-deploy. Local-first website/API change; no database sync, no VPS data replacement.

Changed URLs / API routes / data flow:
- URL changed: `/welcome` public Tâm landing page. `Đặt Lịch Cho Khách` now opens the booking sheet in-place instead of navigating to `/booking`.
- API routes added: `GET /api/ctv-public/client-lookup`, `GET /api/ctv-public/services`, `POST /api/ctv-public/bookings`.
- Data flow changed: public visitor enters customer phone first; lookup may populate an existing available customer name; visitor enters CTV phone; submit resolves an active CTV by phone and creates/reclaims the customer plus one appointment in the selected LOB.
- Data flow invariant: public booking must not create `saleorders`, `saleorderlines`, payments, earnings, or payouts.

User roles:
- Public visitor on `/welcome` with no login.
- CTV whose phone number is used for attribution.
- Admin/staff verifying the accepted client later in Dental or Cosmetic customer/appointment views.

Happy paths:
- `/welcome` renders the Tâm landing page and clicking `Đặt Lịch Cho Khách` opens the `Giới thiệu khách` modal without login.
- The modal shows the top notice `Type in the phone number to verify first.`
- Customer phone field appears before name and receives focus first.
- Existing available customer phone lookup fills the name field.
- Public submit with valid CTV phone creates a booking through `POST /api/ctv-public/bookings`.
- Selected service stays on `appointments.productid`; omitted service uses Referral Start when configured.

Edge cases / regressions:
- Unknown CTV phone returns `P_CTV_NOT_FOUND` and does not create any rows.
- Active claim owned by another CTV returns `B_CLIENT_CLAIMED`.
- Claimed-by-same CTV lookup shows `claimedByMe` and still allows booking.
- Existing partner accepted through public booking becomes `customer=true`.
- Signup/login CTAs on `/welcome` remain `/ctv/signup` and `/ctv/portal`.
- Authenticated `/ctv` refer modal still works without requiring the CTV phone field.

Setup/login state:
- No login required for `/welcome`.
- Test data needed: one active `partners.is_ctv=true` CTV phone and at least one available existing customer phone in the chosen LOB.
- Capture screenshot evidence of the opened public booking sheet before deploy sign-off.

TestSprite execution items:
- [x] PASS: Verify `/welcome` screenshot with landing page and booking modal open - local Chrome/Playwright captured `docs/live-artifacts/ctv-public-booking/01-welcome-public-booking-modal.png`.
- [x] PASS: Verify customer phone is first and notice text is visible - screenshot shows `Type in the phone number to verify first.`, first form label `Số điện thoại`, CTV phone field, and submit button.
- [ ] PENDING: Verify name autofills after an available phone lookup using live/local API test data.
- [ ] PENDING: Verify public booking submit with valid CTV phone creates only partner/customer + appointment rows.
- [ ] PENDING: Verify unknown CTV phone blocks with `P_CTV_NOT_FOUND`.
- [ ] PENDING: Verify another-CTV active claim blocks with `B_CLIENT_CLAIMED`.
- [ ] PENDING: Verify authenticated `/ctv` refer modal has no CTV phone field and still submits through `/api/ctv/bookings`.

---

# TestSprite Plan: ctv.thammyvientam.com landing retained + NK3 forwarding 2026-06-02
Feature/edit name: CTV public domain nginx split routing
Branch: nk3-deploy. Live VPS nginx/static-file change; no database sync, no backend data writes, no website bundle rebuild.

Changed URLs / API routes / data flow:
- URL retained: `https://ctv.thammyvientam.com/` remains the public Tâm landing page.
- Static URL retained: `https://ctv.thammyvientam.com/static/*` is served directly by nginx from `/var/www/ctv-thammyvientam-landing` so the logo/favicon assets load without the old CTV app upstream.
- URLs changed: all non-root `ctv.thammyvientam.com` paths now 301 to NK3 `https://tmv.2checkin.com$request_uri`, including `/booking`, `/ctv/signup`, `/ctv/portal`, and arbitrary deep links.
- API routes changed: none.
- Data flow changed: public browser navigation only; no CTV app API, TGClinic API, or database writes are introduced.

User roles:
- Public visitor clicking the landing page CTAs.
- CTV visitor using the login/signup links.
- Admin/staff not affected unless they manually visit the public CTV host.

Happy paths:
- Opening `https://ctv.thammyvientam.com/` still shows the Tâm landing page with logo and three CTA buttons.
- Landing page static assets load from `ctv.thammyvientam.com/static/*`.
- Clicking `Đặt Lịch Cho Khách` forwards from `/booking` to `https://tmv.2checkin.com/booking`.
- Clicking `Đăng Ký CTV` forwards from `/ctv/signup` to `https://tmv.2checkin.com/ctv/signup`.
- Clicking `Đăng Nhập` forwards from `/ctv/portal` to `https://tmv.2checkin.com/ctv/portal`.
- Query strings are preserved, e.g. `/booking?source=verify` -> `https://tmv.2checkin.com/booking?source=verify`.

Edge cases / regressions:
- `/` and `/index.html` must not forward away from the landing page.
- `/static/images/tam-logo-group.png` must not forward to NK3.
- HTTPS certificate remains valid for `ctv.thammyvientam.com`.
- `nginx -t` passes before reload.
- NK3 target `https://tmv.2checkin.com` remains reachable.

Setup/login state:
- No login required for the `ctv.thammyvientam.com` landing and redirect checks.
- Use live browser/screenshot verification after nginx reload.

TestSprite execution items:
- [x] PASS: Verify `https://ctv.thammyvientam.com/` screenshot still shows the Tâm landing page - Playwright screenshot `output/playwright/ctv-thammyvientam-forward-20260602/01-landing-static.png`.
- [x] PASS: Verify `https://ctv.thammyvientam.com/static/images/tam-logo-group.png?v=1778133986` returns 200 image content - curl returned `200 image/png 249558`.
- [x] PASS: Verify `/booking?source=verify` returns 301 to `https://tmv.2checkin.com/booking?source=verify` - curl returned exact Location; browser then reached NK3 `/login` because the app route is protected.
- [x] PASS: Verify `/ctv/signup` returns 301 to `https://tmv.2checkin.com/ctv/signup` - curl returned exact Location.
- [x] PASS: Verify `/ctv/portal` returns 301 to `https://tmv.2checkin.com/ctv/portal` - curl returned exact Location.
- [x] PASS: Capture browser screenshot evidence for the landing page and forwarded NK3 route - screenshots `01-landing-static.png` and `02-forwarded-booking-nk3-login.png`.

---

# TestSprite Plan: Shared no-overlap DatePicker calendar controls 2026-06-02
Feature/edit name: Mobile-safe shared DatePicker redesign across CTV, calendar, reports, payments, customers, and service forms
Branch: nk3-deploy. Local-first frontend verification; no backend data writes and no VPS/database sync involved.

Changed URLs / API routes / data flow:
- URL changed: `/ctv` CTV portal refer-client sheet (`Giới thiệu khách`).
- URLs changed: `/calendar` quick-add appointment modal and export custom date-range modal.
- URL changed: `/reports/revenue` date filters.
- Form surfaces changed: payment/deposit transaction-date forms, customer health-check upload date form, and patient service form date control.
- Shared UI changed: `website/src/components/ui/DatePicker.tsx` now opens in normal document flow and uses a Monday-first grid.
- API routes changed: none.
- Data flow changed: none; existing form state strings and API payload fields are preserved, including `POST /api/ctv/bookings` receiving the same `date` string defaulting to today's `Asia/Ho_Chi_Minh` date when the sheet opens.

User roles:
- CTV user on `/ctv`.
- Authenticated admin/staff using calendar, reports, payment/deposit, customer profile, and service forms.

Happy paths:
- Tapping `Ngày hẹn` opens the app calendar instead of Safari/iOS native `type=date`.
- Opening the calendar pushes `Lĩnh vực`, `Dịch vụ`, notes, and the submit button down instead of covering them.
- Selecting a date updates the displayed `dd/mm/yyyy` value and closes the panel.
- Submitting with the default date still works without manually touching the calendar.
- `/calendar` export custom date-range and quick-add appointment date pickers keep footer/apply buttons visible.
- `/reports/revenue` date filters open without the feedback hint covering the modal area.

Edge cases / regressions:
- The picker remains Monday-first in Vietnamese and English.
- Date fields in appointment, service, payment, deposit, reports, customer health-check upload, and CTV forms do not use an overlapping absolute panel or native mobile date input.
- Feedback login hint does not render over modal/dialog/date-picker states.
- Phone lookup, LOB selection, optional service, notes, and `B_CLIENT_CLAIMED` blocking remain unchanged.
- Mobile Safari, mobile Chrome, tablet, and desktop layouts must not show clipped controls or overlapping text.

Setup/login state:
- Use a CTV-authenticated `/ctv` session on local `http://127.0.0.1:<vite-port>/ctv` or live `https://tmv.2checkin.com/ctv` after deployment.
- For admin/staff surfaces, use an authenticated session on local `http://127.0.0.1:<vite-port>/` or live `https://tmv.2checkin.com/` after deployment.
- Capture mobile screenshot evidence of the refer-client sheet and representative admin date controls with the calendar open.

TestSprite execution items:
- [x] PASS: Unit coverage locks the no-native-date-input CTV sheet and in-flow custom picker - `npm --prefix website test -- src/components/ui/DatePicker.test.tsx src/components/ctv/CtvReferModal.test.tsx` (8 passed).
- [x] PASS: Production source scan found no remaining native date inputs - `rg -n "type=\"date\"|type='date'" website/src --glob '!**/*.map'` returned only test assertions.
- [x] PASS: Browser screenshot of `/ctv` mobile refer-client sheet with `Ngày hẹn` calendar open and no overlap - `docs/live-artifacts/ctv-date-picker/01-ctv-refer-calendar-open.png`.
- [x] PASS: Browser screenshot of `/reports/revenue` date filter with custom calendar open and no feedback overlap - `docs/live-artifacts/ctv-date-picker/02-reports-revenue-date-filter-open.png`.
- [x] PASS: Browser screenshot of `/calendar` export date-range modal with custom calendar open and Apply button reachable - `docs/live-artifacts/ctv-date-picker/03-calendar-export-date-range-open.png`.
- [x] PASS: Browser screenshot of `/calendar` quick-add appointment date picker with submit footer reachable - `docs/live-artifacts/ctv-date-picker/04-calendar-quick-add-date-open.png`.

---

# TestSprite Plan: CTV portal orange motion pill header 2026-06-02
Feature/edit name: `/ctv` compact orange menu + scroll-hide motion header
Branch: nk3-deploy. Local-first frontend verification; no backend data writes and no VPS/database sync involved.

Changed URLs / API routes / data flow:
- URL changed: `/ctv` CTV portal shell only.
- API routes changed: none.
- Data flow changed: none; existing `GET /api/ctv/referrals`, `GET /api/ctv/commission-summary`, `GET /api/ctv/me`, and `GET /api/ctv/network` calls are unchanged.
- UI behavior: the orange header is now a smaller rounded pill; `Giới thiệu khách` and `Tuyển CTV` are grouped inside a compact pill action menu; the header hides on downward scroll and returns on upward scroll or focus.

User roles:
- CTV user on `/ctv`.

Happy paths:
- First load shows the compact orange pill header with TG Clinic, Cổng CTV, greeting, language, notifications, and both action buttons.
- Scrolling down moves the header out of view to free mobile content space.
- Scrolling up returns the header without changing the active bottom tab or loaded CTV data.
- Tapping `Giới thiệu khách` still opens the refer-client sheet; tapping `Tuyển CTV` still opens the recruit modal.

Edge cases / regressions:
- Reduced-motion users still get a visible, usable header without animated movement.
- Header focus reveals the header so keyboard/focus users do not lose controls.
- Vietnamese and English labels remain present and do not clip in the pill buttons.
- Bottom navigation stays fixed and the single `Theo dõi` tab remains unchanged.

Setup/login state:
- Use a CTV-authenticated `/ctv` session on local `http://127.0.0.1:<vite-port>/ctv` or live `https://tmv.2checkin.com/ctv` after deployment.
- Capture mobile screenshot evidence for expanded, hidden-after-scroll, and returned-after-scroll states.

TestSprite execution items:
- [x] PASS: Verify `/ctv` first-load compact pill header on a mobile viewport with screenshot evidence - local Playwright/Chrome mocked CTV session, `docs/live-artifacts/ctv-header-motion/01-expanded.png`.
- [x] PASS: Verify downward scroll hides the header without moving or duplicating bottom navigation - local Playwright/Chrome mocked CTV session, `docs/live-artifacts/ctv-header-motion/02-hidden-on-scroll-down.png`.
- [x] PASS: Verify upward scroll returns the header and both action buttons remain clickable - local Playwright/Chrome mocked CTV session, `docs/live-artifacts/ctv-header-motion/03-returned-on-scroll-up.png`; action button accessibility covered by `CtvDashboard.test.tsx`.
- [x] PASS: Verify EN/VI labels and the language dropdown still render under the compact header - `npm --prefix website test -- src/pages/CTV/CtvDashboard.test.tsx` covered English shell, Vietnamese shell, and below-header language dropdown.

---

# TestSprite Plan: NK3 CTV eligibility bar + Doctor→CTV breadcrumb 2026-06-02
Feature/edit name: 6-month CTV-link countdown bar (`CtvLinkBar`) + Doctor→CTV breadcrumb (`DoctorCtvTrail`)
Branch: nk3-deploy. Local verification on 5433 `tdental_demo` (+ `tcosmetic_demo`); never run against real NK/nk2.

Changed URLs / API routes / data flow:
- DB: new `dbo.appointments.ctv_id` (migration 054) + idempotent anchor backfill; persisted on appointment create/update and `POST /api/ctv/bookings`.
- Read paths now expose real `appointments.ctv_id` + `ctv_name`, and `GET /api/SaleOrders/lines` exposes per-service `so.ctv_id` + `ctv_name`.
- `GET /api/Partners/:id` & `/Partners/resolve` `referralClaim` gains `anchorAt` + `eligible` (via `getCtvLinkStatus`).
- `GET /api/ctv/referrals` gains `link_expires_at`, `link_anchor_at`, `link_active`, `eligible`, `linked_ctv_name` (latest-expiring window wins across LOBs).
- Anchor rule: latest non-cancelled CTV-bearing appointment OR service (service wins ties); `expiresAt = anchor + 6 months`; computed on read, non-destructive.

User roles: Admin (customer profile bar + breadcrumb); CTV (portal card bar + eligibility banner).

Happy path:
- A referred client with a CTV-bearing event in the last 6 months → green/amber bar with "≈N tháng/tuần/ngày còn lại"; appointment/service rows show `BS. … › CTV: …`.
- A client whose latest CTV-bearing event is older than 6 months → grey bar "Đã hết hạn — khách có thể gắn CTV khác"; portal card shows the eligibility banner with the journey dimmed.

Edge cases / regressions to check:
- No CTV-bearing event but `referred_by_ctv_id` set → linked, no anchor, not eligible (no countdown).
- Appt vs service tie on date → service wins and names its CTV.
- Cancelled appointments / soft-deleted services ignored; paid AND unpaid services both count.
- Cross-LOB: latest-expiring active window wins; eligible only when every LOB window is inactive.
- Invariants: no change to commission %, earnings rows, payouts, or `referred_by_ctv_id` outside existing assign/claim paths.

Test plan (automated + live):
- [x] PASS: Jest `computeCtvLink` + `getReferralClaimStatus` delegation + `getPartnerById`/`resolveHandler` referralClaim — 22 + 6 green; full API suite 917 pass (3 pre-existing, DB-fixture failures unrelated, proven at baseline 6a4674e1).
- [x] PASS: Vitest `CtvLinkBar` + `DoctorCtvTrail` (9) and 7 affected customer/ctv suites (48) — all green; `tsc --noEmit` clean; `npm run build` green.
- [x] PASS: Live Playwright on http://127.0.0.1:5175 (t@clinic.vn) — customer `0de4e55d…` profile shows the expired `ctv-link-bar-expired` + "CTV Demo Referrer"; appointment row shows the `doctor-ctv-trail` `CTV: CTV Demo Referrer` pill. Screenshots in `website/docs/live-artifacts/`.
- [ ] PENDING: Live CTV-portal card bar + eligibility banner — needs a CTV account (only admin creds available); covered by unit (`ReferralFlipCard`) + `/ctv/referrals` API for now.
- [ ] PENDING: Verify an ACTIVE (green/amber, not expired) bar live once a client has a CTV-bearing event within 6 months (all current demo anchors are 2023–2025 → expired).

---

# TestSprite Plan: NK3 Payment DELETE/VOID earnings reversal (money integrity) 2026-06
Feature/edit name: Payment delete and void now reverse v2 earnings attribution (prevents phantom commissions after delete)
Branch: nk3-deploy only (local 5433 tdental_demo + tcosmetic_demo demo data for NK3). Never applied to real NK or nk2.

Changed URLs and API routes:
- DELETE /api/Payments/:id (now calls reverseOnRefund inside tx)
- POST /api/Payments/:id/void (now calls reverseOnRefund inside tx)
- No new routes; existing endpoints now produce symmetric negative earnings rows (like refund path).

Affected data flows:
- Before: delete/void reversed only residuals/allocations; positive earnings rows for the payment remained → phantom commissions visible in CTV downline, admin Commission tab, potentialOverride, and future payouts.
- After: both paths call commissionEngine.reverseOnRefund (inserts negative rows for every prior positive earnings row for that payment_id). Net = 0 for the payment. Original positive rows left untouched (audit). Negatives reference the payment (even if hard-deleted).
- Only on nk3-deploy + local NK3 demo DBs during verification.

User roles: Admin with payment.void (the role that could previously "delete" payments).

Happy path:
- Admin creates payment on a referred client → earnings row(s) created (source ctv/salestaff/etc., amount = line * product rate).
- Admin deletes or voids the payment → negative reversal row(s) appear for the same recipients/sources; net attribution for that payment = 0.
- CTV downline views and reports no longer show phantom from the deleted payment.

Edge cases / regressions to check:
- Delete a payment that had MLM overrides (L1-L4) → all levels get matching negatives.
- Delete a payment with no prior earnings → no-op (no error).
- Delete after partial payout (some earnings have payout_id) → still insert negatives for the unpaid portion (current reverse does all; refine later if needed).
- Void vs hard delete produce equivalent net-zero effect.
- LOB isolation (dental vs cosmetic) preserved via req.lob + txClient.

Test plan (manual + automated):
- [x] PASS: Added contract test in commissionEngine.test.js (NK3 reversal section) — 854 tests pass in the suite.
- [ ] PENDING: Browser verification on http://127.0.0.1:5175 (t@clinic.vn / 123123) — create payment on a client with referred_by_ctv_id or salestaffid, confirm earnings in DB, delete via admin Payment UI (or API), re-query earnings for net zero on that payment_id.
- [ ] PENDING: Run the NK3-only cleanup script (scripts/nk3-only/fix-commission-attribution-2026-06.sql) against local 5433 only; re-check the specific "Trung kien" downline view in admin /commission CTV tab.
- [ ] PENDING: Confirm no earnings reversal call on non-NK3 branches/environments (guarded by branch + comments).

# TestSprite Plan: NK3 CTV appointment-only booking and name autofill 2026-06-01

Feature/edit name: CTV refer-client available-name autofill and appointment-only booking

Changed URLs and API routes:
- `/ctv` refer-client booking sheet (`Giới thiệu khách`)
- `GET /api/ctv/client-lookup?phone=&lob=`
- `POST /api/ctv/bookings`

Affected data flows:
- Phone lookup still reads the selected Dental/Cosmetic database only.
- If lookup returns an existing available client with a name, the modal pre-fills the name input without overwriting a manually typed name.
- If lookup returns a client actively claimed by another CTV, the modal does not pre-fill the name and submit remains blocked by `B_CLIENT_CLAIMED`.
- `POST /api/ctv/bookings` creates/reclaims the client, marks accepted existing partners `customer=true`, and creates a `dbo.appointments` row only.
- Selected service stays as `appointments.productid`; when no service is selected, the active configured Referral Start product is used as appointment metadata. Booking must not create `dbo.saleorders`, `dbo.saleorderlines`, or a Referral Start/service card.
- Referral-claim availability remains protected by using the booking appointment as the claim anchor.

User roles:
- CTV user on `/ctv`.
- Admin/customer staff verifying the resulting client and appointment in the selected LOB.

Happy paths:
- Cosmetic available existing phone auto-fills the name and submits without retyping the client name.
- Booking returns `201 { clientId, appointmentId }`, creates one appointment, and does not create a service card.
- Booking with no selected service creates an appointment tagged with Referral Start when the selected LOB has `commission_settings.referral_start_product_id` configured.
- Existing accepted partner is still searchable in admin Customers because `customer=true` is set.

Edge cases:
- Active claim owned by another CTV does not auto-fill and still returns `B_CLIENT_CLAIMED`.
- A manually typed name is not overwritten by a later lookup response.
- Unknown or cross-LOB `productId` is dropped to null and the appointment still succeeds without a service card.

Regressions:
- Date still defaults to today's `Asia/Ho_Chi_Minh` date.
- Dental and Cosmetic remain LOB-isolated.
- CTV journey stage must not advance to serviced from a booking-only appointment.
- Commission claim blocking still prevents another CTV from taking an active booking.

Setup/login state:
- Use NK3/TMV live CTV login state on `https://tmv.2checkin.com/ctv`.
- Use an existing available Cosmetic phone for name-prefill proof; avoid submitting the user's real test booking before they retry.
- Capture screenshot evidence for the autofilled name state and, after user-approved booking, verify appointment exists without a saleorder/service card.

TestSprite execution items:
- [ ] PENDING: Verify an available existing Cosmetic phone auto-fills the name field on `/ctv`.
- [ ] PENDING: Verify a phone actively claimed by another CTV does not auto-fill the name and submit shows the claimed-client error.
- [ ] PENDING: Submit a test booking with no selected service and verify exactly one appointment row is created with Referral Start product metadata and no saleorder/saleorderline service card.
- [ ] PENDING: Verify the client remains searchable in admin Customers for the selected LOB after booking.

---

# TestSprite Plan: NK3 CTV refer-client default date 2026-06-01

Feature/edit name: CTV refer-client appointment date defaults to today

Changed URLs and API routes:
- `/ctv` refer-client booking sheet (`Giới thiệu khách`)
- `POST /api/ctv/bookings` (same payload contract, now reached because the required `date` field is prefilled)

Affected data flows:
- The CTV modal initializes `date` to today's `Asia/Ho_Chi_Minh` calendar date when it opens.
- Submitting a valid name/phone/LOB without manually touching the date input sends that default date to `POST /api/ctv/bookings`.

User roles:
- CTV user on `/ctv`.

Happy paths:
- Open the refer-client sheet on mobile Safari and verify the `Ngày hẹn` field displays today's date.
- Enter `thuan test`, `0123123123`, select Cosmetic, add a note, and submit without changing the date; booking should proceed instead of showing `Vui lòng nhập đầy đủ thông tin`.

Edge cases:
- If a user clears the date manually, the existing required-field validation should still block submit.
- Reopening the sheet after a successful booking should show a fresh today default.

Regressions:
- Phone lookup and `B_CLIENT_CLAIMED` blocking still work.
- Optional service and note fields still submit when present.

Setup/login state:
- Use NK3/TMV live CTV login state on `https://tmv.2checkin.com/ctv`.
- Capture screenshot evidence of the date-filled sheet and the successful/accepted booking state.

TestSprite execution items:
- [ ] PENDING: Verify mobile `/ctv` sheet opens with today's date visible in `Ngày hẹn`.
- [ ] PENDING: Submit the Cosmetic `thuan test / 0123123123` booking without manually selecting a date and verify no required-field error appears.
- [ ] PENDING: Verify a manually cleared date still blocks with `Vui lòng nhập đầy đủ thông tin`.

---

# TestSprite Plan: NK3 CTV booking accepted customer search 2026-06-01

Feature/edit name: CTV referral booking makes accepted existing clients searchable in admin Customers

Changed URLs and API routes:
- `/ctv` refer-client booking sheet (`Giới thiệu khách`)
- `/customers?lob=cosmetic`
- `/customers?lob=dental`
- `GET /api/ctv/client-lookup?phone=&lob=`
- `POST /api/ctv/bookings`
- `GET /api/Partners?search=`
- `GET /api/cosmetic/Partners?search=`

Affected data flows:
- `POST /api/ctv/bookings` resolves an existing partner by `clientId` or phone in the selected LOB.
- Accepted existing partner rows are updated with `customer = true` and `referred_by_ctv_id = current CTV`.
- Admin Customers search continues to filter `dbo.partners.customer = true`, so the portal-accepted client becomes visible without creating a duplicate partner identity.
- Appointment creation remains in the selected Dental/Cosmetic database only; booking must not create a Referral Start/service card.

User roles:
- CTV user on `/ctv` can submit the referral booking.
- Admin or customer staff with `customers.view` can search `/customers` in the matching LOB.

Happy paths:
- Cosmetic: book/reclaim existing phone `0123123123` as a CTV and verify `/customers?lob=cosmetic` finds `thuan test` by name and phone.
- Dental: same path works for a Dental existing partner without crossing into Cosmetic data.
- New clients still insert with `customer=true`.

Edge cases:
- Existing employee/staff partner accepted as a client keeps the same `partners.id` and becomes `customer=true`.
- Active claim owned by another CTV still returns `B_CLIENT_CLAIMED` and does not update the row.
- Unknown or cross-LOB `productId` is dropped to null and the appointment is still created.

Regressions:
- CTV users still cannot enter admin routes.
- Admin Customers search remains accent-insensitive and LOB-isolated.
- No duplicate partner row is created for the same accepted existing person.

Setup/login state:
- Use NK3/TMV live only after local verification and deployment.
- Use a Cosmetic CTV account for `/ctv`; use admin login for `/customers?lob=cosmetic`.
- Capture screenshot evidence of the CTV accepted-booking state and the admin Customers search result.

TestSprite execution items:
- [ ] PENDING: Submit or replay a CTV booking for an existing unclaimed Cosmetic partner and verify `POST /api/ctv/bookings` returns 201.
- [ ] PENDING: Verify the same client appears in `/customers?lob=cosmetic` search by name and by phone, with screenshot evidence.
- [ ] PENDING: Verify an active claim owned by another CTV still blocks with `B_CLIENT_CLAIMED`.
- [ ] PENDING: Verify Dental `/customers?lob=dental` does not show the Cosmetic-only client.

---

# TestSprite Plan: NK Employee Feedback Revenue Source + Customer Profile Save 2026-06-01

Feature/edit name: Revenue-by-source card on Revenue report and legacy DOB validation fix for customer profile save

Changed URLs and API routes:
- `/reports/revenue`
- `/customers/:id`
- `POST /api/Reports/revenue/by-source`
- `PUT /api/Partners/:id`
- `PUT /api/cosmetic/Partners/:id` (same shared contract behavior)

Affected data flows:
- Revenue source breakdown uses recognized posted service revenue from payment allocations plus direct posted `payment_category = 'payment'` receipts with no allocation rows.
- Source attribution uses `COALESCE(saleorders.sourceid, partners.sourceid)` and keeps an unassigned row for paid receipts with no source.
- Customer profile create/update validation normalizes migrated blank/zero DOB parts to null before Zod validation.

User roles:
- Admin or reporting staff with `reports.view`.
- Admin or clinic staff with `customers.edit`.

Happy paths:
- Open `/reports/revenue` and verify `Doanh thu theo nguồn` renders source bars from `POST /api/Reports/revenue/by-source`.
- Export the source card CSV and verify source name, order count, and collected amount match the visible card.
- Open migrated customer `/customers/c271050f-6f03-45ab-b7e6-b419008393be`, edit a non-DOB field, and save without `Number must be greater than or equal to 1`.

Edge cases:
- Source-specific sale order source wins over customer fallback source.
- Unallocated direct receipts with no source appear under `Chưa gán nguồn`.
- DOB day/month values above valid ranges still fail validation.
- Empty string, `0`, and `"0"` DOB fields normalize to null on create/update.

Regressions:
- Existing revenue summary, trend, branch, doctor, category, cash-flow, and export controls still load.
- Customer source remains hidden on the customer profile assignment card/edit form.
- Customer phone overlap rules and LOB-aware cosmetic partner routing remain unchanged.

Setup/login state:
- Use NK admin login (`t@clinic.vn`) for production verification after deploy.
- Use a customer with migrated DOB zero/blank values; reported example was `/customers/c271050f-6f03-45ab-b7e6-b419008393be`.

TestSprite execution items:
- [ ] PENDING: Verify `/reports/revenue` shows `Doanh thu theo nguồn` with nonblank source rows for a date range with payments.
- [ ] PENDING: Verify `POST /api/Reports/revenue/by-source` excludes deposits, refunds, deposit usage, and voided payments.
- [ ] PENDING: Verify unassigned paid receipts appear as `Chưa gán nguồn`, not silently dropped.
- [ ] PENDING: Verify customer profile save succeeds when legacy DOB fields are blank/0 and only unrelated fields are edited.
- [ ] PENDING: Verify invalid real DOB values, such as day 32 or month 13, still show a validation error.

---

# TestSprite Plan: NK3 CTV MLM commission (Dental + Cosmetic) 2026-05-31

Feature/edit name: Verify CTV MLM override commission levels 1–2 for both Dental and Cosmetic LOB

Changed URLs and API routes:
- No runtime code or live routes were changed in this task (local DB + engine verification only).
- Optional (if validating via UI/API): `GET /api/Ctvs`, `GET /api/cosmetic/Ctvs`, `GET /api/ctv/commission-summary`, `GET /api/cosmetic/ctv/commission-summary` (if present in the deployment), and any admin earnings list surface.

Affected data flows:
- `dbo.partners.referred_by_ctv_id` as the CTV upline/downline pointer (CTV → upline).
- `dbo.partners.referred_by_ctv_id` on the CUSTOMER partner as the direct referrer pointer (customer → leaf CTV).
- `api/src/services/commissionEngine.createEarningsForPayment()` writing `dbo.earnings`:
  - Level 0 (direct earner) = leaf CTV.
  - Level 1 (upline override) = mid CTV.
  - Level 2 (upline override) = top CTV.
- `dbo.commission_level_config` share_percent used for level overrides (L1=14.5%, L2=7.3%).
- `dbo.products.commission_rate_percent` used to compute the base direct commission (per-product rate).

User roles:
- Admin (for UI validation): can access `/commission` and view CTV earnings.
- CTV users are not required for this verification (we validate earnings writes).

Happy paths:
- Dental DB: creating a paid service for a customer referred by leaf CTV creates 3 earnings rows (L0/L1/L2) with correct amounts.
- Cosmetic DB: same behavior in `tcosmetic_demo`.

Edge cases:
- If `commission_level_config` disables a level (`enabled=false`) or sets share to 0, that level must not receive an override row.
- Earnings are created on payment collection (not just “service created”), so tests must include a payment event.
- Referral-claim gating: first payment should still attribute because the claim becomes active based on the payment_date anchor.

Regressions:
- Direct (level 0) earning amount remains `service_amount × product.commission_rate_percent` (not reduced by MLM shares).
- Override rows are additive and idempotent per (payment_id, service_line_id, recipient, level).

Setup/login state:
- Local-first verification was executed against local Postgres on `127.0.0.1:5433`:
  - Dental DB: `tdental_demo`
  - Cosmetic DB: `tcosmetic_demo`
- Deterministic test IDs used (same in both DBs):
  - CTV top: `11111111-1111-4111-8111-111111111111`
  - CTV mid: `22222222-2222-4222-8222-222222222222`
  - CTV leaf: `33333333-3333-4333-8333-333333333333`
  - Customer: `44444444-4444-4444-8444-444444444444`
  - Product: `55555555-5555-4555-8555-555555555555` (`commission_rate_percent=24`)
  - Order: `66666666-6666-4666-8666-666666666666`
  - Order line: `77777777-7777-4777-8777-777777777777` (`pricetotal=1,000,000`)
  - Payment: `88888888-8888-4888-8888-888888888888` (`payment_category='payment'`, `amount=1,000,000`)

Checks:
- [x] PASS: Local dental override amounts — base commission 240,000; L1 mid 34,800; L2 top 17,520; 3 rows created for payment `8888…` in `tdental_demo.dbo.earnings`.
- [x] PASS: Local cosmetic override amounts — same amounts and 3 rows created for payment `8888…` in `tcosmetic_demo.dbo.earnings`.
- [x] PASS: Focused Jest (local) — `JWT_SECRET=test-secret npm --prefix api test -- --runInBand src/services/__tests__/commissionEngine.test.js` (green; note: Jest prints an open-handles warning but exits 0).
- [x] PASS: Live NK3 verification (controlled writes) — created 3-level chains + 1 paid service in BOTH LOBs and verified earnings via `GET /api/Earnings?lob=...&ctvId=...` + screenshots. Evidence JSON: `artifacts/live-checks/nk3-ctv-commission-20260531T185857.json`; screenshots: `artifacts/screenshots/nk3-ctv-commission-20260531T185850-01-after-login.png` + `artifacts/screenshots/nk3-ctv-commission-20260531T185850-02-commission-page.png`.

# TestSprite Plan: TMV NK3 service catalog + feedback fixes 2026-05-31

Feature/edit name: Cosmetic employee service catalog visibility and unresolved feedback fixes

Changed URLs and API routes:
- Verified URL: `https://tmv.2checkin.com/service-catalog`
- Changed API route: `GET /api/Products` and `/api/cosmetic/Products`
- Changed API route: `POST /api/ProductCategories`, `PUT /api/ProductCategories/:id`, `DELETE /api/ProductCategories/:id` and cosmetic mirrors
- Changed API route: `POST /api/Reports/doctors/performance` and `/api/cosmetic/Reports/doctors/performance`

Affected data flows:
- Cosmetic service catalog list filtering for location-scoped employees.
- Cosmetic product category create/edit/delete requests and their DB routing.
- Doctors performance report branch/date filtering.
- Feedback triage for pending manual and auto-captured TMV/NK3-only threads.

User roles:
- Cosmetic employee `0123123123` / `thuan test` with `lob_scope=["cosmetic"]`, Assistant tier, one assigned cosmetic location.
- Admin `t@clinic.vn` for feedback inbox and reports verification.

Happy paths:
- A single-location cosmetic employee can open `/service-catalog`, select `Công nghệ cao`, and see active global cosmetic services.
- Admin can create/edit/delete Cosmetic service groups without `query is not defined` or dental DB writes.
- Admin can open `/reports/doctors` and the doctors performance endpoint returns 200 for a branch/date filter.

Edge cases:
- Product rows with `companyid IS NULL` are global and must remain visible under a selected branch filter.
- Product rows assigned to a different branch must not leak under the selected branch filter.
- Category mutations under `/api/cosmetic/*` must use request-scoped DB routing, not the dental legacy query.
- Doctors report SQL joins both doctors and appointments, so company filters must stay qualified.

Regressions:
- Dental `/api/Products?companyId=...` keeps branch-specific products and global products visible.
- Cosmetic `/api/cosmetic/Products?companyId=...` does not leak dental rows.
- Category sidebar counts still match active global products.
- Revenue report endpoints stay 200 while doctors report moves from 500 to 200.

Setup/login state:
- Live target: `https://tmv.2checkin.com` only (NK3). Do not touch `nk.2checkin.com` or `nk2.2checkin.com`.
- Employee login: `0123123123` with current password.
- Admin login: `t@clinic.vn` with current password.

Checks:
- [x] PASS: Root cause probe — employee `thuan test` has one location (`Thẩm mỹ Hồ Chí Minh`), `GET /api/cosmetic/Products?categId=<Công nghệ cao>&active=true` returned 24 global services, but adding `companyId=<employee location>` returned 0 before the fix.
- [x] PASS: Focused Jest — product catalog and doctors performance regression tests passed locally.
- [x] PASS: Semgrep — `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/routes/products.js api/src/routes/productCategories.js api/src/routes/reports/doctors.js` completed with 0 findings.
- [x] PASS: NK3 deploy — backed up files to `/opt/tgroup-nk3/hotfix-backups/tmv-feedback-catalog-20260531T042418Z`, copied only NK3 API route files, and forced a no-cache `tgroup-nk3-api` rebuild.
- [x] PASS: Live employee catalog API — `GET /api/cosmetic/Products?categId=<Công nghệ cao>&companyId=<employee location>&active=true` now returns 24 services.
- [x] PASS: Live doctors report API — `POST /api/cosmetic/Reports/doctors/performance` now returns 200 with 38 rows for May 2026 / Thẩm mỹ Hồ Chí Minh.
- [x] PASS: Live category mutation smoke — created and deleted a temporary Cosmetic category; create returned a UUID and delete returned 204.
- [x] PASS: Screenshot — `/service-catalog` as `thuan test` shows service rows in `artifacts/screenshots/tmv-thuan-service-catalog-fixed-20260531T0430Z.png`.
- [x] PASS: Screenshot — `/reports/doctors` as admin shows report data in `artifacts/screenshots/tmv-doctors-report-fixed-20260531T0430Z.png`.
- [x] PASS: Feedback status recap — deposit and company-seed issues read as already fixed; service catalog/category mutation and doctors report were active and are now fixed; live appointment/customer-create save flows still require controlled write verification before marking resolved.

# TestSprite Plan: TMV live feedback triage 2026-05-31

Feature/edit name: TMV live feedback triage read-only audit

Changed URLs and API routes:
- No runtime code or live routes were changed.
- Verified `https://tmv.2checkin.com/feedback`
- Verified `GET /api/Feedback/all?source=manual`
- Verified `GET /api/Feedback/all?source=auto&host=tmv.2checkin.com`
- Verified supporting probes on `GET /api/Feedback/unread-count`, `GET /api/cosmetic/CustomerBalance/:id`, `GET /api/cosmetic/Payments`, `GET /api/cosmetic/Appointments`, `POST /api/cosmetic/Reports/revenue/*`, and `POST /api/cosmetic/Reports/doctors/performance`.

Affected data flows:
- Read-only admin feedback inbox retrieval for manual employee feedback and auto-captured error threads.
- Cosmetic customer balance/payment read paths used to classify deposit-wallet feedback.
- Cosmetic appointment/employee/company read paths used to classify wrong-LOB foreign-key feedback.
- Report API read paths used to classify current auto-error health.

User roles:
- Admin `t@clinic.vn` with feedback inbox access and Dental/Cosmetic LOB scope.

Happy paths:
- Admin can log in and load `/feedback`.
- Manual feedback tab returns the current feedback queue.
- Auto-detected errors tab returns the current-host error queue.

Edge cases:
- Pending feedback can be stale even after a fix; verify the live route/API state before marking fixed.
- Auto-detected dynamic-import errors may come from users running old cached chunks after deploy; compare current asset loading before treating them as active code defects.
- 502 auto-errors may be transient deploy/restart errors; rerun the exact endpoint before prioritizing.

Regressions:
- Feedback unread badge still returns 200 and reports the current admin pending count.
- Report APIs should not regress to 500/502 after classification.
- Cosmetic data probes must stay on `/api/cosmetic/*` where the issue is LOB scoped.

Setup/login state:
- Live target: `https://tmv.2checkin.com`.
- Admin login: `t@clinic.vn` with current password.
- Data artifact: `artifacts/feedback/live-feedback-20260531T0340Z.json`.
- Screenshot evidence: `artifacts/screenshots/tmv-feedback-inbox-20260531T0350Z.png` and `artifacts/screenshots/tmv-feedback-auto-errors-20260531T0350Z.png`.

Checks:
- [x] PASS: Feedback manual tab — `GET /api/Feedback/all?source=manual` returned 200 with 16 manual threads.
- [x] PASS: Feedback auto tab — `GET /api/Feedback/all?source=auto&host=tmv.2checkin.com` returned 200 with 57 current-host auto threads.
- [x] PASS: Feedback unread count — `GET /api/Feedback/unread-count` returned 200 with admin count 6.
- [x] PASS: Cosmetic deposit balance probe — reported pending customer now returns nonzero `deposit_balance` from `/api/cosmetic/CustomerBalance/:id`.
- [x] PASS: Cosmetic appointment list probe — `/api/cosmetic/Appointments` returned 200.
- [x] PASS: Cosmetic report revenue probes — `/api/cosmetic/Reports/revenue/summary`, `/api/cosmetic/Reports/revenue/trend`, and `/api/cosmetic/Reports/revenue/by-location` returned 200.
- [x] PASS: Cosmetic report doctor performance probe — after the NK3 hotfix, `POST /api/cosmetic/Reports/doctors/performance` returned 200 with 38 rows for May 2026 / Thẩm mỹ Hồ Chí Minh.
- [ ] PENDING: Non-mutating read probes cannot prove employee/customer/appointment create flows save successfully; use a controlled test customer/employee before marking those remaining pending user-feedback threads resolved.

---

# TestSprite Plan: Cosmetic employee creation + LOB isolation (v0.32.80)

Feature/edit name: New employees stamped with lob_scope on create; login scopes empty-scope staff to home LOB; EmployeeForm loads LOB-correct permission groups

Files:
- `api/src/routes/employees/mutations.js` — CREATE INSERT now stamps `lob_scope = [getCurrentLob()]`.
- `api/src/routes/auth.js` — login: non-admin/non-CTV empty `lob_scope` → `[authLob]` (home LOB); admins → both; CTV → `[]`.
- `website/src/components/employees/EmployeeForm.tsx` — `fetchPermissionGroups(currentLOB)` (+ removed a duplicate import).
- `api/src/routes/__tests__/employeeLobScopeStamping.test.js` — new (9 cases).

Checks:
- [x] PASS: Unit — create stamps `['cosmetic']` under /api/cosmetic/*, `['dental']` otherwise (employeeLobScopeStamping.test.js).
- [x] PASS: Unit — login fallback: non-admin empty→[authLob], CTV→[], admin→both, explicit scope preserved.
- [x] PASS: Backend suite 476/476; EmployeeForm tsc clean.
- [ ] PENDING: Live (tmv.2checkin.com v0.32.80) — log in as a cosmetic employee (e.g. ngocanh12@gmail.com): JWT lobScope=['cosmetic'], switcher=Cosmetic, appointments/data = COSMETIC (not dental).
- [ ] PENDING: Live — edit/create a cosmetic employee: tier/permission-group dropdown lists COSMETIC groups (not dental).
- [~] KNOWN: `EmployeeForm.lob.test.tsx` has 4 pre-existing failures (incomplete BusinessUnitProvider mock — part of the branch's baseline test rot, not this change).

---

# TestSprite Plan: Cosmetic deployment defaults to Cosmetic LOB (v0.32.79)

Feature/edit name: Baked `VITE_DEFAULT_LOB` so NK3/tmv opens on Cosmetic by default (fixes Báo cáo + Phân quyền nhân sự showing dental data until manual toggle)

Files:
- `website/src/contexts/BusinessUnitContext.tsx` — `readDeploymentDefaultLob()`; default LOB precedence now `?lob=` > persisted localStorage > `VITE_DEFAULT_LOB` (if in available LOBs) > `finalAvailable[0]`.
- `Dockerfile.web` — `ARG/ENV VITE_DEFAULT_LOB=dental` + baked into `.env.production.local`.
- NK3 compose (`/opt/tgroup-nk3/runtime/docker-compose.nk3.yml`) web build arg `VITE_DEFAULT_LOB: "cosmetic"` (NK/NK2 leave unset → dental).
- `website/src/contexts/__tests__/BusinessUnitContext.test.tsx` — +4 tests.

Checks:
- [x] PASS: Unit — admin defaults to cosmetic when `VITE_DEFAULT_LOB=cosmetic` and no persisted value (BusinessUnitContext.test.tsx, 14/14).
- [x] PASS: Unit — persisted localStorage choice wins over `VITE_DEFAULT_LOB`.
- [x] PASS: Unit — `VITE_DEFAULT_LOB` ignored when not in available LOBs (flag off → dental).
- [x] PASS: Unit — dental deployment (flag unset) keeps admins on dental (no NK/NK2 regression).
- [x] PASS: Live (tmv.2checkin.com v0.32.79) — fresh login, no toggle: LOB switcher = "Cosmetic"; Báo cáo shows cosmetic ₫1.929.658.000 (not dental ₫6.1B); Phân quyền shows cosmetic groups ("COSMETIC PERM TEST GROUP", Admin 56 perms/11 members); 0 console errors.
- [x] PASS: Backend authz unchanged & correct — cosmetic admin (minted authLob=cosmetic JWT) 200 on `/api/cosmetic/Reports/*` + `/Permissions/*`; non-admin correctly 403.

---

# TestSprite Plan: Multi-level CTV override made real (v0.32.76)

Feature/edit name: Downline override becomes real pending commission (engine multi-level split + backfill)

Files:
- `api/src/services/commissionEngine.js` — `_writeCtvOverrides()` (additive, idempotent), hooked into `createEarningsForPayment` (source='ctv' only), `backfillOverridesForLob()`, exports.
- `api/src/services/ctvNetwork.js` — projection base scoped to `COALESCE(level,0)=0`.
- `api/scripts/backfill-ctv-overrides.js` — one-time both-DB backfill.

Checks:
- [x] PASS: jest — override cascades to enabled upline levels (additive, 3 inserts: L0+L1+L2); salestaff source does NOT cascade; idempotent NOT-EXISTS guard. Commission suites (21) + hierarchy (8) green.
- [x] PASS: NK3 deploy v0.32.76; backfill created TTK L2 override ₫41,230 (dental); `GET /api/ctv/commission-summary` → `totals.pending: 41230, counts.pending: 1` (was 0). Matches Network projection.
- [ ] PENDING: NK3 live portal — Hoa hồng → Chờ nhận shows "TỔNG CHỜ NHẬN 41.230đ" with one line.
- [ ] PENDING (pre-promotion): review real payout impact before NK2/NK (changes amounts owed for every CTV with downline).

---

# TestSprite Plan: CTV Network — potential flip card (v0.32.75)

Feature/edit name: "Tiềm năng từ tuyến dưới" becomes a flip card showing the earning source (paid-to-them / your cut per member)

Files:
- `website/src/components/ctv/CtvHierarchyPanel.tsx` — new `PotentialFlipCard` (front summary → back source list); removed inline per-level chips + unused `ctv`/`levelBreakdown`.
- `website/src/i18n/locales/{en,vi}/ctv.json` — `hierarchy.flipToSource/flipBack/paidToThem/noEarningSource`.
- (No backend change — uses `earned`/`overrideContribution` already on each node.)

Checks:
- [x] PASS: `tsc --noEmit` clean; eslint 0 warnings; en/vi json valid.
- [ ] PENDING: NK3 web rebuild + deploy v0.32.75.
- [ ] PENDING: NK3 live — tap the potential card → flips → lists "lý kim phụng" with paid ₫2,061,500 + your cut ₫41,230; tap flips back.

---

# TestSprite Plan: CTV Network — detailed/collapsible downline + search (v0.32.74)

Feature/edit name: Network tab — per-level override breakdown, collapsible downline cards with source detail, downline search bar

Files:
- `api/src/services/ctvNetwork.js` — each downline node now carries `earned` + `overrideContribution`.
- `website/src/lib/api/ctv.ts` — `CtvHierarchyNode.earned?` / `.overrideContribution?`.
- `website/src/components/ctv/CtvHierarchyPanel.tsx` — rewritten: per-level breakdown chips on the potential card, `DownlineCard` collapsible (expand → earnings/rate/cut/LOB/contact), search input (`normalizeText` diacritic-insensitive), no-match state.
- `website/src/i18n/locales/{en,vi}/ctv.json` — `hierarchy.sourceLabel/searchPlaceholder/noMatch/yourCut/theyEarned/yourPotential/clearSearch`.

Checks:
- [x] PASS: `npx jest ctvNetwork.hierarchy` 8/8 (incl. per-node + sum=total); `tsc --noEmit` 0; eslint 0 warnings; en/vi json valid.
- [x] PASS: NK3 build `tsc` gate passed; deployed v0.32.74; `GET /api/ctv/hierarchy` returns per-node `earned`/`overrideContribution` (L2 "lý kim phụng" earned ₫2,061,500 → cut ₫41,230); `/api/ctv/referrals` still `[]`.
- [ ] PENDING: NK3 live portal visual — Mạng lưới shows breakdown chips, search filters downline, member cards expand/collapse with the earnings detail.

---

# TestSprite Plan: CTV Portal — Track shows real clients only + Network downline override (v0.32.73)

Feature/edit name: Fix Theo dõi (Track) leaking downline CTVs as clients; add projected override-from-downline number to Mạng lưới (Network)

Files:
- `api/src/routes/ctv.js` — `/referrals` + `/client-journeys` refSql gained `AND COALESCE(is_ctv,false)=false` (exclude downline CTVs from the client list); `GET /hierarchy` now delegates to `getCtvHierarchy`.
- `api/src/services/ctvNetwork.js` — `buildCtvHierarchy` rolls up downline earnings → `totals.downlineEarningsBase / potentialOverride / overrideRatePct` using `commission_level_config` shares (fallback `STANDARD_OVERRIDE_SHARES`; disabled levels pay 0). `loadHierarchySource` fetches the level config.
- `website/src/lib/api/ctv.ts` — `CtvHierarchyResponse.totals` extended (3 optional fields).
- `website/src/components/ctv/CtvHierarchyPanel.tsx` — "Potential from downline" card (₫ + %, "Projected/Tạm tính" badge), shown when `downlineCount > 0`.
- `website/src/i18n/locales/{en,vi}/ctv.json` — `hierarchy.potentialTitle/potentialHint/projectedBadge`.
- `api/src/services/__tests__/ctvNetwork.hierarchy.test.js` — new (7 cases).

Checks:
- [x] PASS: `npx jest ctvNetwork.hierarchy` 7/7; services suite (commissionEngine+ctvNetwork) 22/22.
- [x] PASS: `tsc --noEmit` exit 0; eslint clean on changed FE files; en/vi ctv.json valid.
- [ ] PENDING: NK3 API verify — minted CTV JWT for Trần Trung Kiên: `GET /api/ctv/referrals` returns ONLY `is_ctv=false` customers (0 for this CTV); `GET /api/ctv/hierarchy` `totals.potentialOverride/overrideRatePct` present and sane.
- [ ] PENDING: NK3 live portal visual — Theo dõi no longer lists downline CTVs; Mạng lưới shows the "Tiềm năng từ tuyến dưới" card.

---

# TestSprite Plan: CTV Portal — Track-Clients Customer Deep-Link (v0.32.72)

Feature/edit name: Shareable "Open customer" / "Copy link" on each Track-Clients card (CTV portal)

Files:
- `website/src/components/ctv/ReferralFlipCard.tsx` — footer (sibling of the flip button) with `<a href="/customers/:id" target=_blank>` Open customer + Copy-link button (clipboard, transient "Copied"). `customerPath = /customers/${referral.id}`.
- `website/src/i18n/locales/{en,vi}/ctv.json` — `card.openCustomer/copyLink/linkCopied`.
- (No API change — `referral.id` = `dbo.partners.id` of the referred client, confirmed in ctv.js /referrals SQL; `/customers/:id` route exists in App.tsx.)

Checks:
- [x] PASS: `tsc --noEmit` exit 0; ctv.json en/vi valid.
- [x] PASS: id mapping — /referrals selects `id ... FROM dbo.partners WHERE referred_by_ctv_id`, so referral.id → /customers/:id is correct.
- [~] PRE-EXISTING FAIL (not this change): `ReferralFlipCard.test.tsx` 2/3 fail — test harness renders raw i18n keys (flip button name = "card.showServicesFor"); getByRole-by-translated-name fails independently of the footer. Owner to fix async i18n in test.
- [ ] PENDING: NK3 deploy + live verify on the CTV portal — each Track-Clients card shows Open customer + Copy link; Open navigates to /customers/:id; Copy puts the full URL on the clipboard.

---

# TestSprite Plan: Admin CTV Search + Hierarchy (v0.32.71) — VERIFIED ON LOCAL

Feature/edit name: Commission → CTV tab — search box + click-to-expand upline/downline hierarchy

Files:
- `api/src/services/ctvNetwork.js` — `loadHierarchySource()` (both-LOB fetch, per-LOB resilient + logs failures) + `getCtvHierarchy(ctvId)` (validates ctvId, then `buildCtvHierarchy`). Existing `buildCtvNetwork`/`buildCtvHierarchy` unchanged.
- `api/src/routes/ctvs.js` — admin-gated `GET /:id/hierarchy` → `getCtvHierarchy`; typed 500 envelope.
- `website/src/lib/api/ctv.ts` — `fetchCtvHierarchyForCtv(id, lob?)`.
- `website/src/components/commission/CtvManagementTab.tsx` — diacritic-insensitive multi-field search; per-row expand reusing `CtvHierarchyPanel`; cache cleared on suspend.
- `website/src/i18n/locales/{en,vi}/commission.json` (+`common.json` `clear`).

Checks:
- [x] PASS: Website typecheck — `tsc --noEmit` exit 0.
- [x] PASS: API jest — no new failures vs. pre-existing 9 failing suites.
- [x] PASS: Backend endpoint — seeded chain root→mid→leaf: `GET /Ctvs/{mid}/hierarchy` → `upline:[root]`, `downline:[leaf]`, totals 1/1/1; `{root}` → `downline:[mid L1, leaf L2]`. No-token → 401. Cosmetic mirror path reachable.
- [x] PASS: Browser (local Cosmetic LOB, WebBridge) — search "test" filters to 1 row; click "Admin" expands → `CtvHierarchyPanel` shows Direct=1/Total=1/Upline=1 + upline "CTV Demo Referrer"; no i18n key leakage (`ctv` ns loads on the admin page).
- [x] PASS: Adversarial review (3 reviewers + per-finding verify) — confirmed findings fixed (silent-failure logging, ctvId guard, typed 500, stale-cache clear, placeholder copy); O(n²) BFS + no-cache noted as pre-existing/parity, out of scope.
- [ ] PENDING: NK3 deploy — scp changed files, rebuild api+web, re-verify search + expand on https://tmv.2checkin.com (Vietnamese names exercise the diacritic search for real).

---

# TestSprite Plan: CTV Payout System (v0.32.70) — VERIFIED ON LOCAL

Feature/edit name: Manual CTV payout cycles + receipt photo (`/api/Payouts`)

Files:
- `api/src/routes/payouts.js` — new Express router: `GET /` (list cycles), `POST /` (create cycle in a tx: lock earnings `FOR UPDATE`, all-pending guard, insert payout, flip earnings to `paid`), `POST /upload-receipt` (multer+sharp), `PATCH /:id` (attach receipt). Gate: admin or `commissions.payout.run`.
- `api/src/server.js` — mounts `/api/Payouts` + `express.static('/uploads/payouts')`.
- `api/src/services/payoutService.js` — REMOVED (broken knex; tx moved into router via raw pg).
- `website/src/components/commission/EarningsPayoutsTabs.tsx` — receipt rendered via `getUploadUrl()`.
- `nginx.conf` / `nginx.docker.conf` — `/uploads/payouts` proxy.
- `api/migrations/051_add_payout_receipt.sql` — applied to local `tdental_demo` + `tcosmetic_demo`.

Checks:
- [x] PASS: API unit suite — `npx jest src/__tests__/payouts.test.js` → 7/7 (gate 403; admin allow; `commissions.payout.run` allow; POST creates + updates earnings; `409 B_EARNINGS_NOT_PAYABLE` when an earning isn't pending; PATCH sets receipt_url+uploaded_at; PATCH `404 S_NOT_FOUND`).
- [x] PASS: Website typecheck — `tsc --noEmit` clean.
- [x] PASS: No new regressions — the 9 failing suites/4 tests are identical on clean HEAD (pre-existing, unrelated to this change).
- [x] PASS: Live browser (local Cosmetic LOB, WebBridge) — Payouts tab loads with **no 404**; 4 pending earnings (1,035,000đ); selected all + cycle "Tháng 5/2026 (verify)" → Pay; earnings cleared from pending; cycle shown under Recent cycles (cosmetic · 4 thu nhập · 1.035.000đ).
- [x] PASS: Receipt chain — `POST /upload-receipt` (sharp → .jpg) → `PATCH /:id` (earnings_count=4, total=1035000) → `GET /uploads/payouts/<f>.jpg` → `HTTP 200 image/jpeg`; FE img src resolved to API origin.
- [ ] PENDING: NK3 deploy — apply `051_add_payout_receipt.sql` to `tdental_smoketest` + `tcosmetic_smoketest`, rebuild api+web, re-verify the Chi trả tab on https://tmv.2checkin.com.

---

# TestSprite Plan: Flat Referral Commission, No Pool (v0.32.67) — VERIFIED ON NK3

Feature/edit name: CTV commission = flat % of actual service (24% default, 7% braces), pool removed

Changed code paths:
- `api/src/services/commissionEngine.js` — `createEarningsForPayment` writes a single earnings row at level 0 = `Σ(line_amount × products.commission_rate_percent)` to the resolved recipient; the pool + `_walkCtvChain`/`commission_level_config` split is removed.
- `api/scripts/set-referral-commission-rates.sql` — sets product rates (24 default / 7 braces). Applied to `tdental_smoketest` only.
- Engine + backfill (`commissionEngine.js`, `customerReferrer.js`) deployed to `tgroup-nk3-api`.

Execution checks:
- [x] PASS: API unit suites — 36/36 (`createEarningsForPayment` now asserts single-row, direct rate; braces 7% case = 2,061,500 on 29,450,000).
- [x] PASS: rates applied — `tdental_smoketest` products: 374 @ 24%, 36 braces @ 7% (her "Niềng Mắc Cài Kim Loại Tự Buộc 3M" @ 7%).
- [x] PASS: **Live NK3** — backfill for ĐẶNG THỊ TUYẾT MAI created one earning of **2,061,500đ** (= 29,450,000 × 7%) to CTV "lý kim phụng"; `/api/ctv/client-journeys` → `total_earned=2061500`, `/api/ctv/commission-summary` → `pending=2061500`. NK/NK2 untouched; files backed up.
- [ ] PENDING: Browser screenshot of the CTV **Hoa hồng** tab showing 2,061,500đ.
- [ ] PENDING (owner decision): apply the rate script to NK/NK2 when promoting; decide whether upline MLM levels should ever pay.

---

# TestSprite Plan: Activity-Based CTV Journey Staging (v0.32.66) — VERIFIED ON NK3

Feature/edit name: CTV journey stage from real activity (not commission payout)

Changed code paths:
- `api/src/routes/ctv.js` — `/client-journeys` (NK3's portal endpoint) + `/referrals` apply an activity-based stage override (completed appointment / sale-order line / payment), batched per LOB, guarded by `safeQueryRows`.
- FE: `ReferralFlipCard.getProgress`, `CtvTrackingTab` filters, `CtvReferral` type prefer server `stage_progress`.
- `api/src/services/commissionEngine.js` + `api/src/routes/commissionEngine.js` + `api/test/commissionEngine.test.js` — `triggerCommissionEngine` export + route load fix (#3).

Execution checks:
- [x] PASS: API unit suites — `cd api && JWT_SECRET=x npx jest test/commissionEngine.test.js src/services/__tests__/*` → all green.
- [x] PASS: `website` typecheck clean; new ReferralFlipCard 4/4 test passes.
- [x] PASS: activity SQL valid (EXPLAIN) on both `tdental_demo` and `tcosmetic_demo`.
- [x] PASS: **Live NK3 endpoint** — deployed `/client-journeys` override to `tgroup-nk3-api`; minted CTV token for "lý kim phụng" and `GET /api/ctv/client-journeys` returned ĐẶNG THỊ TUYẾT MAI `stage=paid, stage_progress=4/4` (was 1/4), confirmed across 3 runs. NK / NK2 untouched; pre-patch `ctv.js` backed up to `/opt/tgroup-hotfix-backups/`.
- [ ] PENDING: Browser screenshot of the NK3 CTV portal showing her at 4/4 (inject the minted JWT into localStorage; no password reset needed).
- [ ] PENDING (pre-existing, not this change): FE vitest CTV suite fails on i18n-not-initialized in the test env (`aria-label="card.showServicesFor"`).

---

# TestSprite Plan: Retroactive CTV Earnings Backfill on Assignment

Feature/edit name: Retroactive CTV Earnings Backfill on Assignment (v0.32.65)

Changed code paths:
- `api/src/services/commissionEngine.js` — new `backfillEarningsForClient({ clientId, lob, getDb })`.
- `api/src/services/customerReferrer.js` — `setCustomerReferrer(..., { lob })` triggers backfill after a successful assign (non-fatal).
- CTV-assignment call sites now pass `{ lob: req.lob || 'dental' }`: `saleOrders/createSaleOrder.js`, `saleOrders/updateSaleOrder.js`, `appointments/mutationHandlers.js` (create + update).

Affected data flows:
- A customer who already paid, then is linked to a CTV, now has `dbo.earnings` rows written retroactively for those past payments.
- Earnings amount/pool computed from `payment_allocations → saleorderlines` product `commission_rate_percent` (same as live payment hook).
- CTV portal `/api/ctv/client-journeys` derives stages purely from earnings, so backfill advances the journey past "referred" (1/4).

Execution checks:
- [ ] PENDING: Engine unit suite — `cd api && JWT_SECRET=x npx jest src/services/__tests__/commissionEngine.test.js src/services/__tests__/customerReferrer.backfill.test.js` is green (backfill attribution, idempotent skip, no-referrer no-op, trigger contract).
- [ ] PENDING: Live NK3 — assign a CTV to a customer who already paid (Service form), then open that CTV's portal `Theo dõi` tab; the client card advances past 1/4 and shows commission. Evidence: screenshot before/after.
- [ ] PENDING: Idempotency on NK3 — re-save the same CTV assignment; verify `dbo.earnings` for that client/payment did not gain a duplicate `source='ctv'` row.
- [ ] PENDING: Regression — a brand-new service/appointment with a CTV (no prior payment) still assigns with no error and writes no earnings until payment.

---

# TestSprite Plan: TMV Cosmetic Employee Login Rate-Limit Fix

Feature/edit name: TMV Cosmetic Employee Login Rate-Limit Fix

Changed URLs and API routes:
- `https://tmv.2checkin.com/login`
- `POST /api/Auth/login`
- `GET /api/Auth/me`

Affected data flows:
- Login remains Dental-first for existing NK/NK2 staff and admins.
- When `COSMETIC_LOB_ENABLED=true`, login falls back to the Cosmetic identity database if no Dental row matches the identifier.
- The JWT records the auth-source LOB so `/api/Auth/me` refreshes the employee row and permissions from the same database.
- Successful logins still do not consume the failed-login rate-limit budget; repeated invalid credentials still return 429 after the configured threshold.

User roles:
- Cosmetic-only TMV employee with `lob_scope=['cosmetic']` and `cosmetic.access`.
- Existing Dental/admin user with Dental-first login.

Happy paths:
- `PhuongNTN` (`0362950725@gmail.com`) can log into TMV when the row exists only in `tcosmetic_smoketest`.
- Refreshing the app after login calls `/api/Auth/me` and preserves Cosmetic scope.
- Existing Dental/admin login still authenticates against Dental without querying Cosmetic first.

Edge cases:
- Duplicate or invalid Dental login rows still fail generically rather than falling through to another identity.
- Cosmetic DB fallback only runs when `COSMETIC_LOB_ENABLED=true`.
- Wrong passwords still count toward the per-identifier+IP failed-login limiter.

Regressions:
- Dental/NK login behavior remains unchanged.
- CTV redirect behavior remains `/ctv` for `is_ctv=true`.
- `/api/cosmetic/*` remains gated by `requireLobScope('cosmetic')` plus `cosmetic.access`.

Setup data and login state:
- Live TMV target: `https://tmv.2checkin.com`.
- A cosmetic-only employee row exists in `tcosmetic_smoketest.dbo.partners` for `0362950725@gmail.com`; no matching row exists in `tdental_smoketest`.
- Use a known correct password for that employee; do not brute-force production credentials during verification.

TestSprite execution items:
- [ ] PENDING: Verify `0362950725@gmail.com` logs into `https://tmv.2checkin.com/login` and lands in Cosmetic scope.
- [ ] PENDING: Refresh after login and verify `/api/Auth/me` keeps `lob_scope=['cosmetic']`.
- [ ] PENDING: Verify an existing Dental/admin login still works on TMV and NK.
- [ ] PENDING: Verify repeated wrong passwords still return 429 after the failed-login threshold.

---

# TestSprite Plan: TMV Cosmetic Legacy CTV Source

Feature/edit name: TMV Cosmetic Legacy CTV Source

Changed URLs and API routes:
- `https://tmv.2checkin.com/commission` > `CTV` tab in Dental and Cosmetic LOB mode
- `GET /api/Ctvs`
- `GET /api/cosmetic/Ctvs`
- `PATCH /api/Ctvs/:id`
- `PATCH /api/cosmetic/Ctvs/:id`
- `POST /api/Auth/login`

Affected data flows:
- Admin CTV list now exposes `source`, `legacy_code`, and `created_via` so imported legacy CTVs can be visually identified.
- Cosmetic LOB mode calls `/api/cosmetic/Ctvs` and filters the list to CTV rows with Cosmetic scope.
- Legacy CTV password hashes are accepted only for rows marked `created_via LIKE 'legacy_ctv_import%'`; successful login migrates the hash to bcrypt. The safe import runner preserves existing non-legacy passwords by default and only writes legacy hashes for new/imported rows or already-legacy rows.
- Legacy CTV phone/ref-code login is accepted only for rows marked `created_via LIKE 'legacy_ctv_import%'`; staff/admin users still log in by email.
- `/api/ctv` self-dashboard gating accepts both `is_ctv` and legacy JWT `isCtv` casing.
- `api/scripts/import-legacy-ctvs.js --dry-run` plans the import from legacy CTV snapshots and writes an audit file before any database write.

User roles:
- Admin with Dental + Cosmetic LOB access and CTV management permission or wildcard admin permissions.
- Imported CTV users with `is_ctv=true`, `employee=true`, active status, and legacy source marker.

Happy paths:
- Admin opens `/commission`, switches to the CTV tab in Cosmetic mode, and sees Cosmetic-scoped CTV rows with a Legacy CTV source badge after import.
- Admin toggles an imported CTV active/suspended status and the change mirrors to Cosmetic if the mirror row exists.
- Imported legacy CTV row that received a legacy hash logs in with the old phone/ref-code plus old legacy password, lands on `/ctv`, and their password hash migrates to bcrypt.

Edge cases:
- Non-legacy CTV rows show TMV source, not Legacy CTV.
- Cosmetic CTV tab should not show Dental-only CTV rows.
- A non-CTV admin calling `/api/ctv/me` still receives `403 S_CTV_ONLY`.
- Legacy password fallback must not work for rows without `created_via LIKE 'legacy_ctv_import%'`.
- Phone/ref-code login must not work for staff/admin or non-imported CTV rows.

Regressions:
- `/api/cosmetic/*` still returns `S_LOB_FORBIDDEN` for users without Cosmetic scope.
- Existing CTV self portal commission, tracking, and profile tabs remain CTV-only.
- Commission config and CTV admin routes remain reachable under the Cosmetic mirror.

Setup data and login state:
- Live TMV: `https://tmv.2checkin.com`.
- Use an admin account with both Dental and Cosmetic access.
- Legacy import should set `created_via='legacy_ctv_import_20260528'`, `ref=<legacy ma_ctv>`, `lob_scope=['dental','cosmetic']`, `is_ctv=true`, and matching Dental/Cosmetic partner IDs.
- Manual recovery row for previously skipped legacy CTV `0989460997`: Dental/Cosmetic partner id `0a5f8672-5f22-80f8-1029-777f104416ef`, `created_via='legacy_ctv_import_20260528_manual'`, phone ending `0997`, legacy password hash copied from the source DB.
- Dry-run audit artifact: `artifacts/ctv-import/20260528-live-refresh-20260528-193252/legacy-ctv-import-plan.json`.
- DB write/import still requires the second explicit confirmation before execution.

TestSprite execution items:
- [ ] PENDING: Verify `/commission` CTV tab in Cosmetic mode loads from `/api/cosmetic/Ctvs` and screenshot the Legacy CTV source badge.
- [ ] PENDING: Verify Dental mode still loads `/api/Ctvs`.
- [ ] PENDING: Verify imported legacy CTV row with a written legacy hash can login with old phone/ref-code plus old password and confirm DB password hash is bcrypt after login.
- [x] PASS: Verify manual recovery row for `0989460997` resolves as exactly one imported legacy CTV login candidate - live Dental query returned one active employee CTV with `created_via LIKE 'legacy_ctv_import%'` and the deployed login lookup returned `legacyFallbackAllowed=true`.
- [ ] PENDING: Verify non-imported CTV/staff phone login fails unless the email identifier is used.
- [ ] PENDING: Verify non-legacy CTV rows show TMV source.

---

# TestSprite Plan: TMV Cosmetic Service Source Save Fix

Feature/edit name: TMV Cosmetic Service Source Save Fix

Changed URLs and API routes:
- `https://tmv.2checkin.com/customers/:id?lob=cosmetic`
- `GET /api/cosmetic/CustomerSources`
- `POST /api/cosmetic/SaleOrders`
- `PATCH /api/cosmetic/SaleOrders/:id`

Affected data flows:
- The protected admin route tree is wrapped in `BusinessUnitProvider` and keyed by `currentLOB`, so Cosmetic customer routes hydrate the Cosmetic context before Layout and customer hooks fetch data.
- Cosmetic service modal source chips now come only from valid UUID customer-source rows in the active Cosmetic LOB.
- Successful empty Cosmetic customer-source responses clear stale Dental/fallback source chips instead of leaving `src-*` options in the modal.
- Service create/update normalizes non-UUID `sourceid` values to `null` before writing `SaleOrders`.

User roles:
- Admin with Dental + Cosmetic LOB access and `customers.edit`/`services.view`.
- Cosmetic staff allowed to create patient service records.

Happy paths:
- Open a Cosmetic customer profile, create a service with a valid Cosmetic source selected, and verify save posts to `/api/cosmetic/SaleOrders`.
- Open a Cosmetic customer profile when `/api/cosmetic/CustomerSources` returns no rows and verify the service can still save with no source chips.
- Edit an existing service and verify valid source UUIDs persist through `PATCH /api/cosmetic/SaleOrders/:id`.

Edge cases:
- Fallback source IDs such as `src-1` must not be visible or submitted.
- Stale Dental source rows must disappear after switching to Cosmetic if the Cosmetic source list is empty.
- Dental mode must continue to save services through top-level `/api/SaleOrders`.

Regressions:
- `/customers/:id?lob=cosmetic` must not crash with `useBusinessUnit must be used inside BusinessUnitProvider`.
- Existing tooth quantity/comment, doctor/assistant/TLBS, branch, and payment residual behavior remains unchanged.
- Service form stays under the FormShell modal and keeps save errors visible.
- Settings customer-source management still shows API fallback data only when the source API request fails.

Setup data and login state:
- Live TMV: `https://tmv.2checkin.com`.
- Use an admin account with both Dental and Cosmetic access.
- Keep `tgclinic_lob=cosmetic` or open with `?lob=cosmetic`.

TestSprite execution items:
- [ ] PENDING: Verify `/customers/:id?lob=cosmetic` renders the customer profile without a BusinessUnitProvider runtime crash.
- [ ] PENDING: Verify Cosmetic service create with a valid source saves and screenshot the modal/service history after save.
- [ ] PENDING: Verify empty Cosmetic customer-source state does not show `src-*` fallback chips and service save still succeeds.
- [ ] PENDING: Verify Dental service create still offers Dental customer sources and posts to `/api/SaleOrders`.

---

# TestSprite Plan: TMV Cosmetic Feedback Sweep 2026-05-24

Feature/edit name: TMV Cosmetic Feedback Sweep 2026-05-24

Changed URLs and API routes:
- `https://tmv.2checkin.com/feedback?lob=cosmetic`
- `https://tmv.2checkin.com/permissions?lob=cosmetic`
- `https://tmv.2checkin.com/customers?lob=cosmetic`
- `https://tmv.2checkin.com/employees?lob=cosmetic`
- `https://tmv.2checkin.com/calendar?lob=cosmetic`
- `GET /api/Feedback/all?source=auto&host=tmv.2checkin.com`
- `GET /api/cosmetic/Permissions/groups`
- `GET/PUT /api/cosmetic/Permissions/employees`
- `GET /api/cosmetic/CustomerBalance/:customerId`
- `GET/POST /api/cosmetic/Payments`
- `GET/POST/PUT /api/cosmetic/Partners`
- `GET/POST/PUT /api/cosmetic/Employees`
- `GET/POST/PUT /api/cosmetic/Appointments`

Affected data flows:
- Cosmetic appointment create/edit keeps the active LOB from form submission through appointment hooks.
- Cosmetic customer add/edit, CSKH/sales/branch selectors, employee add/edit, and permission-board calls load and write through Cosmetic mirrors.
- Cosmetic deposits, payment history, wallet top-ups, payment void/delete, and customer balance reads use Cosmetic mirrors.
- Feedback Auto-detected Errors defaults to the current host, while User Feedback remains manual/global.

User roles:
- Admin with both Dental and Cosmetic LOB access.
- Cosmetic staff with customer, calendar, payment, employee, permission, and feedback access according to their role.

Happy paths:
- Open Cosmetic permissions and verify no `GET /Permissions/employees` 404 appears.
- Open Cosmetic employee add/edit and verify branch and permission group dropdowns load.
- Open Cosmetic customer add/edit and verify branch, CSKH, sales, and referrer selectors load from Cosmetic data.
- Create or edit a Cosmetic appointment and verify the request uses `/api/cosmetic/Appointments`.
- Open a Cosmetic customer with deposits and verify `CustomerBalance` returns 200 and the payment modal can see available deposit.
- Open Feedback Auto-detected Errors and verify the first request includes `source=auto&host=tmv.2checkin.com`; toggle All hosts and verify `host` is omitted.

Edge cases:
- Dental-only users must still be blocked from Cosmetic mirrors by the LOB gate.
- Dental mode must continue to use top-level `/api/*` routes.
- Empty/unknown feedback host should preserve all-host auto-error behavior.
- Manual feedback must not disappear when the auto host filter is active.

Regressions:
- Existing Dental appointment, customer, employee, permission, and payment workflows must still pass.
- Cosmetic `/api/cosmetic/CustomerBalance/:id` must remain mounted after deploy.
- Feedback detail, reply, status, delete, unread count, and attachment flows remain unchanged.

Setup data and login state:
- Live TMV: `https://tmv.2checkin.com`.
- Use an admin with Dental + Cosmetic access.
- Keep `?lob=cosmetic` or persisted `tgclinic_lob=cosmetic`.
- Verify against real Cosmetic customers with posted deposits when testing payment modal behavior.

TestSprite execution items:
- [ ] PENDING: Verify Cosmetic permissions page loads employees/groups without 404 and screenshot the page.
- [ ] PENDING: Verify Cosmetic employee add/edit loads branch and permission group dropdowns from Cosmetic routes.
- [ ] PENDING: Verify Cosmetic customer add/edit assignment selectors load from Cosmetic routes.
- [ ] PENDING: Verify Cosmetic appointment create/edit posts to `/api/cosmetic/Appointments`.
- [ ] PENDING: Verify Cosmetic payment modal sees non-zero posted deposit through `/api/cosmetic/CustomerBalance/:id`.
- [ ] PENDING: Verify Feedback Auto-detected Errors current-host and all-host toggles with screenshots.

---

# TestSprite Plan: TMV Feedback Host Hygiene

Feature/edit name: TMV Feedback Host Hygiene

Changed URLs and API routes:
- `https://tmv.2checkin.com/feedback?lob=cosmetic`
- `GET /api/Feedback/all?source=auto&host=tmv.2checkin.com`
- `GET /api/Feedback/all?source=auto`
- `GET /api/Feedback/all?source=manual`

Affected data flows:
- Auto-detected feedback reads remain global feedback data, but the admin queue can now narrow auto-errors to the current browser host using `error_events.metadata.url` or `feedback_threads.page_url`.
- Manual employee feedback remains unfiltered by host and visible from the User Feedback tab.
- The all-host auto-error view remains available for cleanup of stale hosts such as `ctv.2checkin.com`, `nk2.2checkin.com`, `76-13-16-68.sslip.io`, and raw IP origins.

User roles:
- Admin or staff with effective settings feedback/admin access that can open the feedback settings page.

Happy paths:
- Open `https://tmv.2checkin.com/feedback?lob=cosmetic`, switch to Auto-detected Errors, and verify the default request includes `source=auto&host=tmv.2checkin.com`.
- Toggle All hosts and verify the request keeps `source=auto` but omits `host`.
- Switch back to User Feedback and verify manual feedback loads with `source=manual` and no host filter.

Edge cases:
- Hosts submitted with a scheme or path normalize to the hostname before filtering.
- Empty host keeps the old all-host behavior.
- Auto rows without `metadata.url` can still match `feedback_threads.page_url` when that stores a full URL.

Regressions:
- Existing `/api/Feedback/all?source=manual` and `/api/Feedback/all?source=auto` callers still work.
- Feedback detail, reply, status, delete, unread count, and attachment flows remain unchanged.
- Feedback is still not routed through `/api/cosmetic/Feedback`.

Setup data and login state:
- Live TMV: `https://tmv.2checkin.com`.
- Use a logged-in admin with feedback/settings access.
- Keep Cosmetic context via `?lob=cosmetic` only for page context; feedback remains global.

TestSprite execution items:
- [ ] PENDING: Verify Auto-detected Errors defaults to current-host TMV filtering and screenshot the queue count.
- [ ] PENDING: Verify All hosts mode shows stale-host cleanup scope without losing auto-error fields.
- [ ] PENDING: Verify User Feedback still lists manual employee feedback without host filtering.

---

# TestSprite Plan: TMV Cosmetic Feedback Fixes

Feature/edit name: TMV Cosmetic Feedback Fixes

Changed URLs and API routes:
- `https://tmv.2checkin.com/permissions?lob=cosmetic`
- `https://tmv.2checkin.com/customers/:id?lob=cosmetic`
- `GET /api/cosmetic/Permissions/employees`
- `GET/PUT /api/cosmetic/Permissions/employees/:employeeId`
- `GET /api/cosmetic/Permissions/groups`
- `GET /api/cosmetic/Permissions/resolve/:employeeId`
- `POST/PATCH /api/cosmetic/SaleOrders`

Affected data flows:
- PermissionBoard under Cosmetic reads and writes permission assignments through the request-scoped Cosmetic permissions mirror.
- Cosmetic customer add-service submits service records through `/api/cosmetic/SaleOrders`.
- Service save failures stay visible in the modal instead of only logging to the console.

User roles:
- Admin with both Dental and Cosmetic LOB access plus `permissions.view`, `permissions.edit`, `customers.edit`, and `services.view`.
- Cosmetic staff/admin creating staff accounts and customer services.

Happy paths:
- Open Cosmetic `/permissions` and verify employee permission assignments load without a 404.
- Create or edit a Cosmetic employee and verify the permission group selector can load groups/employees.
- Open a Cosmetic customer profile, add a service, and verify the request uses `/api/cosmetic/SaleOrders`.
- If save fails, verify the modal displays the error above the footer and remains open.

Edge cases:
- Dental-only users calling `/api/cosmetic/Permissions/employees` receive the LOB gate, not Dental data.
- Missing `permissions.view` still returns a permission failure.
- A stale/invalid service payload produces a visible submit error instead of a silent no-op.

Regressions:
- Dental `/permissions` still uses top-level `/api/Permissions/*`.
- Dental customer service creation still uses top-level `/api/SaleOrders`.
- Existing Cosmetic customer, source, service, and payment route mirrors remain available.

Setup data and login state:
- Live TMV: `https://tmv.2checkin.com`.
- Use an admin account with both Dental and Cosmetic LOB access.
- Keep `tgclinic_lob=cosmetic` or open with `?lob=cosmetic`.

TestSprite execution items:
- [x] PASS: Reproduced pre-fix live `GET /api/cosmetic/Permissions/employees` 404 from TMV Cosmetic permissions screenshot - direct API returned 404 while top-level `/api/Permissions/employees` returned 200.
- [x] PASS: After deploy, verify Cosmetic permissions page has no `API GET /Permissions/employees failed (404)` and screenshot the page - `output/playwright/tmv-cosmetic-feedback-20260523T1657Z/01-permissions-cosmetic-after.png`; final network audit recorded 0 permission 404s.
- [x] PASS: After deploy, verify `GET /api/cosmetic/Permissions/employees` returns 200 - direct API returned 200 with 103 employee rows.
- [x] PASS: After deploy, verify Cosmetic customer add-service posts to `/api/cosmetic/SaleOrders`; if save fails, visible submit error is shown - Playwright intercepted `POST https://tmv.2checkin.com/api/cosmetic/SaleOrders` and screenshot `output/playwright/tmv-cosmetic-feedback-20260523T1657Z/02-service-save-error-visible-after.png` shows the footer-level error; final network audit recorded 0 Cosmetic feedback/permissions 404s.

---

# TestSprite Plan: TMV Cosmetic Money Isolation Regression

Feature/edit name: TMV Cosmetic Money Isolation Regression

Changed URLs and API routes:
- `https://tmv.2checkin.com/customers/fcee66e3-0e1b-4527-825d-1fdd171d12ee?lob=cosmetic`
- `GET /api/cosmetic/Partners?search=0989460997`
- `GET /api/cosmetic/CustomerBalance/:id`
- `GET /api/cosmetic/Payments/deposits?customerId=:id`
- `POST /api/cosmetic/Payments/:id/void`
- Control checks against top-level Dental `GET /api/Partners?search=T163752` and `GET /api/CustomerBalance/:id`

Affected data flows:
- Cosmetic customer profile balance reads must come only from `tcosmetic_smoketest.dbo.payments`.
- Cosmetic deposit history must filter by the Cosmetic customer UUID, not by shared phone and not by Dental rows.
- Cross-LOB badge is allowed as a phone-match indicator only; it must not merge Dental money, appointments, services, or profile balances into Cosmetic.
- False Cosmetic deposit `05923eda-0813-481d-9b15-63236f54c84c` for customer `fcee66e3-0e1b-4527-825d-1fdd171d12ee` was backed up and voided, preserving audit history while removing active balance.

User roles:
- Admin with both Dental and Cosmetic LOB access and `payment.view` / `payment.void`.
- Cosmetic staff with customer/payment view permissions should see the corrected 0 đ active deposit balance.

Happy paths:
- Open the Cosmetic customer profile for `thuan le` phone `0989460997` and verify the header shows `Deposit Balance 0 đ`.
- Keep the `also a dental client` badge visible when the cross-view phone probe finds Dental matches.
- Verify `/api/cosmetic/CustomerBalance/fcee66e3-0e1b-4527-825d-1fdd171d12ee` returns `deposit_balance: 0`.
- Verify `/api/cosmetic/Payments/deposits?customerId=fcee66e3-0e1b-4527-825d-1fdd171d12ee` returns only rows for that Cosmetic customer and no posted active deposits.

Edge cases:
- A Dental-only customer UUID must return 404 under `/api/cosmetic/CustomerBalance/:id`.
- A Dental ref such as `T163752` must be absent from `/api/cosmetic/Partners` while still present in top-level Dental `/api/Partners`.
- Voided Cosmetic deposit rows may remain visible for audit, but must not contribute to active deposit balance.
- Same phone in both LOBs must not be treated as a shared financial identity.

Regressions:
- Dental mode must still show the Dental customer rows and balances through top-level `/api/*`.
- Cosmetic pages must not fire top-level `/api/Partners`, `/api/CustomerBalance`, `/api/Payments`, `/api/Appointments`, `/api/Products`, `/api/Employees`, `/api/Reports`, `/api/settings`, or `/api/face` calls while Cosmetic is selected.
- Existing Cosmetic customer, appointment, service, employee, report, source, bank, face, HSO, and export mirrors must remain available.

Setup data and login state:
- Live TMV: `https://tmv.2checkin.com`.
- Cosmetic customer: `fcee66e3-0e1b-4527-825d-1fdd171d12ee`, name `thuan le`, phone `0989460997`.
- Voided false deposit: `05923eda-0813-481d-9b15-63236f54c84c`, amount `1,000,000`, now `status='voided'`.
- Live backup before correction: `/var/backups/tgroup-nk3/tmv-cosmetic-false-deposit-20260523T105515Z/`.
- Evidence artifacts: `output/playwright/tmv-cosmetic-lob-isolation-20260523T1055Z/`.

TestSprite execution items:
- [x] PASS: Verify false Cosmetic deposit row was backed up before correction - `/var/backups/tgroup-nk3/tmv-cosmetic-false-deposit-20260523T105515Z/payment-before.tsv` and `customer-before.tsv`.
- [x] PASS: Verify Cosmetic false deposit was voided through `/api/cosmetic/Payments/:id/void` - API response returned `voidSuccess=true`, `beforeBalance=1000000`, `afterBalance=0`.
- [x] PASS: Verify Cosmetic customer profile browser screenshot shows `Deposit Balance 0 đ` - `output/playwright/tmv-cosmetic-lob-isolation-20260523T1055Z/01-thuan-le-cosmetic-balance-zero.png`.
- [x] PASS: Verify live browser network on the profile had no bad top-level Dental data calls - `browser-profile-network.json` recorded 19 API calls, 16 Cosmetic calls, 0 bad top-level calls, 0 errors.
- [x] PASS: Verify live API LOB isolation checks - `cosmetic-lob-isolation-api.json` recorded 15 checks and 0 failures.
- [x] PASS: Verify Cosmetic DB integrity checks for payments/appointments/saleorders/dotkhams missing Cosmetic customers and active `thuan le` deposits - `cosmetic-lob-isolation-db.tsv` recorded all zero counts.

---

# TestSprite Plan: TMV Cosmetic LOB Redo

Feature/edit name: TMV Cosmetic LOB Redo

Changed URLs and API routes:
- `https://tmv.2checkin.com`
- Cosmetic-mode `/dashboard`
- Cosmetic-mode `/customers` and `/customers/:id`
- Cosmetic-mode `/calendar`
- Cosmetic-mode `/payment`
- Cosmetic-mode `/services`
- Cosmetic-mode `/service-catalog`
- Cosmetic-mode `/employees`
- Cosmetic-mode `/reports/revenue`
- `GET/POST/PUT /api/cosmetic/Partners`
- `GET/POST/PUT /api/cosmetic/Appointments`
- `GET/POST/PATCH/DELETE /api/cosmetic/Payments`
- `GET/POST/PUT/PATCH /api/cosmetic/Products`
- `GET/POST/PATCH /api/cosmetic/Employees`
- `GET/POST/PUT/DELETE /api/cosmetic/CustomerSources`
- `GET /api/cosmetic/DotKhams`
- `GET/PUT /api/cosmetic/settings/bank`
- `GET/POST /api/cosmetic/ExternalCheckups`
- `POST /api/cosmetic/face/recognize`, `POST /api/cosmetic/face/register`, `POST /api/cosmetic/face/re-register`, `GET /api/cosmetic/face/status/:id`
- `GET /api/cosmetic/Exports/*`

Affected data flows:
- Business Unit selection initializes from `?lob=cosmetic` or persisted `tgclinic_lob=cosmetic` before customer, appointment, employee, service, payment, report, and dashboard data hooks fire.
- Customer add/edit, assignment searches, uniqueness checks, face-ID rescue searches, profile reads, service actions, monthly plans, DotKham history, HSO/checkups, customer sources, and bank settings pass the active Cosmetic LOB to API clients.
- Cosmetic mirror routes now include customer sources, DotKhams, bank settings, external checkups, face-ID, and exports so Cosmetic callers do not hit dental/global endpoints.

User roles:
- Admin with both Dental and Cosmetic LOB access, including `kien@clinic.vn` after the live DB permission repair.
- Cosmetic staff/admin users with `cosmetic.access` and the relevant workflow permissions.

Happy paths:
- Open `https://tmv.2checkin.com/?lob=cosmetic` and confirm the first dashboard/customer/calendar/payment/service/employee/report data requests use `/api/cosmetic/*`.
- Add and edit a Cosmetic customer, including CSKH/sales assignment searches and uniqueness checks.
- Add and edit a Cosmetic appointment for a Cosmetic customer.
- Add a Cosmetic payment/deposit and confirm reload/balance routes stay Cosmetic.
- Add/edit Cosmetic service catalog records and sale-order/service lines.
- Use Face ID rescue/register flows in Cosmetic mode without calling top-level `/api/face` or top-level `/api/Partners`.
- Load customer sources, bank settings, DotKham/medical-history tooltip, HSO/checkup gallery/upload, and exports through Cosmetic mirrors.

Edge cases:
- Persisted `tgclinic_lob=cosmetic` must beat the default Dental value on first render.
- `?lob=cosmetic` must deep-link into Cosmetic mode without a first-render Dental fetch.
- Switching back to Dental must keep legacy top-level `/api/*` behavior.
- Non-admin or single-LOB staff must not get unauthorized Cosmetic switching from localStorage/query attempts.
- Cosmetic customer searches must remain accent-insensitive.

Regressions:
- Dental mode must still use top-level `/api/*` and Dental data.
- CTV routes must remain CTV-only; admin `GET /api/ctv/me` should stay forbidden.
- Revenue must still exclude deposits/refunds/usage/voids while including direct posted service payments.
- Payment/customer balance and sale-order-line changes must not double-count allocations.

Setup data and login state:
- Use live TMV: `https://tmv.2checkin.com`.
- Use an admin with both LOBs (`t@clinic.vn` verified for full browser/API sweep; `kien@clinic.vn` live DB row now has `{dental,cosmetic}` but still needs the real password for browser login proof).
- Keep `COSMETIC_LOB_ENABLED=true` and `VITE_COSMETIC_LOB_ENABLED=true`.
- Preserve screenshot evidence for every browser-visible checked page under `output/playwright/`.

TestSprite execution items:
- [x] PASS: Verify Cosmetic first-render request audit has zero top-level `/api/Employees`, `/api/Appointments`, `/api/Partners`, `/api/Payments`, `/api/Products`, `/api/face`, or `/api/settings` calls after selecting/persisting Cosmetic - live browser artifact `output/playwright/tmv-cosmetic-after-deploy-20260523T1033Z/cosmetic-browser-after-deploy-results.json` recorded 50 `/api/cosmetic/*` calls and 0 bad top-level data calls.
- [x] PASS: Verify Cosmetic dashboard screenshot on `https://tmv.2checkin.com/?lob=cosmetic` - `output/playwright/tmv-cosmetic-after-deploy-20260523T1033Z/01-cosmetic-dashboard.png`.
- [x] PASS: Verify Cosmetic customers add/edit and customer-list screenshot - API mutation artifact created/edited customer `47b6d6d0-ce04-4723-8dcf-688639944c64`; screenshots `02-cosmetic-customers.png` and `09-cosmetic-created-customer.png`.
- [x] PASS: Verify Cosmetic appointment add/edit and calendar screenshot - API mutation artifact created/edited appointment `ef1fdadf-cff3-4e30-b2a4-905351eb9808`; screenshot `03-cosmetic-calendar.png`.
- [x] PASS: Verify Cosmetic payment/deposit add/reload and payment screenshot - API mutation artifact created deposit `ebda1ef8-adaf-4e42-bdb3-5c8847de2df0`, reloaded payments/deposits/balance; screenshot `04-cosmetic-payment.png`.
- [x] PASS: Verify Cosmetic service/service-catalog add/edit and screenshots - API mutation artifact created/edited service `5144f944-a4ab-49b6-a22d-f3cb721eb154`; screenshots `05-cosmetic-services.png` and `06-cosmetic-service-catalog.png`.
- [x] PASS: Verify Cosmetic employees list/add/edit and employee screenshot - API mutation artifact created/edited employee `e3550ab6-6886-4b0c-9250-20baa753b185`; screenshot `07-cosmetic-employees.png`.
- [x] PASS: Verify Cosmetic revenue report screenshot and revenue paid/deposit exclusion behavior - `/api/cosmetic/Reports/revenue/summary` returned 200 in artifact `cosmetic-api-after-deploy-results.json`; screenshot `08-cosmetic-reports-revenue.png`.
- [x] PASS: Verify Cosmetic support mirrors for customer sources, DotKhams, bank settings, HSO/checkups, face-ID, and exports return non-5xx and stay LOB-scoped - artifact `cosmetic-api-after-deploy-results.json` covered `/api/cosmetic/CustomerSources`, `/DotKhams`, `/settings/bank`, `/ExternalCheckups`, `/face/status`, and `/Exports/types` with no failures.
- [x] PASS: Verify Dental mode still uses Dental/top-level routes after switching back - API artifact confirmed the Cosmetic-created customer is absent from top-level Dental `/api/Partners/:id` with 404, preserving DB separation.

---

# TestSprite Plan: NK3 Cosmetic LOB Feedback Fixes

Feature/edit name: NK3 Cosmetic LOB Feedback Fixes

Changed URLs and API routes:
- `https://76-13-16-68.sslip.io/reports/revenue`
- `https://76-13-16-68.sslip.io/feedback` (source of triage only; no feedback code changed)
- Cosmetic-mode `/employees`
- Cosmetic-mode `/calendar` and appointment create/edit surfaces
- Cosmetic-mode `/customers` and `/customers/:id`
- Cosmetic-mode `/payment` and customer deposit/payment panels
- `GET/POST/PUT /api/cosmetic/Partners`
- `GET/POST/PUT /api/cosmetic/Appointments`
- `GET/POST/PATCH/DELETE /api/cosmetic/Employees`
- `GET/POST/PATCH/DELETE /api/cosmetic/Payments`
- `GET /api/cosmetic/Payments/deposits`
- `GET /api/cosmetic/Payments/deposit-usage`
- `GET /api/cosmetic/CustomerBalance/:id`
- `GET /api/cosmetic/SaleOrderLines`
- `POST /api/cosmetic/Reports/revenue/summary`
- `POST /api/cosmetic/Reports/revenue/trend`
- `POST /api/cosmetic/Reports/revenue/by-location`
- API CORS allowlist for `https://76-13-16-68.sslip.io`
- `Dockerfile.web` Vite build args for `VITE_COSMETIC_LOB_ENABLED`

Affected data flows:
- Cosmetic UI create/update/read hooks now pass the active `currentLOB` to API clients so `apiFetch` uses `/api/cosmetic/*` mirror routes.
- Employee form branch list and employee save use cosmetic `companies` and `partners` rows instead of dental rows.
- Customer create/update and customer selectors use cosmetic partners and cosmetic companies, preventing dental FK validation against cosmetic company IDs.
- Customer form company, employee assignment, and referrer selectors pass the active Cosmetic LOB to `fetchCompanies`, `fetchEmployees`, `fetchPartners`, and selected-referrer lookup calls.
- Appointment create/update uses cosmetic appointments and cosmetic partners, preventing `Partner with given partnerId does not exist` when the selected customer exists only in `tcosmetic_demo`.
- Cosmetic deposit list, usage history, customer balance, customer profile, and payment mutations use the cosmetic mirror so deposit history and summary cards read the same DB.
- Revenue summary, trend, and by-location include posted direct `payment_category = 'payment'` receipts with no allocation rows, including imported cosmetic receipts whose `service_id` is blank; by-location shows an unassigned row for paid receipts with no company, while excluding deposits, refunds, deposit usage, and voided payments.

User roles:
- Admin with both Dental and Cosmetic LOB access.
- Cosmetic staff/admin users with `cosmetic.access`, relevant customer/appointment/employee/payment/report permissions, and Cosmetic selected in the business-unit selector.

Happy paths:
- In Cosmetic mode, `/employees` branch dropdown lists cosmetic branches only, and creating/updating an employee posts to `/api/cosmetic/Employees`.
- In Cosmetic mode, creating/updating an appointment with a cosmetic customer succeeds through `/api/cosmetic/Appointments`.
- In Cosmetic mode, creating/updating a customer with a cosmetic branch succeeds through `/api/cosmetic/Partners`.
- In Cosmetic mode, adding a customer deposit shows the row in deposit history and updates summary cards through `/api/cosmetic/CustomerBalance/:id`.
- On `/reports/revenue` in Cosmetic mode, `Tổng đã thu`, trend, and location cards include posted direct payment-category service receipts even when imported rows have no `service_id` or company assignment yet.

Edge cases:
- Deposit-category wallet/customer advances without `service_id` must not be counted as revenue and must remain in deposit/cash-flow reporting.
- Deposits, refunds, deposit usage, and voided payments must remain excluded from revenue paid totals.
- Switching between Dental and Cosmetic must not leave stale dental customer, employee, sale-order-line, payment, or balance data in cosmetic screens.
- Cosmetic customer selectors must remain accent-insensitive for Vietnamese names.

Regressions:
- Dental routes must continue using legacy `/api/*` paths when the active LOB is Dental.
- Existing payment allocation revenue must still use capped allocation math and not double-count direct receipts that already have payment allocations.
- Customer profile service/payment tabs should keep loading after the LOB-aware sale-order-line and balance changes.
- `website/package.json` version is bumped to `0.32.35-cosmetic-lob`.

Setup data and login state:
- Use NK3: `https://76-13-16-68.sslip.io`.
- Log in with an admin/staff account that can select Cosmetic LOB.
- Use a cosmetic branch, cosmetic customer, cosmetic employee, a posted direct `payment_category = 'payment'` receipt with no allocation row, and a deposit-category advance row.
- Keep `COSMETIC_LOB_ENABLED=true` and verify the cosmetic mirror API is mounted.
- Verify browser-origin API calls from `https://76-13-16-68.sslip.io` do not fail CORS.
- Verify the deployed web bundle has `VITE_COSMETIC_LOB_ENABLED=true` so the Business Unit selector can enter Cosmetic mode.

TestSprite execution items:
- [ ] PENDING: Verify Cosmetic `/employees` lists cosmetic branches and employee create/update does not show dental branches or save to dental.
- [ ] PENDING: Verify Cosmetic customer add/edit branch, sales staff, CSKH, and referrer selectors request Cosmetic companies/employees/customers and never show Dental-only selector rows.
- [ ] PENDING: Verify Cosmetic appointment create/update succeeds with a cosmetic-only customer and does not return `Partner with given partnerId does not exist`.
- [ ] PENDING: Verify Cosmetic customer create/update succeeds with a cosmetic company ID and does not hit the dental companies FK.
- [ ] PENDING: Verify Cosmetic deposit add/reload shows the deposit row and updates summary cards through `/api/cosmetic/CustomerBalance/:id`.
- [ ] PENDING: Verify Cosmetic `/reports/revenue` `Tổng đã thu`, trend, and by-location totals include direct posted payment-category receipts with no allocation row, including rows whose `service_id` or company assignment is blank.
- [ ] PENDING: Verify deposit-category advances, refunds, deposit usage, and voided payments are excluded from revenue.
- [ ] PENDING: Verify live NK3 browser requests from `https://76-13-16-68.sslip.io` do not trigger CORS failures.
- [ ] PENDING: Verify live NK3 Docker web build forwards `VITE_COSMETIC_LOB_ENABLED=true` and does not compile the Cosmetic selector as disabled.
- [ ] PENDING: Verify Dental mode still uses dental data for customers, employees, appointments, payments, customer balance, sale-order lines, and revenue.

---

# TestSprite Plan: NK2 Responsive Population Audit

Feature/edit name: NK2 Responsive Population Audit

Changed URLs and API routes:
- Full NK2 route sweep across authenticated app pages.
- No API routes changed by this QA pass.

Affected data flows:
- Authenticated page hydration from NK2 staging APIs.
- Route-level list/detail/report data population across phone, tablet, and desktop viewport classes.
- Browser console, network, overflow, and empty-state detection for visible app surfaces.

User roles:
- Authenticated NK2 admin/staff session used for broad route access.

Happy paths:
- Verify each primary route loads populated content or an intentional empty state on iPhone, iPad, and desktop widths.
- Verify core navigation remains reachable on each device family.
- Verify responsive wrapping prevents controls, filters, tabs, and action buttons from clipping offscreen.

Edge cases:
- Long Vietnamese labels, dense data tables, report tabs, modals, and side navigation must not overlap at iPhone or iPad widths.
- Pages with low or missing data must show deliberate empty/loading/error states rather than blank panels.
- API failures or unauthorized responses must not leave a false "populated" page.

Regressions:
- `/calendar` iPad toolbar wrapping must remain fixed while the broader app sweep runs.
- Desktop layouts must not degrade while mobile/tablet wrapping is corrected.
- Report/dashboard/customer/payment/service pages should not introduce page-level horizontal overflow.

Setup data and login state:
- Use NK2 staging: `https://nk2.2checkin.com`.
- Use an authenticated admin/staff session with access to the main navigation.
- Collect screenshot evidence for every checked device family and every failure.

TestSprite execution items:
- [x] PASS: Sweep iPhone representative widths across all primary authenticated routes for population, console errors, and horizontal overflow - 92 checks completed under `reports/responsive-qa/iphone`; no blank/unpopulated pages, console errors, failed network requests, or true page-wide overflow.
- [x] PASS: Sweep iPad portrait/landscape representative widths across all primary authenticated routes for population, console errors, and horizontal overflow - 92 checks completed under `reports/responsive-qa/ipad`; `/feedback` visible "Auto-detected Errors" was confirmed as a tab label, not a runtime error.
- [x] PASS: Sweep desktop representative widths across all primary authenticated routes for population, console errors, and horizontal overflow - 92 checks completed under `reports/responsive-qa/desktop`; true layout blockers isolated to `/calendar` toolbar controls and `/employees` edit action visibility.
- [x] PASS: Record all failed routes with screenshot path, viewport, visible symptom, and suspected data/UI category - consolidated in `reports/responsive-qa/desktop/report.md`, `reports/responsive-qa/ipad/report.md`, and `reports/responsive-qa/iphone/report.md`.
- [x] PASS: Recheck `/calendar` at 1280x720 and 1366x768 after the 0.32.32 toolbar breakpoint fix; export, filter, and quick-add controls are visible - evidence: `output/playwright/responsive-qa/fixed/laptop-1280x720__calendar__after-0.32.32.png`, `output/playwright/responsive-qa/fixed/laptop-1366x768__calendar__after-0.32.32.png`.
- [x] PASS: Recheck `/employees` at 1280x720, 1366x768, and 1440x900 after the 0.32.32 sticky action/table text fix; edit action is visible and long location text is truncated - evidence: `output/playwright/responsive-qa/fixed/laptop-1280x720__employees__after-0.32.32.png`, `output/playwright/responsive-qa/fixed/laptop-1366x768__employees__after-0.32.32.png`, `output/playwright/responsive-qa/fixed/desktop-1440x900__employees__after-0.32.32.png`.

---

# TestSprite Plan: Calendar iPad Toolbar Wrapping

Feature/edit name: Calendar iPad Toolbar Wrapping

Changed URLs and API routes:
- `/calendar`
- No API routes changed.

Affected data flows:
- Calendar appointment data still loads through `GET /api/Appointments` with calendar-mode pagination.
- The responsive toolbar layout now wraps at tablet widths instead of forcing one row, so view mode tabs, date navigation, search, export, filters, and quick-add remain visible while appointment cards populate below.
- No appointment DTO, status, export, or mutation payload changed.

User roles:
- Admin and staff with `appointments.view`.
- Staff with `appointments.add`, `appointments.edit`, or `appointments.export` should see the same controls without clipping when those permissions are granted.

Happy paths:
- Open `/calendar` at iPad landscape width (`1024x768`) and verify Ngày/Tuần/Tháng, date navigation, search, export, filter, and quick-add controls are all visible and non-overlapping.
- Verify day-view appointment cards populate below the toolbar with the expected count for the selected day.
- Switch between day, week, and month at tablet width and confirm controls stay reachable.

Edge cases:
- Long Vietnamese date labels such as `Thứ Hai, 18 tháng 5, 2026` must not overlap the view tabs.
- Permission combinations that hide export or quick-add should not leave awkward empty toolbar space.
- Search suggestions should still open below the search input after the toolbar wraps.

Regressions:
- Desktop wide layout should still use a single-row toolbar.
- Mobile and narrow tablet layouts should keep controls wrapped instead of introducing horizontal page overflow.
- Export date-range modal, smart filter drawer, and quick-add appointment modal should still open from `/calendar`.

Setup data and login state:
- Use an authenticated local or NK2 admin session.
- Use a calendar day with multiple appointments, such as `2026-05-18` in local seeded data.

TestSprite execution items:
- [ ] PENDING: Verify `/calendar` at `1024x768` shows all toolbar controls without overlap or right-edge clipping.
- [ ] PENDING: Verify day-view appointment cards populate below the toolbar after calendar data finishes loading.
- [ ] PENDING: Verify day/week/month switching at tablet width keeps the toolbar wrapped and reachable.
- [ ] PENDING: Verify search, export menu, filter drawer, and quick-add controls still open from the wrapped tablet toolbar.
- [ ] PENDING: Verify wide desktop keeps the single-row toolbar with no visual regression.

---

# TestSprite Plan: Payment Method Contract Alignment

Feature/edit name: Payment Method Contract Alignment

Changed URLs and API routes:
- `/payment`
- `/customers/:id` payment/deposit surfaces
- `GET /api/Payments`
- `GET /api/Payments/:id`
- `POST /api/Payments`
- `PATCH /api/Payments/:id`
- `POST /api/Payments/:id/proof`
- No new API routes added.

Affected data flows:
- Frontend deposit/payment display labels now align with the live payment contract methods: `cash`, `bank_transfer`, `deposit`, and `mixed`.
- `contracts/dist` is rebuilt from `contracts/payment.ts`, so package consumers no longer see stale card/e-wallet enum values.
- VietQR remains a frontend entry alias that sends `bank_transfer` to the backend; it is not stored as a separate payment method.

User roles:
- Admin or payment staff with `payment.view` and `payment.add`.
- Customer-profile staff using deposit history and payment tabs.

Happy paths:
- Open `/payment` and verify existing cash, bank-transfer, deposit, and mixed payment rows display readable method labels.
- Open a customer profile payment/deposit surface and verify deposit history displays `bank_transfer` as a bank-transfer label, not the raw key.
- Create or edit a payment using cash/bank/deposit/mixed flows and confirm the backend receives only live method codes.

Edge cases:
- Legacy rows with unknown method strings should fall back to the raw method string instead of crashing.
- VietQR top-up flows should still map to `bank_transfer`.
- English and Vietnamese payment labels should both have `bank_transfer` and `deposit` keys.

Regressions:
- Payment history, deposit history, refunds, void/delete actions, payment proof uploads, and report/export payment-method grouping still work.
- No card/e-wallet methods should appear as accepted live payment methods in contracts, docs, or payment UI labels.

Setup data and login state:
- Use an authenticated admin/staff session with payment permissions.
- Use any customer with deposit/payment rows containing cash, bank transfer, deposit usage, or mixed payments.

TestSprite execution items:
- [ ] PENDING: Verify `/payment` renders live payment method labels without card/e-wallet options.
- [ ] PENDING: Verify `/customers/:id` deposit history renders `bank_transfer` and `deposit` labels in English and Vietnamese locales.
- [ ] PENDING: Verify VietQR top-up still posts `bank_transfer` to `POST /api/Payments`.
- [ ] PENDING: Verify `contracts/dist/payment.d.ts` and `contracts/payment.ts` expose the same live method enum.

---

# TestSprite Plan: Documentation Traceability And Governance Sync

Feature/edit name: Documentation Traceability And Governance Sync

Changed URLs and API routes:
- No user-facing URLs changed.
- No runtime API behavior changed.
- Documentation coverage updated for `/api/Partners/resolve`, `/api/Feedback/unread-count`, `/api/IpAccess/*`, `/api/DotKhams`, `POST /api/Exports/:type/preview`, `POST /api/Exports/:type/download`, `/api/Reports/*`, `GET /api/SaleOrders/lines`, `PATCH /api/SaleOrders/:id`, `DELETE /api/SaleOrderLines/:id`, `PATCH /api/Payments/:id`, and `POST /api/Payments/:id/proof`.

Affected data flows:
- Feature work should now be traceable across use case, workflow, contract, data model, product-map domain, permission registry, and test matrix entries.
- Deployment docs use `api/migrations/` as the canonical migration path and mark `api/src/db/migrations/` as supplemental stragglers needing explicit review.
- `scripts/verify-docs.sh` now enforces docs, changelog, and TestSprite ledger updates for contract/schema/API/frontend/backend-data-flow changes.
- Local `.husky/pre-commit`, root `npm run verify:docs` / `npm run verify:governance`, and PR checks now run the governance gate so future changes cannot rely on optional manual memory.
- Authority docs no longer embed generated memory blocks, and `scripts/sync-claude-mem.sh` strips accidental generated-memory blocks from `AGENTS.md` while keeping the real memory mirror in `.claude/memory.md`.

User roles:
- Architecture and product agents checking feature blast radius before implementation.
- Frontend, backend, data, QA, and release agents using the authority stack.
- TestSprite verification agent reading this ledger after a feature/edit.

Happy paths:
- Pick a report/export feature and confirm the route appears in `docs/CONTRACTS.md`, `product-map/contracts/api-index.md`, `docs/USE-CASES.md`, `docs/WORKFLOWS.md`, and a test matrix entry.
- Run `bash scripts/verify-docs.sh` with the current diff and confirm it passes when docs, changelog, and `testbright.md` are present.
- Check `docs/RUNBOOK.md` and `docs/runbooks/DEPLOYMENT.md`; both should point canonical VPS migration application to `/opt/tgroup/api/migrations/*.sql`.

Edge cases:
- Docs-only governance edits still require `docs/CHANGELOG.md`.
- Frontend, feature, contract, product-map, and backend data-flow edits require `testbright.md`.
- Supplemental migrations under `api/src/db/migrations/` must not be silently assumed to run with the canonical migration loop.
- Authority docs must not contain `<claude-mem-context>` blocks.

Regressions:
- Existing Revenue Report Excel Reconciliation TestSprite plan remains intact.
- Existing production database backup, Hosoonline, Face ID, export, and search TestSprite plans remain intact.
- Runtime behavior, API responses, and website routes should not change from this docs/governance sync alone.

Setup data and login state:
- No login state required for docs/script verification.
- Use repository root `/Users/thuanle/Documents/TamTMV/Tgrouptest`.

TestSprite execution items:
- [x] PASS 2026-05-17: `bash scripts/verify-docs.sh` passes through `npm run verify:governance` with this synchronized docs/changelog/testbright diff.
- [x] PASS 2026-05-17: `.husky/pre-commit` runs `bash scripts/verify-docs.sh` before website version checks.
- [x] PASS 2026-05-17: `.github/workflows/pr-checks.yml` includes a `doc-governance` job that runs documentation governance against the PR base SHA.
- [x] PASS 2026-05-17: `npm run verify:governance` runs the docs gate plus whitespace diff checks.
- [x] PASS 2026-05-17: Generated-memory marker grep returns no matches outside `docs/runbooks/VERIFICATION.md`.
- [x] PASS 2026-05-17: `bash scripts/sync-claude-mem.sh` does not leave generated-memory markers in `AGENTS.md`.
- [ ] PENDING: Verify `docs/RUNBOOK.md` and `docs/runbooks/DEPLOYMENT.md` both use `/opt/tgroup/api/migrations/*.sql` as the canonical deploy loop.
- [ ] PENDING: Verify `docs/DATA-MODEL.md` and `docs/MIGRATIONS.md` document 53 canonical root migrations and 2 supplemental migrations.
- [ ] PENDING: Verify payment methods in docs/contracts are `cash`, `bank_transfer`, `deposit`, and `mixed`, with no unsupported card/e-wallet methods described as live.
- [ ] PENDING: Verify key live routes above are represented in `docs/CONTRACTS.md` and `product-map/contracts/api-index.md`.

---

# TestSprite Plan: Prompt-Level Authority Gate

Feature/edit name: Prompt-Level Authority Gate

Changed URLs and API routes:
- No user-facing URLs changed.
- No runtime API routes changed.

Affected data flows:
- Each new agent prompt in Claude-compatible local tooling now runs `scripts/prompt-authority-check.sh` through `.claude/settings.json` `UserPromptSubmit`.
- The prompt gate verifies core authority files exist, strips accidental generated-memory blocks from `AGENTS.md`, checks that generated memory markers did not leak into other authority docs, and prints prompt-matched docs/domains for agents to read before edits.
- Root `npm run verify:prompt` provides the manual fallback for agents/tools that do not execute `.claude/settings.json` prompt hooks.
- Root `npm run verify:governance` now includes the prompt authority gate before doc-update and whitespace checks.

User roles:
- Architecture, product, frontend, backend, data, QA, and release agents starting or continuing project work.
- TestSprite verification agent checking that prompt-start governance is visible before implementation.

Happy paths:
- Submit a prompt mentioning payments/revenue and verify the prompt gate points to money-flow, invariants, payment domain, and payment-allocation docs.
- Submit a prompt mentioning frontend UI and verify the prompt gate points to `website/agents.md`, `website/design.md`, behavior/use-case/workflow/test docs, and `testbright.md`.
- Run `npm run verify:prompt` from the repository root and verify it passes without stdin.

Edge cases:
- If authority docs are missing, the prompt gate must fail before work starts.
- If generated memory markers leak into non-`AGENTS.md` authority docs, the prompt gate must fail and print the matching file/line.
- If generated memory markers are appended to `AGENTS.md`, the prompt gate should strip them before checking so the next prompt is not blocked by memory-tool output.
- If the active agent does not support `UserPromptSubmit`, the fallback is manual `npm run verify:prompt` at prompt start.

Regressions:
- Existing commit/PR documentation governance must still run after the prompt gate.
- The hook output must stay compact enough that prompt checking does not become token-heavy.
- Runtime app behavior should not change from this governance hook.

Setup data and login state:
- No app login required.
- Use repository root `/Users/thuanle/Documents/TamTMV/Tgrouptest`.

TestSprite execution items:
- [x] PASS 2026-05-17: `npm run verify:prompt` passes with no stdin and prints the compact authority reminder.
- [x] PASS 2026-05-17: Payment/revenue prompt text surfaces money-flow, invariants, payment domain, payment allocation, reports, and test matrix docs.
- [x] PASS 2026-05-17: Frontend prompt text surfaces website frontend/design docs, behavior, use-case, workflow, test matrix, and `testbright.md`.
- [x] PASS 2026-05-17: `.claude/settings.json` contains a `UserPromptSubmit` hook that runs `bash scripts/prompt-authority-check.sh`.
- [x] PASS 2026-05-17: `package.json` `verify:governance` runs the prompt authority gate before docs and whitespace checks.
- [x] PASS 2026-05-18: Prompt gate stripped an accidental `<claude-mem-context>` block from `AGENTS.md`, then `npm run verify:prompt` passed and marker grep returned clean.

---

# TestSprite Plan: Revenue Report Excel Reconciliation

Feature/edit name: Revenue Report Excel Reconciliation

Changed URLs and API routes:
- `/reports/revenue`
- `POST /api/Reports/revenue/summary`
- `POST /api/Reports/revenue/by-location`
- `POST /api/Exports/revenue-flat/preview`
- `POST /api/Exports/revenue-flat/download`
- `POST /api/Exports/report-sales-employees/preview`
- `POST /api/Exports/report-sales-employees/download`

Affected data flows:
- Revenue page `Tổng đã thu` uses posted payment-method totals from `/api/Reports/revenue/summary`, matching the revenue-flat Excel collected total.
- `/api/Reports/revenue/summary` keeps paid-only sale-order states instead of dropping payments whose sale order was created outside the selected report date.
- Employee revenue Excel applies the same posted allocation, deposit/refund/usage exclusion rules as revenue-flat.
- Branch revenue breakdown now honors the selected branch filter; all-location remains all branches.
- Cash-flow cards still show raw cash movement and should not be used as the Excel paid-revenue comparison.

User roles:
- Admin or manager with `reports.view`.
- Staff with `payments.export` for `revenue-flat` export.
- Staff with `reports.export` for employee revenue export.
- Scoped branch manager with assigned-location reporting access.

Happy paths:
- On `/reports/revenue`, select `2026-05-16` to `2026-05-16` and all locations; `Tổng đã thu` should equal `revenue-flat` preview `Tổng tiền` and downloaded workbook column `Số tiền`.
- Select a specific branch; revenue summary, revenue by branch, and revenue-flat preview should all use the same branch scope.
- Preview and download `Báo cáo doanh thu theo nhân viên`; deposits, refunds, deposit usage, and voided payments must not appear in employee revenue totals.

Edge cases:
- Payments collected in the selected date range for sale orders created before the selected date must still count in `Tổng đã thu`.
- A branch/date range with paid revenue but no new sale orders should still show collected revenue.
- `companyId: "all"` from any report caller should behave like no branch filter in frontend report payloads.
- Deposit top-ups and internal deposit usage remain visible only in cash-flow or deposit reports, not recognized paid revenue.

Regressions:
- Existing revenue trend, payment method donut, doctor/category breakdowns, and export preview modal still render.
- `Báo cáo doanh thu` workbook columns and filename stay unchanged.
- Existing cash-flow summary still separates money in, money out, net cash flow, and internal deposit usage.

Setup data and login state:
- Use an authenticated NK2 or local admin session with report/export permissions.
- For live reproduction, NK2 evidence used all-location filter `{ "dateFrom": "2026-05-16", "dateTo": "2026-05-16" }`.
- Download workbook and sum column `Số tiền`; do not compare dashboard `Tổng đã thu` to workbook `Tổng tiền phiếu`.

TestSprite execution items:
- [x] PRE-DEPLOY FAIL 2026-05-18: Live NK2 `/reports/revenue` for `2026-05-16` all locations still showed `Tổng đã thu` around `318.537.157 ₫`, while the posted-payment report API total was `533.697.000 ₫`; screenshot proof: `output/playwright/2026-05-18T04-48-03-856Z-feedback-06892fc6-revenue-total-fixed.png`.
- [x] PASS 2026-05-18: After NK2 web-only deploy to `v0.32.24`, `/reports/revenue` for `2026-05-16` all locations shows `Tổng đã thu 533.697.000 ₫`, matching `POST /api/Reports/revenue/summary` posted-payment total; proof screenshots: `output/playwright/2026-05-18T04-55-02-553Z-feedback-06892fc6-revenue-total-resolved-stable.png` and `output/playwright/2026-05-18T04-57-35-499Z-feedback-06892fc6-status-resolved-via-page.png`.
- [ ] PENDING: Verify `/reports/revenue` `Tổng đã thu` equals `POST /api/Exports/revenue-flat/preview` summary `Tổng tiền` for the same date/branch filters.
- [ ] PENDING: Verify downloaded `Báo cáo doanh thu` workbook column `Số tiền` equals the page `Tổng đã thu`.
- [ ] PENDING: Verify paid revenue from old sale orders inside the payment date range is not dropped from `Tổng đã thu`.
- [ ] PENDING: Verify selecting a branch scopes summary, branch breakdown, and revenue-flat preview consistently.
- [ ] PENDING: Verify employee revenue export excludes deposit, refund, deposit usage, and voided payment rows.
- [ ] PENDING: Verify cash-flow cards still show raw cash movement separately and are not mislabeled as Excel paid revenue.

---

# TestSprite Plan: TGClinic Orange Butterfly Favicon

Feature/edit name: TGClinic Orange Butterfly Favicon

Changed URLs and API routes:
- `/`
- All website routes that inherit `website/index.html`
- Static asset: `/favicon.svg`
- No API routes changed.

Affected data flows:
- Browser loads the SVG favicon from `website/public/favicon.svg`.
- Vite serves the icon through the app shell defined in `website/index.html`.
- No backend, database, auth, or user-record data flow changed.

User roles:
- Any authenticated or unauthenticated browser visitor.
- Admin, receptionist, dentist, and manager roles should see the same browser-tab icon.

Happy paths:
- Open the local website and confirm the browser tab loads the orange butterfly favicon.
- Fetch `/favicon.svg` and confirm it returns SVG content.
- Navigate between routes and confirm the favicon remains stable because the app shell owns it.

Edge cases:
- Browser cache may keep the old Vite icon until hard refresh or cache clear.
- SVG favicon should remain legible at 16x16 and 32x32 browser-tab sizes.
- Missing favicon should not block app startup or route rendering.

Regressions:
- `website/index.html` still loads `/src/main.tsx`.
- Existing page title and version bootstrap script remain unchanged.
- No API route or permission behavior changes.

Setup data and login state:
- No special data or login state required.
- Use the normal local website dev server.

TestSprite execution items:
- [ ] PENDING: Verify `GET /favicon.svg` returns the orange butterfly SVG asset.
- [ ] PENDING: Verify the browser tab icon changes from the default Vite icon to the orange butterfly on `/`.
- [ ] PENDING: Verify a nested app route keeps the same favicon after navigation.
- [ ] PENDING: Verify the app shell still mounts and renders the React app.

---

# TestSprite Plan: NK Production Database Daily Backup Rotation

Feature/edit name: NK Production Database Daily Backup Rotation

Changed URLs and API routes:
- No user-facing URLs changed.
- No API routes changed.
- VPS target: `https://nk.2checkin.com`
- VPS script: `/opt/tgroup/scripts/backup-nk-db.sh`
- Backup directory: `/opt/tgroup/backups/nk-db-daily/`

Affected data flows:
- `pg_dump` reads the production `tdental_demo` database from Docker container `tgroup-db`.
- The backup job writes compressed PostgreSQL custom-format dump files and `.sha256` checksums.
- Retention keeps only the latest 3 `nk-tdental_demo-*.dump` files after a successful new backup.

User roles:
- Infra/Release operator with root SSH access to the VPS.
- Clinic users should see no product behavior change.

Happy paths:
- Manual run of `/opt/tgroup/scripts/backup-nk-db.sh` creates a non-empty dump and checksum.
- `sha256sum -c` passes for the newest dump.
- `pg_restore -l` can list the dump table of contents through `tgroup-db`.
- Root crontab contains one daily entry scheduled for 12:00 Vietnam time.

Edge cases:
- If `tgroup-db` is missing or unhealthy, the script exits before writing a successful backup.
- If `pg_dump` creates an empty temp file, the temp file is removed and no retention cleanup runs.
- Retention cleanup should only remove older matching NK dump/checksum pairs after a successful backup.
- The VPS currently uses UTC, so the cron expression is `0 5 * * *`.

Regressions:
- Existing `tgroup-api`, `tgroup-web`, and `tgroup-db` containers must remain running.
- Existing `/opt/tgroup/backups/db-sync/` backups must not be touched.
- No database restore, sync, import, export to local, or schema migration should run as part of this job.

Setup data and login state:
- Use SSH alias `dokploy` or `root@76.13.16.68`.
- Use app path `/opt/tgroup`, container `tgroup-db`, database `tdental_demo`.

TestSprite execution items:
- [ ] PENDING: Verify the newest backup file exists in `/opt/tgroup/backups/nk-db-daily/` and is non-empty.
- [ ] PENDING: Verify the newest `.sha256` file passes `sha256sum -c`.
- [ ] PENDING: Verify `docker exec -i tgroup-db pg_restore -l < newest.dump` lists `tdental_demo` archive contents.
- [ ] PENDING: Verify `crontab -l` contains exactly one `backup-nk-db.sh` entry scheduled for `0 5 * * *`.
- [ ] PENDING: Verify the retained matching `.dump` count is not greater than 3 after future daily runs.

---

# TestSprite Plan: NK Hosoonline Session-Token Image Hotfix

Feature/edit name: NK Hosoonline Session-Token Image Hotfix

Changed URLs and API routes:
- `/customers/61d6759f-f2e2-4443-8d5b-b3a7003ab7c5`
- `/customers/:id`
- `GET /api/ExternalCheckups/:customerCode`
- `GET /api/ExternalCheckups/images/:imageName`
- `POST /api/ExternalCheckups/:customerCode/health-checkups`

Affected data flows:
- Hosoonline checkup list still loads through `GET /api/ExternalCheckups/:customerCode`.
- Proxied Hosoonline image and upload fetches now send the TGClinic bearer token from either local storage or session storage.
- Non-remembered NK login sessions should no longer get `401 {"error":"No token"}` for checkup thumbnails.

User roles:
- Authenticated admin or clinic staff with `external_checkups.view`.
- Staff with `external_checkups.upload` for upload regression coverage.

Happy paths:
- Log into NK without Remember Me, open `/customers/61d6759f-f2e2-4443-8d5b-b3a7003ab7c5`, and verify Health Checkup Images thumbnails render.
- Verify `GET /api/ExternalCheckups/images/:imageName` requests include `Authorization: Bearer ...` and return image bytes.
- With upload permission, verify add-checkup upload still sends auth to `POST /api/ExternalCheckups/:customerCode/health-checkups`.

Edge cases:
- Remember Me sessions that store the token in local storage should continue to render images.
- Missing or expired sessions should still receive 401 and trigger the existing failed-image state.
- Hosoonline `http://` media URLs should still be normalized through the existing HTTPS/proxy path.

Regressions:
- Customer profile loading, profile tabs, and the checkup list must still render.
- Existing `external_checkups.view` permission gate must continue to protect image bytes.
- Existing upload form behavior and error parsing must remain unchanged.

Setup data and login state:
- Use NK production login state.
- Use customer `T056733` from `/customers/61d6759f-f2e2-4443-8d5b-b3a7003ab7c5`, which currently has Hosoonline image records.

TestSprite execution items:
- [ ] PENDING: Verify non-remembered NK session renders Hosoonline thumbnails on `/customers/61d6759f-f2e2-4443-8d5b-b3a7003ab7c5`.
- [ ] PENDING: Verify image requests include Authorization and return `image/*`, not 401 JSON.
- [ ] PENDING: Verify remembered/local-storage sessions still render Hosoonline thumbnails.
- [ ] PENDING: Verify the upload form still sends Authorization when staff has `external_checkups.upload`.

---

# TestSprite Plan: Reporting And Permission Feedback Completion

Feature/edit name: Revenue Recognition Reports, Cash Flow Report, Payment Permission Split, and Ho so Online Upload Gate

Changed URLs and API routes:
- `/reports/revenue`
- `/reports/services`
- `/customers/:id`
- `/permissions`
- `POST /api/Reports/revenue/summary`
- `POST /api/Reports/revenue/trend`
- `POST /api/Reports/revenue/by-location`
- `POST /api/Reports/revenue/by-doctor`
- `POST /api/Reports/revenue/by-category`
- `POST /api/Reports/services/breakdown`
- `POST /api/Reports/cash-flow/summary`
- `POST /api/Payments`
- `POST /api/Payments/refund`
- `DELETE /api/Payments/:id`
- `POST /api/Payments/:id/void`
- `GET /api/ExternalCheckups/:customerCode`
- `POST /api/ExternalCheckups/:customerCode/patient`
- `POST /api/ExternalCheckups/:customerCode/health-checkups`

Affected data flows:
- Revenue report paid totals now come from posted `payment_allocations` linked to treatment invoices instead of unpaid sale-order totals or deposits.
- Deposits, refunds, deposit usage, and voided payments stay in cash-flow reporting and are excluded from revenue recognition.
- Cash-flow summary is mounted through `/api/Reports/cash-flow/summary`.
- Service/category/source report revenue uses posted payment allocations instead of listed service prices or unpaid order values.
- Payment creation, refunds, and destructive void/delete actions use separate permission strings: `payment.add`, `payment.refund`, and `payment.void`.
- Ho so Online view, patient creation, and image upload are split into `external_checkups.view`, `external_checkups.create`, and `external_checkups.upload`; the customer profile hides create/upload controls for view-only staff.

User roles:
- Super Admin/Admin with full reporting and permission access.
- Receptionist or clinic staff with payment add/view but without destructive payment void permission.
- Dentist or other view-only clinic role with `external_checkups.view` but no upload permission.
- Dental Assistant/Assistant role with assigned-location customer access and `external_checkups.upload`.
- Reporting staff with `reports.view`.

TestSprite execution items:
- [ ] PENDING: On `/reports/revenue`, verify summary paid totals match posted treatment payment allocations and do not count customer deposits.
- [ ] PENDING: On `/reports/revenue`, verify trend, location, doctor, and category breakdowns show paid service revenue by payment date.
- [ ] PENDING: On `/reports/services`, verify source/category revenue excludes unpaid listed treatment value and deposits.
- [ ] PENDING: Call `POST /api/Reports/cash-flow/summary` and verify deposits, refunds, deposit usage, voided payments, money in/out, and net cash-flow are separated.
- [ ] PENDING: With a user lacking `payment.void`, verify payment delete/void actions fail with 403 or are hidden where the UI has permission context.
- [ ] PENDING: With a user lacking `external_checkups.upload`, open `/customers/:id` and verify Ho so Online images can be viewed but the add-checkup upload button is hidden.
- [ ] PENDING: With a user that has `external_checkups.upload`, verify the add-checkup upload button appears and upload submits to `POST /api/ExternalCheckups/:customerCode/health-checkups`.
- [ ] PENDING: With a Dental Assistant/Assistant role, verify customer search/profile/Hồ sơ online upload works, while treatment, deposit, and payment creation remain blocked.
- [ ] PENDING: Open `/permissions` and verify `payment.void` and `external_checkups.upload` are visible permission options with descriptions.

Edge cases:
- Partial payments split across multiple sale-order lines.
- Overallocated imported payment allocation rows should not exceed the posted payment amount in service/person export-style calculations.
- Deposit usage with `method = deposit` should not increase revenue.
- Voided payments should stay out of recognized revenue and appear only as cash-flow adjustments.
- Ho so Online patient missing state should not show create/upload controls unless the user has the matching permission.

Regressions:
- Existing `/reports/revenue` chart/table shapes remain compatible with the frontend.
- Payment history, deposit list, and customer profile payment tabs still load for `payment.view` users.
- Existing Hosoonline image proxy remains protected by `external_checkups.view`.
- Existing permission-board role editing still saves unknown/new permission strings.

Setup data and login state:
- Use an authenticated admin session for full checks.
- Use at least one scoped clinic role without `payment.void` and without `external_checkups.upload`.
- Use customers with existing payments, deposits, and Ho so Online images.

---

# TestSprite Plan: Overview Wait Timer Arrival Timestamp Repair

Feature/edit name: Overview Wait Timer Arrival Timestamp Repair

Changed URLs and API routes:
- `/`
- `PUT /api/Appointments/:id`

Affected data flows:
- Marking an appointment `arrived` writes `datetimearrived` as Vietnam wall-clock time instead of a DB-session-dependent double timezone conversion.
- Overview `PatientCheckInCard` keeps the full `datetimearrived` timestamp through `useOverviewAppointments` and `WaitTimer` instead of comparing only time-of-day.
- In-treatment and done transitions continue stamping `datetimeseated` and `datedone` from the same Vietnam timestamp source.

User roles:
- Admin and clinic staff with `appointments.edit` and `overview.view`.

Happy paths:
- Mark a scheduled appointment as arrived from `/`, wait 3-5 seconds, and confirm the card timer counts upward instead of staying at `0s`.
- Refresh `/` after marking arrived and confirm the timer uses the persisted `datetimearrived` timestamp.
- Move the same appointment to `Đang khám` and confirm the waiting timer becomes static using the treatment start time.

Edge cases:
- Existing arrived rows with bad historical timestamps should not block new check-ins from getting correct timestamps after this fix.
- Local DB sessions with a non-Vietnam `current_setting('TimeZone')` should still stamp Vietnam wall-clock appointment timestamps.
- Persisted timestamps whose date differs from today should not clamp to `0s` only because their clock time is later than the current clock time.
- Check-in timers should not regress to whole-minute-only display after the first minute.

Regressions:
- Appointment creation still populates `datecreated` and `lastupdated`.
- Staff clear/save behavior on `PUT /api/Appointments/:id` remains intact.
- Calendar appointment listing and overview today-only filtering remain unchanged.

Setup data and login state:
- Use an authenticated admin session.
- Use any today appointment that is still scheduled or confirmed.
- For backend verification, assert the update SQL contains `NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'` and does not contain the double `UTC` timezone conversion.

---

# TestSprite Plan: Customer Appointment Start Time

Feature/edit name: Customer Appointment Start Time

Changed URLs and API routes:
- `/customers/:id`
- `GET /api/Appointments?partner_id=...`

Affected data flows:
- Customer profile appointment history now preserves a start time from `dbo.appointments.date` when the legacy `time` column is null.
- The profile hook still normalizes appointment dates to the selected timezone for date badges.
- Duration continues to use `timeexpected`.

User roles:
- Authenticated admin or clinic staff with customer profile access.

Happy paths:
- Open `/customers/9a358608-c0c2-47e5-88c0-b361006ddb39`.
- Go to `Lịch sử lịch hẹn`.
- Rows such as `AP244803` with `time = null` and timestamped `date` should show the local start time instead of `--:--`.
- Rows with explicit `time`, such as `09:00`, should keep that explicit time.

Edge cases:
- Plain `YYYY-MM-DD` dates without a time component should still show `--:--` if `time` is null.
- ISO timestamps should display in the selected app timezone, defaulting to `Asia/Ho_Chi_Minh`.

Regressions:
- Date badges must not shift one day.
- Customer profile appointment counts, doctor/team display, status badges, and edit buttons should continue to render.

Setup data and login state:
- Use an authenticated admin session.
- Use the current production customer URL `/customers/9a358608-c0c2-47e5-88c0-b361006ddb39` or another customer with migrated appointments where `time` is null and `date` contains a timestamp.

---

# TestSprite Plan: Appointment Export Time Preservation

Feature/edit name: Appointment Export Time Preservation

Changed URLs and API routes:
- `/calendar`
- `/appointments`
- `/reports/appointments`
- `POST /api/Exports/:type/preview`
- `POST /api/Exports/:type/download`

Affected data flows:
- Appointment operational Excel exports now preserve the full appointment timestamp from `dbo.appointments.date` when the legacy `time` column is empty.
- Export filename and workbook date formatting should continue to use Vietnam time.
- The API runtime should run with `TZ=Asia/Ho_Chi_Minh` so PostgreSQL timestamp parsing matches the clinic UI.

User roles:
- Authenticated admin or clinic staff with export access for calendar, appointments, or reports surfaces.

Happy paths:
- Export appointments where `date` contains a full timestamp and `time` is null; the exported workbook should show the stored appointment hour, not `00:00`.
- Export appointments where both `date` and `time` are present; the explicit legacy time should still win.
- Preview and download should return the same row count for the same filters.

Edge cases:
- Null appointment date returns a blank export date instead of crashing.
- ISO string dates and plain `YYYY-MM-DD` strings still produce valid workbook dates.
- Large date-range downloads should complete behind the production `/api` proxy timeout.

Regressions:
- Existing export types must still register and download.
- Appointment calendar display should not shift by one day or lose appointment hours.
- Export audit behavior should continue to record preview/download attempts.

Setup data and login state:
- Use an authenticated admin session, preferably `website/.auth/admin.json` if valid.
- Use appointments with `dbo.appointments.date` values containing afternoon times and null `time` values.

---

# TestSprite Plan: Accent-Insensitive Search

Feature/edit name: Accent-Insensitive Search

Changed URLs and API routes:
- `/`
- `/calendar`
- `/appointments`
- `/customers`
- `/employees`
- `/services`
- `/service-catalog`
- `/payment`
- `/permissions`
- `/api/Appointments?search=...`
- `/api/Partners?search=...`
- `/api/Employees?search=...`
- `/api/Products?search=...`
- `/api/ProductCategories?search=...`
- `/api/SaleOrders?search=...`
- Other API list searches that accept `search`, including cash books, receipts, CRM tasks, monthly plans, stock pickings, journals, payslips, commissions, and website pages.

Affected data flows:
- Overview staff search within `Lịch trình ngày` and `Lịch hẹn hôm nay` normalizes both the query and appointment text before matching.
- Overview `Today's Services / Activity` search is currently a placeholder with no service rows to filter; when service rows are added, the same accent-insensitive rule applies.
- Staff type unaccented Vietnamese search terms into frontend search inputs.
- Frontend-only list filters normalize both the query and displayed row text.
- API-backed searches send the raw query; backend SQL compares both raw and accent-stripped forms.
- Customer code, phone, appointment number, sale order number, and receipt/reference searches must still work.

User roles:
- Admin user with access to customers, calendar, appointments, employees, services, payment, settings/permissions, and reporting-style operational lists.
- Scoped clinic staff should see only data allowed by existing route permissions and location filters.

Happy paths:
- On `/`, searching `nguyen`, `thoai`, or `duong` in the Overview appointment searches finds matching accented customer, doctor, assistant, TLBS, location, or note text when matching rows exist.
- On `/`, typing into the `Lịch trình ngày` search must not change the `Lịch hẹn hôm nay` search, and typing into `Lịch hẹn hôm nay` must not change `Lịch trình ngày`.
- Searching `quyen` finds records containing `Quyền`.
- Searching `nguyen` finds records containing `Nguyễn`.
- Searching `my han` finds records containing `Mỹ Hân`.
- Existing accented searches such as `quyền` still find the same records.
- Numeric and alphanumeric searches such as phone numbers, `T8250`, `AP...`, and `SO...` still return the expected records.

Edge cases:
- Mixed case search terms.
- Extra leading/trailing spaces.
- Empty search term should return the normal unfiltered list.
- Vietnamese `đ`/`Đ` should match `d`.
- Search counts and pagination totals should match the visible filtered rows.

Regressions:
- Customer search must not fall back to phone-digit matching for alphanumeric customer codes.
- Calendar day search, Today Appointments search, payment search, service catalog category search, and permission-board employee search should not require accents.
- Backend count/aggregate queries must not fail when search uses joined display fields.

Setup data and login state:
- Use an authenticated admin session, preferably `website/.auth/admin.json` if it is still valid.
- Seed or pick records containing accented Vietnamese names such as `Phạm Thị Thảo Quyền`, `Nguyễn Thị Mỹ Hân`, and a customer code like `T8250`.

---

# TestSprite Plan: Guided Face Profile Capture

Feature/edit name: Guided Face Profile Capture

Changed URLs and API routes:
- `/customers`
- `/customers/:id`
- `POST /api/face/register`
- `GET /api/face/status/:partnerId`

Affected data flows:
- Add-customer face capture now guides staff through straight, left, and right customer head positions.
- New customers with a saved no-match face scan register all captured profile samples after the customer record is created.
- Existing customer face registration stores multiple profile samples through the existing face-register endpoint.
- Face status sample count should increase by the number of accepted profile samples.

User roles:
- Admin or clinic staff with `customers.view` and `customers.edit`.

Happy paths:
- Opening the customer add form and using face scan shows the three-step guide: straight, left, right.
- A no-match customer add stores the pending profile samples and registers them after Save.
- Editing an existing customer and pressing Register Face stores three samples without leaving the modal stuck in processing.

Edge cases:
- Camera denied shows the existing permission error.
- Staff can still switch camera before scanning.
- Manual Capture during a profile step advances to the next pose.
- Closing the modal clears pending profile samples.

Regressions:
- Quick Face ID recognition still opens from the header and can recognize or cancel.
- Existing single-image face recognition APIs remain compatible with `FaceCaptureModal` callers.
- Failed post-save face registration must not block the created customer record.

Setup data and login state:
- Use an authenticated admin session with camera permission enabled.
- Use fake camera media for browser automation, or a real local camera for manual verification.
- Use a test customer that can be safely edited for `/customers/:id` face registration checks.

---

# TestSprite Plan: CompreFace Face ID Provider

Feature/edit name: CompreFace Face ID Provider

Changed URLs and API routes:
- `/customers`
- `/customers/:id`
- Header Quick Face ID button on all authenticated routes
- `POST /api/face/recognize`
- `POST /api/face/register`
- `POST /api/face/re-register`
- `GET /api/face/status/:partnerId`
- `GET /api/health`

Affected data flows:
- Browser camera still captures the JPEG through `FaceCaptureModal`.
- Backend Face ID provider is selected by `FACE_RECOGNITION_PROVIDER=local|compreface`.
- CompreFace mode registers subjects with `partners.id`, uploads face examples to CompreFace, maps recognition subjects back to `dbo.partners`, and updates `partners.face_subject_id` / `face_registered_at`.
- Local mode continues to use `face-service` embeddings in `dbo.customer_face_embeddings`.

User roles:
- Admin or clinic staff with `customers.view` for recognition.
- Admin or clinic staff with `customers.edit` for registration/re-registration.

Happy paths:
- With `FACE_RECOGNITION_PROVIDER=compreface`, `/api/health` reports `faceProvider: "compreface"` and `checks.faceService: true` when CompreFace is reachable with a valid key.
- Registering a customer face creates or reuses a CompreFace subject and returns `{ success, partnerId, sampleId, sampleCount, faceRegisteredAt }`.
- Re-registering from `/customers/:id` replaces the CompreFace subject examples and returns all sample IDs.
- Quick Face ID recognition maps a CompreFace subject back to the correct customer and opens `/customers/:id`.

Edge cases:
- Missing or invalid `COMPREFACE_API_KEY` degrades Face ID health without blocking unrelated customer pages.
- Existing CompreFace subject returns 409 and registration still adds a new example.
- Deleted/missing CompreFace subject during re-register is ignored before recreating it.
- Unknown CompreFace subjects are ignored instead of linking to the wrong customer.
- Low-confidence results return candidates or no-match, not an automatic customer jump.
- Browser sessions without native `FaceDetector` support must not auto-capture a center face from frame quality alone.
- CompreFace recognize/register requests must send a native multipart `file` part; provider responses like "Required part file is missing" indicate the upload client is broken.
- `NO_FACE` from local or CompreFace providers must keep the camera modal open and show "Không phát hiện khuôn mặt" / "Face not detected".
- CompreFace no-face responses must return HTTP 422 with `error: "NO_FACE"`, not a generic engine error.

Regressions:
- `FACE_RECOGNITION_PROVIDER=local` still uses `face-service` and `dbo.customer_face_embeddings`.
- Single-image capture callers still work with `POST /api/face/register`.
- Guided profile capture still sends three images for re-registration.
- Manual customer search fallback still works after no-match.
- Header Quick Face ID, customer camera widget, and profile re-registration all keep capture open on no-face failures until staff manually closes it.

Setup data and login state:
- Use an authenticated admin session with camera permission enabled.
- Use fake camera media for automation or a real local camera for manual checks.
- Start CompreFace with `docker compose up -d compreface-postgres-db compreface-api compreface-core`.
- Set a valid `COMPREFACE_API_KEY` for the recognition service and set `FACE_RECOGNITION_PROVIDER=compreface`.
- Use a safe test customer whose Face ID can be replaced.

Execution checklist for the no-face fix:
- [ ] PENDING: With the camera pointed away or covered, verify the capture modal shows "Không phát hiện khuôn mặt" and remains open until cancel/close.
- [ ] PENDING: Trigger CompreFace no-face on `POST /api/face/re-register` and verify HTTP 422 `NO_FACE`, not `ENGINE_ERROR`.
- [ ] PENDING: Trigger Header Quick Face ID no-face and verify it keeps capture open without opening the no-match rescue popover.
- [ ] PENDING: Trigger customer profile re-registration no-face and verify no success toast appears until a valid face is captured.

---

# TestSprite Plan: Customer Service Quantity Save

Feature/edit name: Customer Service Quantity Save

Changed URLs and API routes:
- `/customers/:id`
- `/api/SaleOrders/:id`
- `/api/SaleOrders/lines?partner_id=...`

Affected data flows:
- Staff opens a customer profile and goes to `Phiếu khám`.
- Staff edits an existing service line quantity/unit such as `1 răng`.
- The edit form saves through the parent sale order route.
- The backend must update both `saleorders.quantity` and the rendered `saleorderlines.productuomqty`.
- The customer profile reloads sale-order lines and shows the saved quantity without a manual page reload.

User roles:
- Admin or clinic staff with `customers.edit` and service-record access.

Happy paths:
- Open a customer with at least one service line showing `1 răng`.
- Edit that service and change quantity to another value, for example `3`.
- Save the form.
- Reopen the same customer `Phiếu khám` row and confirm the quantity column shows `3 răng`.
- Reopen the edit modal and confirm the quantity field still shows the saved value.

Edge cases:
- Existing migrated rows where the line quantity differs from the parent order quantity.
- Quantity-only edits with the same price, doctor, service, and tooth values.
- Edits that also change service price, doctor, assistant, TLBS, tooth notes, or unit.

Regressions:
- Payment totals and remaining balance must not duplicate across multi-line orders.
- Delete service still targets the sale-order line id.
- Payment still targets the parent sale order id.
- Existing tooth label such as `manual` remains visible unless staff intentionally changes it.

Setup data and login state:
- Use an authenticated admin session.
- Prefer the current customer URL `/customers/f72f8c86-34e9-4377-b59c-b414002ec20c` if seeded locally.
- Use disposable or already-known QA service data when changing quantity.

## Fix Implemented (2026-05-07)

**Root cause:** `ServiceForm.tsx` stored `quantity` as a string, which caused React controlled-input reconciliation issues with `type="number"` — the browser's native number parsing conflicted with React's string value, making the input appear frozen/uneditable.

**Changes:**
- `website/src/components/services/ServiceForm.tsx`:
  - Changed `quantity` state from `string` to `number` (`initialData?.quantity ?? 1`)
  - Fixed `onChange` to parse to number: `setQuantity(v === '' ? 1 : Number(v))`
  - Simplified submit: `quantity || 1` (no more `Number()` coercion needed)
- `website/src/hooks/useServices/mapSaleOrderToServiceRecord.ts`:
  - Fixed `parseFloat("0")` being falsy: changed `order.quantity ? parseFloat(...) : 1` → `order.quantity != null ? parseFloat(...) : 1`

---

# TestSprite Plan: Customer Initial Load Performance

Feature/edit name: Customer Initial Load Performance

Changed URLs and API routes:
- `/customers`
- `/customers/:id`
- `/api/Appointments?offset=0&limit=200`
- `/api/Employees?offset=0&limit=500&active=all`
- `/api/SaleOrders?offset=0&limit=500`

Affected data flows:
- Customer list initial render after login.
- Customer profile hooks that share appointment, employee, and service data.
- Empty-search state for appointments, employees, and services.

User roles:
- Authenticated admin or clinic staff with customer access.

Happy paths:
- Open `/customers` after login and confirm the customer table renders.
- Initial customer-list load should not request profile-only appointments, employees, or sale orders.
- Opening `/customers/:id` should still request profile-specific employees and service data.
- Searching appointments, employees, or services still triggers the debounced search request after typing.

Edge cases:
- Clearing a non-empty search term should reload the unfiltered data once.
- Switching selected customer profile should still load profile-specific services.
- Location-scoped views should still pass the selected location filter.

Regressions:
- Creating or updating appointments and services should still update local state.
- Employee filters and service filters should still work after the initial fetch.
- Version display and guided face capture should continue to load.

Setup data and login state:
- Use an authenticated admin session.
- Capture browser network requests for `/customers` and compare duplicate initial API calls before and after the change.

---

# TestSprite Plan: Staff Selector Clear Option

Feature/edit name: Staff Selector Clear Option

Changed URLs and API routes:
- `/appointments`
- `/calendar`
- `/services`
- `/customers/:id` through the service edit modal
- No API route shape changed; existing appointment and sale-order save routes should receive `null`/empty staff values when staff is cleared.

Affected data flows:
- Appointment edit/add form doctor, assistant, and dental-aide selectors.
- Service edit/add form doctor, assistant, and dental-aide selectors.
- Shared `DoctorSelector` clear action now emits `null` instead of an empty string.

User roles:
- Admin or clinic staff allowed to add/edit appointments and patient service records.

Happy paths:
- Open an appointment or service with a selected doctor, assistant, or TLBS.
- Open the staff dropdown and click `Không chọn (None)`.
- Save and reopen the record; the cleared field should stay empty.
- Select another staff member after clearing and save successfully.

Edge cases:
- Clear only one staff role while leaving the other two selected.
- Clear all three staff selectors and save.
- Use search inside the dropdown, then clear the current selection.

Regressions:
- Staff search remains accent-insensitive.
- Staff dropdown still filters by the correct role: doctor, assistant, and doctor-assistant.
- Calendar/service edit saves still close normally and refresh visible records after success.

Setup data and login state:
- Use an authenticated admin session.
- Use any appointment or service record that already has doctor, assistant, or TLBS selected.

Fix implemented:
- The shared staff selector now shows the `Không chọn (None)` clear row whenever clearing is enabled, even if the current record has a stale selected id that does not resolve in the active staff list.

---

# TestSprite Plan: Customer Payment Identity Reconciliation

Feature/edit name: Customer Payment Identity Reconciliation

Changed URLs and API routes:
- `/payment`
- `/customers/:id`
- `GET /api/Payments`
- `GET /api/Payments?customerId=...&type=payments`
- `GET /api/Payments/deposits`
- `GET /api/Payments/deposit-usage`
- `GET /api/Payments/:id`

Affected data flows:
- Canonical payment rows now include the linked customer name, phone, and location name from `dbo.partners` / `dbo.companies`.
- `/payment` history maps canonical `dbo.payments` rows into visible customer payment rows without losing customer identity.
- Payment search can match customer names and phones on canonical payment rows, including accent-insensitive searches like `ma van thanh`.
- Customer profile payment tabs and service history still use the same payment and allocation IDs.

User roles:
- Admin or clinic staff with `payment.view`.
- Staff with customer profile access when checking `/customers/:id` payment history.

Happy paths:
- Open `/payment`, search `ma van thanh`, and confirm payments for `MÃ VĂN THÀNH - UP` remain visible.
- Search `0985227087` and confirm both duplicate customer profiles can be reconciled from visible payment identity.
- Open `T050559` customer profile and confirm orthodontic payments total `14.801.000 ₫` against `SO45244`.
- Open `T058004` customer profile and confirm the two `700.000 ₫` payments remain separate on the QL profile.

Edge cases:
- Payment rows with missing partner records should still render without crashing.
- Legacy `accountpayments` fallback rows should include customer identity when fallback is used.
- Voided payments should keep existing status behavior.
- Deposit and deposit-usage endpoints should still return the same rows and counts.

Regressions:
- `/payment` all-location history should not lose receipt/reference code display.
- Outstanding balance cards should still derive from sale orders and not double-count canonical payment rows.
- Customer profile service residual display should still use sale order residual and allocation data.
- Existing accent-insensitive search behavior across payment text fields should remain intact.

Setup data and login state:
- Use an authenticated admin session with `payment.view`.
- Use local customer records `T050559` (`MÃ VĂN THÀNH - UP`) and `T058004` (`MÃ VĂN THÀNH - QL`), both phone `0985227087`.
- Use local sale order `SO45244` and payment references `CUST.IN/2026/103918`, `CUST.IN/2026/103919`, and `CUST.IN/2026/102219` as verification anchors.

---

# TestSprite Plan: Customer Service Paid Total Reconciliation

Feature/edit name: Customer Service Paid Total Reconciliation

Changed URLs and API routes:
- `/customers/:id`
- `GET /api/SaleOrders/lines`

Affected data flows:
- Customer service rows derive the paid total from posted payment amounts when imported payment allocation rows overstate the receipt amount.
- Expanded service payment history remains tied to canonical `dbo.payments` rows and should match the service row total.
- Residual display recalculates from the corrected paid amount and imported sale-order total.

User roles:
- Admin or clinic staff with `services.view`.
- Staff reviewing customer service history and payment history on a customer profile.

Happy paths:
- Open customer `T050557` / sale order `SO45243` and expand the payment history.
- Confirm the 8 history rows add to `15.400.000 ₫`.
- Confirm the collapsed service row shows paid `15.400.000 ₫` and residual `4.400.000 ₫` for total `19.800.000 ₫`.
- Confirm direct posted service payments without allocation rows still count in service paid totals.

Edge cases:
- Imported allocation rows where one payment is duplicated above its real posted amount.
- Payments split across more than one invoice should be proportionally capped only when the total allocation exceeds the real payment.
- Voided or non-payment category records should not increase the service paid total.

Regressions:
- Customer service rows with no overallocated imports should keep the same paid and residual totals.
- Service history sorting and product/doctor/dental-aide fields should remain unchanged.
- Payment button and expanded payment-history drawer should still render for partially paid services.

Setup data and login state:
- Use an authenticated admin session with `services.view`.
- Use local customer `T050557` and sale order `SO45243`.
- Verification anchor receipts: `CUST.IN/2025/80040`, `CUST.IN/2025/80041`, `CUST.IN/2025/84122`, `CUST.IN/2025/88698`, `CUST.IN/2025/92961`, `CUST.IN/2026/99621`, `CUST.IN/2026/102814`, `CUST.IN/2026/106326`.

---

# TestSprite Plan: Employee Sales Export Payment Reconciliation

Feature/edit name: Employee Sales Export Payment Reconciliation

Changed URLs and API routes:
- `/reports`
- Operational export preview/download route for the employee sales report builder.

Affected data flows:
- Employee sales report/export rows normalize overallocated imported `payment_allocations` rows before splitting payment amount across service lines.
- Report totals should match actual posted payment amounts instead of duplicated imported allocation amounts.

User roles:
- Admin or reporting staff with report/export permission.

Happy paths:
- Preview and export employee sales revenue for a date range that includes a fully paid imported service.
- Confirm the report total does not exceed the underlying posted payment amount when allocation rows are duplicated.
- Confirm line-level splitting still works for services with multiple active sale-order lines.

Edge cases:
- Payment allocations whose total exceeds the posted payment amount.
- Multi-line service orders where a normalized allocation needs to be split by line price.
- Location-scoped report users should keep the same permission behavior.

Regressions:
- Normal report filters for date, company, employee type, and employee ID still apply.
- Export workbook grouping and summary totals remain unchanged for non-overallocated data.

Setup data and login state:
- Use an authenticated admin/reporting session.
- Use a date range containing known overallocated imported sale orders such as `SO45243` or high-delta examples from the audit query.

---

# TestSprite Plan: NK2 Feedback Bug Triage

Feature/edit name: NK2 Feedback Bug Triage

Changed URLs and API routes:
- `https://nk2.2checkin.com/feedback`
- `GET /api/Feedback/all`
- `GET /api/Feedback/all/:threadId`

Affected data flows:
- Feedback admin page lists pending staff-submitted bug reports from `feedback_threads`.
- Feedback verification API returns manual staff reports plus auto-detected API/frontend error threads.
- Report artifacts are written under `reports/feedback-extract/`.

User roles:
- Admin with feedback moderation access.
- QA/TestSprite reviewer reading pending bug reports and auto-error clusters.

Happy paths:
- Log into NK2 as an admin and open `/feedback`.
- Confirm the page lists all pending manual staff reports.
- Fetch `GET /api/Feedback/all` with the same admin session and confirm the manual count matches the visible table.
- Confirm the generated report separates manual staff bugs from auto-detected 401/403 noise, backend 500 clusters, and frontend errors.

Edge cases:
- Expired or missing admin token should redirect to `/login` and not expose feedback data.
- Auto-detected 401/403 threads should be treated as auth/session noise unless tied to a confirmed workflow.
- Backend 500 clusters should preserve endpoint, status, latest timestamp, and occurrence count.
- Manual reports from NK and NK2 URLs should keep the original page URL for reproduction.

Regressions:
- `/feedback` table filtering, status labels, and `View` actions should still work.
- Login should still return to the authorized admin surface after authentication.
- Release notes toast should not block access to the feedback table.

Setup data and login state:
- Use NK2 admin login from `.agents/live-site.env`.
- Latest audit report: `reports/feedback-extract/2026-05-16T12-21-43-239Z-feedback-verification.md`.

TestSprite execution items:
- [ ] PENDING: Verify `/feedback` shows the 8 pending manual staff reports.
- [ ] PENDING: Verify `GET /api/Feedback/all` returns 345 pending feedback threads on NK2.
- [ ] PENDING: Verify manual staff reports are prioritized above auto-error clusters.
- [ ] PENDING: Verify auth/permission noise is not mixed into the manual bug list.

## Face Lab auto-capture reliability (2026-05-18)
- URL: `/face`
- API: `POST /api/face/recognize`
- Verify all 4 modules complete auto-capture within ~15s on browsers without native FaceDetector (Safari, Firefox, Chrome with flag off).
- Verify forced-capture safety net fires at 15s using best frame seen.
- Verify adaptive threshold relaxes after 6s and 10s of scanning.
- Verify "Capture now" button immediately triggers capture using best frame.

## Face Lab inline registration (2026-05-18)
- URL: `/face`
- API: `POST /api/face/register` (multipart partnerId + image)
- Verify: activate Burst module, capture face, no_match result shows "Register this face to a customer" button
- Verify: clicking opens search panel; typing 2+ chars calls `GET /api/Partners?search=...`
- Verify: clicking a customer registers the captured blob; success badge shows partner name
- Re-running the lab against same face should now return a match

## Face Lab recognize-failed recovery (2026-05-18)
- URL: `/face` (iPhone Safari especially)
- Verify: if `POST /api/face/recognize` times out or fails, the lab still shows the captured frame and the Register-face panel
- Verify: camera stops as soon as capture completes (LED off before upload)
- Verify: Register-face still works against captured blob after a recognize failure

## Face ID engine swap (2026-05-18)
- Surface: Global Face ID button (top bar), CustomerCameraWidget, AddCustomerForm
- Verify: opening Face ID and holding face captures within 5-15s on Safari, Firefox, iOS
- Verify: 5-frame burst — best of 5 sent to /api/face/recognize (check captured-blob size > 30 KB)
- Verify: profile-mode 3-pose registration on customer profile still works
- Regression: /face URL returns 404 (lab removed)

## External-checkup empty state + Create success notice (2026-05-18, v0.32.31)
- URL: `/customers/<UUID>` for any customer with no Hosoonline patient yet (e.g. `T056483`)
- API: `GET /api/ExternalCheckups/:code`, `POST /api/ExternalCheckups/:code/patient`
- Verify (patient missing): empty gallery shows `checkupEmptyPatientMissing` VN text "Khách hàng chưa có hồ sơ trên Hosoonline. Bấm 'Tạo bệnh nhân HSO' để bắt đầu tải ảnh lên." and the "Tạo bệnh nhân HSO" button is visible (requires `external_checkups.upload` perm)
- Verify (patient exists, no images): empty gallery shows `checkupEmptyNoImages` VN text "Chưa có ảnh khám nào trên Hosoonline. Bấm 'Thêm lịch khám' để tải ảnh lên."
- Verify (auth failed): shows amber `checkupEmptyAuthFailed` warning instead of generic gray text
- Verify (create success): clicking "Tạo bệnh nhân HSO" shows emerald success notice "Đã tạo hồ sơ Hosoonline. Bạn có thể tải ảnh khám lên ngay." and the gallery refreshes so the upload button becomes available
- Verify (i18n): switch language to EN; all 6 empty-state variants render English strings (no hardcoded fallbacks)
- Regression: customer with existing checkups + images still renders the gallery normally (e.g. customer code `T6281` returns 2 checkups with images that load through `/api/ExternalCheckups/images/...`)

---

# TestSprite Plan: SMS/Zalo Appointment Messaging Research

Feature/edit name: SMS/Zalo Appointment Messaging Research

Changed URLs and API routes:
- Research only; no runtime URL or API route changed.
- Future implementation plan covers `/notifications`, `/calendar`, `/customers/:id`, Overview today queue.
- Future API plan covers `GET /api/Notifications/templates`, `POST /api/Notifications/templates`, `PUT /api/Notifications/templates/:id`, `POST /api/Notifications/preview`, `POST /api/Notifications/send`, `GET /api/Notifications/messages`, `GET /api/Notifications/messages/:id`, `POST /api/Notifications/messages/:id/retry`, `GET /api/Notifications/late-appointments`, `POST /api/Notifications/appointments/:id/late-reminder`, and customer contact-preference endpoints.

Affected data flows:
- Appointment lateness detection from appointment schedule fields, appointment state, and `datetimearrived`.
- Customer contact routing through `partners.id`, `phone`, `zaloid`, and `receiverzalonumber`; phone must not be treated as unique.
- Future append-only messaging outbox, attempt log, template, provider-account, and contact-preference tables.
- Provider adapter flow for dry-run, Vietnam SMS Brandname, and later Zalo ZBS/ZNS.

User roles:
- Reception/front desk with appointment view and future `notifications.send`.
- Manager/admin with future `notifications.view`, `notifications.edit`, `notifications.send`, and `notifications.admin`.
- Staff without notification permissions must not see send/retry/admin controls.
- Location-scoped staff must not see or send reminders for another branch/location.

Happy paths:
- Open `/notifications` and verify templates, outbox statuses, provider status, and message detail history render after implementation.
- Open `/calendar` on a day with a late eligible appointment and verify the manual late-reminder action is visible.
- Send one late reminder and verify the message row records queued/sent status, rendered body snapshot, provider response, actor, channel, and appointment/customer links.
- Open customer profile and verify communication preferences and recent message history are visible without assuming phone uniqueness.
- Verify dry-run provider records the full send flow locally without contacting a real provider.

Edge cases:
- Missing phone, invalid phone, opted-out customer, duplicate phone across customers, missing appointment time, timezone boundary around midnight, already arrived, cancelled, done, in-progress, provider outage, provider timeout, rejected template, quiet-hours block, duplicate click, and worker race.
- SMS copy must avoid treatment names, health details, balances, URLs, and phone numbers unless provider/legal approval explicitly allows them.
- Zalo route must use approved template IDs and handle customers who do not have Zalo eligibility.

Regressions:
- `/notifications` existing route guard must continue to require notification permission.
- Calendar appointment load, check-in, cancel, and quick-add flows must not change when the messaging controls are hidden.
- Customer profile contact edits must not change the durable partner identity invariant.
- Existing appointment reminder fields must not be silently repurposed as the only audit trail.
- Provider webhook callbacks must require signature/shared-secret verification or remain internal polling only; unsigned callbacks must not update message status.

Setup data and login state:
- Use authenticated admin/manager and receptionist/staff sessions.
- Seed at least one scheduled/confirmed appointment 15+ minutes late today, one arrived appointment, one cancelled appointment, one other-branch late appointment, one customer with no phone, one duplicate-phone customer pair, one opted-out customer, and one dry-run provider config.
- Collect screenshot evidence for `/notifications`, `/calendar` late appointment state, and customer communication history when browser-visible verification runs.

TestSprite execution items:
- [ ] PENDING: Verify `/notifications` messaging dashboard renders templates, outbox statuses, failed/skipped states, and retry details.
- [ ] PENDING: Verify `/calendar` exposes manual late-reminder action only for eligible late appointments.
- [ ] PENDING: Verify a manual late reminder creates one outbox row and one provider attempt with an idempotency key.
- [ ] PENDING: Verify duplicate send attempts for the same appointment/template/customer do not create duplicate successful messages.
- [ ] PENDING: Verify missing/invalid/opted-out contact cases create skipped or blocked states, not crashes.
- [ ] PENDING: Verify customer profile communication preferences and message history key by `partners.id`, not phone number.
- [ ] PENDING: Verify staff without `notifications.send` cannot send or retry reminders.
- [ ] PENDING: Verify staff without `notifications.edit` cannot create/edit templates or provider settings.
- [ ] PENDING: Verify staff without `notifications.admin` cannot access provider/admin configuration.
- [ ] PENDING: Verify location-scoped staff cannot view or send reminders for another branch/location.
- [ ] PENDING: Verify unsigned or invalid provider webhook callbacks do not update message status.

## 2026-05-19 — Feedback Attachment Persistence / Revenue Proof Restore

Feature/edit name:
- Feedback attachment transaction hardening and NK revenue-resolution proof-image restore.

Changed URLs and API routes:
- Browser-visible: `https://nk.2checkin.com/feedback`, affected thread `06892fc6-5ccc-4c22-ad00-fed55199e9ad` on `/reports/revenue`.
- Upload/static route: `/uploads/feedback/:storedName`.
- API routes: `POST /api/Feedback`, `POST /api/Feedback/my/:threadId/reply`, `POST /api/Feedback/all/:threadId/reply`, `DELETE /api/Feedback/all/:threadId`.

Affected data flows:
- User/admin file upload -> `uploads/feedback/*` -> `feedback_messages` -> `feedback_attachments` -> `/uploads/feedback/*` static serving -> `/feedback` image preview.
- Thread deletion -> DB attachment/message/thread delete commit -> physical file cleanup after commit.

User roles:
- Admin/manager viewing all feedback and replying with resolution proof images.
- Staff creating feedback or replying to their own feedback with screenshots.

Happy paths:
- Admin opens `/feedback`, selects the May 17 revenue-report resolved thread, and sees the restored proof image load without a broken image/empty thumbnail.
- Admin reply with text plus image succeeds and the returned attachment URL loads with HTTP 200.
- Staff creates file-only feedback and staff/admin file-only replies succeed with empty message content plus a valid image attachment.
- Admin deletes a feedback thread and attached files disappear only after the DB delete succeeds.

Edge cases:
- Reply with no text and no file returns 400 without creating rows or files.
- Reply with uploaded file to a missing thread returns 404 and removes the uploaded file.
- Attachment DB insert/enrichment failure rolls back message/thread updates and removes the uploaded file.
- Delete-route DB failure before commit must not delete physical files that still have DB rows.

Regressions:
- Existing text-only feedback creation/reply behavior remains unchanged.
- Existing feedback list/detail endpoints still populate messages and attachments.
- `/uploads/feedback/*` continues to serve JPEG/PNG/GIF/WebP files through production nginx/API routing.

Setup data and login state:
- Use an authenticated admin session for `t@clinic.vn` on NK production.
- Use feedback thread `06892fc6-5ccc-4c22-ad00-fed55199e9ad` and restored file `c51c44c8-8b39-4fdc-b881-6c70711160ca.jpg` as regression evidence.
- Orphan-row backup for unrecoverable stale attachments: `/opt/tgroup/backups/feedback-orphan-attachments-20260519T0249Z.csv`.
- Capture screenshot evidence of the loaded proof image in `/feedback` after deployment.

TestSprite execution items:
- [ ] PENDING: Verify `/feedback` thread `06892fc6-5ccc-4c22-ad00-fed55199e9ad` loads the restored revenue proof image.
- [ ] PENDING: Verify new admin reply with image returns a `/uploads/feedback/*` URL that loads HTTP 200.
- [ ] PENDING: Verify file-only staff feedback and file-only staff/admin replies do not crash.
- [ ] PENDING: Verify missing-thread file replies clean up uploaded files and do not create `feedback_attachments` rows.
- [ ] PENDING: Verify delete rollback simulation does not remove physical files before DB commit.

## 2026-05-24 — Cosmetic Deposit And Payment LOB Routing

Feature/edit name:
- Cosmetic deposit wallet and customer payment API routing.

Changed URLs and API routes:
- Browser-visible surfaces: customer profile payment modal/deposit wallet, `/payment`.
- Dental API routes remain top-level: `/api/Payments`, `/api/Payments/deposits`, `/api/Payments/deposit-usage`, `/api/CustomerBalance/:id`.
- Cosmetic API routes must be used when active LOB is Cosmetic: `/api/cosmetic/Payments`, `/api/cosmetic/Payments/deposits`, `/api/cosmetic/Payments/deposit-usage`, `/api/cosmetic/Payments/:id/void`, `/api/cosmetic/Payments/:id`, `/api/cosmetic/Payments/refund`, `/api/cosmetic/CustomerBalance/:id`.

Affected data flows:
- `BusinessUnitContext.currentLOB` -> deposit hooks/customer payment hooks -> `website/src/lib/api/payments.ts` and `customerBalance.ts` -> `apiFetch` cosmetic prefix -> isolated cosmetic DB payment and balance rows.
- Cosmetic deposit creation, refund, void, update, delete, deposit usage, and service payment creation must not read or mutate dental payment rows.

User roles:
- Admin or staff with Cosmetic LOB access and payment permissions.
- Dental users and Dental active LOB remain on legacy top-level payment routes.

Happy paths:
- In Cosmetic LOB, opening a customer deposit wallet fetches deposits, deposit usage, and balance from `/api/cosmetic/*`.
- In Cosmetic LOB, creating a deposit makes the balance visible in the same payment modal/customer wallet refresh.
- In Cosmetic LOB, creating a service payment with deposit usage posts through `/api/cosmetic/Payments`.
- Dental LOB still fetches and mutates the legacy `/api/Payments*` and `/api/CustomerBalance/:id` routes.

Edge cases:
- Cosmetic customer has deposit history but zero dental balance; UI must show the cosmetic balance, not dental 0.
- Mixed/cash/bank payments with `deposit_used` must stay in the active LOB.
- Void/delete/update/refund actions must refresh from the same active LOB after mutation.
- LOB toggle changes must not keep stale dental customer payment/deposit state in Cosmetic.

Regressions:
- Dental customer payment history, wallet top-up, refund, void, delete, update, and balance display remain unchanged.
- Payment history fallback from sale orders remains unchanged for Dental and Cosmetic.
- Existing permission handling for payment add/refund/void/delete remains backend-owned and unchanged.

Setup data and login state:
- Use a dual-scope admin session with active LOB set to Cosmetic.
- Use at least one Cosmetic customer with a posted 500,000 VND deposit and one service invoice/dotkham eligible for deposit usage.
- Repeat with active LOB Dental for a known dental customer to confirm legacy route behavior.

TestSprite execution items:
- [ ] PENDING: Verify Cosmetic customer wallet opens and calls `/api/cosmetic/Payments/deposits`, `/api/cosmetic/Payments/deposit-usage`, and `/api/cosmetic/CustomerBalance/:id`.
- [ ] PENDING: Verify Cosmetic deposit creation posts to `/api/cosmetic/Payments` and refreshes the cosmetic balance in the payment modal.
- [ ] PENDING: Verify Cosmetic service payment creation with deposit usage posts to `/api/cosmetic/Payments`.
- [ ] PENDING: Verify Cosmetic deposit refund, void, delete, and update actions stay on `/api/cosmetic/Payments*`.
- [ ] PENDING: Verify Dental payment/deposit flows still use top-level `/api/Payments*` and `/api/CustomerBalance/:id`.

## 2026-05-24 — Cosmetic Appointment Save LOB Routing

Feature/edit name:
- Cosmetic appointment create/update API routing from calendar and customer-profile appointment forms.

Changed URLs and API routes:
- Browser-visible: `/calendar`, `/customers/:id` appointment create/edit surfaces.
- API routes: Cosmetic saves must call `POST /api/cosmetic/Appointments` and `PUT /api/cosmetic/Appointments/:id`; Dental saves must continue calling `POST /api/Appointments` and `PUT /api/Appointments/:id`.

Affected data flows:
- `BusinessUnitContext.currentLOB` -> `useAppointmentForm` -> `createAppointment` / `updateAppointment`.
- `BusinessUnitContext.currentLOB` -> `useAppointments` -> list/search/create/update/status/cancel appointment API calls.
- `apiFetch` receives `lob: 'cosmetic'` so it prefixes `/api/cosmetic/*`; Dental remains legacy top-level.

User roles:
- Admin or scoped staff using the Cosmetic LOB calendar/customer profile.
- Dental staff using the existing Dental appointment flows.

Happy paths:
- With active LOB Cosmetic, calendar appointment create saves through `/api/cosmetic/Appointments`.
- With active LOB Cosmetic, customer-profile appointment edit saves through `/api/cosmetic/Appointments/:id`.
- With active LOB Dental, appointment create/edit continues to use legacy `/api/Appointments`.

Edge cases:
- Switching LOB before saving must use the current active LOB, not stale state.
- Appointment search/list refreshes must use the selected LOB.
- Check-in advance, status update, and cancel actions must use the selected LOB.

Regressions:
- Dental appointment form validation, duration mapping, and appointment update behavior must remain unchanged.
- Calendar list/search filters by selected location must still work.
- Cosmetic saves must not write into Dental appointments.

Setup data and login state:
- Use an authenticated admin with both `dental` and `cosmetic` LOB access.
- Seed or create one Cosmetic customer, one Cosmetic location, and one Cosmetic service.
- Use one existing Dental appointment as a regression comparison.

TestSprite execution items:
- [ ] PENDING: Verify Cosmetic `/calendar` appointment create sends `POST /api/cosmetic/Appointments` and appears after refresh under Cosmetic only.
- [ ] PENDING: Verify Cosmetic `/calendar` appointment update sends `PUT /api/cosmetic/Appointments/:id`.
- [ ] PENDING: Verify Cosmetic `/customers/:id` appointment save uses `/api/cosmetic/Appointments`.
- [ ] PENDING: Verify Dental `/calendar` appointment create/update still uses top-level `/api/Appointments`.
- [ ] PENDING: Verify Cosmetic appointment search/list, check-in advance, status update, and cancel actions stay inside `/api/cosmetic/Appointments`.

---

# TestSprite Plan: Admin CTV Full Edit

Feature/edit name: Admin CTV Full Edit (name / phone / email / password)

Changed URLs and API routes:
- `https://tmv.2checkin.com/commission` > `CTV` tab — new Edit (Sửa) button per row + Edit modal
- `PUT /api/Ctvs/:id` (admin-only) — new endpoint

Behavior to verify:
- Admin opens Commission > CTV tab, clicks Edit (Sửa) on a CTV row; modal opens pre-filled with name, phone, email; password field is blank with a "leave blank to keep current" hint.
- Saving with edited name/phone/email persists via `PUT /api/Ctvs/:id`; the table reflects the new values after reload and the DB row is updated.
- Entering a new password resets the CTV login: the new credentials authenticate (HTTP 200) and the old password is rejected (HTTP 401).
- Leaving the password blank keeps the existing password unchanged.

Edge cases:
- Setting a phone/email already used by another partner returns `U_DUPLICATE_PHONE` / `U_DUPLICATE_EMAIL` (400); re-saving the CTV's own current phone/email is allowed (no false duplicate).
- Invalid email format → `U_INVALID_EMAIL`; password shorter than 6 chars → `U_WEAK_PASSWORD`; empty body → `VALIDATION` (all 400).
- Editing a cosmetic-scoped CTV mirrors the change into the cosmetic DB; a dental-only CTV does not error on the missing cosmetic row.

Regressions:
- CTV list, source badge, and suspend/reactivate behavior remain unchanged.
- Non-admin callers receive 403 `S_FORBIDDEN` from `PUT /api/Ctvs/:id`.

Setup data and login state:
- Authenticated admin `t@clinic.vn` / `123123`.
- At least one CTV row present in the demo DB.

TestSprite execution items:
- [ ] PENDING: Verify Edit (Sửa) modal opens pre-filled with the CTV's name/phone/email and a blank password field.
- [ ] PENDING: Verify editing name/phone/email saves via `PUT /api/Ctvs/:id` and the table + DB reflect the new values.
- [ ] PENDING: Verify a new password resets login (new creds → 200, old creds → 401).
- [ ] PENDING: Verify duplicate phone/email returns 400 while re-saving the CTV's own current values succeeds.
- [ ] PENDING: Verify invalid email, weak password, and empty body each return the documented 400 error codes.
- [ ] PENDING: Verify a non-admin caller gets 403 `S_FORBIDDEN`.

---

# TestSprite Plan: Legacy CTV Hierarchy Reconciliation

Feature/edit name: NK3 legacy CTV hierarchy import and reconciliation

Changed URLs and API routes:
- Browser-visible: `https://tmv.2checkin.com/commission` > `CTV` tab, including legacy source badges and hierarchy data.
- API routes/data surfaces: `GET /api/Ctvs`, `GET /api/cosmetic/Ctvs`, CTV login through `POST /api/Auth/login` for legacy phone/ref identifiers.

Affected data flows:
- Legacy source `ctv_db.ctv` active CTV rows -> NK3 Dental `dbo.partners` and Cosmetic `dbo.partners`.
- Legacy CTV code/phone remains the login identifier; copied legacy password hashes stay on the imported CTV rows.
- Legacy upline code -> `partners.referred_by_ctv_id` in both Dental and Cosmetic databases.

User roles:
- Admin/staff reviewing CTVs in Cosmetic LOB.
- Imported legacy CTV users logging in with their legacy phone/ref and password.

Happy paths:
- Admin opens the CTV tab and sees all imported legacy CTVs with legacy source labels.
- Imported legacy CTV login resolves by phone/ref and uses the copied legacy password hash.
- Kien's CTV row exists in both NK3 databases and opens a hierarchy tree with 17 direct downlines.
- The full legacy graph has 198 active legacy CTV rows, 147 upline links, 51 root/no-upline rows, and 0 orphan uplines in each NK3 database.

Edge cases:
- Existing NK3 CTV rows with matching legacy refs must be updated in place, not duplicated.
- Missing legacy CTVs with phone collisions against non-CTV customer records must be inserted as dedicated CTV rows instead of merged into customer rows.
- Root CTVs with no legacy upline, including Kien, must keep `referred_by_ctv_id = NULL`.
- Existing copied password hashes must be preserved when updating already imported legacy CTV rows.

Regressions:
- Non-legacy NK3 CTV records remain active and are not converted to legacy source.
- Dental and Cosmetic CTV counts may differ by pre-existing non-legacy rows, but legacy import counts and hierarchy links must match.
- Historical clients, services, appointments, and earnings are not rewritten by this reconciliation.

Setup data and login state:
- Source backup: `backups/ctvlegacy/full-hierarchy-20260529-153624/vps-ctv_db-before-full-hierarchy-repair-20260529-153624.dump`.
- Target backups: `backups/ctvlegacy/full-hierarchy-20260529-153624/vps-tdental_smoketest-before-full-hierarchy-repair-20260529-153624.dump` and `backups/ctvlegacy/full-hierarchy-20260529-153624/vps-tcosmetic_smoketest-before-full-hierarchy-repair-20260529-153624.dump`.
- Dry-run artifact: `artifacts/ctv-import/full-hierarchy-20260529-153624/full-hierarchy-repair-dry-run.json`.

Execution verification:
- [x] PASS: Full hierarchy repair applied to NK3 after two explicit confirmations.
- [x] PASS: Dental has 198 legacy CTVs, 147 with upline, 51 without upline, and 0 orphan uplines.
- [x] PASS: Cosmetic has 198 legacy CTVs, 147 with upline, 51 without upline, and 0 orphan uplines.
- [x] PASS: Kien exists in both databases as an active legacy CTV with a copied password hash, no upline, and 17 direct downlines.
- [x] PASS: Live `GET /api/ctv/hierarchy` for Kien returns 17 direct downlines, 107 total downlines, and 0 uplines.
- [x] PASS: Live `/ctv` browser screenshot captured at `screenshots/tmv-kien-ctv-hierarchy-20260529.png`.

TestSprite execution items:
- [ ] PENDING: Verify `https://tmv.2checkin.com/commission` > `CTV` tab shows legacy source labels for imported CTV rows.
- [ ] PENDING: Verify Kien's hierarchy tree displays 17 direct downlines under the root Kien row.
- [ ] PENDING: Verify one imported legacy CTV can log in with their legacy phone/ref and known password.
- [ ] PENDING: Verify legacy CTV search works with names and phone/ref last digits without duplicate rows.
- [ ] PENDING: Verify Dental and Cosmetic CTV tabs show the same 198 legacy imported CTV identities, allowing only pre-existing non-legacy count differences.

---

# TestSprite Plan: NK3 CTV Appointment, Service Reversal, and Admin Flow

Feature/edit name: NK3 CTV referral appointment, commission reversal guard, and admin five-tab CTV flow

Changed URLs and API routes:
- Browser-visible: `https://tmv.2checkin.com/ctv` refer-client modal.
- Browser-visible: `https://tmv.2checkin.com/commission` five tabs: Config, CTV, New Clients, Earnings, Payouts.
- API routes: `POST /api/ctv/bookings`, `GET /api/ctv/client-lookup`, `DELETE /api/SaleOrderLines/:id`, `DELETE /api/cosmetic/SaleOrderLines/:id`, `GET /api/NewClients`, `GET /api/Earnings`, `GET /api/Payouts`, export types `new-clients`, `ctv-earnings`, `ctv-payouts`.

Affected data flows:
- CTV phone lookup -> existing available partner -> CTV modal name prefill without overwriting manual input.
- CTV booking -> `dbo.partners` create/reclaim/customer=true -> `dbo.appointments` only; selected service or Referral Start default goes to `appointments.productid`.
- Service reversal -> `payment_allocations`/saleorder residuals/payments/earnings stay consistent; paid-out CTV commissions block reversal.
- Admin commission page -> five-step breadcrumb flow; clean date labels on New Clients, Earnings, and Payouts; earned dates visible before payout selection.

User roles:
- CTV portal user with `is_ctv=true`.
- Admin/staff with Cosmetic LOB access, `customers.edit`, `payment.void`, `ctv.manage`, and commission payout/export permissions.

Happy paths:
- On `/ctv`, enter phone `0123123123` in Cosmetic when the client exists and is available; the name field pre-fills and booking creates one appointment only.
- Booking with no selected service creates an appointment whose `productid` is the active Referral Start product when configured.
- Booking with a selected service creates an appointment with that service as `productid` and no service card.
- Deleting an unpaid service line soft-deletes the line and parent order when it is the last active line.
- Deleting a paid single-line service with unpaid/pending CTV earnings voids the linked single-invoice payment, restores residual, and creates negative earnings reversals.
- `/commission` shows the five tabs as a breadcrumb workflow; date filters render as readable dates instead of raw `YYYY-MM-DD`.

Edge cases:
- Existing client claimed by another CTV still blocks with `B_CLIENT_CLAIMED`.
- A bad or cross-LOB selected `productId` is dropped to `null` and does not break appointment creation.
- Service reversal with `earnings.status='paid'` or `payout_id IS NOT NULL` returns `B_COMMISSION_PAID_OUT` and does not delete the service.
- Service reversal with a payment allocated to multiple invoices/dotkhams returns `B_PAYMENT_MIXED_ALLOCATIONS`.
- Service reversal on a paid order with multiple active lines returns `B_SERVICE_PAYMENT_REQUIRES_ORDER_VOID`.

Regressions:
- CTV booking must never create `dbo.saleorders` or `dbo.saleorderlines`.
- Dental and Cosmetic routes must remain LOB-isolated.
- Payment delete/void paid-out guards from `POST /api/Payments/:id/void` and `DELETE /api/Payments/:id` must still work.
- Existing CTV Excel exports for New Clients, Earnings, and Payouts must still preview/download.

Setup data and login state:
- NK3 deploy target: `https://tmv.2checkin.com`, Cosmetic LOB.
- Admin login with access to Cosmetic and commission payout/export permissions.
- CTV test account able to open `/ctv`.
- Test records: one available existing Cosmetic client by phone, one pending single-line paid service with unpaid earnings, and one paid-out earning linked to a payout/proof.

TestSprite execution items:
- [ ] PENDING: Verify `/ctv` phone lookup pre-fills the name for an existing available Cosmetic client and does not prefill when the user already typed a name.
- [ ] PENDING: Submit `/ctv` booking with no service and confirm one `dbo.appointments` row with Referral Start `productid`, no `saleorders`, and no `saleorderlines`.
- [ ] PENDING: Submit `/ctv` booking with a selected service and confirm the appointment uses that service `productid`, with no service card.
- [ ] PENDING: Try a claimed client and confirm `B_CLIENT_CLAIMED`.
- [ ] PENDING: Delete unpaid service line and confirm line/order soft-delete only.
- [ ] PENDING: Delete paid single-line service with pending commission and confirm payment void + residual restore + negative earnings reversal.
- [ ] PENDING: Delete service linked to paid-out commission and confirm `B_COMMISSION_PAID_OUT` with no service/payment mutation.
- [ ] PENDING: Verify `/commission` five-tab breadcrumb flow and readable date labels on New Clients, Earnings, and Payouts.
- [ ] PENDING: Verify New Clients, Earnings, and Payouts Excel preview/download still work with active date filters.

---

# TestSprite Plan: NK Production Login Monitor 2026-06-02

Feature/edit name: NK production read-only login health monitor

Changed URLs and API routes:
- Browser-visible: `https://nk.2checkin.com/`, `https://nk.2checkin.com/customers`, `https://nk.2checkin.com/calendar`.
- API routes observed only through live app navigation/login; no route was changed.

Affected data flows:
- Production login via the visible login form.
- Read-only dashboard, customer list, and calendar page loads after authentication.

User roles:
- Existing clinic account `t@clinic.vn` with production access.
- Fallback account `t@clinic.com` only if the primary account cannot log in.

Happy paths:
- Primary account logs in without visible login errors.
- Three distinct visible-navigation screens load nonblank content.
- Browser console, page errors, and `/api/*` responses remain free of blocking errors.

Edge cases:
- If primary login fails, retry with fallback credentials and capture the visible login error.
- If a page is blank, visibly broken, or reports a blocking API error, preserve screenshots and network evidence before fixing.

Regressions:
- Do not create, edit, delete, submit, or otherwise mutate production data during the monitor.
- Keep screenshots privacy-redacted when reporting production UI evidence.

Setup data and login state:
- Target: `https://nk.2checkin.com`.
- Credentials checked in order: `t@clinic.vn / 123123`, then `t@clinic.com / 123123` only if needed.
- Evidence directory: `output/playwright/nk-login-monitor-20260602-000500/`.

Execution verification:
- [x] PASS: Primary account `t@clinic.vn` logged in successfully; fallback was not used.
- [x] PASS: Overview `/` loaded through visible navigation with nonblank content and no visible error; screenshot `output/playwright/nk-login-monitor-20260602-000500/redacted-safe/01-overview-privacy-redacted.png`.
- [x] PASS: Customers `/customers` loaded through visible navigation with nonblank content and no visible error; screenshot `output/playwright/nk-login-monitor-20260602-000500/redacted-safe/02-customers-privacy-redacted.png`.
- [x] PASS: Calendar `/calendar` loaded through visible navigation with nonblank content and no visible error; screenshot `output/playwright/nk-login-monitor-20260602-000500/redacted-safe/03-calendar-privacy-redacted.png`.
- [x] PASS: Monitor result recorded 0 API errors, 0 console errors, and 0 page errors.

---

# TestSprite Plan: NK3 Extracted PRD 2026-06-05

Feature/edit name: Code-grounded TestSprite PRD extraction for tmv.2checkin.com / NK3

Changed URLs and API routes:
- Documentation only: `/Users/thuanle/Documents/TamTMV/Tgrouptest/docs/PRD-extracted.md`
- Target site for generated tests: `https://tmv.2checkin.com`
- UI/API surfaces to test are enumerated in `docs/PRD-extracted.md`; no runtime route changed.

Affected data flows:
- No production/local data mutation from this extraction.
- TestSprite should use the PRD's feature entries and open questions to decide executable versus skipped assertions.

User roles:
- Public visitor.
- Staff/admin with route permissions.
- Cosmetic-scoped staff.
- CTV user.

Happy paths:
- Use PRD entries `AUTH-1` through `AVATAR-1` to generate tests for working and partial features.
- Prioritize `/welcome`, `/ctv/join`, `/ctv`, `/calendar`, `/customers`, `/payment`, `/commission`, and `/service-catalog` for NK3 Cosmetic.

Edge cases:
- Treat PRD `STATUS: partial|broken|unknown` features as guarded tests or expected-failure notes, not green-path assertions.
- Assert avatar selection as missing/broken unless the user answers the avatar open question.
- Confirm Cosmetic flag/LOB access before running `/api/cosmetic/*` expectations.

Regressions:
- Do not create wallet, payout, payment, service, appointment, or CTV data on live without explicit test data setup.
- Do not test USDT/crypto funding because no source-backed rule exists in this codebase.

Setup data and login state:
- Target: `https://tmv.2checkin.com`, NK3 Cosmetic.
- Needs: admin/staff account with Cosmetic and relevant permissions; CTV account for `/ctv`; public CTV phone for `/welcome` booking; test customer/client phones safe for mutation only if approved.

TestSprite execution items:
- [ ] PENDING: Import `docs/PRD-extracted.md` into TestSprite as the source PRD.
- [ ] PENDING: Resolve OPEN QUESTIONS 1-22 before turning partial/broken surfaces into pass/fail assertions.

---

# TestSprite Plan: NK3 CTV Business Logic Addendum 2026-06-05

Feature/edit name: CTV referral and commission business-logic authority doc from operator interview

Changed URLs and API routes:
- Documentation only: `/Users/thuanle/Documents/TamTMV/Tgrouptest/docs/business-logic/ctv-referral-commission.md`
- Cross-linked docs: `BEHAVIOR.md`, `DECISIONS.md`, `docs/INVARIANTS.md`, `product-map/domains/ctv.yaml`, `product-map/domains/earnings-commissions.yaml`, `product-map/business-logic/commission-rules.md`
- Runtime URLs/API routes changed: none.

Affected data flows:
- Future CTV service-card commission generation.
- CTV claim/timer eligibility.
- CTV booking appointment-only flow.
- Admin service/appointment CTV reassignment.
- CTV tier config, braces override, payouts, hierarchy moves, and customer deposit wallet history.

User roles:
- Public CTV signup visitor.
- CTV portal user.
- Admin/staff creating service cards, appointments, payments, payouts, and CTV hierarchy changes.

Happy paths:
- Service card with selected CTV creates CTV earnings from full service price immediately using tier config.
- CTV booking creates appointment only and no commission.
- Public signup without upline creates active root/top-level CTV; signup with upline attaches under that CTV.
- Admin payout can be Dental-only, Cosmetic-only, or combined with linked LOB payout rows.

Edge cases:
- Service card without selected CTV creates no CTV earnings even if customer has appointment owner.
- Disabled or missing uplines get no money; company keeps missing percentages.
- Paid-out CTV earnings block cancel/delete/refund/service CTV reassignment.
- Dental Braces/Orthodontics override is planned and must not be asserted as current working code.
- Avatar selection remains not implemented/skipped for NK3 TestSprite.

Regressions:
- Do not use product/service `commission_rate_percent` as CTV commission source.
- Do not use payment-collected timing as the accepted CTV earning trigger.
- Do not let Dental claim locks block Cosmetic claims or Cosmetic locks block Dental claims.
- Do not add payment edit workflow; correction is delete/void plus new payment.

Setup data and login state:
- Target: `https://tmv.2checkin.com`, default Cosmetic LOB unless Dental-specific Braces testing is explicitly requested.
- Needs dedicated mutation-safe test CTV/customer/service records before any live create/delete/refund/payout assertions.

TestSprite execution items:
- [ ] PENDING: Import `docs/business-logic/ctv-referral-commission.md` as business-rule context beside `docs/PRD-extracted.md`.
- [ ] PENDING: Treat rows marked `target`, `planned`, or `gap` as expected implementation gaps until code is updated.
- [ ] PENDING: Use `INV-003C` for future CTV service-card commission tests.

---

# TestSprite Plan: CTV spec Wave 8 — remove staff payment edit 2026-06-05
Feature: §9/gap#11 — payments are corrected by delete/void + new, not edited. Flags: PAYMENT_EDIT_DISABLED (api), VITE_PAYMENT_EDIT_DISABLED (web).
- [x] PASS: LIVE on tmv.2checkin.com — PATCH /api/Payments/:id returns 405 B_PAYMENT_EDIT_DISABLED; GET/list still 200; CustomerProfile edit-deposit button hidden.

---

# TestSprite Plan: CTV spec Wave 5 — Braces override (Dental-only) 2026-06-05
Feature: §5 — braces/ortho services use a separate higher tier (full price). Flag BRACES_OVERRIDE_ENABLED. Migration 056 (braces_commission_level_config, tdental_nk3 only).
- [x] PASS: LIVE on tmv.2checkin.com — dental braces card @1,000,000 → earnings L0=300000 (30% braces), vs 24% standard for non-braces. Detection by name OR category (incl. VN "Niềng răng" category); fixed a real category-detection miss found in live test.

---

# TestSprite Plan: CTV spec Wave 4 — Combined payouts (backend) 2026-06-05
Feature: §10 — combined payout = one LOB-local row in Dental + Cosmetic linked by payout_group_id + shared receipt. Migration 057.
- [x] PASS: LIVE on tmv.2checkin.com — POST /api/Payouts/combined created payout rows in tdental_nk3 AND tcosmetic_nk3 with the SAME payout_group_id (1587d680) + identical receipt; earnings marked paid. Partial-failure path returns 409/partial.
- [ ] PENDING (UI): CTV portal one-combined-row (expandable) + admin All-filter combined view — payout_group_id is now exposed on GET /api/Payouts for the UI to group.
- [ ] NOTE (separate bug): X-LOB request header is ignored on POST /api/SaleOrders (cosmetic create ran in dental) — pre-existing, not part of this spec.

---

# TestSprite Plan: CTV spec Wave 6 — Hierarchy move (backend) 2026-06-05
Feature: §12 — admin moves a CTV's upline only when fresh (no referrals/services/earnings); auto audit log. Migration 058 (audit_logs).
- [x] PASS: LIVE on tmv.2checkin.com — POST /api/Ctvs/:id/move on a FRESH CTV → 200, referred_by_ctv_id updated both DBs + audit_logs 'move' row. Moving a CTV WITH activity → 409 B_CTV_HAS_ACTIVITY (guard works). Admin-only (403 otherwise).
- [ ] PENDING (UI): drag-and-drop hierarchy tree in the admin CTV portal (CtvHierarchyPanel) wired to POST /:id/move.

---

# TestSprite Plan: CTV spec Waves 4/6/7 UI — browser-verified 2026-06-05
- [x] PASS: W6 drag-drop (commission → CTV tab) LIVE — 213 draggable CTV rows + drag hint; drop re-parents via POST /Ctvs/:id/move (Playwright screenshot /tmp/nk3_W6_ctv_mgmt.png).
- [x] PASS: W7 deposit history (/payment) LIVE — customer selector (9 opts) + deposit-wallet history panel with transactions, no edit button (Playwright /tmp/nk3_W7_v2.png).
- [x] PASS: W4 combined-payout display (commission → Chi trả, LOB=All) LIVE — one 'Combined' row, per-LOB breakdown ↳dental 240k/↳cosmetic 240k, total 480k (Playwright /tmp/nk3_W4_combined.png).
- ALL 8 waves of docs/business-logic/ctv-referral-commission.md now up and running + verified on tmv.2checkin.com.

---

# TestSprite Plan: NK3 post-redeploy read-only verification 2026-06-05
Feature/edit name: NK3 v0.32.101 redeploy smoke — public CTV signup/booking, Cosmetic admin pages, and deploy health.

Changed URLs and API routes checked:
- `https://tmv.2checkin.com/version.json` reports `0.32.101`; commit metadata is `unknown`.
- `https://tmv.2checkin.com/api/health` returns healthy with DB and face-service checks true.
- `https://ctv.thammyvientam.com/` renders CTA links to `/welcome?book=1`, `/ctv/join`, and `/ctv`.
- `https://tmv.2checkin.com/ctv/join` renders the no-login CTV signup form.
- `https://tmv.2checkin.com/welcome?book=1` opens the public customer referral booking sheet.
- Authenticated Cosmetic pages checked read-only: `/?lob=cosmetic`, `/customers?lob=cosmetic`, `/calendar?lob=cosmetic`, `/commission?lob=cosmetic`, `/payment?lob=cosmetic`.
- Public API route checked read-only: `GET /api/ctv-public/services` returned 200; `GET /api/ctv-public/ctv-lookup?phone=0000000000` returned `{ exists:false }`.

Affected data flows:
- Public CTV signup display only; no live CTV created in this verification.
- Public appointment booking display only; no live booking submitted in this verification.
- Cosmetic admin read flows for dashboard, customers, calendar, commission, and payment.
- NK3 database schema read-only check: `appointments.ctv_id` exists on both `tdental_nk3` and `tcosmetic_nk3`; service-card earnings idempotency index exists on both DBs.

User roles:
- Public visitor on the Tâm landing and no-login CTV signup/booking routes.
- Authenticated admin/staff with Cosmetic LOB access.

Happy paths:
- Landing CTA hrefs resolve to real TMV routes instead of dead paths.
- CTV signup form loads without requiring login and shows name, phone, optional email, password, and referrer phone fields.
- `/welcome?book=1` opens the booking/referral sheet immediately.
- Cosmetic dashboard, customers, calendar, commission, and payment pages render with no browser-captured API 4xx/5xx errors.

Edge cases and regressions:
- Do not treat live `gitCommit: unknown` as commit-level proof; use version/build-time/container start plus screenshots until build args are fixed.
- Keep checks read-only unless mutation-safe CTV/customer/payment records are explicitly approved.
- API logs still contain legacy endpoint errors for `commissions`, `accountjournals`, and a customer-receipts column mismatch; authenticated pages checked here did not surface them, but TestSprite should watch those routes separately.

Setup data and login state:
- Target: `https://tmv.2checkin.com`, default Cosmetic LOB.
- Browser evidence: `website/output/playwright/nk3-redeploy-check-20260605T111600Z/` and `website/output/playwright/nk3-auth-readonly-check-20260605T111833Z/`.
- VPS evidence: `tgroup-nk3-web` started `2026-06-05T07:08:32Z`; `tgroup-nk3-api` started `2026-06-05T06:36:32Z`.

TestSprite execution items:
- [x] PASS: Public route and API read-only smoke for v0.32.101 redeploy.
- [x] PASS: Authenticated Cosmetic read-only smoke across dashboard/customers/calendar/commission/payment.
- [ ] PENDING: Separate mutation-safe TestSprite run for public signup submit and booking submit using approved disposable data.
- [ ] PENDING: Fix deploy build metadata so `version.json` reports the actual git commit and branch.
