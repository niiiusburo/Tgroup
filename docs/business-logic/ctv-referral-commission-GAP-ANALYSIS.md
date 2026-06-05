# CTV Referral & Commission — Code-Grounded Gap Analysis & Wave Plan

> Generated 2026-06-05 from an 8-cluster code-mapping workflow against `docs/business-logic/ctv-referral-commission.md`.
> States: implemented / partial / missing / conflicts-with-spec. Scope: NK3 (tmv.2checkin.com) first.

## Payouts — Separate/Combined by LOB (Spec §10)

NK3 Payouts implementation is currently per-LOB only (no combined payouts). The schema has no payout_group_id column to link Dental and Cosmetic payout rows. The API accepts single lob parameter; no logic exists to atomically create paired rows across both DBs. The CTV portal fetches payouts per LOB and displays them separately; no expansion UI for combined payouts. Admin interface (Commission page) also shows LOB-specific payouts only, with no 'All' filter option. Spec §10 requires: (1) separate OR combined payout runs, (2) combined payouts linked by payout_group_id on both Dental and Cosmetic rows, (3) shared receipt_url across linked rows, (4) CTV portal shows one combined row (expandable), (5) Admin 'All' filter shows combined rows. Implementation plan: add payout_group_id schema column, extend POST /api/Payouts to accept combined flag and atomically create paired rows in both DBs, update CTV and admin UX to display/expand combined payouts, scope all changes to NK3-only via COSMETIC_LOB_ENABLED flag.

