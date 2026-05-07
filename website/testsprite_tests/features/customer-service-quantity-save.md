# TestSprite Feature: Customer Service Quantity Save

## Target

- Frontend URL: `/customers/:id`
- Product surface: Customer profile `Phiếu khám`
- API routes: `PATCH /api/SaleOrders/:id`, `GET /api/SaleOrders/lines?partner_id=...`

## Acceptance Criteria

- A service row showing quantity/unit such as `1 răng` can be edited and saved.
- Saving a quantity change updates the line quantity rendered by the `Phiếu khám` table.
- The updated value remains visible after the customer service rows refresh.
- Reopening the edit modal shows the saved quantity.
- Unit text such as `răng` remains saved unless staff changes it.

## Suggested TestSprite Steps

1. Sign in with an admin or clinic staff account that can edit customer services.
2. Navigate to a customer profile with `Phiếu khám` rows, for example `/customers/f72f8c86-34e9-4377-b59c-b414002ec20c` when seeded.
3. Open the `Phiếu khám` tab.
4. Find a service row showing `1 răng`.
5. Click the row edit action.
6. Change quantity from `1` to another value, for example `3`.
7. Save the service form.
8. Confirm the table row updates to `3 răng` without a manual browser reload.
9. Reopen the edit form for the same service and confirm the quantity field still contains `3`.

## Edge Cases

- Migrated records where `saleorderlines.productuomqty` differs from `saleorders.quantity`.
- Quantity-only edits that do not change price or staff.
- Edits that also change unit, tooth notes, doctor, assistant, or TLBS.
- Records with tooth label `manual` should keep that label unless staff changes it.

## Regression Checks

- Payment actions still use the parent sale order id.
- Delete service still uses the sale-order line id.
- Paid and remaining totals do not duplicate for multi-line orders.
- Customer service list refreshes after save.

## Setup Data / Login State

- Use an authenticated admin or receptionist session.
- Prefer disposable QA data if changing a real quantity would affect clinic records.
- If using the seeded local customer, restore or note the original quantity after the batch test if needed.
