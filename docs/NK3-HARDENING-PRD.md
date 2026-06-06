# NK3 Hardening PRD (Dental + Cosmetic + CTV)

**Owner:** autonomous session (Claude) · **Date:** 2026-06-06 · **Branch:** nk3-deploy
**Goal:** Make Dental + Cosmetic + CTV work together correctly and securely on NK3, with TDD.
Derived from the `nk3-gap-discovery` workflow (37 gaps) + live evidence probes. Every agent
claim was re-verified against the running NK3 before inclusion — several were rejected as
false (see "Rejected").

## Already shipped this session
- CTV portal 403 fix (permissionService: is_ctv → ctv.* regardless of tier_id). Commit 1d8e44b6.
- Cross-LOB PHI gate (dentalLobGate.js on the cosmetic-mirrored route set). Commit 4e616a3a. Verified.
- Migration 059 (CTV never staff tier). Applied to both NK3 DBs.

## Rejected (verified NOT real / would break things)
- "Gate Earnings/Payouts" — already admin-perm-gated (403 to cosmetic staff); no leak. Earnings/Payouts
  use `?lob` + getDb(lob) and have NO /cosmetic mirror, so threading lob→apiFetch would 404 and BREAK
  the working earnings tab. LEAVE AS-IS.
- "fetchEarnings/fetchPayouts thread lob to apiFetch" — same reason. DO NOT.
- "schema-migrations gaps" — agent found 0; schema is consistent on NK3.
- "CTV commission-summary thread lob" — it INTENTIONALLY aggregates both DBs. LEAVE.

## Work items (priority order)

### P1 — Dead route cleanup (5 routes 500 for everyone, 0 FE references) — LOW risk
Comment out mounts in api/src/server.js: Commissions, Receipts, AccountJournals, StockPickings, HrPayslips.
Evidence: admin token → 500 "relation/column does not exist". FE refs = 0 each. Verify no 500s after.

### P2 — Money integrity — migrations + TDD
- P2a: earnings.level = NULL (3 rows tcosmetic_nk3). Investigate root cause; backfill or document.
- P2b: migration 060 — FK earnings.payout_id → payouts(id) ON DELETE SET NULL; clean the 1 orphan first.
- P2c: migration 061 — CHECK (enabled OR share_percent = 0) on commission_level_config; zero out disabled L3/L4.

### P3 — FE LOB threading for MIRRORED gated routes (so cosmetic context shows cosmetic data, not 403/dental) — MED risk
Thread `lob: currentLOB` (PREFIX approach → /api/cosmetic/*) ONLY for routes with a cosmetic mirror:
- website/src/pages/Reports.tsx (+ report subpages) — currently no LOB → admin in cosmetic sees DENTAL reports.
- website/src/lib/api/commission.ts → fetchNewClients (mirror exists; leave fetchEarnings/fetchPayouts on ?lob).
- website/src/lib/api/ctv.ts → fetchCtvs (/Ctvs/options, mirror exists).
TDD: extend website/src/lib/api/commission.lob.test.ts. NOTE: only mirrored routes; verify each returns cosmetic data via /cosmetic before wiring.

### P4 — Quality / docs — LOW risk
- cosmetic.json i18n namespace (en + vi) so cosmetic staff don't inherit English.
- CtvLinkBar.tsx: urgency icon when remainingDays ≤ 7.
- docs/INVARIANTS.md: INV-008B-ext (CTV = 3 perms regardless of tier_id), dental LOB gate, 4-state.
- locations.edit perm: enforce on companies write route or remove from registry.

### P5 — Verify + release
- Re-run api test suite (baseline: 971 pass / 7 pre-existing env failures).
- Live re-probe matrix (admin/cosmetic/CTV). Browser spot-check.
- CHANGELOG.json entry covering CTV fix + LOB gate + this batch. Commit incrementally.

## Test baseline (pre-work)
api: 971 pass / 7 fail — all pre-existing & environmental (commissionEngine, authResponseShape,
saleOrderLines = need live DB; faceServiceModelUrls = network; feedbackAttachments = setup). None mine.

---
## STATUS (2026-06-06, end of autonomous pass)

DONE & LIVE-VERIFIED on NK3 (committed):
- CTV portal 403 fix (permissionService is_ctv→ctv.*) — 1d8e44b6
- Cross-LOB PHI gate (dentalLobGate) — 4e616a3a
- Migration 059 (CTV never staff tier) — applied both DBs
- P1 dead-route cleanup (Commissions/Receipts/AccountJournals/StockPickings/HrPayslips → 404) — 9d158506
- P2b FK earnings.payout_id (migration 060) — applied both DBs — 85dbbb61
- INV-008F (dental LOB gate) + INV-008G (CTV tier_id-independent) — 2fefb97a

FINAL LIVE MATRIX (all expected):
  /api/Partners      admin200 cos403 ctv403   (PHI gate)
  /api/Appointments  admin200 cos403 ctv403
  /api/cosmetic/Partners admin200 cos200 ctv403 (mirror)
  /api/ctv/commission-summary admin403 cos403 ctv200 (CTV-self only, by design)
  /api/Commissions   404/404/404 (dead route cleaned)
  CTV create (POST /api/ctv as CTV): 201
Tests: dentalLobGate 7/7 + permissionService 22/22 green. api baseline 971 pass (7 pre-existing env failures).

REJECTED via evidence (would have broken things or non-issues):
- Gating Earnings/Payouts (already admin-perm-gated; use ?lob; no mirror → threading would 404 the earnings tab)
- Disabled-level CHECK constraint (engine already excludes disabled levels)
- Most FE LOB-threading "gaps" (fetchCtvOptions/fetchCtvs already thread lob; ?lob works for admins)
- schema/migration drift (none; schema consistent)

DEFERRED (low impact; need a web rebuild or risky; documented for a future release):
- P3 Reports.tsx LOB threading (admin-in-cosmetic sees dental reports — edge case)
- P4a cosmetic.json i18n namespace
- P4b CtvLinkBar ≤7d urgency icon
- P2a 3 null-level pending cosmetic earnings (legacy/seed; backfill risks mis-assigning money levels)
- locations.edit perm enforce/remove; permission constants enum; earnings/payout audit logging
