# Summary — 01-04: Payment Proof Backend + E2E Test

## Completed

- Created `api/migrations/002_payment_proofs.sql` with `payment_proofs` table:
  - Columns: `id`, `payment_id`, `proof_image`, `qr_description`, `qr_generated_at`, `created_at`
- Created `api/src/routes/payments.js` with `POST /:id/proof` endpoint:
  - Validates base64 image prefix (`data:image/`)
  - Inserts proof record and returns `{ success: true, proofId }`
- Updated `VietQrModal.tsx` with payment proof upload UI:
  - File input (`accept="image/*"`) with FileReader base64 conversion
  - Preview thumbnail of selected image
  - "Xác nhận đã thanh toán" button calling `uploadPaymentProof`
  - Success/error messaging with green/red styling
- Added `uploadPaymentProof` helper to `website/src/lib/api.ts`
- Created `website/e2e/vietqr-payment.spec.ts` (TC-VQ1):
  - Logs in as `tg@clinic.vn` / `123456`
  - Navigates to customer profile → Payment tab → Make Payment → Tạo QR
  - Fills amount `500000`, generates QR, asserts `img.vietqr.io` image is visible
  - Passes end-to-end against local dev server
- Bumped version to `0.4.10` in `website/package.json`
- Added top entry to `website/public/CHANGELOG.json` for v0.4.10

## Commits

- `88d23852` — feat(01-foundation-vietqr-04): payment proof backend, upload UI, E2E test, and version bump

## Artifacts

- `api/migrations/002_payment_proofs.sql`
- `api/src/routes/payments.js`
- `website/src/components/payment/VietQrModal.tsx`
- `website/src/lib/api.ts`
- `website/e2e/vietqr-payment.spec.ts`
- `website/package.json`
- `website/public/CHANGELOG.json`
