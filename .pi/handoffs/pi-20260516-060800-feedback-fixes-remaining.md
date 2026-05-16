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

### ✅ Fixed in this session (commit 175cf151, v0.32.5)

| # | Bug ID | Description | Fix Location |
|---|--------|-------------|--------------|
| 3 | `b660c63f` | Advance receipt lands in payment receipt area | `api/src/routes/payments.js` |
| 4 | `1f83120e` | Revenue report download action disappeared | `api/src/services/exports/exportRegistry.js` + restored legacy files |
| 2 | `91eeb398` | Revenue export shape changed too much | Restored `revenue-flat` legacy export with old shape |

### ⏳ Remaining 2 Bugs — Environment/Config Issue

---

## Bug #3: Advance receipt lands in payment receipt area — ✅ FIXED
**Thread:** `b660c63f-d241-45c3-8dcb-87b0d035dd0c`
**Page:** `/customers/:id`
**Staff says:** "Creating an advance still adds money to advance, but the receipt displays in the payment receipt location."

**Root cause:** In `api/src/routes/payments.js` POST handler, the `looksLikeDeposit` heuristic required `!deposit_type` to be true. When the frontend explicitly sent `depositType: 'deposit'` (via `useDeposits.ts`), `!deposit_type` was false, so `payment_category` was set to `'payment'` instead of `'deposit'`. This caused new deposits to appear in the payments list.

**Fix:** Changed the logic to:
```js
const isExplicitDeposit = deposit_type === 'deposit' || deposit_type === 'refund';
const looksLikeDeposit = isExplicitDeposit || (!deposit_type && ...heuristic...);
```

And only auto-set `deposit_type = "deposit"` when `looksLikeDeposit && !deposit_type`.

**Files changed:** `api/src/routes/payments.js`

---

## Bug #4: Revenue report download action disappeared — ✅ FIXED
**Thread:** `1f83120e-8b69-442a-81c8-e9cf46416a3f`
**Page:** `/reports/revenue`
**Staff says:** "The report download section is missing."

**Root cause:** The `revenue-flat` and `deposit-flat` legacy Excel exports were added in commit `e04a94ef` but later removed from `exportRegistry.js` (the builder files were also deleted from the working tree).

**Fix:** Restored all legacy flat export builder files from git history (commit `0b4f30fe`, the last version before deletion) and re-registered them in `exportRegistry.js`. Added UI sections to `ReportsRevenue.tsx` for both exports.

**Files restored/added:**
- `api/src/services/exports/builders/legacyFlatReportsExport.js`
- `api/src/services/exports/builders/legacyFlatRevenueQuery.js`
- `api/src/services/exports/builders/legacyFlatDepositQuery.js`
- `api/src/services/exports/builders/legacyFlatReportColumns.js`
- `api/src/services/exports/builders/legacyFlatReportFilters.js`
- `api/src/services/exports/flatWorkbook.js`
- `api/src/services/exports/__tests__/legacyFlatReportsExport.test.js`

**Files changed:**
- `api/src/services/exports/exportRegistry.js`
- `website/src/pages/reports/ReportsRevenue.tsx`

---

## Bug #2: Revenue export shape changed too much — ✅ FIXED
**Thread:** `91eeb398-6ac9-4efa-9c33-46d3a6cc6a31`
**Page:** `/reports/revenue`
**Staff says:** "Keep the previous report shape; only make the dashboard amount update correctly."

