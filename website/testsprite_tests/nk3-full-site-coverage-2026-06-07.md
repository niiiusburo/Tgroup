# TestSprite — NK3 FULL-SITE coverage (real Chrome)

- **Target:** https://tmv.2checkin.com (NK3, Cosmetic LOB "Thẩm mỹ" + Dental "Nha khoa"), v0.32.112
- **Date:** 2026-06-07
- **Engine:** real Google Chrome (spawned, dedicated profile), driven via CDP — not the TestSprite cloud engine
- **Login:** admin `t@clinic.vn`; plus a throwaway CTV created for portal testing (suspended after)
- **Coverage:** every route in `App.tsx` (31 routes) across all 11 configured scopes. Plan expanded to **41 tests** in `testsprite_frontend_test_plan.json`.

## Headline: 37 PASS · 2 BUGS · 1 BLOCKED · 1 UX note. No page crashes; LOB isolation verified.

## Route load sweep (23/23 load clean, 0 crashes/blanks)
**Admin (15):** `/` `/calendar` `/customers` `/employees` `/locations` `/services` `/service-catalog` `/website` `/settings` `/relationships` `/commission` `/notifications` `/permissions` `/payment` `/feedback` — all correct headings, no error boundary.
**Reports (8):** `/reports/{dashboard,revenue,appointments,doctors,customers,locations,services,employees}` — all render with charts.

## Per-scope results
| Scope | Result | Evidence |
|---|---|---|
| Authentication | ✅ | login → /, invalid → 401 on page, logout clears token |
| Customer Management | ⚠️ | list/search(accent)/detail/create/edit ✅; **delete = BUG (see below)** |
| Employee Management | ✅ | list/create/deactivate ✅; ⚠️ Add defaults tier to Super Admin |
| Calendar | ✅ | day/week/month switch + Next/Prev nav (7→8 Jun) |
| Payments | ✅ | `/payment` Kế hoạch thanh toán, 100 rows |
| Permission control | ✅ | `/permissions` board: Super Admin 15p·7m, Admin 35p·4m, Editor 27p·113m |
| Service catalog | ✅ | `/services` cards+pricing; `/service-catalog` 20 rows+search |
| Report generation | ✅ | 8/8 render; revenue shows real ₫ (1.88B issued, 95.6% recovery, donut by payment method, date filter, export) |
| Commission tracking | ✅ | Cấu hình (L0 24%/Upline1 4%/Upline2 2%) + CTV(227)/New(30)/Income(28)/Payout(29) tabs |
| CTV portal | ⚠️ | guard redirect ✅, admin-create ✅ (201), suspend ✅ (200); **login = BUG → interior BLOCKED** |
| Public guest booking | ✅ | `/welcome` landing + "Giới thiệu khách" booking form + `/ctv/join` signup, all unauth |
| Cosmetic LOB | ✅ | toggle isolation: cosmetic **12,577** vs dental **36,362** patients; app remounts; round-trip clean |
| Misc (locations/relationships/website/settings/feedback/notifications) | ✅ | all render with controls |

## 🐞 Bugs

### BUG-1 (High) — Cosmetic customer delete silently fails
UI delete on a Cosmetic customer calls `PATCH /api/Partners/<id>/soft-delete` (no `/cosmetic` prefix) → **404**, no error shown. Correct `PATCH /api/cosmetic/Partners/<id>/soft-delete` → **200**. Delete path bypasses the lob-aware `apiFetch` (INV-008x / `apiFetch.lob.test.ts`).
**Fix:** route the soft-delete through `apiFetch` so it gains `/cosmetic` on the cosmetic LOB; toast on non-200.

### BUG-2 (High) — Admin-created CTV cannot log in
A CTV created via Commission → "Thêm CTV" (name + phone + password, active, lob `dental,cosmetic`, `POST /api/ctv` 201) **cannot authenticate**: `POST /api/Auth/login {email:"<phone>",password}` → **401 "Invalid login or password"** for `0900812635`, `84900812635`, `+84900812635`. This **blocks the CTV portal interior** (home/commission/network/tracking/me tabs) — TS-094 not testable.
**Likely cause:** the admin-create password isn't persisted to the dental auth row, or phone-login identifier resolution fails for admin-created CTVs. **Recommend** verifying `api/src/routes/ctv.js` POST writes a bcrypt hash to the canonical (dental) partner auth row, and that `loginIdentifier` resolves by phone for `created_via='admin_create'`.

## ⚠️ Notes
- **UX:** Add-Employee tier select defaults to **Super Admin** — should default to a low-privilege tier.
- **Console:** `/feedback` logs `403 "Admin access required"` loading admin feedback (page still renders an empty state). Other console 404/401/400 were **test-induced** by delete/login API probing, not app defects.
- **No hard-delete via UI/API** for customers (soft-delete only) or CTVs (suspend only) — by design.

## Test data + cleanup (production left clean)
- Customer `ZZ_TESTSPRITE_*` — soft-deleted (200).
- Employee `ZZ_TESTSPRITE_EMP_*` — hard-deleted via `DELETE /api/cosmetic/Employees/:id` (200).
- CTV `ZZ_TESTSPRITE_CTV_*` — **suspended** via `PATCH /api/cosmetic/Ctvs/:id` (200); CTVs have no hard-delete, so it remains as an inactive marked row (safe; manual purge optional).

## Coverage gaps (need follow-up)
- **CTV portal interior** — blocked by BUG-2; retest once CTV login works (or provide a known-good CTV credential).
- **Write flows on dental LOB** — all writes here exercised the cosmetic LOB; dental-side create/edit not separately driven.
- **Public booking submission** — the booking/referral form renders; an actual submission was not sent (would create real data).
