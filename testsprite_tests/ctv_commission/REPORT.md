# TestSprite-style Report — CTV Referral & Commission (NK3)

**Target:** https://tmv.2checkin.com  ·  **Login:** t@clinic.vn  ·  **Run:** 2026-06-05T09:28:09.150Z
**Mode:** mutations **ON** · UI on

**Result: 31 pass · 0 soft-pass · 0 fail · 0 skipped** (of 31)

## Summary by wave

| Wave | ✅ | 🟡 | ❌ | ⏭️ |
|---|---|---|---|---|
| Auth | 2 | 0 | 0 | 0 |
| W1 | 5 | 0 | 0 | 0 |
| W2 | 5 | 0 | 0 | 0 |
| W5 | 1 | 0 | 0 | 0 |
| W3 | 2 | 0 | 0 | 0 |
| W4 | 5 | 0 | 0 | 0 |
| W6 | 4 | 0 | 0 | 0 |
| W7 | 4 | 0 | 0 | 0 |
| W8 | 3 | 0 | 0 | 0 |

## All cases

| | ID | Wave | Kind | Mut | Title | Detail / Error |
|---|---|---|---|---|---|---|
| ✅ | AUTH-1 | Auth | api |  | Admin login + /Auth/me returns the session user | user=t@clinic.vn |
| ✅ | AUTH-2 | Auth | api |  | Protected endpoint rejects missing token | HTTP 401 |
| ✅ | W1-API-1 | W1 | api |  | Signup rejects empty body with VALIDATION (name/phone/password) | 400 VALIDATION |
| ✅ | W1-API-2 | W1 | api |  | Email optional (no missing-email error) + duplicate phone blocked (no mutation) | blocked HTTP 400 U_DUPLICATE_PHONE |
| ✅ | W1-API-3 | W1 | api |  | Signup missing password is rejected | 400 |
| ✅ | W1-API-4 | W1 | api | Y | Root signup (no upline, no email) creates a root CTV | created root ctv id=d720d89f-39c5-4073-bc03-0368f59ce7e6 phone=03991693259 |
| ✅ | W1-UI-1 | W1 | ui |  | /ctv/join renders with email marked optional | email field + optional notice present |
| ✅ | W2-API-1 | W2 | api |  | Dental tier config has enabled L0 with positive share; L3 disabled | L0=24% enabled; L3 disabled |
| ✅ | W2-API-2 | W2 | api |  | Cosmetic tier config returns levels | 5 levels |
| ✅ | W2-API-3 | W2 | api |  | GET /api/Earnings returns items + totals | totalItems=20 |
| ✅ | W2-API-4 | W2 | api |  | POST /api/SaleOrders rejects missing token | HTTP 401 |
| ✅ | W5-API-1 | W5 | api |  | Braces override config surface (DB-backed; probe API) | braces config via /api/CommissionConfig?lob=dental&type=braces |
| ✅ | W2-API-5 | W2 | api | Y | INV-003C: service card with CTV → L0 earning = FULL price × live tier rate (self-cleaning) | paid=0 → L0=296160 = full 1234000×24% (normal); CTV→null ⇒ status=reversed, active net=0 |
| ✅ | W3-API-1 | W3 | api |  | PATCH /api/SaleOrders/:id requires auth | HTTP 401 |
| ✅ | W3-API-2 | W3 | api |  | PATCH unknown sale order id is handled (no 5xx, no mutation) | HTTP 404  |
| ✅ | W4-API-1 | W4 | api |  | GET /api/Payouts (dental) returns items; rows expose payout_group_id field | items=0, payout_group_id field present |
| ✅ | W4-API-2 | W4 | api |  | GET /api/Payouts (cosmetic) returns 200 | items=0 |
| ✅ | W4-API-3 | W4 | api |  | POST /api/Payouts/combined requires auth | HTTP 401 |
| ✅ | W4-API-4 | W4 | api |  | POST /api/Payouts/combined validates body (no mutation on empty) | HTTP 400 U_INVALID_INPUT |
| ✅ | W4-UI-1 | W4 | ui |  | /commission Payouts tab exposes an All/Combined LOB option | All/Combined option present |
| ✅ | W6-API-1 | W6 | api |  | POST /api/Ctvs/:id/move requires auth | HTTP 401 |
| ✅ | W6-API-2 | W6 | api |  | Move unknown CTV id is handled (no 5xx, no mutation) | HTTP 404 S_NOT_FOUND |
| ✅ | W6-API-3 | W6 | api |  | Activity guard: moving a CTV with downline is blocked 409 B_CTV_HAS_ACTIVITY (no mutation) | 409 B_CTV_HAS_ACTIVITY (blocked, no move) |
| ✅ | W6-UI-1 | W6 | ui |  | /commission CTV tab renders draggable CTV rows | draggable=216, hint=true |
| ✅ | W7-API-1 | W7 | api |  | GET /api/Payments/deposits returns items for a customer | HTTP 200 |
| ✅ | W7-API-2 | W7 | api |  | GET /api/Payments/deposit-usage returns 200 | HTTP 200 |
| ✅ | W7-API-3 | W7 | api |  | GET /api/Payments/deposits requires auth | HTTP 401 |
| ✅ | W7-UI-1 | W7 | ui |  | /payment exposes the deposit-history customer selector | selector present=true |
| ✅ | W8-API-1 | W8 | api |  | PATCH /api/Payments/:id returns 405 B_PAYMENT_EDIT_DISABLED | 405 B_PAYMENT_EDIT_DISABLED |
| ✅ | W8-API-2 | W8 | api |  | PATCH /api/Payments/:id requires auth | HTTP 401 |
| ✅ | W8-UI-1 | W8 | ui |  | /payment deposit history rows have no inline edit affordance | no payment-edit affordance |

