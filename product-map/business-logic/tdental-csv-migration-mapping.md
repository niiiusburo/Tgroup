# TDental CSV Migration Mapping Rules

Last updated: 2026-04-25

This contract defines how TDental source exports map into the reconstructed TGClinic local schema before bulk migration. It is intentionally stricter than the first manual imports because the full export contains duplicate customer refs, duplicate phones, stale rows, and accounting tables that do not share the same model as the app.

## Source Priority

1. Live TDental UI/API is the truth when it disagrees with a stale CSV export.
2. A fresh CSV export can be used for bulk import only after a delta check confirms no missing live rows for the target date window.
3. Local demo data is not truth; it is a reconstructed target that must match TDental after import.
4. If a CSV import is used, run a live TDental delta check after import for appointments, orders, service lines, and posted payments. Any live row missing from the CSV must be imported from live API data or the batch must be rerun from a fresh export.

## Approved App Scope

The full export contains more TDental/Odoo workflow data than TGClinic intentionally exposes. Bulk import must target only the app-visible model:

- customers/profile/assignment fields in `dbo.partners`
- staff references through `dbo.employees`, `dbo.employee_permissions`, and `dbo.employee_location_scope`
- locations in `dbo.companies`
- service catalog rows in `dbo.products` / `dbo.productcategories`
- appointment cards in `dbo.appointments`
- customer service history through `dbo.saleorders` and `dbo.saleorderlines`
- payment history through `dbo.payments` and `dbo.payment_allocations`
- customer sources/referral/sales/CSKH fields already represented by the local schema

Do not import `dotkhams`, `dotkhamsteps`, quotation internals, tooth diagnosis internals, or rich customer-receipt workflow internals as first-class data. If a hidden TDental table is only needed to explain an anomaly, preserve that fact in the dry-run audit rather than adding a new target table.

## Identity Rules

| Source entity | Target entity | Primary match | Fallback | Rule |
| --- | --- | --- | --- | --- |
| `dbo.Partners` customer | `dbo.partners` customer | `Id` UUID | None for bulk import | Never merge by `Ref`, name, or phone when UUID is available. Duplicate refs and phones are allowed during this migration, but they are warning-only audit fields. |
| `dbo.Employees` / staff partners | `dbo.partners` employee | existing local employee by source `Id`/`PartnerId` | normalized/similar name | Reuse existing staff first. If the same staff exists at another branch, add the missing branch to `employee_location_scope` instead of creating a duplicate employee. Create staff only when no confident match exists. |
| `dbo.Products` | `dbo.products` | existing local product by source `Id` or `DefaultCode` | normalized/similar name with category/price review | Reuse existing services first. Create a product only when no confident match exists; log ambiguous same-name service matches. |
| `dbo.SaleOrders` | `dbo.saleorders` | `Id` UUID | None | Order names such as `SO24329` are display codes, not primary identity. |
| `dbo.SaleOrderLines` | `dbo.saleorderlines` | `Id` UUID | None | Lines are imported by UUID and tied to their source `OrderId`. |
| `dbo.Appointments` | `dbo.appointments` | `Id` UUID | None | Appointment codes such as `AP210661` are display codes only. |

## Customer Profile Sales Staff

The customer profile `Nhan vien sale` must be derived from service-line assistant data, not employee names.

1. Read non-null `SaleOrderLines.AssistantId` values for the customer.
2. Count by assistant UUID.
3. If one assistant has the highest count, set `partners.salestaffid` to that employee UUID.
4. If there is a tie, leave the value unchanged and flag for manual review.
5. If all service lines have null `AssistantId`, keep the existing local value; do not infer from duplicate employee names.

This is required because the source has duplicate names such as `AnhVL`, `DungBTT`, `Sale Nhung`, `TrangTL`, and `Nguyen Thi Hong Diem`.

## Services and Orders

