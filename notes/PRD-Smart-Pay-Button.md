# PRD: Smart Pay Button — Context-Aware Service Payment

## Problem Statement

When a staff member clicks the **Pay** button on a service record in the customer profile, the Payment Form opens blind — it shows no information about **which service** is being paid for, **how much it costs**, **how much is already paid**, or **how much is still owed**. The staff member must manually look up the service cost, type it in, and then find the right invoice in the allocation section. This is error-prone and slow.

From the screenshots:
- Clicking Pay on a 3,500,000đ service opens a form with **empty amount**
- There is **no indication** of which service the payment is for
- The form doesn't show **what's been paid** vs **what's still owed**
- The allocation section lists all invoices but **none is auto-selected**

## Solution

Make the Pay button **intelligent** — when clicked, it passes full service context to the Payment Form so the staff member sees exactly what they're paying for, how much is owed, and the form is pre-filled accordingly.

The Pay button itself changes appearance based on payment status:
- **Orange** (active) when the service still has an outstanding balance (residual > 0)
- **Gray** (still clickable) when the service is fully paid (residual = 0)

## User Stories

1. As a clinic staff member, I want to see an orange Pay button next to services that still have outstanding balances, so that I can immediately identify which services need payment.

2. As a clinic staff member, I want to see a gray Pay button next to fully-paid services, so that I know payment is complete but I can still open the form to review or add a correction.

3. As a clinic staff member, when I click the Pay button, I want to see the **service name** prominently displayed at the top of the payment form, so that I know exactly what I'm paying for.

4. As a clinic staff member, when I click the Pay button, I want to see a **payment summary card** showing total cost, amount already paid, and remaining balance, so that I can verify the amount before paying.

5. As a clinic staff member, when I click the Pay button on a service with outstanding balance, I want the **payment amount to be auto-filled** with the remaining balance, so that I can pay in full with one click.

6. As a clinic staff member, when I click the Pay button, I want the corresponding invoice/đợt khám to be **auto-selected** in the allocation section, so that the payment is automatically linked to the correct record.

7. As a clinic staff member, I want to be able to change the auto-filled amount to pay partially (installment), so that I can accept partial payments when the customer cannot pay in full.

8. As a clinic staff member, when I open the Pay form for a fully-paid service, I want to see a clear **"Đã thanh toán đủ"** (fully paid) indicator, so that I don't accidentally overpay.

9. As a clinic staff member, I want the form header subtitle to show both the **customer name** and the **service name**, so that the context is clear without scrolling.

10. As a clinic staff member, when paying from a service record, I want the allocation section to be **pre-filled and locked** to that specific record (not requiring manual selection), so that the payment goes to the right place.

11. As a clinic staff member, I want to see a mini **payment history** for the specific service record inside the payment form, so that I can see prior payments on this same service.

12. As a clinic staff member, I want the deposit balance and outstanding balance cards to still be visible when paying from a service, so that I know if I can use deposit funds.

## Implementation Decisions

### Data Layer

- **Extend `CustomerService` mapping** in `Customers.tsx` to populate `paidAmount` and `residual` from `ServiceRecord` data. The `ServiceRecord.paidAmount` is already mapped from `ApiSaleOrder.totalpaid`. Add `residual` derivation (`totalCost - paidAmount`).
- **Extend `ServiceRecord`** interface to include optional `residual` field, populated from `ApiSaleOrder.residual`.
- **Pass `CustomerService` context** through `CustomerProfile` → `PaymentForm` via a new `serviceContext` prop that carries `id`, `name`, `cost`, `paidAmount`, `residual`.

### PaymentForm Component

- Add a new optional `serviceContext` prop to `PaymentFormProps`:
  ```
  {
    recordId: string;       // The saleorder/dotkham ID
    recordName: string;     // Service name for display
    recordType: 'saleorder' | 'dotkham';
    totalCost: number;
    paidAmount: number;
    residual: number;       // Remaining balance
  }
  ```
- When `serviceContext` is provided:
  - Show a **Service Payment Card** at the top (below customer info) with: service name, total cost, paid so far, remaining balance, and a progress bar
  - Auto-fill the total payment amount to `residual` (distributed across cash source by default)
  - Auto-select the matching invoice/dotkham in the allocation section
  - Lock the allocation to that single record (prevent toggling others off)
  - Update header subtitle to include the service name
  - If `residual === 0`, show a green **"Đã thanh toán đủ"** banner and disable the submit button
