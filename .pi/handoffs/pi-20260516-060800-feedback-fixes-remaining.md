# Handoff: Remaining 5 Feedback Bugs (of 8)

**Handoff ID:** pi-20260516-060800-feedback-fixes-remaining
**Date:** 2026-05-16T06:08:00+07:00
**Session Tool:** Pi
**Session ID:** current-session
**Branch:** fix/feedback-reports
**Worktree:** /Users/thuanle/Documents/TamTMV/Tgrouptest

---

## What we were doing

Fixing 8 manual staff feedback reports from the NK feedback system. 3 are done, 5 remain.

### ✅ Already Fixed (verified on NK2 staging)

| # | Bug ID | Description | Fix Location |
|---|--------|-------------|--------------|
| 7 | `926fe4a4` | Payments export missing cash/bank/deposit columns | `api/src/services/exports/builders/paymentsExport.js` |
| 8 | `b064ee3d` | Revenue export "Phiếu khám" mixes exam code + service | `api/src/services/exports/builders/reportSalesEmployeesExport.js` |
| 5 | `aaab3cf5` | Calendar export presets always use today, not viewed date | `website/src/components/calendar/ExportDateRangeModal.tsx` + `Calendar.tsx` |

### ⏳ Remaining 5 Bugs — Fix These Next

---

## Bug #3: Advance receipt lands in payment receipt area
**Thread:** `b660c63f-d241-45c3-8dcb-87b0d035dd0c`
**Page:** `/customers/9aa0b5c4-ac80-4851-9c0b-b14c0088ad79`
**Staff says:** "Creating an advance still adds money to advance, but the receipt displays in the payment receipt location."

**Investigation so far:**
- The customer page uses `useCustomerDetailController.ts` which imports `useExternalCheckups` — but that's for hồ sơ online, not deposits.
- Deposits are handled in `website/src/pages/Customers.tsx` with props: `depositList`, `depositBalanceData`, `handleAddDeposit`, `handleVoidDeposit`, etc.
- The deposit UI components are likely in `website/src/components/customer/` — search for `Deposit` or `deposit` components.
- **Key question:** Is the "advance receipt" (phiếu tạm ứng/đặt cọc) being rendered inside the payment receipt list instead of its own section?

**Suggested fix path:**
1. Open `website/src/pages/Customers.tsx` and find where deposits are rendered vs payments
2. Check if a deposit receipt component is being passed to the payment list by mistake
3. Look for recent commits that touched customer deposit/payment UI

---

## Bug #1 + #6: Hồ sơ Online — NK2 works, NK doesn't; can't view/upload images
**Thread #1:** `7bd930b0-82b5-42a1-9137-167373f6cc38` (NK vs NK2 parity)
**Thread #6:** `84adb3d5-d7ec-4173-9813-71121e128e1f` (create works, view/upload broken)
**Page:** Customer detail → Hồ sơ Online tab
**Staff says:** 
- NK2 can view hồ sơ online, but NK cannot.
- Created online record, but images cannot be viewed and upload-back does not work.

**Investigation so far:**
- Backend route: `api/src/routes/externalCheckups.js` — proxies hosoonline.com images
- Image proxy endpoint: `GET /api/ExternalCheckups/images/:imageName`
- Requires `external_checkups.view` permission
- The route checks `HOSOONLINE_API_KEY` or `hasHosoLoginCredentials()`
- **Critical finding:** The image proxy fetches from hosoonline with auth headers. If NK and NK2 have different env configs (different API keys or login credentials), one could work while the other fails.

**Suggested fix path:**
1. Compare `HOSOONLINE_API_KEY`, `HOSOONLINE_USERNAME`, `HOSOONLINE_PASSWORD` env vars between NK and NK2
2. Check VPS env files: `/opt/tgroup/.env` (live) vs `/opt/tgroup/.env.staging` (staging)
3. Test the image proxy directly: `curl -H "Authorization: Bearer <token>" https://nk.2checkin.com/api/ExternalCheckups/images/<imageName>`
4. Check if the hosoonline login is failing on NK (look at API container logs)
5. For upload: check `POST /api/ExternalCheckups/:customerCode/health-checkups` — same auth issue likely

**Files to check:**
- `api/src/routes/externalCheckups.js`
- `api/src/services/hosoonlineClient.js`
- VPS env files on 76.13.16.68

---

## Bug #4: Revenue report download action disappeared
**Thread:** `1f83120e-8b69-442a-81c8-e9cf46416a3f`
**Page:** `/reports/revenue`
**Staff says:** "The report download section is missing."

**Investigation so far:**
- The current `/reports/revenue` page has "Xuất dữ liệu" (Export Data) buttons in the UI
- Staff may be referring to a **legacy** download that was removed or moved
- Git history shows a `legacyFlatReportsExport` was added in commit `e04a94ef` with types: `revenue-flat`, `deposit-flat`
- These legacy exports may have been the "report download" staff is looking for

