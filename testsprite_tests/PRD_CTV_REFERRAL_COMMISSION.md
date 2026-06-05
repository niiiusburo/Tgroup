# PRD — CTV Referral & Commission (NK3 / tmv.2checkin.com)

**For:** TestSprite test-plan generation & execution
**Target:** `https://tmv.2checkin.com`  ·  **Login:** `t@clinic.vn` / `123123`
**Structured PRD:** `testsprite_tests/standard_prd_ctv_commission.json`
**Authority source:** `docs/business-logic/ctv-referral-commission.md` + `…-GAP-ANALYSIS.md`
**Delivery:** 8 waves (W1–W8) shipped to NK3 and live-verified on 2026-06-05.

> ⚠️ **Live production.** This is a real clinic environment. Service-card creation, payouts, CTV moves, and payment delete/void mutate real data and real commission money. Use **TESTSPRITE-prefixed** test customers/CTVs, prefer read-only affordance checks, and clean up created test data. **Never** run a "pay" payout action against real CTV earnings.

---

## 0. System overview

CTV = an external referrer/collaborator stored as a partner row with CTV role flags, mirrored across two isolated LOB databases (`tdental_nk3`, `tcosmetic_nk3`). The headline rule that changed: **commission is born when a service card is created**, computed from the **full service price** via **tier config** — *not* at payment time, *not* on the paid/allocated amount, *not* on the legacy product `commission_rate_percent`.

**Active NK3 feature flags** (NK/NK2 keep the legacy model until migration):

| Flag | Effect |
|---|---|
| `CTV_PUBLIC_ROOT_SIGNUP` (+ `VITE_CTV_PUBLIC_ROOT_SIGNUP`) | W1 root signup path |
| `CTV_SERVICE_CARD_COMMISSION` | W2/W3/W5 service-card commission model (disables payment-time path) |
| `BRACES_OVERRIDE_ENABLED` | W5 Dental braces tier override |
| `PAYMENT_EDIT_DISABLED` | W8 payment-edit 405 |

**Commission levels:** L0 = direct CTV on the card · L1 = direct upline · L2 = next upline. L3/L4 exist but are disabled by default. Disabled levels and missing uplines earn nothing (the unspent % stays with the company; it is not redistributed).

---

## 1. Feature → endpoint map

| Wave | Feature | Frontend | Primary API |
|---|---|---|---|
| W1 | Public CTV root signup + optional email | `/ctv/join` | `POST /api/ctv-public/join` |
| W2/W5 | Service-card commission + braces override | `/customers/:id`, `/commission` | `POST /api/SaleOrders`, `GET /api/Earnings`, `GET /api/CommissionConfig` |
| W3 | Service-card CTV reassignment + paid-out lock | `/customers/:id` | `PATCH /api/SaleOrders/:id` |
| W4 | Combined Dental+Cosmetic payouts | `/commission` → Payouts | `GET /api/Payouts`, `POST /api/Payouts/combined`, `PATCH /api/Payouts/:id` |
| W6 | Drag-drop CTV hierarchy move | `/commission` → CTV tab | `GET /api/Ctvs`, `POST /api/Ctvs/:id/move` |
| W7 | Admin deposit wallet history | `/payment` | `GET /api/Payments/deposits`, `GET /api/Payments/deposit-usage` |
| W8 | Payment-edit removal | `/payment`, profile | `PATCH /api/Payments/:id` → 405 |
| W-SEC | CTV self password (all-LOB verify) | CTV portal | CTV self-profile (secondary) |

---

## 2. Test cases

### W1 — Public CTV signup

- **TC101 — Root signup (no upline) succeeds.** Go to `/ctv/join`; enter a unique `TESTSPRITE_<rand>` phone + password; leave upline **and** email blank; submit → success/portal access. *Expect:* a **root** CTV created (no upline), active immediately.
- **TC102 — Email is optional and labeled so.** On `/ctv/join`, confirm the email field shows an optional label/helper; submitting with email blank succeeds.
- **TC103 — Duplicate phone blocked.** Enter a phone already belonging to a CTV; submit → blocked/duplicate error; no new CTV.
- **TC104 — Upline attach.** Enter a valid upline phone or referral code + a unique phone + password; submit → new CTV is attached **under that upline** (not root).

### W2/W5 — Service-card commission + braces

