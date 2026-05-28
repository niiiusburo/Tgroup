# GOAL — Finish the Cosmetic LOB / CTV-MLM Commission Feature

You are the executor agent. This is a self-contained mission brief — everything you need to know to take this feature from ~75% done to **production-ready on NK3 (`tmv.2checkin.com`)** without re-deriving anything. Do NOT touch NK or NK2.

---

## 🚨 RULE 0 — WORKTREE DISCIPLINE (non-negotiable)

ALL work happens here:
- Path: `/Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-ctv-mlm-commission`
- Branch: `feat/ctv-mlm-commission`

The shell `cd` does **not** persist between bash tool calls. Begin EVERY bash command with:
```bash
cd /Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-ctv-mlm-commission
```

BEFORE every `git commit`, run this guard. If it prints STOP, fix `cd` and try again. A prior agent committed to the wrong branch and I had to revert.
```bash
test "$(git rev-parse --show-toplevel)" = "/Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-ctv-mlm-commission" \
  && test "$(git branch --show-current)" = "feat/ctv-mlm-commission" \
  && echo OK || echo STOP
```
The sibling path `/Users/thuanle/Documents/TamTMV/Tgrouptest/` is branch `fix/feedback-reports` (user's other work). NEVER commit there.

Other invariants:
- The husky pre-commit hook **requires** a `docs/CHANGELOG.md` entry. Add one line per commit under the existing `## [unreleased] — 2026-05-22 (feat/ctv-mlm-commission)` block. Never use `--no-verify`.
- Do not edit `AGENTS.md`, `product-map/test-matrix.md`, or restructure CHANGELOG sections.
- Never run anything against `*_smoketest` or production DBs unless explicitly in the deploy step. Local dev DBs are Homebrew Postgres `127.0.0.1:5433` (`tdental_demo`, `tcosmetic_demo`).
- Web version bumps: `website/package.json` semver patch + a top entry in `website/public/CHANGELOG.json` (validate JSON before commit).

---

## What this feature is (one paragraph)

Cosmetic clinic Line-of-Business v2 with a CTV (cộng tác viên / referral partner) MLM commission system layered on top. Architecture: two physical Postgres DBs (`tdental_*`, `tcosmetic_*`), LOB-aware `apiFetch` routing, header LOB toggle for admins, separate CTV mobile portal at `/ctv`. The MLM money loop is: admin configures a 5-level commission split + per-service referral % → CTV books a referred client (claiming them for 6 months) → payment triggers `commissionEngine` which splits the pool up the upline chain only while the claim is active → admin batches selected pending earnings into a payout cycle. NK3 is the canonical sandbox (`https://tmv.2checkin.com`, `*_smoketest` DBs, port 5375 web / 3202 api).

---

## What's DONE (do NOT rebuild — trust these facts)

### Backend (committed on `feat/ctv-mlm-commission`)
- `api/migrations/047_add_cosmetic_lob_v2_dental_additive.sql` — `partners.is_ctv`, `referred_by_ctv_id`, `lob_scope text[]`; `products.commission_rate_percent NUMERIC(5,2)`; **`dbo.earnings`** (append-only) + **`dbo.payouts`** + `dbo.consultations` + `dbo.referral_locks` + `earnings.payout_id` FK col.
- `api/migrations/049_add_commission_level_config.sql` — `dbo.commission_level_config(level int unique, label, enabled bool, share_percent numeric(5,2))` seeded L0–L4 = 72.7/14.5/7.3/3.6/1.8; `dbo.commission_settings` singleton with `default_referral_percent`; `earnings.level` int col.
- `api/migrations/050_add_referral_start_product.sql` — `commission_settings.referral_start_product_id uuid`.
- `api/src/services/commissionEngine.js` — D13 priority (`referred_by_ctv_id` > cosmetic consultation > dental salestaff). For `source='ctv'`: walks `referred_by_ctv_id` upline ≤5 levels, splits pool per level config, skips disabled levels (remainder stays with clinic, no redistribution). Other sources write single full-pool row at level 0. **Credits CTV only while claim active as of payment date** (`asOf` passed from `createEarningsForPayment`). Accepts injectable `referralClaim` for tests. 11 jest cases.
- `api/src/services/referralClaim.js` — `computeClaim` (pure) + `getReferralClaimStatus(clientId, lob, { asOf, txClient, getDb })` → `{ ownerCtvId, ownerName, anchorDate, expiresAt, active }`. `anchor = max(earliest Referral Start saleorderline date, last paid-service date)`; active for 6 months. 14 jest cases.
- `api/src/services/referralCard.js` — `createReferralStartCard({ clientId, lob })` writes a zero-amount saleorder + line referencing `commission_settings.referral_start_product_id`. Throws `REFERRAL_PRODUCT_NOT_CONFIGURED` if unset.
- `api/src/routes/ctv.js` — `GET /commission-summary` (cross-DB CTV self-view), `GET /referrals`, `GET /me`, `POST /` (create CTV, CTV-or-admin, instant active, `employee=true` for login, `lob_scope` as text[] array), `POST /clients` (refer customer), `POST /bookings` (eligibility gate: blocks `400 B_CLIENT_CLAIMED` with `ownerName`+`expiresAt` when actively claimed by another CTV; else creates/re-claims client + Referral Start card + appointment; `409 REFERRAL_PRODUCT_NOT_CONFIGURED`). Use `crypto.randomUUID()` (NOT `require('uuid')` — uuid v13 is ESM and crashes jest).
- `api/src/routes/ctvs.js` — admin `GET /` list + `PATCH /:id` suspend.
- `api/src/routes/commissionConfig.js` — admin `GET /` + `PUT /` (validates enabled-sum ≤ 100 → `B_LEVEL_SUM_EXCEEDS_100`). Uses real column names `label`, `share_percent` (not `display_name`/`sharePercent` — a prior agent guessed wrong).
- `api/src/routes/partners/resolveHandler.js` + `getPartnerById.js` — both return `referralClaim: { ownerCtvId, ownerName, active, expiresAt } | null`.

### Frontend (committed)
- `website/src/pages/CtvDashboard.tsx` — 4-tab mobile portal (Home/Comm/Refs/Me), orange brand. Header has `+ Client` (booking) + `+ CTV` (signup) pills under the title. `+ Client` sheet calls `createBooking` and shows Vietnamese `B_CLIENT_CLAIMED` message on conflict.
- `website/src/pages/Commission.tsx` — admin page with **four** sub-tabs: Config, CTVs, Earnings, Payouts. Config has raw-string % inputs (decimals + clear work), live ≤100% validation. CTVs has list/suspend/Add. Earnings + Payouts come from `EarningsPayoutsTabs.tsx`.
- `website/src/lib/api/ctv.ts` + `commission.ts` — typed clients for all of the above.
- `website/src/components/customer/CustomerProfile/ProfileHeader.tsx` — renders "Người giới thiệu (CTV): `<name>` · còn hiệu lực đến `<date>` / đã hết hạn".
- `website/src/hooks/useCustomerProfile.ts` + `lib/api/partners.ts` — typed `referralClaim` on profile.

### Infra / deploy
- NK3 canonical domain: **`https://tmv.2checkin.com`** (LE cert, auto-renew). Old `ctv.2checkin.com` 301-redirects `/` to tmv, keeps `/tbot/*` (kanban). CORS allowlist swapped accordingly (committed `0213bcd1`). NK + NK2 untouched.
- Deployed: web 0.32.41, migration 050 on both `*_smoketest` DBs, "Referral Start" product created + `referral_start_product_id` set on both smoketest DBs.
- Live E2E proven (with `Origin: https://tmv.2checkin.com` header — curl omits Origin by default, so it bypasses CORS and gives false-passes; ALWAYS send the Origin header):
  - Admin login 200 · CommissionConfig GET/PUT (with sum>100 → `B_LEVEL_SUM_EXCEEDS_100`) · admin Ctvs list · admin creates CTV → CTV can log in (redirect `/ctv`) · CTV-A books new client → 201 (`clientId`+`appointmentId`+Referral Start card auto-created) · CTV-B books same client → **400 `B_CLIENT_CLAIMED`** (expiresAt = 6 months from card).

### Uncommitted on disk (you must commit, with `cd` + branch guard)
- `api/src/routes/earnings.js` — `GET /` gated by `commissions.view.team`. Admin Earnings list.
- `api/src/routes/payouts.js` — `GET /` + `POST /` gated by `commissions.payout.run`. Admin Payouts.
- `website/src/components/commission/EarningsPayoutsTabs.tsx` — admin Earnings + Payouts UIs (consumed by `Commission.tsx`).
- A 0.32.45 cosmetic-router fix is logged in `docs/CHANGELOG.md` ("Fixed: TMV/NK3 /commission no longer errors on Cosmetic LOB: the cosmetic router now exposes /api/cosmetic/CommissionConfig and /api/cosmetic/Ctvs") — verify that change actually exists in `api/src/server.js` (search for `cosmeticRouter.use('/CommissionConfig'` and `/Ctvs`) and commit if not yet committed.

---

## Verified facts (use these — do NOT re-verify)

| Concern | Truth |
|---|---|
| Worktree | `/Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-ctv-mlm-commission`, branch `feat/ctv-mlm-commission` |
| `dbo.payments` cols | FK = `customer_id`, date = `payment_date`, `amount` (NOT `partnerid`/`paymentdate`) |
| `dbo.partners` NOT-NULL bool cols on insert | `supplier, customer, isagent, isinsurance, active, employee, iscompany, ishead, isbusinessinvoice, isdeleted` (set them all explicitly) |
| Auth source DB | `query()` defaults to dental; login requires `employee = true AND isdeleted = false AND active = true`. CTV partner rows MUST have `employee=true` to log in. |
| Password hashing | `bcryptjs` (NOT `bcrypt`). The `bcrypt` package isn't installed. |
| Admin detection | `const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService'); isAdminPermissionState(permState) === true` for the admin group. Admin's permission list does **not** literally contain `'*'`. The middleware `requirePermission(x)` checks for `effectivePermissions.includes('*')` OR the named perm — so admin must either match the wildcard via state, or be granted the named permission, or your handler bypasses with `isAdminPermissionState`. **WARN:** `earnings.js`/`payouts.js` use `requirePermission('commissions.view.team'/'commissions.payout.run')` — admins may NOT have those keys. Verify on the smoketest DB whether admin's tier grants them; if not, add them in `permissionService.js` or the migration that seeds admin perms (048), OR change the gates to also allow `isAdminPermissionState`. |
| UUID | `crypto.randomUUID()` (uuid v13 is ESM, breaks `require` in jest). |
| Sale-order/line insert pattern | See `api/src/routes/saleOrders/createSaleOrder.js` — copy it; uses `nextval('dbo.saleorder_code_seq')`. |
| Appointment insert | Copy from `api/src/routes/appointments/mutationHandlers.js` (or see `ctv.js` `POST /bookings` for the canonical 19-column insert that's already verified live on NK3). |
| Cosmetic router | `/api/cosmetic/*` mirrors dental routes; gated by `requireLobScope('cosmetic')` + `attachCosmeticDb` + `requirePermission('cosmetic.access')`. To make a new route work in cosmetic LOB you must add `cosmeticRouter.use('/RouteName', routeModule)` in `server.js` (already mounted ~line 380). |
| Engine wiring | `commissionEngine.createEarningsForPayment` is invoked from `api/src/routes/payments.js` on payment write. |

---

## What's still MISSING / the four real gaps (in priority order)

### Gap 1 — Manual payouts + receipt photo (~45 min)
**Clarification (locked):** Payouts are paid MANUALLY (cash / bank transfer outside the system). There is no real payment processor and nothing to "verify" automatically. The admin just records what they paid and attaches a **receipt photo** as proof. The CTV sees the cycle (+ optionally the receipt image) on the Paid tab.

The core route logic already exists and is correct (`api/src/routes/payouts.js`): atomic `SELECT … FOR UPDATE` on pending earnings → insert `dbo.payouts` row → `UPDATE dbo.earnings SET status='paid', payout_id=$1`. What's missing is the receipt attachment.

Tasks:
1. **Migration `051_add_payout_receipt.sql`** (additive, both DBs, guarded `schema_migrations` insert like 049/050):
   ```sql
   ALTER TABLE dbo.payouts
     ADD COLUMN IF NOT EXISTS receipt_url TEXT NULL,
     ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ NULL;
   ```
2. **Backend** in `api/src/routes/payouts.js`:
   - Extend `POST /` to accept optional `receipt_url` in the body (already-uploaded URL from a separate upload endpoint) and persist it.
   - Add `PATCH /:id` (admin) that sets `receipt_url` + `receipt_uploaded_at = now()` on an existing payout (so admin can attach the photo after the cycle is created).
   - GET responses include `receipt_url`.
   - **Permission gate:** the existing `requirePermission('commissions.payout.run')` will reject the admin (admin's tier doesn't grant that key). Change the guard to also accept `isAdminPermissionState` (or `*`), mirroring how `commissionConfig.js` and `ctvs.js` already do it. Same fix for `earnings.js` `commissions.view.team`. Pattern:
     ```js
     const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
     async function adminOrPerm(employeeId, perm) {
       const state = await resolveEffectivePermissions(employeeId);
       const list = (state && state.effectivePermissions) || [];
       return isAdminPermissionState(state) || list.includes('*') || list.includes(perm);
     }
     ```
3. **Mounts in `api/src/server.js`:** make sure `app.use('/api/Earnings', earningsRoutes); app.use('/api/Payouts', payoutsRoutes)` exist, AND mirror under the cosmetic router (`cosmeticRouter.use('/Earnings', earningsRoutes); cosmeticRouter.use('/Payouts', payoutsRoutes)`) so LOB-aware `apiFetch` routes correctly when admin is in Cosmetic LOB.
4. **Image upload host:** reuse whichever pattern `api/src/routes/payments/helpers.js` or `feedback/adminRoutes.js` already uses for image proofs (uploaded URL stored as text). Do NOT introduce a new uploader. If the existing one is a separate `POST /api/uploads` style endpoint that returns a `url`, the admin UI simply calls it first then passes the URL into `POST /Payouts` or `PATCH /Payouts/:id`.
5. **Frontend** in `website/src/components/commission/EarningsPayoutsTabs.tsx`:
   - Payouts cycle creation form: multi-select pending earnings (already there per the file) + a "Cycle label" text input + `notes` + a file input for the receipt photo. On submit, upload the image first → get URL → `POST /Payouts` with `earningIds`, `cycleLabel`, `notes`, `receipt_url`.
   - Past-cycles list: show `cycle_label`, `paid_at`, `total_amount`, `earnings_count`, and a thumbnail of `receipt_url` if present (click to open).
   - "Attach receipt" button on a cycle that has none → calls `PATCH /Payouts/:id`.
   - Render all four data states (loading/empty/error/success).
6. **CTV portal Paid view** (`website/src/pages/CtvDashboard.tsx`, commission tab → Paid sub-view): the existing skeleton renders payout cycles; wire it to read the real `payout_id` linkage from the CTV's earnings — group by `payout_id`, show cycle label + amount + receipt thumbnail if `receipt_url` is set.
7. **Tests:** unit-test the new admin-or-perm helper; jest the `POST /Payouts` happy path + `B_EARNINGS_NOT_PAYABLE` (already returned); jest the `PATCH /Payouts/:id` (admin only, sets `receipt_url`).

**Acceptance:** on NK3 with `Origin: https://tmv.2checkin.com`, an admin (in either LOB) lists pending earnings, selects N, creates a cycle with cycle_label + receipt photo → those earnings flip to `paid` with the same `payout_id`; the CTV sees the cycle on their Paid tab with the receipt thumbnail.

### Gap 2 — Per-service referral % UI on the service form (~30 min)
Backend column `products.commission_rate_percent` already exists and the engine reads it. The admin can't edit it yet.
- File: `website/src/components/services/ServiceForm.tsx`. Add a number input "Tỷ lệ hoa hồng (%)" bound to `commission_rate_percent` with helper text "(mặc định: <global default>%)". Use the raw-string draft pattern from `Commission.tsx` `ConfigTab` so decimals + clear work. Clamp 0–100 on blur.
- Wire it through `lib/api/products.ts` (or wherever services are submitted) into the existing `POST/PUT /api/Products` flow. Verify the backend products handler already persists this field; if not, extend it (additive).
- Acceptance: edit a service in `tcosmetic_smoketest`, set `commission_rate_percent=10`, submit, reload — value persists. Then collect a payment on that service for a CTV-referred client and confirm earnings rows reflect the 10% pool (next gap).

### Gap 3 — Live payment-split proof on NK3 (~30 min, no code if engine works)
The engine has 11 unit tests but never ran end-to-end on real money on NK3.
- On `tcosmetic_smoketest`: take the live CTV from Gap-1 testing (or seed one), book a real service that has `commission_rate_percent` set, collect a payment via `POST /api/cosmetic/Payments`, then `SELECT id, recipient_partner_id, source, level, amount, status FROM dbo.earnings WHERE payment_id = $X ORDER BY level` — assert rows split per the configured level shares with `source='ctv'`, sum ≤ pool.
- Refund the payment, confirm a negative reversal row exists (`amount < 0`, `source='ctv'`, same `payment_id` chain).
- If anything's off, fix the engine wiring in `api/src/routes/payments.js`, not the engine itself.

### Gap 4 — Visual click-through QA (~15 min, you can NOT automate this in Claude Code without Playwright MCP, which isn't loaded; report PENDING if you can't)
On `https://tmv.2checkin.com` with a hard refresh:
- Admin login → `/commission` → all 4 sub-tabs render (Config, CTVs, Earnings, Payouts) with real data, no console errors.
- Config tab: type `14.5` into a Share % input — decimal sticks; enabled-sum > 100 disables Save.
- CTVs tab: `+ Add CTV` creates → list refreshes → Suspend toggles.
- Earnings tab: pending rows list, can multi-select.
- Payouts tab: create a cycle from selections → cycle appears.
- Switch LOB to Cosmetic (admin header toggle): `/commission` still works (the 0.32.45 fix routes `/api/cosmetic/CommissionConfig` + `/Ctvs`).
- Log in as a CTV → `/ctv` → `+ Client` pill opens sheet → fill name/phone/date → submit creates booking. Try same client again from a 2nd CTV account → see Vietnamese `B_CLIENT_CLAIMED` message with expiry date.
- Open the customer profile of the booked client → "Người giới thiệu (CTV)" badge shows owner + "còn hiệu lực đến <date>".

---

## Nice-to-haves (defer to `product-map/unknowns.md` if time-boxed)
- CTV portal **Network/downline tree** tab (original plan had a 5-tab portal; we have 4).
- Admin UI to set `commission_settings.referral_start_product_id` (currently SQL-only).
- Admin force-reassign of an actively claimed client.
- Lapse-warning notifications to CTVs as their 6-month window approaches.

---

## Deployment runbook (NK3 ONLY — NK + NK2 stay untouched)

After committing each chunk: typecheck + tests, then deploy.

```bash
# 1. Sanity locally
cd /Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-ctv-mlm-commission
cd api && npx jest 2>&1 | tail -5
cd ../website && npx tsc --noEmit --pretty false && npx vite build 2>&1 | tail -3
npx depcruise --output-type err src 2>&1 | tail -3

# 2. Bump version + CHANGELOG entries (web only — api has no version)
#    Edit website/package.json patch bump + prepend to website/public/CHANGELOG.json (validate JSON).
node -e "JSON.parse(require('fs').readFileSync('website/public/CHANGELOG.json','utf8'));console.log('ok')"

# 3. Push branch
git push origin feat/ctv-mlm-commission

# 4. Deploy NK3 (tarball swap)
git archive --format=tar.gz -o /tmp/nk3-cosmetic-vNEXT.tgz HEAD
scp /tmp/nk3-cosmetic-vNEXT.tgz root@76.13.16.68:/opt/tgroup-nk3/
ssh root@76.13.16.68 'set -e; cd /opt/tgroup-nk3
  ts=$(date -u +%Y%m%dT%H%M%SZ)
  mv app app.bak-pre-vNEXT-$ts && mkdir app && tar xzf nk3-cosmetic-vNEXT.tgz -C app
  # Apply any NEW migrations (none unless you add one) to BOTH smoketest DBs only:
  # for db in tdental_smoketest tcosmetic_smoketest; do
  #   docker exec -i tgroup-db psql -U postgres -d $db -v ON_ERROR_STOP=1 < app/api/migrations/05X_xxx.sql
  # done
  docker compose -f runtime/docker-compose.nk3.yml up -d --build api web'

# 5. Live verify (browser origin matters)
curl -s https://tmv.2checkin.com/version.json | head -c 100
TOKEN=$(curl -s -X POST https://tmv.2checkin.com/api/Auth/login \
  -H 'Content-Type: application/json' -H 'Origin: https://tmv.2checkin.com' \
  -d '{"email":"t@clinic.vn","password":"123123"}' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).token||'')}catch(e){console.log('')}})")
[ -n "$TOKEN" ] && echo "login OK" || echo "login FAIL"
# Then exercise Earnings, Payouts, and a CTV booking end-to-end as in Gap 1+3.
```

Rollback if needed: `ssh root@76.13.16.68 'cd /opt/tgroup-nk3 && mv app app.bad && mv app.bak-pre-vNEXT-<ts> app && docker compose -f runtime/docker-compose.nk3.yml up -d --build api web'`.

---

## Spec + plan to read (for context only — don't re-implement what they cover)
- `docs/superpowers/specs/2026-05-22-ctv-signup-and-commission-config-design.md`
- `docs/superpowers/specs/2026-05-22-ctv-referral-claim-design.md`
- `docs/superpowers/plans/2026-05-22-ctv-referral-claim.md`
- `product-map/CTV-MLM-INTEGRATION-PLAN.md` (the master roadmap)
- `BEHAVIOR.md` (`B_CLIENT_CLAIMED`, `B_LEVEL_SUM_EXCEEDS_100`, `S_CTV_CREATE_FORBIDDEN`, `REFERRAL_PRODUCT_NOT_CONFIGURED` are already registered)

## When done, report
- All commit SHAs grouped by gap.
- The full E2E result on NK3 with `Origin: https://tmv.2checkin.com` (admin → Earnings/Payouts cycle; CTV → booking + B_CLIENT_CLAIMED; payment → engine split rows; refund → reversal).
- The actual permission decision for `commissions.view.team` / `commissions.payout.run` (granted to admin tier vs. handler-level bypass).
- Anything you parked into `product-map/unknowns.md`.
- Confirm `git rev-parse --show-toplevel` was the feat worktree for every commit.

**Definition of done:** all four gaps green on NK3, branch pushed, no regressions to the existing CTV booking / claim flow, NK + NK2 untouched.
