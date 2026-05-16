# Handoff: Feedback Fixes — Bugs #2, #3, #4 Done; #1/#6 Need NK2 Verification

**Handoff ID:** pi-20260516-083000-feedback-fixes-done
**Date:** 2026-05-16T08:30:00+07:00
**Session Tool:** Pi
**Branch:** fix/feedback-reports
**Worktree:** /Users/thuanle/Documents/TamTMV/Tgrouptest
**Commit:** 175cf151 (v0.32.5)

---

## Summary

3 of 5 remaining bugs are **fixed and deployed to NK2 staging**. 2 bugs (#1, #6 — hồ sơ online) are **environment/config issues** that require staff verification to confirm root cause.

---

## ✅ Fixed — Bugs #2, #3, #4

### Bug #3: Advance receipt lands in payment receipt area
**File:** `api/src/routes/payments.js`
**Root cause:** `looksLikeDeposit` heuristic required `!deposit_type`. When frontend sent `depositType: 'deposit'`, the condition failed and `payment_category` was set to `'payment'`.
**Fix:** Added `isExplicitDeposit` check:
```js
const isExplicitDeposit = deposit_type === 'deposit' || deposit_type === 'refund';
const looksLikeDeposit = isExplicitDeposit || (!deposit_type && ...heuristic...);
```

### Bug #4: Revenue report download action disappeared
**Files:** Restored 6 legacy flat export files + registry + UI
**Root cause:** `revenue-flat` and `deposit-flat` exports were removed from `exportRegistry.js` and builder files deleted.
**Fix:** Restored all legacy files from git history (commit `0b4f30fe`) and re-registered. Added UI sections to `ReportsRevenue.tsx`.

### Bug #2: Revenue export shape changed too much
**Files:** Same as bug #4
**Root cause:** Staff preferred the old single-column format.
**Fix:** The restored `revenue-flat` export has the original column layout. Both formats now available.

---

## ⏳ Pending — Bugs #1, #6 (Hồ sơ Online)

**Issue:** NK2 works, NK doesn't; can't view/upload images

**Investigation done:**
- Both NK and NK2 have **identical** hosoonline env vars (same API key, username, password)
- Direct API tests show **both return identical responses** (HTTP 200, same JSON)
- Image proxy returns 404 for non-existent images on **both** (expected)
- The code path is the same; no code difference between staging and live

**Current hypothesis:** Staff may be testing different patients, or there's a frontend caching issue, or the "works/doesn't work" refers to a specific patient with actual images (not the empty-checkup patients tested).

**Next step:** Ask staff to test hồ sơ online on NK2 staging and confirm if the issue still exists. If it does, capture:
1. Exact patient code where images fail
2. Browser console errors
3. Network tab response for `/api/ExternalCheckups/:code` and `/api/ExternalCheckups/images/:name`

---

## Deployment Status

| Environment | Status | Version |
|-------------|--------|---------|
| NK2 staging | ✅ Deployed (web rebuilt + API restarted) | 0.32.5 |
| NK live | ⏳ Not deployed | 0.32.4 |

**NK2 staging URL:** https://nk2.2checkin.com
**NK live URL:** https://nk.2checkin.com

---

## Files Changed (commit 175cf151)

### Backend
- `api/src/routes/payments.js` — Fix deposit payment_category classification
- `api/src/services/exports/exportRegistry.js` — Register revenue-flat, deposit-flat
- `api/src/services/exports/builders/legacyFlatReportsExport.js` — **restored**
- `api/src/services/exports/builders/legacyFlatRevenueQuery.js` — **restored**
- `api/src/services/exports/builders/legacyFlatDepositQuery.js` — **restored**
- `api/src/services/exports/builders/legacyFlatReportColumns.js` — **restored**
- `api/src/services/exports/builders/legacyFlatReportFilters.js` — **restored**
- `api/src/services/exports/flatWorkbook.js` — **restored**
- `api/src/services/exports/__tests__/legacyFlatReportsExport.test.js` — **restored**

### Frontend
- `website/src/pages/reports/ReportsRevenue.tsx` — Add legacy export UI sections

### Meta
- `website/package.json` — v0.32.5
- `website/public/CHANGELOG.json` — Updated
- `docs/CHANGELOG.md` — Entry added

---

## Verification Commands

```bash
# Check NK2 staging has the fix
curl -s 'https://nk2.2checkin.com/api/auth/me' -H 'Authorization: Bearer <token>'

# Test legacy export preview
curl -s 'https://nk2.2checkin.com/api/Exports/preview?type=revenue-flat' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"companyId":"all","dateFrom":"2026-05-01","dateTo":"2026-05-16"}'

# Test deposit category fix (create deposit, then check payments list doesn't include it)
# Via UI: /customers/:id → Payment tab → add deposit → verify deposit only shows in Deposits section
```

---

## Remaining Work

1. **Verify bugs #2, #3, #4 on NK2 staging** — Ask staff to test
2. **Investigate bugs #1, #6 with staff** — Get specific patient code and browser logs
3. **Deploy to NK live** — After NK2 verification passes:
   ```bash
   cd /opt/tgroup
   git pull origin fix/feedback-reports
   docker build -f Dockerfile.web -t tgroup-web --build-arg VITE_API_URL=https://nk.2checkin.com/api .
   docker stop tgroup-web && docker rm tgroup-web
   docker run -d --name tgroup-web -p 5175:80 tgroup-web
   docker restart tgroup-api
   ```

---

## Context

| Item | Value |
|------|-------|
| VPS | root@76.13.16.68 |
| Admin login | t@clinic.vn / 123123 |
| Staging web | tgroup-staging-web (port 5275→80) |
| Staging API | tgroup-staging-api (port 3102) |
| Live web | tgroup-web (port 5175→80) |
| Live API | tgroup-api (port 3002) |