| Rule | State | Cx | Risk | Plan (short) | Files |
|---|---|---|---|---|---|
| payouts-separate-or-combined: Admin can run payouts separately by LOB or combined across D | missing | M | med | 1. Add POST /api/Payouts request body schema support for `combined: boolean` flag. 2. When combined=true, atomically create one payout_group_id (UUID), then: (a | payouts.js, 051_add_payout_receipt.sql, payouts.test.js |
| payouts-group-id-schema: Combined payout uses one LOB-local payout row in Dental and  | missing | S | low | 1. Create migration 052_add_payout_group_id.sql: ALTER TABLE dbo.payouts ADD COLUMN IF NOT EXISTS payout_group_id UUID NULL; CREATE INDEX IF NOT EXISTS idx_payo | 052_add_payout_group_id.sql, payouts.js, payouts.test.js |
| payouts-shared-receipt: Combined payout uses same receipt/proof URL on both linked p | missing | M | med | 1. When uploading/attaching receipt to a combined payout, admin provides lob='all' or both single payouts need synchronized receipt. 2. Modify PATCH /api/Payout | payouts.js, payouts.test.js |
| payouts-ctv-portal-display: CTV portal shows one combined payout row by default, expanda | partial | M | med | 1. Update PayoutRow type to include payout_group_id?: string. 2. Modify fetchPayouts API client to accept filter mode: 'single-lob' / 'combined-view' (default:  | commission.ts, EarningsPayoutsTabs.tsx, payouts.js |
| payouts-admin-display: Admin All filter shows one combined row; Dental/Cosmetic fil | missing | M | med | 1. Clarify scope: spec §10 says 'Admin All filter shows one combined row' — confirm this means admin has an 'All' LOB option alongside Dental/Cosmetic. 2. Updat | payouts.js, EarningsPayoutsTabs.tsx, commission.ts |

## Claim ownership + 6-month timer + eligibility + per-LOB lock

The referralClaim service implements a 6-month CTV claim window (spec §6, §7) but has a critical cross-LOB lock violation. Current code: (1) timer anchor is correct: latest CTV-bearing appointment OR service per customer, resetting on new CTV activity; (2) eligibility gate is present: blocks different CTV bookings when claim is active within 6 months; (3) fallback to referred_by_ctv_id when no CTV-bearing event exists. CRITICAL GAP: the eligibility check does NOT enforce per-LOB lock scoping — a Dental claim blocks Cosmetic booking and vice versa (spec §6 row 5 says cross-LOB locks are "target" scoping, meaning this is a design intent not yet shipped). This violation occurs at: api/src/routes/ctv.js:955 and ctvPublic.js:222 where getReferralClaimStatus is called with a single LOB but the spec requires independent 6-month windows per LOB.

| Rule | State | Cx | Risk | Plan (short) | Files |
|---|---|---|---|---|---|
| claim-6month-window: 6-Month Claim Window (Spec §6 Row 1) | implemented | S | low | No change needed. Implementation is correct. | referralClaim.js |
| claim-timer-anchor: Timer Anchor = Latest CTV-Bearing Appointment OR Service (Sp | implemented | S | low | No change needed. Logic correctly implements: latest appointment date OR latest saleorder date, whichever is newer, with service tiebreaker. | referralClaim.js |
| claim-same-ctv-activity-resets: Same CTV Activity Resets Timer (Spec §6 Row 3) | implemented | S | low | No change needed. Booking a new appointment with same CTV will naturally become the new anchor when getCtvLinkStatus re-queries next time. | ctv.js, referralClaim.js |
| claim-expiration-frees-customer: Expiration = Claim Expires, Customer Becomes Eligible (Spec  | implemented | S | low | No change needed. Correctly implements expiry logic. | referralClaim.js, ctv.js |
| claim-cross-lob-lock-VIOLATION: Cross-LOB Lock Is PER LOB, Not Global (Spec §6 Row 5 — TARGE | conflicts-with-spec | M | med | IMPLEMENTATION PLAN FOR NK3: (1) Do NOT change this now. Spec row 5 is marked 'target', meaning it is accepted logic but implementation is deferred. (2) To ship | referralClaim.js, ctv.js, ctvPublic.js |
| claim-timer-survives-reassignment: Admin CTV Reassignment Keeps Timer, Only Changes Owner (Spec | missing | M | med | IMPLEMENTATION PLAN FOR NK3: (1) Add PATCH /api/appointments/:id support for ctv_id field (admin-only, requires appointments.edit permission). (2) Validate ctv_ | appointments.js, appointments.test.js |
| claim-eligible-booking: Eligible Booking = Unclaimed, Expired, or Same CTV (Spec §7  | implemented | S | low | No change needed. Gate is correct (modulo cross-LOB lock issue in rule claim-cross-lob-lock-VIOLATION). | ctv.js, ctvPublic.js |
| claim-blocked-booking: Blocked Booking = Different CTV Active in Window (Spec §7 Ro | implemented | S | low | No change needed. Blocks correctly. | ctv.js, ctvPublic.js |
| claim-block-returns-error-no-create: Block Result = Error Only, No Create (Spec §7 Row 3) | implemented | S | low | No change needed. Correctly returns early without side effects. | ctv.js, ctvPublic.js |
| claim-referral-start-fallback: Referral Start Fallback When No Service Selected (Spec §7 Ro | implemented | S | low | No change needed. Correctly implemented per INV-022. | ctv.js, ctvPublic.js |

## Braces Override (Spec §5, Gap #4)

The spec defines a Dental-only Braces override tier config (§5) that allows separate, higher commission rates for orthodontic services detected by category name or product name matching. Current code is missing this entirely: (1) No table to store braces-specific tier config; (2) No detection logic to identify braces services; (3) No branching in commissionEngine to apply different tier rates; (4) Products still carry legacy commission_rate_percent columns that spec targets for removal. Implementation requires: add a braces_commission_level_config table (or nullable braces columns to the existing tier config), add service-matching logic at payment/service-creation time, and conditionally route the commission calculation through the braces engine when applicable.

| Rule | State | Cx | Risk | Plan (short) | Files |
|---|---|---|---|---|---|
| BR-001: Braces Category Detection | missing | S | low | 1. Create utility function `isBracesService(product, serviceLineRow)` that checks: (a) product.category matches 'Braces'/'Orthodontics', or (b) product name mat | commissionEngine.js, payments.js, bracesDetection.js (new) |
| BR-002: Braces Tier Config Table | missing | M | med | 1. Create migration 050_add_braces_commission_level_config.sql that adds dbo.braces_commission_level_config with identical shape to commission_level_config: (le | 050_add_braces_commission_level_config.sql, commissionConfig.js, commissionEngine.js |
| BR-003: Braces Branch in Commission Engine | partial | M | med | 1. Extend _shareByLevel signature to accept optional `isBraces: boolean` param. 2. In createEarningsForPayment, detect braces BEFORE the loop: await bracesDetec | commissionEngine.js, payments.js, commissionEngine.test.js |
| BR-004: Braces Line Metadata in Payments Route | missing | M | med | 1. In payments.js POST handler, after calling _linesForPayment, JOIN each line with its product to extract product.categid / category name. 2. Call bracesDetect | payments.js, commissionEngine.js |
| BR-005: Spec Removal: Product commission_rate_percent Legacy | partial | S | low | 1. Mark commission_rate_percent as deprecated in products schema docs. 2. Do NOT use it in commissionEngine or any live commission code (already compliant). 3.  | commissionEngine.js, commissionEngine.test.js, INVARIANTS.md, schema-map.md |

## Admin CTV Override / Reassignment (Spec §8)

Admin CTV override for appointment and service cards is partially implemented. Appointment CTV change is currently wired to update the customer's referred_by_ctv_id (via setCustomerReferrer), affecting the claim owner but NOT moving commission money per spec. Service-card CTV change is WIRED (saleOrders PATCH :id/ctv_id) but LACKS the critical commission reversal/recreation logic: when a service's CTV is changed before payout, the old pending commission should be reversed and new pending commission created immediately for the new CTV/uplines. Additionally, there is NO paid-out lock guard to block service CTV reassignment when commission has already been paid out. Per INV-003B/INV-003C, these are high-priority gaps.

| Rule | State | Cx | Risk | Plan (short) | Files |
|---|---|---|---|---|---|
| RULE-8.1-APPT-OVERRIDE: Appointment-card CTV change: changes ownership + claim owner | implemented | S | low | No change needed. Appointment CTV override is correctly implemented per §8. Verify via test: change appointment CTV, confirm appointment.ctv_id persists, confir | mutationHandlers.js, customerReferrer.js |
| RULE-8.2-SERVICE-OVERRIDE-BEFORE-PAYOUT: Service-card CTV change BEFORE payout: reverse old pending c | partial | L | high | (1) Add a service-CTV-reassignment handler in updateSaleOrder.js. Before updating ctv_id, fetch the old ctv_id from saleorders. (2) Query all payment_allocation | updateSaleOrder.js, commissionEngine.js |
| RULE-8.3-PAID-OUT-LOCK: If related CTV commission has already been paid out, cancel/ | partial | S | med | (1) In updateSaleOrder.js, before reversing/recreating earnings on a CTV change, add the same paid-out check: query dbo.earnings WHERE payment_id IN (select fro | updateSaleOrder.js, serviceReversal.js |
| RULE-8.4-TIMER-AND-SERVICE-OVERRIDE: Service-card CTV changes move service ownership and commissi | missing | M | med | (1) Review the claim window query logic (likely in referralClaim.js or a CTV eligibility check). (2) Ensure that when computing the claim expiration, the query  | referralClaim.js, ctv.js, updateSaleOrder.js |

## Public signup root path + admin hierarchy management (spec §12; gaps #8,#9)

This cluster covers CTV public signup (no upline required for root CTVs) and admin drag-and-drop hierarchy management. Public signup is PARTIALLY implemented: upline phone/code resolution works, cross-DB duplicate blocking and LOB inheritance exist, but the spec requires: (1) email to be optional (currently required), name requirement clarification, field-level notices in UX; (2) explicit root CTV path when no upline code/phone entered (currently rejects with U_UPLINE_REQUIRED). Admin hierarchy management is COMPLETELY MISSING: no endpoints exist for reading admin hierarchy view, moving CTVs, guarding moves with activity checks, or creating audit logs. The spec requires drag-and-drop UI + permission checks + automatic audit logging. No language/i18n gaps found — both EN/VI keys exist in ctv.json.

| Rule | State | Cx | Risk | Plan (short) | Files |
|---|---|---|---|---|---|
| R-12-01: Public signup creates ROOT CTV when NO upline phone/referral | missing | M | med | 1. Add optional param handling so code and uplinePhone are both optional (not required). 2. After upline resolution logic (lines 410-419), add: if (!upline && ! | ctvPublic.js |
| R-12-02: Email is optional on public signup, UI must clarify | partial | S | low | 1. api/src/routes/ctvPublic.js: change line 400 validation from '!name // !phone // !email // !password' to '!name // !phone // !password' (remove email check). | ctvPublic.js, JoinCtv.tsx, ctv.json, ctv.json |
| R-12-03: Duplicate phone/email blocking guards only when already a CT | implemented | S | low | 1. Code review: add explicit IS_CTV filter to queries (lines 426-429) to clarify intent: WHERE ... AND is_ctv = true. This doesn't change behavior (if they alre | ctvPublic.js |
| R-12-04: Existing customer signing up as CTV creates separate CTV row | implemented | S | low | Code is correct as-is (rejects > risk of double-identity). No change needed. If spec later allows recycle-same-phone, code would need to check: (phone exists AN | ctvPublic.js |
| R-12-05: Name field handling on public signup (currently required by  | partial | S | low | 1. Interpret spec: name is operationally required (CTV roster expects a name for display). Keep current behavior (require name). 2. Add clarity: add comment in  | ctvPublic.js, JoinCtv.tsx |
| R-12-06: Signup UX breadcrumb/progress + field notices | partial | M | low | 1. Breadcrumb: Add a progress bar or step indicator (e.g., 'Step 1 of 1 — Create Account') at top of form, or multi-step flow if desired. 2. Field notices: Add  | JoinCtv.tsx, ctv.json, ctv.json |
| R-12-07: Language support (EN/VI) for CTV signup and portal | partial | M | low | 1. Audit JoinCtv.tsx for hardcoded strings (Vietnamese text on lines 70, 79, 82-84, 104, 120, 126, etc.). All visible text must come from i18n keys. 2. Add miss | JoinCtv.tsx, ctv.json, ctv.json |
| R-12-08: Admin drag-and-drop CTV hierarchy tree for moving uplines/do | missing | L | high | 1. CREATE admin UI component: AdminCtvHierarchyTree.tsx (or similar) in website/src/pages/Admin/CtvHierarchy/ that: (a) fetches full network via GET /api/ctv-ad | Admin, App.tsx |
| R-12-09: Move eligibility guard: CTV must be fresh (no activity) + au | missing | L | high | 1. CREATE api endpoint: PATCH /api/Ctvs/:id/move (admin-gated, requires ctv.manage perm). 2. Request body: { referred_by_ctv_id: <new-upline-id> }. 3. Validatio | ctvs.js, db, migrations |

## Commission Trigger + Tier Rates (Spec §3-4, Gaps #1-3)

NK3 uses a payment-time commission model instead of the spec-required service-card-creation model. Earnings are created via commissionEngine.createEarningsForPayment() ONLY when POST /api/Payments is called, using the allocated (paid) amount rather than the full service price. Tier rates are correctly implemented via dbo.commission_level_config and admin PUT /api/CommissionConfig; all five levels (0-4) exist with proper enable/disable behavior and sum-validation. The core gap is the trigger point and amount basis: service card creation with attached CTV must immediately create pending earnings at the full service price (saleorders.amounttotal), not defer it to payment time with a paid amount. No NK/NK2 scope leakage risk if scoped at service-create time (isolated to saleOrders/createSaleOrder.js + new commissionEngine entry point).

| Rule | State | Cx | Risk | Plan (short) | Files |
|---|---|---|---|---|---|
| CTVSvc-Trigger-Create: Service-card creation with attached CTV must create earnings | missing | M | med | 1. Add new function createEarningsForServiceCard() to commissionEngine.js that mirrors createEarningsForPayment() but accepts a saleorder row instead of payment | commissionEngine.js, createSaleOrder.js, saleOrderLines.js, services.test.js |
| CTVSvc-Amount-Full: Commission amount basis must be full service price, not paid | partial | L | high | 1. The new createEarningsForServiceCard() (from CTVSvc-Trigger-Create) will use saleorders.amounttotal as the base amount. 2. Decision required: should payment. | commissionEngine.js, createSaleOrder.js, payments.js |
| CTVSvc-NoApptEarnings: CTV booking (appointment-only) must NOT create commission | implemented | S | low | No changes required. Verify that bookings test suite (api/src/routes/__tests__/ctvBookings.test.js) includes negative test for 'booking with service intent does | ctv.js, referralClaim.js, ctvBookings.test.js |
| CTVSvc-NoSelectedCTV: Service with no selected CTV must not create commission | partial | S | low | 1. In new createEarningsForServiceCard(), include guard: 'if (!saleorder.ctv_id) return [];' (no earnings if ctv_id is null/empty). 2. Test: POST /api/SaleOrder | commissionEngine.js, saleOrdersCreate.test.js |
| CTVSvc-TierConfig: Tier rates come from CTV admin portal tier config (commissio | implemented | S | low | 1. Confirm dbo.commission_level_config schema via migration 049 (already checked). 2. Verify PUT /api/CommissionConfig validation (line 69) prevents sum>100% an | commissionConfig.js, commissionEngine.js, 049_add_commission_level_config.sql |
| CTVSvc-LevelEnable: Levels 0-2 active by default; 3-4 configurable-but-disabled; | partial | S | med | 1. Check migration 049 for DEFAULT enabled/disabled values in INSERT seed data for commission_level_config. 2. If no seed data exists, add a migration to seed:  | 049_add_commission_level_config.sql, commissionConfig.test.js |

## Deletes/refunds/corrections + payment-edit removal (spec §9, gap #11)

Current code (payments.js, serviceReversal.js, commissionEngine.js) implements the delete/void/refund paths with earnings reversal via INV-003A and INV-003B guards. However, there is a critical spec gap: commission is currently created at PAYMENT time (not service-card creation), based on allocated amount (not full service price), and using legacy product `commission_rate_percent` (not tier config). The UI still supports payment EDIT via PATCH (legacy gap §9 row 3), and the spec requires removal of this button. Service deletion correctly blocks if paid-out (serviceReversal.js lines 84-99). No code currently exists to create commission at service-card creation time (spec INV-003C target state).

| Rule | State | Cx | Risk | Plan (short) | Files |
|---|---|---|---|---|---|
| DEL-001: Payment DELETE and VOID reverse earnings (INV-003A) | implemented | M | low | Status: COMPLETE. DELETE (hard/soft) and VOID both reverse earnings via negative rows. Pay-out lock enforced. No changes needed. | payments.js, commissionEngine.js |
| DEL-002: Service deletion blocks if related payment is paid-out (INV- | implemented | M | low | Status: COMPLETE. Service line deletion properly guards paid-out earnings and blocks with 409 error. Commission reversal is idempotent via reverseOnRefund at se | serviceReversal.js, saleOrderLines.js |
| DEL-003: Commission created at PAYMENT time, not service-card creatio | partial | L | high | MISSING: Implement commission creation at saleorderlines POST. (1) Add createEarningsForPayment call in saleOrderLines.js POST handler (near line 100-160 approx | saleOrderLines.js, commissionEngine.js |
| DEL-004: Commission uses allocated/paid amount, not full service pric | partial | M | high | BLOCKED by DEL-003. Once service-card commission is implemented, pass full service price (saleorderlines.total or cost field) instead of allocated. Keep payment | commissionEngine.js, saleOrderLines.js |
| DEL-005: Commission uses tier config, not product commission_rate_per | partial | S | med | VERIFY: Grep entire codebase for commission_rate_percent usage in commission contexts (not just schema). If found, remove. If tier config is correctly the only  | commissionEngine.js |
| DEL-006: UI payment edit button exists but spec requires removal (leg | partial | M | med | REMOVE UI payment edit button + PATCH handler (3 steps). (1) website: Remove PATCH call and edit modal from CustomerDeposits.tsx and PaymentTab.tsx. Disable onE | payments.ts, useDeposits.ts, CustomerDeposits.tsx, index.tsx, payments.js |
| DEL-007: Payment deletion is hard-delete by default, soft-delete via  | implemented | S | low | Status: IMPLEMENTED. Default behavior (hard=true) permanently removes payment. Soft mode (hard=false) keeps row + reverses earnings. Test that hard delete remov | payments.js |
| DEL-008: Service refund workflow: delete/void payment + backfill earn | partial | M | med | Status: PARTIAL. Refund workflow exists (create negative payment + reverse earnings). Service deletion auto-voids and reverses. However, spec §9 row 2 'If a com | payments.js, serviceReversal.js |
| DEL-009: Commission status='paid' or payout_id blocks all reversals ( | implemented | S | low | Status: COMPLETE. Paid-out lock is enforced across all reversal paths. No changes needed. | payments.js, serviceReversal.js |
| DEL-010: Payment allocation immutability enforced (INV-010: no alloca | implemented | S | low | Status: COMPLETE. PATCH does not touch allocations. Invariant INV-010 is enforced. | payments.js |

## Deposit Wallet History (Spec §11, Gap #10)

The NK3 codebase has a partial implementation of deposit wallet history. The customer profile Payment History tab (PaymentTab.tsx) correctly displays deposit top-ups, refunds, and usage via the CustomerDeposits component. However, the admin /payment page (Payment.tsx) does not have a customer selector to show individual customer deposit wallet history after selecting one customer. The backend API routes correctly separate deposits from payments via the payment_category column with endpoints GET /api/Payments/deposits and GET /api/Payments/deposit-usage.

| Rule | State | Cx | Risk | Plan (short) | Files |
|---|---|---|---|---|---|
| SPEC-11.1: Customer profile Payment History tab shows deposit transacti | implemented | S | low | Feature is complete. Verify visual rendering on customer profile page. No action required. | PaymentTab.tsx, CustomerDeposits.tsx, useDeposits.ts |
| SPEC-11.2: Admin /payment page shows per-customer deposit wallet histor | missing | M | med | Add customer selector dropdown to Payment.tsx admin payments tab. Wire selectedCustomerId to useDeposits hook. Render CustomerDeposits component when customer i | Payment.tsx, useDeposits.ts, CustomerSelector.tsx, CustomerDeposits.tsx |
| SPEC-11.3: Deposits correctly classified with payment_category column | implemented | S | low | Feature is complete. Verify migration 003_add_payment_category.sql is applied on NK3 database. No action required. | 003_add_payment_category.sql, payments.js, readHandlers.js |
| SPEC-11.4: Void/deleted correction rows visible in deposit history | partial | M | med | Implement soft-delete for payments: change DELETE /api/Payments/:id to set status='voided' instead of hard-delete. This keeps rows visible with strikethrough st | CustomerDepositSections.tsx, PaymentTab.tsx, payments.js |
| SPEC-11.5: CTV portal wallet is separate from customer deposit wallet | implemented | S | low | Feature correctly scoped. No action required. Maintain separation of CTV earnings and customer deposits. | CtvMeTab.tsx, CustomerProfileContent.tsx |


---

## Wave Plan (NK3 implementation order)

| Wave | Scope | Size | Status |
|---|---|---|---|
| **1** | Public signup: root CTV (no upline, NK3-flagged `CTV_PUBLIC_ROOT_SIGNUP`/`VITE_CTV_PUBLIC_ROOT_SIGNUP`) + email optional + name clarity | M | ✅ **LIVE on tmv.2checkin.com + verified** (root CTV created in both NK3 DBs, referred_by NULL, active; email-optional). TDD: ctvPublicJoin 23/23, JoinCtv 6/6. |
| **2** | Commission engine INV-003C: earnings born at **service-card create** on **full service price**, tier-config only (flag `CTV_SERVICE_CARD_COMMISSION`); disable payment-time path when on; service-line reversal on delete/refund | XL | ✅ CODE DONE (engine + 9 unit tests; wired into createSaleOrder.js; payment-path gated; paidList reversed-safe; migration 055 staged). **LIVE + verified**: migration 055 applied to both NK3 DBs; flag CTV_SERVICE_CARD_COMMISSION=true; service card @1,000,000 → earnings L0 240000 (24% full price, payment_id NULL). |
| 3 | Admin reassignment §8: service-card CTV change → reverse+recreate pending; paid-out lock | L | ✅ CODE DONE (updateSaleOrder.js: paid-out 409 lock + reverse-old + recreate-new, flag-gated; 3 tests). DEPLOYED to NK3 (live, flag on). |
| 4 | Combined payouts §10: `payout_group_id` migration + atomic paired rows + shared receipt + portal/admin combined display | L | 📋 |
| 5 | Braces override §5 (Dental-only): detection + `braces_commission_level_config` + engine branch | M-L | ✅ **LIVE-verified**: migration 056 (braces table 30/5/2.5%) applied to tdental_nk3; flag BRACES_OVERRIDE_ENABLED=true; braces card @1M → L0 300000 (30%). Detects by name AND category (VN 'Niềng răng'). |
| 6 | Admin drag-drop CTV hierarchy §12#9: move endpoint + no-activity guard + `audit_logs` | L | 📋 |
| 7 | Deposit wallet history §11: admin `/payment` per-customer history (customer profile tab already exists) | M | 📋 |
| 8 | Payment-edit removal §9: remove staff edit button; keep delete+new correction | M | 📋 |

Notes:
- Cross-LOB lock (§6 row5) is already per-LOB-correct in `referralClaim.js` (queries scoped via `getDb(lob)`); spec marks it deferred — **no change**.
- Level-default seed (0-2 enabled, 3-4 disabled) to verify in migration 049 during Wave 2.
- All money-path changes (Waves 2-4) are flag-gated so NK/NK2 keep current behavior until migration.