## Notes

- Safe mode runs read-only reads, negative/contract checks (auth gates, validation, blocked-actions that perform **no** mutation), and UI affordance checks. Mutating happy-paths (create service card, run payout, move a fresh CTV, root signup) are **gated** behind `ALLOW_MUTATIONS=1`.
- Known caveat: `X-LOB` is ignored on `POST /api/SaleOrders` → cosmetic service cards attribute commission to the dental DB (separate LOB-routing bug).
- Fixtures: customerId=`c4f677ff-a20f-4e23-bf71-ef2f95450583`, ctvId=`cdc4a737-3414-4386-a7f6-89b31fc393d0`, ctvWithActivity=`fe1c4e2b-3198-4497-a435-c0c432ad37ee`.

## Headline proof — INV-003C (W2-API-5)

Created a service card for a fresh TESTSPRITE customer with an attached CTV at a 1,234,000 price and **zero paid**, then read earnings:
- **L0 earning = 296,160 = 1,234,000 × 24%** → commission is born at **service-card creation** on the **FULL price**, not at payment time and not on the paid amount. If the legacy payment-time model were active, a zero-paid card would yield **no** earning.
- Reassigning CTV → null reversed it (`status='reversed'`, verified in `dbo.earnings`); active net = 0.

## Adversarial UI verification (false-positive guard)

The four UI passes were re-checked against the live DOM (`verify_ui.mjs`, `shots/`):
- W4: real `<select>` options `Tất cả (Combined) / Cosmetic / Dental`.
- W6: 213+ draggables are all `<TR>` CTV rows (real CTV records).
- W7: `#deposit-history-customer` selector count = 1.
- W1: join page shows `Email (không bắt buộc)` + `… để trống để đăng ký làm CTV cấp gốc` (leave blank → root CTV).

## Test-data cleanup (production left pristine)

All TESTSPRITE rows created by the mutating runs were removed (scoped to `TESTSPRITE Commission%` / `TESTSPRITE Root%`):
- `tdental_nk3`: deleted 3 earnings + 3 lines + 3 orders + 6 partners → remaining TESTSPRITE = **0 / 0 / 0**.
- `tcosmetic_nk3`: deleted 3 mirrored root-CTV partners → remaining mine = **0**.
- Left untouched: one pre-existing `TESTSPRITE TMV QA Cosmetic …` order dated **2026-05-23** (older QA data, not created by this run).

**Final: 31 / 31 pass · 0 fail · 0 skip. Production data clean.**
