---
phase: 02-quick-features-validations
plan: 02
type: execute
completed: "2026-04-10"
duration: 677
tasks: 3
files_created: 0
files_modified: 8
---

# Phase 02 Plan 02: Dental Aide + Deposit/Payment Date Pickers Summary

**One-liner:** Added a third Dental Aide staff selector to ServiceForm and wired it through useServices, plus integrated date pickers defaulting to today in DepositWallet and PaymentForm with date-to-notes forwarding.

## Execution Summary

All three tasks completed successfully with zero TypeScript errors.

- **Task 1:** Extended `CreateServiceInput` with `dentalAideId`/`dentalAideName`, added `dentalaideid` to the API payload, and rendered a new `DoctorSelector` labeled "Nha sĩ phụ" in `ServiceForm`.
- **Task 2:** Added a `type="date"` input defaulting to today in `DepositWallet`, forwarded the selected date through `useDeposits.addDeposit` as a composed note prefix, and updated all callers (`CustomerProfile`, `Customers`, `Payment`) to match the new signature.
- **Task 3:** Added a `type="date"` input labeled "Ngày thanh toán" in `PaymentForm`, defaulting to today, and prepended the selected date to the submitted notes.

## Files Modified

| File | Change |
|------|--------|
| `website/src/hooks/useServices.ts` | Added `dentalAideId`/`dentalAideName` to `CreateServiceInput`; included `dentalaideid` in payload |
| `website/src/components/services/ServiceForm.tsx` | Added state, handler, lookup, payload fields, and UI selector for Dental Aide |
| `website/src/components/payment/DepositWallet.tsx` | Added `addDate` state and date input; updated `onAddDeposit` call signature |
| `website/src/hooks/useDeposits.ts` | Extended `addDeposit` with `date` and composed `notes` with `Date: ${date}` |
| `website/src/components/customer/CustomerProfile.tsx` | Updated `onAddDeposit` prop and lambda to forward `date` |
| `website/src/pages/Customers.tsx` | Updated `handleAddDeposit` to accept and forward `date` |
| `website/src/pages/Payment.tsx` | Updated `onAddDeposit` lambda arity to match new signature |
| `website/src/components/payment/PaymentForm.tsx` | Added `paymentDate` state, date input, and `finalNotes` prepending date |

## Commits

| Hash | Message |
|------|---------|
| `bd412ebc` | feat(02-02): add dental aide selector to ServiceForm and extend types |
| `a95f6823` | feat(02-02): add date picker to DepositWallet and wire through callers |
| `e23a402d` | feat(02-02): add payment date picker to PaymentForm |

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- TypeScript compilation passed with zero errors across all modified files.
- Acceptance criteria confirmed via grep:
  - `dentalAideId` present in `useServices.ts` and `ServiceForm.tsx`
  - `Nha sĩ phụ` label present in `ServiceForm.tsx`
  - `type="date"` present in both `DepositWallet.tsx` and `PaymentForm.tsx`
  - `addDate` and `paymentDate` states present and used
  - `date?: string` present in `useDeposits.ts` `addDeposit` signature

## Self-Check: PASSED

- All modified files compile without TypeScript errors.
- All commits exist and contain the expected changes.
