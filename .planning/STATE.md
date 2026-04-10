---
gsd_state_version: 1.0
milestone: kol-integration
milestone_name: KOL Integration Portal
status: in_progress
last_updated: "2026-04-10T17:50:00.000Z"
last_activity: 2026-04-10
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
  percent: 25
---

# Project State — KOL Integration Portal

**Status:** In Progress  
**Last Activity:** 2026-04-10

## Phase Tracker

| Phase | Status | Plans | Verified |
|-------|--------|-------|----------|
| 1: Foundation & VietQR | Completed | 4 / 4 | Yes |
| 2: KOL Management | Not started | — | — |
| 3: Commission Engine | Not started | — | — |
| 4: Reporting & Payouts | Not started | — | — |

## Completed Plans

- `01-01` — VietQR URL builder + `useBankSettings` hook (TDD)
- `01-02` — Bank settings backend migration + admin form
- `01-03` — VietQR modal integration into PaymentForm / DepositWallet
- `01-04` — Payment proof upload backend + E2E test (TC-VQ1)

## Key Decisions Log

1. **VietQR provider:** `img.vietqr.io` (static QR image) — chosen over dynamic APIs to avoid rate limits and keep flow simple.
2. **face-api.js reuse:** Plan to reuse existing face-api setup from `frontend-truth` for patient-photo capture (deferred to Phase 2).
3. **Payment proofs:** Stored as base64 `TEXT` in `payment_proofs.proof_image` for demo simplicity; migrate to object storage before production.

## Artifacts

- `api/migrations/002_payment_proofs.sql`
- `api/src/routes/payments.js`
- `website/src/components/payment/VietQrModal.tsx`
- `website/e2e/vietqr-payment.spec.ts`
- `website/src/lib/vietqr.ts`
- `website/src/hooks/useBankSettings.ts`
