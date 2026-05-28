# Agent Handoff — CTV Referral Claim, Tasks T4–T9

You are implementing the rest of the CTV referral-claim feature. Tasks T1–T3 are already done and committed. Do T4 → T5 → T6 → T8 → T7 → T9 (T6 depends on T4; T7 depends on T6; rest independent).

---

## 🚨 RULE 0 — WORKTREE DISCIPLINE (a previous agent failed this — do not repeat)

**ALL work happens in this worktree on this branch:**
- Path: `/Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-ctv-mlm-commission`
- Branch: `feat/ctv-mlm-commission`

**The shell `cd` does NOT persist between bash tool calls. Begin EVERY bash command with:**
```bash
cd /Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-ctv-mlm-commission
```

**Before EVERY `git commit`, verify you are in the right place — if either check fails, STOP and fix `cd`, do NOT commit:**
```bash
test "$(git rev-parse --show-toplevel)" = "/Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-ctv-mlm-commission" \
  && test "$(git branch --show-current)" = "feat/ctv-mlm-commission" \
  && echo "OK to commit" || echo "WRONG WORKTREE/BRANCH — STOP"
```
A sibling worktree at `/Users/thuanle/Documents/TamTMV/Tgrouptest/` is branch `fix/feedback-reports` (the user's other work) — NEVER commit there.

**Other rules:**
- One commit per task. The husky pre-commit hook REQUIRES a `docs/CHANGELOG.md` entry — add one line under the existing `## [unreleased] — 2026-05-22 (feat/ctv-mlm-commission)` block (pick `### Added`/`### Changed`) for each task, or the commit is rejected. Never use `--no-verify`.
- Do NOT touch `AGENTS.md`, `product-map/test-matrix.md`, or restructure `docs/CHANGELOG.md` (a prior agent over-reached). Only append the one CHANGELOG line per task.
- Never run anything against `*_smoketest` or production DBs except in the explicit T9 deploy step. Local dev DBs are Homebrew Postgres on `127.0.0.1:5433` (`tdental_demo`, `tcosmetic_demo`).

---

## The full plan (READ THIS — it has the exact code)

`docs/superpowers/plans/2026-05-22-ctv-referral-claim.md` — Tasks 4–9 contain copy-paste code, test code, and commands. Follow them. This handoff adds the corrections below.

## Already done (verified facts — do NOT redo)
- **T1** migration `api/migrations/050_add_referral_start_product.sql` → `commission_settings.referral_start_product_id UUID NULL` (applied to both demo DBs).
- **T2** `api/src/services/referralClaim.js` exports `computeClaim` + `getReferralClaimStatus(clientId, lob, { asOf, txClient, getDb })`. Returns `{ ownerCtvId, ownerName, anchorDate, expiresAt, active }`.
- **T3** `commissionEngine.resolveRecipient` + `createEarningsForPayment` accept `asOf` + injectable `referralClaim`; CTV credited only when claim active.

## Verified schema (use these EXACT names — already confirmed against the DB)
- `dbo.payments`: customer FK = `customer_id`, date = `payment_date`, `amount`. (NOT `partnerid`/`paymentdate`.)
- `dbo.partners`: `id, name, phone, email, password_hash, is_ctv, referred_by_ctv_id, lob_scope (text[]), customer, employee, active, supplier, isagent, isinsurance, iscompany, ishead, isbusinessinvoice, isdeleted, datecreated, lastupdated`. (All those NOT-NULL bools must be set on INSERT.)
- `dbo.saleorders` / `dbo.saleorderlines`: see `api/src/routes/saleOrders/createSaleOrder.js` for the exact insert (saleorder needs `state='sale'`, `code` from `nextval('dbo.saleorder_code_seq')`).
- **T6 BLOCKER — VERIFY BEFORE WRITING THE APPOINTMENT INSERT:** the plan's `dbo.appointments` insert is a GUESS. Run `cd … && PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -c "\d dbo.appointments"` and read `api/src/routes/appointments/mutationHandlers.js` for the canonical insert (real column names, NOT-NULL columns, date/time types). Match it exactly.

## Auth/admin facts
- Admin detection: `const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService')`; `isAdminPermissionState(permState)` is true for the admin group (the admin's permission list does NOT literally contain `'*'`). Use it.
- `req.user` carries `{ employeeId, is_ctv }`. CTV self-recruit is gated by `is_ctv`, not a permission.
- Password hashing uses `bcryptjs` (NOT `bcrypt`). uuid: `const { v4: uuidv4 } = require('uuid')`.
- Error-envelope shape used across routes: `res.status(4xx).json({ error: { code, message, ...extra } })`.

## Tasks

**T4 — `api/src/services/referralCard.js` (+ test).** Plan Task 4 verbatim. `createReferralStartCard({ clientId, lob })` creates a zero-amount saleorder ('Referral Start', state 'sale') + saleorderline referencing `commission_settings.referral_start_product_id`; throw `REFERRAL_PRODUCT_NOT_CONFIGURED` if unset. TDD: write test, fail, implement, pass. Commit.

**T5 — extend `api/src/routes/partners/resolveHandler.js`.** Plan Task 5. After resolving the partner, attach `referralClaim = await getReferralClaimStatus(partner.id, req.lob || 'dental', {})` to the JSON. Add a test mirroring a sibling `partners/__tests__` file. Commit.

**T6 — `POST /bookings` in `api/src/routes/ctv.js`.** Plan Task 6 (already mounted at `/api/ctv`). Flow: resolve client by phone (or `clientId`) → `getReferralClaimStatus` → if active && owner ≠ caller → `400 { error: { code: 'B_CLIENT_CLAIMED', ownerName, expiresAt } }` → else create client if new (mirror the `POST /clients` insert already in this file) / re-claim (`UPDATE partners SET referred_by_ctv_id = caller`) → `createReferralStartCard` → create appointment (USE VERIFIED `dbo.appointments` COLUMNS). Catch `REFERRAL_PRODUCT_NOT_CONFIGURED` → 409. Add the block-case test. `node --check`. Commit.

**T8 — customer profile "Referred by".** Plan Task 8. Add `referralClaim` to `api/src/routes/partners.js` `GET /:id` response (same 2 lines as T5) + test. Then in `website/src/pages/Customers/CustomerProfileContent.tsx` render the owner + active/lapsed badge (only when `referralClaim?.ownerCtvId`). Add `referralClaim` to the page's profile TS type. `cd website && npx tsc --noEmit --pretty false`. Commit.

**T7 — CTV panel booking.** Plan Task 7. Add `createBooking` to `website/src/lib/api/ctv.ts` (`POST /ctv/bookings`) + vitest. Extend the `+ Client` sheet in `website/src/pages/CtvDashboard.tsx` with a `date` field; on submit call `createBooking`; on `e.code === 'B_CLIENT_CLAIMED'` show an inline Vietnamese message with the expiry date. tsc clean. Commit.

**T9 — docs + version + verify + deploy.** Plan Task 9. Bump `website/package.json` patch + top `website/public/CHANGELOG.json` entry (validate JSON). Register `POST /api/ctv/bookings` + `referralClaim` in `product-map/contracts/api-index.md`; `B_CLIENT_CLAIMED` + `REFERRAL_PRODUCT_NOT_CONFIGURED` in `BEHAVIOR.md`; park admin force-reassign in `product-map/unknowns.md`; NK3 checks in `testbright.md`. Run: `cd api && npx jest` (green), `cd website && npx tsc --noEmit && npx vite build && npx depcruise --output-type err src`. Commit. Push: `git push origin feat/ctv-mlm-commission`.

  **Deploy to NK3 ONLY (NK + NK2 untouched):**
  1. Apply migration 050 to the two smoketest DBs: `ssh -o BatchMode=yes root@76.13.16.68 'for db in tdental_smoketest tcosmetic_smoketest; do docker exec -i tgroup-db psql -U postgres -d $db -v ON_ERROR_STOP=1 < /opt/tgroup-nk3/app/api/migrations/050_add_referral_start_product.sql; done'` (run AFTER the app swap below so the file is present, OR pipe from the local file).
  2. Tarball deploy: `git archive --format=tar.gz -o /tmp/nk3-cosmetic-v14.tgz HEAD && scp /tmp/nk3-cosmetic-v14.tgz root@76.13.16.68:/opt/tgroup-nk3/` then on VPS `cd /opt/tgroup-nk3 && ts=$(date -u +%Y%m%dT%H%M%SZ) && mv app app.bak-pre-v14-$ts && mkdir app && tar xzf nk3-cosmetic-v14.tgz -C app && docker compose -f runtime/docker-compose.nk3.yml up -d --build api web`.
  3. Admin step: create the "Referral Start" product (price 0) in the catalog on NK3, then set it: `docker exec tgroup-db psql -U postgres -d tcosmetic_smoketest -c "UPDATE dbo.commission_settings SET referral_start_product_id = '<the-product-uuid>'"` (and tdental_smoketest if dental CTVs apply). Note in unknowns if no UI to pick it yet.
  4. Live E2E with the browser origin header (curl omits Origin and would bypass CORS — always send it): `curl -s -X POST https://ctv.2checkin.com/api/Auth/login -H 'Content-Type: application/json' -H 'Origin: https://ctv.2checkin.com' -d '{"email":"t@clinic.vn","password":"123123"}'` to get a token, then exercise `/api/ctv/bookings`: a new client books (created + Referral Start card + appointment), and a second CTV is blocked with `B_CLIENT_CLAIMED`.

## Report when done
For each task: commit SHA + test pass count. For T6: the actual `dbo.appointments` columns you used. For T9: the deployed version + the live `B_CLIENT_CLAIMED` proof. Confirm `git rev-parse --show-toplevel` was the feat worktree for every commit.