| TDental field | Local field | Mapping |
| --- | --- | --- |
| `SaleOrders.Id` | `saleorders.id` | UUID lowercased |
| `SaleOrders.Name` | `saleorders.name`, `saleorders.code` | Preserve exact display code |
| `SaleOrders.PartnerId` | `saleorders.partnerid` | Customer UUID |
| `SaleOrders.AmountTotal` | `saleorders.amounttotal` | Numeric |
| `SaleOrders.TotalPaid` | `saleorders.totalpaid` | Numeric from source order |
| `SaleOrders.Residual` | `saleorders.residual` | Numeric from source order |
| `SaleOrders.State=sale` | `saleorders.state=pending` | Local app uses `pending` for active sold orders |
| `SaleOrders.State=done` | `saleorders.state=completed` | Completed order |
| `SaleOrders.State=cancel` | `saleorders.state=cancelled` | Cancelled order |
| `SaleOrderLines.ProductId` | `saleorderlines.productid` | Exact product UUID |
| `SaleOrderLines.Name` | `saleorderlines.name`, `productname` | Preserve source display text |
| `SaleOrderLines.AssistantId` | `saleorderlines.assistantid` | Also used for sales staff derivation |
| `SaleOrderLines.ToothRange` | `saleorderlines.toothrange`, `tooth_numbers` | Preserve as text for UI tooth display |
| `SaleOrderLines.Diagnostic` | `saleorderlines.diagnostic` | Preserve as text |

Validation:

- Each imported order total must match the sum of its imported line totals, or the order is flagged before apply.
- Order-level `TotalPaid` and `Residual` must match TDental after import.
- Line-level residual can be recalculated for UI display if the source line has stale zero residual but the order residual is non-zero. This must be reported in the audit output.

## Payments, Deposits, and Allocations

The source accounting model is Odoo-like. The local app has a simplified cash-flow model plus `payment_allocations`. The importer must not direct-copy accounting rows into local payments without classification.

| Source | Target | Rule |
| --- | --- | --- |
| `AccountPayments.State=posted` with sale-order payment relation | `payments` + `payment_allocations` | Create posted payment and allocation rows. |
| `AccountPayments.State=posted` without allocation relation | `payments` | Create unallocated payment/deposit candidate. |
| `AccountPayments.State=cancel` | `payments.status=voided` | Store only if needed for audit; never count toward paid totals. |
| `SaleOrderPayments` | allocation source | Use to connect order/payment intent to invoice/order rows. |
| `SaleOrderPaymentAccountPaymentRels` | allocation source | Use to connect posted account payments to sale-order payments. |
| `PartnerAdvances` | deposit wallet source | Import as deposit wallet rows only after checking that the same amount is not already represented by a payment allocation. |

Payment invariants:

- Posted payment totals must equal TDental for each customer.
- Cancelled payments must not affect service paid or remaining amounts.
- Do not double-count deposits: a deposit allocation and a payment allocation for the same source movement cannot both increase paid totals.
- The existing product-map unknowns for over-allocation and `deposit_type` enum remain blockers for broad automatic deposit reconciliation.

## Appointments

| TDental state | Local state |
| --- | --- |
| `confirm`, `confirmed` | `confirmed` |
| `done`, `completed` | `completed` |
| `cancel`, `cancelled` | `cancelled` |
| `draft` | `scheduled` |

Rules:

- Import appointments by UUID only.
- Preserve source date and time text without JavaScript timezone conversion.
- Preserve doctor, assistant, sale staff, note, reason, and receipt links when present.
- If a same-UUID local appointment differs from TDental, TDental wins unless the local row is known test data.

## Customer Receipts

Full receipt migration is blocked until a target model is chosen.

The source `dbo.CustomerReceipts` includes visit workflow data such as `PartnerId`, `DoctorId`, `State`, `Reason`, `TimeExpected`, and notes. The current local `dbo.customerreceipts` table only stores `id` and `dateexamination`, so a direct copy would lose important visit data.

Allowed next steps:

1. Expand the local receipt schema and UI/API contracts.
2. Or import source receipts into a staging table and map them into appointments/services later.

Until one of these is chosen, receipt rows are audit-only and must not be silently collapsed into the simplified table.

## Pre-Migration Checks

Before applying a customer or bulk batch:

- Source CSV freshness checked against live TDental for the same date range.
- All target customers matched by UUID.
- Duplicate refs/phones allowed, reported, and not used for matching.
- All referenced employee UUIDs exist or are created.
- All referenced product UUIDs exist or are created.
- Order count, line count, order totals, paid totals, and residual totals match TDental.
- Payment allocations reconcile without cancelled rows.
- Appointment count and same-ID appointment values match TDental.
- Live delta check has zero missing appointments, orders, service lines, and posted payments after CSV apply.
- Customer receipts are either blocked or routed to the approved target model.
