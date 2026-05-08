# Feedback Audit: Google Doc + Sheet

Date: 2026-05-08

Sources:
- Google Doc feedback: `1kmH26VhfbttYt1xu88Il1Ucc5_Y1vqw_Jf07rnslcKM`
- Google Sheet feedback: `1hxieElsUpMp3CY9ooAB6NENw_IYGGDMIGej3B4j5M-g`

## Google Doc Feedback

| Feedback | Status | Codebase evidence |
|---|---|---|
| Calendar should default to day view, not week view. | Already built before this pass. | `website/src/hooks/useCalendarData.ts` initializes `viewMode` to `day`. |
| Appointment export needs Phụ tá and Trợ lý BS, not only Bác sĩ. | Already built on the current branch. | `api/src/services/exports/builders/appointmentsExport.js` includes `assistantName` and `dentalAideName` columns. |
| Appointment customer search cannot search by customer code. | Fixed in this pass. | `website/src/components/shared/CustomerSelector.tsx` now searches `customer.code`; covered by `CustomerSelector.test.tsx`. |
| Overview should keep separate searches and the seconds counter should count. | Separate searches already present; seconds fixed in this pass. | `website/src/pages/Overview.tsx` keeps Zone 1 and Zone 3 search state separate, `TodayServicesTable` has its own search state, and `WaitTimer.tsx` now shows seconds after the first minute. |
| Appointment staff selectors cannot clear selected doctor/assistant/TLBS. | Fixed in this pass. | `AppointmentStaffFields.tsx` now sends explicit `null`; `PUT /api/Appointments/:id` preserves null fields through `readBodyField()`. |
| Service form staff selectors cannot clear selected doctor/assistant. | Already built before this pass. | `ServiceForm.tsx` already passes `allowClear` for doctor, assistant, and dental aide selectors and sends null values. |
| Service tooth quantity saves as 1 even when 4-5 teeth are selected. | Fixed in this pass. | `serviceFormToothQuantity.ts` syncs quantity to selected tooth count when quantity is still following the tooth picker/default. |

## Google Sheet Feedback

The sheet feedback is broader than the operational Google Doc fixes. It spans reporting definitions, payment/deposit revenue recognition, role permissions, and Hồ sơ online upload policy. These should be handled as a separate cross-domain reporting + permissions pass.

| Feedback area | Current audit result | Next implementation scope |
|---|---|---|
| Revenue report should count paid treatment vouchers, not deposits, and support location/date/person/role/service breakdowns. | Completed for current report endpoints. Revenue summary, trend, location, doctor, category, and service/source breakdowns now use posted treatment payment allocations and exclude deposit/refund/usage records. | Covered by `revenueRecognition.test.js` and `servicesBreakdown.test.js`; broader UI browser verification remains in `testbright.md`. |
| Cash-flow report should show all money in/out, deposits, before/after confirmation, and payment method breakdown. | Completed for the mounted cash-flow API summary: deposits, refunds, deposit usage, voids, money in/out, and daily trend are separated. | Covered by `cashFlow.test.js`; proof/confirmation-state grouping remains future scope because no receipt-confirmation workflow exists yet. |
| Receptionist/Admin/Super Admin/Dentist/Assistant role access matrix. | Partially completed at the backend permission boundary. Payment create/refund/void/delete and Hồ sơ online view/create/upload are now split into separate permission strings; full role fixture seeding/browser matrix still needs production-role verification. | Covered by `readRoutePermissions.test.js`; role-by-role browser testing remains in `testbright.md`. |
| Admin cannot confirm payment receipts; Dentist can view and confirm payment receipts. | Not implemented because receipt confirmation is not a current route/workflow in the codebase. Payment destructive actions were split so this future feature can get its own permission without sharing `payment.edit`. | Future payment receipt confirmation workflow. |
| Hồ sơ online can view but cannot upload. | Completed for view-only roles. Backend upload now requires `external_checkups.upload`, patient creation remains `external_checkups.create`, and the customer profile hides create/upload controls unless the matching permission is present. | Covered by `readRoutePermissions.test.js` and `HealthCheckupGallery.permissions.test.tsx`. |