- **TC201 — Commission at service-card creation, full price.** As admin, open a TESTSPRITE customer, add a service card at a known price **with an attached CTV**, save. On `/commission` Earnings, confirm a **Level 0** earning for that CTV computed from the **full price** (plus L1/L2 rows for enabled uplines). *Cleanup:* delete the test service card afterward.
- **TC202 — No CTV ⇒ no commission.** Add a service card with **no CTV**; confirm **no** new earning row is created.
- **TC203 — Braces override (Dental).** Add a Dental Braces/Orthodontics service (category `Niềng răng` or name containing `niềng răng`/`brace`) with an attached CTV; confirm the L0 earning uses the **higher braces rate (~30%)**, not the normal tier rate.
- **TC204 — Appointment-only booking ⇒ no commission.** A CTV booking that creates only an appointment (no service card) creates **no** earning.
- **TC205 — Provenance.** Service-card earnings show service-card provenance (not tied to a payment) and full-price basis.

### W3 — Reassignment + paid-out lock

- **TC301 — Reassign before payout reverses + recreates.** On a service card with **pending** commission, change the attached CTV; confirm the old CTV's pending earning is **reversed** and a **new pending** earning exists for the new CTV (+ uplines).
- **TC302 — Paid-out lock (409).** Attempt to change the CTV on a service card whose commission is **paid out** → blocked with **409 `B_COMMISSION_PAID_OUT`**; ownership unchanged.

### W4 — Combined payouts

- **TC401 — All/Combined option present.** `/commission` → Payouts (Chi trả) tab → LOB selector offers an **All / Combined (Tất cả)** option alongside Dental and Cosmetic.
- **TC402 — Combined row expands into legs.** With the All/Combined filter, a combined payout renders as **one row** that expands into **Dental + Cosmetic** legs sharing one `payout_group_id` and one receipt.
- **TC403 — Per-LOB filters show matching leg.** Switch to Dental, then Cosmetic; each shows only its matching LOB-local leg. *(Read-only — do not create a real payout against live earnings.)*

### W6 — Drag-drop hierarchy

- **TC601 — Rows draggable.** `/commission` → CTV tab → CTV rows show a drag affordance/hint.
- **TC602 — Move a fresh CTV.** Drag a **fresh** CTV (no referrals/services/earnings) onto another → re-parented under the target; success state. *(Prefer a TESTSPRITE CTV from TC101.)*
- **TC603 — Activity guard (409).** Attempt to drag a CTV that **has** activity → blocked with **409 `B_CTV_HAS_ACTIVITY`**; hierarchy unchanged.

### W7 — Admin deposit wallet history

- **TC701 — Customer selector present.** `/payment` exposes a deposit-history customer selector (`#deposit-history-customer` / "Lịch sử ví nạp của khách hàng").
- **TC702 — History renders.** Select/search a customer with deposit activity → wallet history renders (top-ups / refunds / usage).
- **TC703 — No inline edit.** Deposit rows have **no** inline edit affordance (delete/void + new only).

### W8 — Payment-edit removal

- **TC801 — No edit button.** `/payment` and customer-profile Payment History have **no** edit button on payment/deposit rows.
- **TC802 — PATCH blocked (405).** `PATCH /api/Payments/:id` on an existing payment → **405 `B_PAYMENT_EDIT_DISABLED`**.
- **TC803 — Delete reverses earnings.** Delete/void a **non-paid-out** payment → removed/voided and related earnings reversed. *(Use TESTSPRITE test data only.)*

### W-SEC — CTV self password (secondary, needs CTV login)

- **TC901 — Correct current password updates all LOBs.** From the CTV portal (e.g. the TC101 CTV), change password with the correct current password → success; login works on both LOBs.
- **TC902 — Wrong current password rejected.** Attempt change with a wrong current password → rejected; no LOB hash changes.

---

## 3. Safety & known caveats (read before running)

| ⚠️ | Caveat | Tester action |
|---|---|---|
| 🔥 | Live production data + money | TESTSPRITE-prefixed data; clean up; never "pay" real payouts |
| ⚠️ | Commission model switched (service-card time, full price) | Assert service-card-time/full-price; do **not** assert payment-time commission |
| ⚠️ | `X-LOB` ignored on `POST /api/SaleOrders` → Cosmetic cards attribute to Dental DB | Verify **dental** side first; treat cosmetic attribution as a known bug |
| ℹ️ | W-SEC needs a CTV login | Use the TC101 CTV or skip |

---

## 4. How to point TestSprite at this PRD

This PRD is intentionally a **separate** file so it does not clobber the existing permission-suite PRD (`standard_prd.json`, 23 passing tests).

1. Config already points at the right target: `website/.testsprite/config.json` → `baseUrl: https://tmv.2checkin.com`, creds `t@clinic.vn` / `123123`.
2. Feed `testsprite_tests/standard_prd_ctv_commission.json` to TestSprite's test-plan generation (or merge its `features[]` into the suite PRD), then generate & run the plan.
3. Tag generated tests `TC1xx–TC9xx` per §2 so they don't collide with the existing `TC001–TC031` permission suite.
