 # TestSprite — NK3 read-only run (real Chrome)

- **Target:** https://tmv.2checkin.com (NK3, Cosmetic LOB / "Thẩm mỹ"), app version v0.32.112
- **Date:** 2026-06-07
- **Engine:** real Google Chrome (spawned, dedicated profile), driven via CDP — not the TestSprite cloud engine
- **Login:** `t@clinic.vn` (admin, scope dental+cosmetic)
- **Scope:** the 10 non-destructive cases from `testsprite_frontend_test_plan.json`. The 3 write cases (TS-012 create customer, TS-013 edit customer, TS-021 create employee) were **skipped** to avoid polluting production.

## Result: 8 PASS · 2 PARTIAL · 0 FAIL (10 run, 3 write tests skipped)

| ID | Test | Result | Evidence |
|---|---|---|---|
| TS-002 | Invalid login rejection | ✅ PASS | Wrong password → stayed on `/login`, "Invalid login or password" shown |
| TS-001 | Admin login + redirect | ✅ PASS | Valid creds → redirected to `/` ("Tổng quan" dashboard). Note: lands on `/`, not literal `/overview` |
| TS-010 | Customer list loads | ✅ PASS | `/customers` → 20 rows, search box "Tìm kiếm khách hàng…", 851 patients |
| TS-011 | Accent-insensitive search | ✅ PASS | Query `phuong` (no diacritics) → matched `Nguyễn Phương Thảo`, `NGUYỄN NGỌC PHƯƠNG TRANG`, `PHƯƠNG THẢO`, etc. |
| TS-020 | Employee list loads | ✅ PASS | `/employees` → heading "Nhân viên", 20 rows, search present |
| TS-030 | Calendar loads | ✅ PASS | `/calendar` → "Lịch hẹn" day view, "Chủ Nhật, 7 tháng 6, 2026", 17 appointments |
| TS-031 | Calendar date nav | ✅ PASS | Next → advanced "7 tháng 6" → "8 tháng 6, 2026" |
| TS-003 | Logout clears session | ✅ PASS | After logout, `/customers` bounced to `/login`; 0 auth/token keys left in localStorage |
| TS-040 | Payment history loads | ⚠️ PARTIAL | Plan route `/payments` **redirects to `/`**. Real page is `/payment` (singular) → "Kế hoạch thanh toán", 100 rows. App works; test-plan route is stale |
| TS-050 | Permission matrix loads | ⚠️ PARTIAL | Plan route `/settings/permissions` **redirects to `/`**. Real route is `/permissions` → "Quyền hạn" board (Architecture / Permission Matrix / Logic Flow tabs; Super Admin 15p·7m, Admin 35p·4m, Editor 27p·113m…). App works; test-plan route is stale |

## Findings (not app bugs — stale test-plan routes)
- **TS-040:** update `targetPage` `/payments` → `/payment` in `testsprite_frontend_test_plan.json`.
- **TS-050:** update `targetPage` `/settings/permissions` → `/permissions`.
- Both currently redirect to the Overview dashboard (the SPA's catch-all/home fallback for unknown routes), which would read as a failure to an automated runner using the plan's literal routes.

## Not run (require approval — production writes)
- TS-012 Create new customer · TS-013 Edit existing customer · TS-021 Create new employee — would leave real rows on live NK3.

## Notes
- Input technique: this React app's controlled inputs ignored Puppeteer `.type()` / triple-click-clear in the CDP-spawned window; the reliable path was the native value setter + dispatched `input` event (search), and in-page DOM `.click()` for small icon controls (calendar chevrons).
- Run was on the live Cosmetic LOB ("Thẩm mỹ") deployment; no data was created, edited, or deleted.
