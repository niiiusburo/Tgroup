# CTV Referral & Commission Business Logic

> Authority source for NK3/TMV CTV referral ownership, CTV booking, service-card commission, tier payout, payout lock, and hierarchy rules.
> Source of business decisions: 2026-06-05 operator interview for `tmv.2checkin.com` NK3 TestSprite preparation.
> Implementation status: several rules below are accepted business logic but not fully implemented in current code. TestSprite must treat those rows as gaps until code catches up.

## 1. Scope

This document governs CTV referral and commission behavior for Dental and Cosmetic unless a row explicitly says Dental-only or Cosmetic-only.

It supersedes older CTV rules that used payment-collected timing or product-level `commission_rate_percent` for CTV commission.

Legacy admin commission configuration in `product-map/business-logic/commission-rules.md` remains a separate legacy system and is not the CTV commission source of truth.

## 2. Core Terms

| Term | Meaning |
|---|---|
| CTV | External referrer / collaborator stored as a partner row with CTV role flags. |
| Service card | Clinic service/order line that represents an activated service for a customer. |
| Appointment card | Scheduled appointment. It can carry CTV ownership and service intent but does not create commission by itself. |
| Owning CTV | CTV attached to the current active customer claim or specific appointment/service card. |
| Level 0 | The direct CTV attached to the service card. |
| Level 1 | Direct upline of Level 0. |
| Level 2 | Next upline above Level 1. |
| Level 3 / Level 4 | Configurable hierarchy levels that exist but normally remain disabled. |

## 3. Commission Trigger

| Rule | Business Logic | Status |
|---|---|---|
| CTV earns when a service card is created | Creating a service card with an attached CTV creates CTV earnings immediately. | target |
| Amount basis | Commission is calculated from the full service price immediately, not from amount paid, deposit paid, or collected cash. | target |
| Appointment-only booking | CTV booking creates or reclaims a customer and creates an appointment only. It does not create a service card and does not create commission. | current invariant |
| Appointment selected service | Service selected during CTV booking is appointment intent only. It can be stored on `appointments.productid`, including Referral Start fallback, but it is not a commissionable sale. | current invariant |
| Service with no selected CTV | If staff creates a service card without a CTV selected, the service stays CTV-less (`saleorders.ctv_id` NULL) and NO commission is created — even when the customer has an active `referred_by_ctv_id`. Commission requires an explicit CTV pick on the card (owner decision DEC-20260610-01, strict attribution; supersedes the create-time inheritance rule). | current invariant |

## 4. Tier Rates

| Rule | Business Logic | Status |
|---|---|---|
| Tier source | CTV percentages come from CTV admin portal tier config. | partial |
| Active levels | Levels 0, 1, and 2 are active by default. Levels 3 and 4 exist as configurable levels but normally remain disabled. | target |
| Disabled/missing level | Disabled levels and missing uplines earn nothing. The missing percentage stays with the company and is not redistributed to lower levels. | target |
| Legacy product rate | Product/service `commission_rate_percent` is legacy mock commission data and is not used for CTV commission. | target removal |
| More uplines cost more | When more enabled uplines exist, the company pays more total CTV percentage. The company does not normalize or cap by redistributing existing percentages. | target |

## 5. Braces Override

| Rule | Business Logic | Status |
|---|---|---|
| Scope | Braces override applies to Dental only. Cosmetic uses the normal tier config unless separately approved. | planned |
| Trigger | A service is Braces/Orthodontics when product/service category is `Braces` or `Orthodontics`, or product/service name contains `brace`, `braces`, or `niềng răng`. | planned |
| Rate source | Braces percentages use a separate Braces tier config in the same CTV admin portal. | planned |
| Amount basis | Braces commission is also based on full service price. | planned |

## 6. Claim Ownership And Six-Month Timer

| Rule | Business Logic | Status |
|---|---|---|
| Claim window | A customer CTV claim lasts 6 months. | current/target |
| Timer anchor | The 6-month countdown resets from the latest CTV-bearing appointment or CTV-bearing service attached to that customer. | partial |
| Same CTV activity | A new appointment or service by the same owning CTV resets the timer. | target |
| Expiration | Once the active window expires, another CTV can claim the customer. | target |
| Cross-LOB lock | CTV claim locks are per LOB. A Dental CTV lock does not block Cosmetic, and a Cosmetic lock does not block Dental. | target |
| Timer after appointment reassignment | If admin changes the CTV owner on an appointment card, the timer stays the same; only ownership changes to the new CTV. | target |

## 7. CTV Booking Eligibility

| Rule | Business Logic | Status |
|---|---|---|
| Eligible booking | A CTV can create an appointment when the customer is unclaimed in that LOB, the claim expired, or the same owning CTV is booking again. | partial |
| Blocked booking | A different CTV cannot create an appointment for a customer actively claimed by another CTV inside the 6-month window. | partial |
| Block result | Blocked booking returns an eligibility/claim error and does not create an appointment, service, customer duplicate, or commission. | partial |
| Referral Start fallback | If no service is selected, the appointment uses the configured Referral Start product as appointment intent only. | partial |

## 8. Admin CTV Override