- When `serviceContext` is NOT provided, the form works exactly as before (generic payment creation)

### ServiceHistory Component

- The Pay button appearance changes based on payment status:
  - `residual > 0` → orange styling (`text-orange-600 bg-orange-50 border-orange-200`)
  - `residual === 0` or no residual data → gray styling (`text-gray-400 bg-gray-50 border-gray-200`)
  - Both are clickable (no disabled state)
- Pass full `CustomerService` object (with paidAmount/residual) to the `onPayForService` callback

### CustomerProfile Component

- When `onPayForService` is called, construct the `serviceContext` from the `CustomerService` object
- Pass `serviceContext` to `PaymentForm` alongside existing props
- Reset `payTargetService` state on close/submit

### Visual Design — Service Payment Card

The card will appear inside the PaymentForm when serviceContext is provided:
```
┌─────────────────────────────────────────────────────┐
│ 🦷 Bọc sứ nha chu...                    Đang điều trị │
│                                                       │
│  Tổng chi phí          Đã thanh toán       Còn nợ      │
│  3,500,000đ           1,000,000đ        2,500,000đ     │
│                                                       │
│  ████████████░░░░░░░░░░░░░░░░░  28.6% paid            │
└─────────────────────────────────────────────────────┘
```
- Total cost in neutral gray
- Paid amount in green
- Remaining in red (or green if 0)
- Progress bar showing payment completion percentage

### Modules to Build/Modify

1. **`types/customer.ts`** — `CustomerService` already has `paidAmount` and `residual` fields (optional). No change needed.
2. **`types/service.ts`** — Add optional `residual` field to `ServiceRecord`
3. **`hooks/useServices.ts`** — Populate `residual` in `mapSaleOrderToServiceRecord`
4. **`pages/Customers.tsx`** — Map `paidAmount` and `residual` when building `customerServices`
5. **`components/customer/ServiceHistory.tsx`** — Update Pay button styling (orange/gray based on residual). Pass full service data.
6. **`components/customer/CustomerProfile.tsx`** — Construct `serviceContext` and pass to PaymentForm
7. **`components/payment/PaymentForm.tsx`** — Add `serviceContext` prop, render Service Payment Card, auto-fill amount, auto-select allocation, handle fully-paid case
8. **`data/mockPayment.ts`** — No changes needed (labels already updated)

### Deep Module: ServicePaymentCard

Extract the service context display into a standalone component `ServicePaymentCard` that:
- Accepts `{ recordName, totalCost, paidAmount, residual }`
- Renders the summary card with progress bar
- Shows "Đã thanh toán đủ" state when residual is 0
- Can be tested in isolation

## Testing Decisions

- **Good test criteria**: Test external behavior — does the form pre-fill correctly? Does the card show the right numbers? Does the allocation auto-select?
- **Modules to test**:
  - `ServicePaymentCard` — unit test: renders correct amounts, progress bar percentage, "fully paid" state
  - `PaymentForm` — integration test: when `serviceContext` is provided, amount is auto-filled, allocation is selected, submit includes correct allocation
  - `ServiceHistory` — unit test: orange button when residual > 0, gray button when residual = 0
- **Prior art**: Existing `PaymentForm.submit.test.tsx` tests the submit flow. Follow the same pattern for the new serviceContext path.

## Out of Scope

- Changing the Payment page (overview) — only the customer profile payment flow is affected
- Modifying the backend API — all data is already available from existing endpoints
- Adding installment scheduling (by-date payments) — this PRD only handles the form pre-fill UX
- Payment receipt generation or printing
- Refund/void workflow from the service Pay button

## Further Notes

- The `CustomerService.residual` field already exists in the type but is not populated from the API. This PRD fixes that data gap.
- The `ServiceRecord.paidAmount` is already available from `ApiSaleOrder.totalpaid` but needs to be threaded through to `CustomerService`.
- The form should remain fully editable after auto-fill — the staff member can always override the amount, change payment sources, or add notes.
