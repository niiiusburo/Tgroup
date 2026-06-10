# TestSprite — NK3 FULL run (all features, real Chrome)

- **Target:** https://tmv.2checkin.com (NK3, Cosmetic LOB "Thẩm mỹ"), v0.32.112
- **Date:** 2026-06-07
- **Engine:** real Google Chrome (spawned, dedicated profile), driven via CDP
- **Login:** `t@clinic.vn` (admin, dental+cosmetic scope)
- **Scope:** all 13 cases in `testsprite_frontend_test_plan.json`, **including the 3 writes**. Test data was clearly marked (`ZZ_TESTSPRITE_*`) and **cleaned up** afterward.

## Result: 13 / 13 PASS

| ID | Test | Result | Evidence |
|---|---|---|---|
| TS-001 | Admin login + redirect | ✅ | valid creds → "Tổng quan" dashboard |
| TS-002 | Invalid login rejection | ✅ | wrong pw → stayed `/login`, "Invalid login or password" |
| TS-003 | Logout clears session | ✅ | post-logout `/customers` → `/login`, `tgclinic_token` removed |
| TS-010 | Customer list loads | ✅ | `/customers`, 20 rows, search present |
| TS-011 | Accent-insensitive search | ✅ | `phuong` → `Nguyễn Phương Thảo`, `PHƯƠNG THẢO`, … |
| TS-012 | Create new customer | ✅ | created **TM696597** "ZZ_TESTSPRITE_…", visible in list |
| TS-013 | Edit existing customer | ✅ | set email `testsprite-edited@example.com` via "Cập nhật"; persisted on profile |
| TS-020 | Employee list loads | ✅ | `/employees` "Nhân viên", 20 rows |
| TS-021 | Create new employee | ✅ | created "ZZ_TESTSPRITE_EMP_…" (Editor, Active) |
| TS-030 | Calendar loads | ✅ | `/calendar` "Lịch hẹn", 17 appts (7 Jun) |
| TS-031 | Calendar date nav | ✅ | Next → 7 Jun → 8 Jun |
| TS-040 | Payment page loads | ✅ | `/payment` "Kế hoạch thanh toán", 100 rows (plan route corrected) |
| TS-050 | Permission matrix loads | ✅ | `/permissions` "Quyền hạn" board (corrected) |

## 🐞 Bug found (cosmetic LOB) — customer delete missing `/cosmetic` prefix
While cleaning up the test customer, the UI delete silently failed. Captured network call:

```
PATCH /api/Partners/<id>/soft-delete   → 404 Route not found
```

The request omits the LOB prefix. The correctly-prefixed endpoint works:

```
PATCH /api/cosmetic/Partners/<id>/soft-delete   → 200 OK
```

**Impact:** deleting a Cosmetic customer from the NK3 UI does nothing (404, no error shown to the user). This is the apiFetch LOB-prefix invariant (see `website/src/lib/api/__tests__/apiFetch.lob.test.ts`, INV-008x) not being applied on the customer delete path. **Recommend:** route the soft-delete through the lob-aware `apiFetch` so it becomes `/api/cosmetic/Partners/:id/soft-delete` when `currentLOB === 'cosmetic'`, and surface a failure toast on non-200.

## Cleanup (production left clean)
- Customer **TM696597** — soft-deleted via `PATCH /api/cosmetic/Partners/<id>/soft-delete` (200); gone from list.
- Employee `ZZ_TESTSPRITE_EMP_…` (`6f489641…`) — hard-deleted via `DELETE /api/cosmetic/Employees/<id>` (200); gone.
- Net data impact on production: **zero**.

## Plan fixes applied
- `testsprite_frontend_test_plan.json`: TS-040 `targetPage` `/payments`→`/payment`; TS-050 `/settings/permissions`→`/permissions`.

## Notes
- Employees and customers are **LOB-scoped** (`/api/cosmetic/Employees`, `/api/cosmetic/Partners`).
- Input technique: React controlled inputs needed native value-setter + `input` event; icon controls needed in-page DOM `.click()`; edit modal save button is "Cập nhật" (not "Lưu").
- Employee creation defaults the tier select to "Super Admin" — switched to "Editor" to avoid creating a privileged account (worth a UX guard: don't default new employees to Super Admin).