| Rule | Business Logic | Status |
|---|---|---|
| Appointment override | Admin can change the CTV on appointment cards. This changes appointment ownership and claim owner but does not move commission money. | target |
| Service override before payout | Admin can change the CTV on service cards before payout. The old pending commission is reversed and new pending commission is created immediately for the new CTV/uplines. | target |
| Paid-out lock | If related CTV commission has already been paid out, cancel/delete/refund/service CTV reassignment is blocked. | partial |
| Timer and service override | Service-card CTV changes move service ownership and commission ownership. The claim timer follows the latest CTV-bearing appointment/service rule. | target |

## 9. Deletes, Refunds, And Corrections

| Rule | Business Logic | Status |
|---|---|---|
| Service cancellation/deletion/refund | If a commissionable service is cancelled, deleted, or refunded before CTV payout, CTV earnings are reversed/taken back. | partial |
| Paid-out commission | Paid-out CTV earnings are permanently locked. Related service/payment reversal is blocked. | current invariant |
| Payment edit | Staff/admin do not edit an incorrect payment. They delete/void the payment and create a new correct payment. | target |
| Direct payment PATCH | Direct `PATCH /api/Payments/:id` is legacy/internal gap and is not a supported correction workflow. | gap |
| Payment delete default | UI payment delete is a hard delete/void correction path unless paid-out CTV commission blocks the action. | partial |

## 10. Payouts

| Rule | Business Logic | Status |
|---|---|---|
| Separate or combined payout | Admin can run payouts separately by LOB or combined across Dental + Cosmetic. | target |
| Combined payout record model | Combined payout uses one LOB-local payout row in Dental and one in Cosmetic linked by the same `payout_group_id`. | target |
| Shared receipt | A combined payout uses the same receipt/proof URL on both linked payout records. | target |
| CTV portal display | CTV portal shows one combined payout row by default, expandable into Dental/Cosmetic breakdown. | target |
| Admin payout display | Admin All filter shows one combined row. Dental/Cosmetic filters show the matching LOB-local row. | target |

## 11. Deposit Wallet History

| Rule | Business Logic | Status |
|---|---|---|
| Customer profile history | Customer profile Payment History tab shows deposit top-ups, deposit refunds, deposit used for service/payment, and void/deleted correction rows. | target |
| Admin payment page history | Admin `/payment` shows the same customer deposit wallet history after staff selects/searches one customer. | target |
| CTV wallet history | This rule is not about the CTV portal wallet. It is customer-profile/admin-payment deposit history only. | target |

## 12. Public CTV Signup And Hierarchy

| Rule | Business Logic | Status |
|---|---|---|
| Direct root signup | Public CTV signup can create a root/top-level CTV when no upline phone/referral code is entered. | target |
| Upline signup | If an upline phone or referral code is entered, the new CTV is attached under that upline. | partial |
| Root activation | Root/top-level CTV is active immediately. | target |
| Duplicate blocking | Signup blocks only when phone/email already belongs to another CTV. | target |
| Existing customer signup | If an existing customer signs up as CTV, create a separate CTV partner row; do not convert the customer row. | target |
| Required fields | Phone and password are required. Email is optional and the signup page must make that clear. | target |
| Signup UX | Signup flow uses breadcrumb/progress treatment and field-level notices/alerts such as email optional. | target |
| Language | CTV portal and signup remain bilingual English/Vietnamese. | partial |
| Hierarchy management | Admin CTV portal includes a drag-and-drop hierarchy tree for moving uplines/downlines. | target |
| Move eligibility | Admin can move a CTV only when the CTV is fresh and has no referred customer, service, or earning activity. | target |
| Move audit | Hierarchy moves create automatic audit logs. A free-text reason is not required. | target |

## 13. TestSprite NK3 Scope Decisions

| Surface | Decision |
|---|---|
| Cosmetic statuses | Cosmetic appointment statuses use the same statuses as Dental. |
| Notifications page | Mark as not implemented for current NK3 TestSprite scope. |
| Website page builder `/website` | Skip for current NK3 TestSprite scope. |
| Location creation | Required field is name only. Existing modal-close-only behavior is a gap. |
| Overview Today Services | Means service cards scheduled/started today, not merely created today. |
| Customer camera quick-add | Skip/remove for current NK3 scope. |
| Avatar selection | Skip/mark not implemented. |
| External integrations | Test Google Places only on customer address fields. Skip External Checkups and `/test/address`. |
| Reports | Smoke-test all report pages; exact DB total validation only for dashboard, revenue, and appointments. |

## 14. Implementation Gaps To Close

- Keep service-card-created CTV earnings as the primary CTV trigger; legacy payment-collected CTV paths remain only for older compatibility/backfill cases until fully retired.
- Remove legacy CTV dependency on product/service `commission_rate_percent`.
- Add tier config as the only CTV rate source, including Level 0-4 enablement.
- Add Dental-only Braces tier override config and service matching.
- Add admin service-card CTV reassignment with pending reversal/new earning behavior and paid-out lock.
- Add admin appointment-card CTV reassignment that changes ownership but keeps timer anchor.
- Change claim lock checks to be per LOB only.
- Add public signup root CTV path when no upline is entered.
- Add admin drag-and-drop CTV hierarchy management with no-activity guard and audit log.
- Add customer deposit wallet history to customer profile and admin `/payment`.
- Remove staff payment edit button/workflow from UI and keep delete-plus-new-payment as correction path.
