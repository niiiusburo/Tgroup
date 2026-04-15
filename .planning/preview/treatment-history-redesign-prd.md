# Treatment History Card Redesign — PRD

## Objective
Redesign the `ServiceHistory` treatment card so that:
1. **Clicking a card expands/collapses it** to reveal the payment history for that treatment.
2. **Editing is no longer triggered by the card click**. Instead, a hover edit button appears next to the status badge on the top-right.
3. The implementation works end-to-end with the existing database schema (no migrations required).

## Current Behavior
- Clicking any treatment card in `CustomerProfile → Records` tab calls `onSelect`, which opens the `ServiceForm` modal.
- Payment info is limited to a small “Pay / Paid” chip and the total cost.

## New Behavior
- **Card click** → toggles an expanded view that lists all payments linked to this sale order (`payments.service_id` or `payment_allocations.invoice_id`).
- **Hover on status area** → reveals a circular pencil icon button to the left of the status badge. Clicking it opens the edit modal.
- **Pay chip** behavior remains unchanged (still triggers payment modal, stops propagation).

## UI Specification

### Collapsed State
- Identical to current layout: order code, status dot, service name, pay chip, meta row (date, doctor, tooth), cost on the right, status dropdown top-right.
- Entire card is clickable to expand.

### Expanded State
- Card keeps all collapsed content.
- Adds a new section below a dashed top border:
  - **Header**: Wallet icon + "Payment History" + count badge.
  - **Payment list**: a rounded white inner card showing each payment:
    - Method badge (Cash / Bank / Deposit).
    - Amount + date + receipt/reference code.
    - Status badge (Posted / Voided).
  - **Footer row**: "Total paid for this treatment" = sum of non-voided payment amounts allocated to this service.
- Voided payments are shown with strikethrough amount and red "Voided" badge.

### Hover Edit Button
- Positioned immediately to the left of the `StatusDropdown` badge.
- Visible only when the user hovers over the status area (`group-hover`).
- Circular 28×28 px button, gray-100 background, `Edit2` icon (14 px).
- Clicking it calls `onEditService(svc)` and stops event propagation.

## Frontend Changes

### Files Modified

#### 1. `website/src/components/customer/ServiceHistory.tsx`
- **Props**: 
  - Rename/remove `onSelect?: (service) => void` → replace with `onEditService?: (service) => void`.
  - Add `payments?: readonly PaymentWithAllocations[]`.
- **State**: add `expandedServiceId: string | null`.
- **Card click handler**: toggle `expandedServiceId`.
- **Render**:
  - Wrap the status area in a `relative group` container.
  - Inject hover edit button absolute-positioned to the left of the status dropdown.
  - When expanded, render payment-history sub-section derived from `payments` filtered by `service.id`.

#### 2. `website/src/components/customer/CustomerProfile.tsx`
- Pass `payments={payments}` into `<ServiceHistory ... />`.
- Change `onSelect={setEditingService}` to `onEditService={setEditingService}`.

#### 3. `website/src/types/customer.ts`
- No changes required (payments are passed as a separate prop).

## Backend Changes
- **No schema changes required**.
- **Optional enhancement** (included): add `serviceId` query-param support to `GET /api/Payments` so that future lazy-loading or direct API consumers can fetch payments for a single treatment.
  - File: `api/src/routes/payments.js`
  - Filter: `AND p.service_id = $param` when `serviceId` is provided.

## Data Flow
1. `CustomerProfile` already loads all customer payments via `useCustomerPayments` → `fetchPayments(customerId, 'payments')`.
2. Each `ApiPayment` contains `serviceId` and `allocations` (where `allocation.invoiceId` = `saleorders.id`).
3. `ServiceHistory` receives the full `payments` array and, for each service, computes:
   ```ts
   const relatedPayments = payments.filter(p =>
     p.serviceId === svc.id ||
     p.allocations?.some(a => a.invoiceId === svc.id)
   );
   ```
4. This ensures the expanded card shows exactly the payments that belong to the treatment, leveraging the existing DB relationships.

## Acceptance Criteria
- [ ] Clicking a treatment card toggles expand/collapse.
- [ ] Expanded card displays payment history with method, amount, date, reference, and status.
- [ ] Total paid footer sums only non-voided related payments.
- [ ] Hovering over the status area reveals an edit button.
- [ ] Clicking the edit button opens the existing `ServiceForm` modal.
- [ ] Pay chip still works and does not expand the card.
- [ ] Status dropdown still works and does not expand the card.
- [ ] No TypeScript or runtime errors.