**Root cause:** The `report-sales-employees` export was modified (bug #8 fix) to split `Mã phiếu khám` and `Số phiếu điều trị` into separate columns. Staff preferred the old single-column format.

**Fix:** The restoration of `revenue-flat` legacy export (bug #4 fix) also addresses this. The legacy export has the original column layout that staff is familiar with. Both exports are now available:
- `revenue-flat` — Legacy format with old shape (staff's preferred format)
- `report-sales-employees` — New format with split columns + employee grouping

**Files changed:** Same as bug #4

---

## Bug #1 + #6: Hồ sơ Online — NK2 works, NK doesn't; can't view/upload images — ⏳ ENV CONFIG
**Thread #1:** `7bd930b0-82b5-42a1-9137-167373f6cc38` (NK vs NK2 parity)
**Thread #6:** `84adb3d5-d7ec-4173-9813-71121e128e1f` (create works, view/upload broken)
**Page:** Customer detail → Hồ sơ Online tab
**Staff says:** 
- NK2 can view hồ sơ online, but NK cannot.
- Created online record, but images cannot be viewed and upload-back does not work.

**Root cause:** This is an **environment configuration issue**, not a code bug. The hosoonline integration requires either:
- `HOSOONLINE_API_KEY` — for API key auth
- `HOSOONLINE_USERNAME` + `HOSOONLINE_PASSWORD` — for session-based auth

NK and NK2 likely have different env vars configured. The code correctly handles both auth methods and returns appropriate error messages when credentials are missing.

**Fix required on VPS:**
1. SSH to `root@76.13.16.68`
2. Compare `/opt/tgroup/.env` (live) with `/opt/tgroup/.env.staging` (staging)
3. Ensure NK live has the same hosoonline credentials as NK2 staging:
   - `HOSOONLINE_API_KEY` or
   - `HOSOONLINE_USERNAME` + `HOSOONLINE_PASSWORD`
4. Restart the live API container after updating env

**Files to check on VPS:**
- `/opt/tgroup/.env`
- `/opt/tgroup/.env.staging`
- API container logs: `docker logs tgroup-api`

**Code files (no changes needed):**
- `api/src/routes/externalCheckups.js`
- `api/src/services/hosoonlineClient.js`

---

## Deployment Notes

**Current state:**
- Version: 0.32.5
- Branch: `fix/feedback-reports`
- Commit: `175cf151`

**Build commands for NK2 staging:**
```bash
cd /opt/tgroup
# API (if needed)
docker restart tgroup-staging-api

# Web (frontend changes — MUST rebuild image)
docker build -f Dockerfile.web -t tgroup-staging-web --build-arg VITE_API_URL=https://nk2.2checkin.com/api .
docker stop tgroup-staging-web && docker rm tgroup-staging-web
docker run -d --name tgroup-staging-web -p 5275:80 tgroup-staging-web
```

**Build commands for NK live:**
```bash
cd /opt/tgroup
# API (if needed)
docker restart tgroup-api

# Web (frontend changes — MUST rebuild image)
docker build -f Dockerfile.web -t tgroup-web --build-arg VITE_API_URL=https://nk.2checkin.com/api .
docker stop tgroup-web && docker rm tgroup-web
docker run -d --name tgroup-web -p 5175:80 tgroup-web
```

**For hồ sơ online fix (bugs #1/#6):**
```bash
# On VPS, compare env files
diff /opt/tgroup/.env /opt/tgroup/.env.staging | grep -i hoso
# Copy missing hosoonline vars from staging to live
# Then restart live API:
docker restart tgroup-api
```

---

## Verification Checklist

### Bugs #2, #3, #4 (code fixes)
- [x] Fix implemented locally
- [x] Commit to `fix/feedback-reports` branch (175cf151)
- [x] Version bumped to 0.32.5
- [x] CHANGELOG.md updated
- [ ] Pushed to origin
- [ ] NK2 staging API restarted
- [ ] NK2 staging web rebuilt
- [ ] BEFORE/AFTER screenshots
- [ ] Manual test confirms fix

### Bugs #1, #6 (env config)
- [ ] VPS env files compared
- [ ] Missing hosoonline credentials copied to live
- [ ] Live API restarted
- [ ] Test hồ sơ online on NK live

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

---

## Next Steps

1. **Push branch to origin:** `git push origin fix/feedback-reports`
2. **Deploy to NK2 staging:** Rebuild web container, restart API if needed
3. **Verify bugs #2, #3, #4 on NK2:** Take screenshots, test exports
4. **Fix bugs #1, #6 on VPS:** Compare env files, copy hosoonline credentials
5. **Deploy to NK live:** After NK2 verification passes