**Suggested fix path:**
1. **Clarify with staff first** — take a screenshot of the current `/reports/revenue` page and ask which specific button/download is missing
2. Check if `legacyFlatReportsExport` is still registered in `exportRegistry.js`
3. If the legacy export was removed, consider restoring it or pointing staff to the new export location

**Files to check:**
- `api/src/services/exports/exportRegistry.js` — look for `revenue-flat` or `deposit-flat`
- `website/src/pages/reports/ReportsRevenue.tsx` — check what export UI is shown

---

## Bug #2: Revenue export shape changed too much
**Thread:** `91eeb398-6ac9-4efa-9c33-46d3a6cc6a31`
**Page:** `/reports/revenue`
**Staff says:** "Keep the previous report shape; only make the dashboard amount update correctly."

**Investigation so far:**
- Staff wants the **old report format** back, with only dashboard totals fixed
- The current `reportSalesEmployeesExport.js` was modified to split `Mã phiếu khám` and `Số phiếu điều trị` (bug #8 fix)
- Git history shows `legacyFlatReportsExport` existed before the current shape — commit `e04a94ef` added it
- The legacy export may be what staff considers the "previous report shape"

**Suggested fix path:**
1. Check git history for the previous version of `reportSalesEmployeesExport.js` before bug #8 fix
2. Compare the old column layout with what staff wants
3. Consider restoring the old shape and applying only the dashboard fix
4. **Alternative:** The `legacyFlatReportsExport` (type `revenue-flat`) may already have the old shape — verify if it's accessible

**Files to check:**
- `api/src/services/exports/builders/reportSalesEmployeesExport.js` — git history
- `api/src/services/exports/builders/legacyFlatRevenueQuery.js`
- `api/src/services/exports/exportRegistry.js` — check if `revenue-flat` is registered

---

## Deployment Notes

**Current deployed state on NK2 staging:**
- Web container: `tgroup-staging-web` (port 5275→80) — **rebuilt with Docker image**
- API container: `tgroup-staging-api` (port 3102)
- Version: 0.32.4
- Branch: `fix/feedback-reports`

**Critical lesson from this session:**
- `docker restart` does NOT pick up new frontend builds — must rebuild the image and recreate the container
- The web Dockerfile is at `/opt/tgroup/Dockerfile.web`
- The nginx config for the web container is at `/opt/tgroup/nginx.docker.conf` (must NOT have `api` upstream — host nginx handles API proxying)
- Build command:
  ```bash
  cd /opt/tgroup
  docker build -f Dockerfile.web -t tgroup-staging-web --build-arg VITE_API_URL=https://nk2.2checkin.com/api .
  docker stop tgroup-staging-web && docker rm tgroup-staging-web
  docker run -d --name tgroup-staging-web -p 5275:80 tgroup-staging-web
  ```

**Live deploy (NK):**
- Same build process but with `VITE_API_URL=https://nk.2checkin.com/api`
- Web container: `tgroup-web` (port 5175→80)
- API container: `tgroup-api` (port 3002)
- **Night deploy recommended** (current Vietnam time is early morning, so deploy is safe)

---

## Context to Preserve

| Item | Value |
|------|-------|
| NK2 staging URL | https://nk2.2checkin.com |
| NK live URL | https://nk.2checkin.com |
| Admin credentials | t@clinic.vn / 123123 (in `.agents/live-site.env`) |
| VPS | root@76.13.16.68 |
| Staging API | tgroup-staging-api (port 3102) |
| Staging web | tgroup-staging-web (port 5275→80) |
| Live API | tgroup-api (port 3002) |
| Live web | tgroup-web (port 5175→80) |
| Feedback extract report | `reports/feedback-extract/2026-05-15T21-37-24-528Z-feedback-fix-queue.md` |
| Verification script | `scripts/verify-feedback.js` |
| Verification report | `reports/feedback-extract/2026-05-15T21-54-28-585Z-feedback-verification.md` |

---

## Verification Checklist (for each fix)

- [ ] Fix implemented locally
- [ ] Commit to `fix/feedback-reports` branch
- [ ] Version bumped (`node scripts/bump-version.mjs patch 'description'`)
- [ ] CHANGELOG.md updated
- [ ] Pushed to origin
- [ ] NK2 staging API restarted (if backend change)
- [ ] NK2 staging web rebuilt (if frontend change): `docker build ... && docker run ...`
- [ ] BEFORE screenshot taken
- [ ] AFTER screenshot taken
- [ ] Playwright or manual test confirms fix
- [ ] Move bug to "Fixed" in this handoff

---

## Next Steps (in suggested order)

1. **Bug #3 (advance receipt):** Check customer page deposit vs payment receipt components
2. **Bug #1/#6 (hồ sơ online):** Compare NK vs NK2 hosoonline env credentials; test image proxy
3. **Bug #4 (missing download):** Clarify with staff — screenshot current UI, ask what's missing
4. **Bug #2 (report shape):** Check git history for old report format; compare with legacy flat export
5. **Deploy all fixes to NK live** after NK2 verification
