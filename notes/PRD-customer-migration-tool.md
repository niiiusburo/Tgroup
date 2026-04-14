# PRD: Customer Data Migration Tool (Real DB → Demo DB)

## Problem Statement

Our demo database (tdental_demo) has simplified, test-only data that doesn't reflect the real production data from the live system (tdental_real, 5.6 GB). When we want to see how a real customer — with their actual services, payment history, and appointments — looks in our new UI, we have no way to import them. The two databases have different schemas (the real DB is Odoo-like with 398 tables; our demo DB is simplified with 27 tables), different product UUIDs for the same products, and different approaches to linking payments to services.

We need a reusable migration tool that can pull a customer's complete profile from the real database and insert it into our demo database, correctly mapping all relationships so the new UI displays real data faithfully.

## Solution

Build a Node.js migration script (`scripts/migrate-customer.js`) that:
1. Reads a customer from `tdental_real` by UUID or name
2. Maps their profile, employees, products, saleorders, payments, and appointments into `tdental_demo`'s schema
3. Syncs product UUIDs from real → demo so future migrations don't need remapping
4. Creates missing employees/doctors and assigns them to the correct branch
5. Handles empty/zero-amount records by skipping them
6. Produces a detailed log of everything migrated, skipped, or errored

First pilot: **Trần Đỗ Gia Hân** (customer `29ce89ed...`) — a braces patient with 3 active orders, 13 payments, and 21 appointments at Tấm Dentist Thủ Đức.

## User Stories

### Core Migration
1. As a developer, I want to run `npm run migrate-customer -- --customer=29ce89ed...` and have the full profile imported, so I don't have to manually insert data.
2. As a developer, I want to run `npm run migrate-customer -- --name="Trần Đỗ Gia Hân"` and have the script find the customer by name, so I don't need to look up UUIDs.
3. As a developer, I want the script to be idempotent — running it twice produces the same result without duplicates — so I can safely re-run on failure.
4. As a developer, I want a `--dry-run` flag that shows exactly what would be migrated without writing anything, so I can verify before committing.

### Customer Profile
5. As a developer, I want the customer's partner record migrated with all matching fields (name, phone, email, gender, DOB, address, source, etc.), so the profile page shows complete information.
6. As a developer, I want fields that exist in real DB but not in demo DB to be silently dropped (e.g., `displayname`, `barcode`, `zaloid`), so the insert doesn't fail on missing columns.
7. As a developer, I want fields that exist in demo DB but not in real DB to be set to sensible defaults (e.g., `password_hash = NULL`, `face_subject_id = NULL`), so the insert doesn't fail on NOT NULL constraints.

### Employee / Doctor Handling
8. As a developer, I want the script to look up each doctor by **name** in our demo DB's `partners` table, so existing doctors are reused.
9. As a developer, I want the script to create a new partner record with `employee=true, isdoctor=true` if no matching doctor name is found, so the doctor exists in our system.
10. As a developer, I want a newly created doctor to be assigned to the same branch (companyid) as in the real DB, so the location mapping is correct.
11. As a developer, I want the real DB's employee UUID stored somewhere (see Implementation Decisions), so we can trace back to the source record.

### Product UUID Sync
12. As a developer, I want the script to sync real DB product UUIDs into our demo DB by **matching on product name**, so future migrations reference the same UUIDs.
13. As a developer, I want the sync to UPDATE our demo product's `id` column to the real DB UUID (cascading to all existing references), so all existing saleorderlines and allocations continue to work.
14. As a developer, I want the script to handle the case where real DB has multiple products with the same name (different companyid) by preferring the product that matches the customer's branch, so we get the right product.
15. As a developer, I want a product UUID mapping table/cache persisted between runs, so we don't re-sync products already migrated.

### Sale Orders & Lines
16. As a developer, I want each saleorder migrated with columns mapped to our demo schema (e.g., real `dateorder` → demo `datecreated`, real `note` → demo `notes`), so the order displays correctly.
17. As a developer, I want saleorderlines migrated with the synced product UUID, so the product name and category resolve correctly.
18. As a developer, I want saleorders with `amounttotal = 0` and no order lines to be **skipped**, so empty placeholder orders don't pollute the data.
19. As a developer, I want the real DB columns that don't exist in demo DB (e.g., `amounttax`, `amountuntaxed`, `invoicestatus`, `paymentstate`) to be silently dropped, so the insert succeeds.

### Payments
20. As a developer, I want each real DB `saleorderpayment` converted into a demo DB `payment` row, so the payment appears in our Payment tab.
21. As a developer, I want a `payment_allocation` row created for each payment linking it to the corresponding saleorder, so the payment shows which service it belongs to (the "allocated to invoice" display).
22. As a developer, I want the `payment_allocations.allocated_amount` set equal to the payment amount (1:1 mapping), so the allocation total matches the payment total.
23. As a developer, I want the saleorder's `residual` and `totalpaid` columns updated based on actual payment allocations, so the "remaining balance" is accurate in the UI.
24. As a developer, I want refund payments (`isrefund = true`) migrated as negative-amount payments, so they reduce the customer's total correctly.
25. As a developer, I want payment fields mapped correctly: real `date` → demo `payment_date`, real `note` → demo `notes`, real `amount` → demo `amount`, real `state` → demo `status`.

### Appointments
26. As a developer, I want all 21 appointments migrated with their status, date, doctor, notes, and companyid, so the appointment history shows correctly.
27. As a developer, I want the doctorid in each appointment remapped to the matched/created doctor in our demo DB, so the appointment shows the correct doctor name.
28. As a developer, I want appointments with a `saleorderid` to have that FK preserved, so the appointment links to the correct service order.
29. As a developer, I want the appointment columns mapped 1:1 (both DBs share the same appointment schema), so no field transformation is needed.

### Reporting & Safety
30. As a developer, I want a summary printed at the end showing: records migrated, records skipped (with reason), records errored (with detail), so I know exactly what happened.
31. As a developer, I want the entire migration wrapped in a transaction with rollback on error, so a partial failure doesn't leave the demo DB in an inconsistent state.
32. As a developer, I want the script to check for UUID collisions before inserting, so we don't overwrite existing unrelated records.

## Implementation Decisions

### Architecture
- **Single Node.js script** at `scripts/migrate-customer.js`, runnable via `npm run migrate-customer -- [options]`.
- Uses the existing `pg` library (already in the project) with **two separate connection pools**: one for real DB, one for demo DB.
- Reads from real DB only. Writes to demo DB only. Never modifies real DB.
- Entire migration wrapped in a **single transaction on the demo DB** with `ROLLBACK` on any error.

### Schema Mapping Strategy
- The script will introspect both database schemas at startup to determine the **common columns** per table.
- For inserts, only common columns are included. Extra columns on either side are silently ignored.
- This makes the script resilient to future schema changes on either side.

### Table Migration Order (respecting FK dependencies)
1. **companies** — verify the branch exists (read-only check, no insert needed since branches already match)
2. **products** — sync UUIDs first (UPDATE existing demo products to use real UUIDs)
3. **partners** (employee/doctors) — create if not exists by name match
4. **partners** (customer) — insert customer record
5. **saleorders** — insert orders
6. **saleorderlines** — insert lines with synced product UUIDs
7. **payments** — convert `saleorderpayments` → `payments`
8. **payment_allocations** — create allocation links
9. **appointments** — insert with remapped doctorid

### Product UUID Sync Approach
- When a product from real DB matches a demo DB product by name:
  - The demo DB product's `id` is **updated** to the real DB UUID using `UPDATE products SET id = $new WHERE id = $old`.
  - All `saleorderlines.productid` references are cascaded: `UPDATE saleorderlines SET productid = $new WHERE productid = $old`.
  - The mapping is cached so subsequent entities use the new UUID immediately.
- When multiple real DB products share the same name (e.g., "Niềng Mắc Cài Kim Loại Tiêu Chuẩn" exists for Quận 3 and Thủ Đức), the one whose `companyid` matches the customer's branch is preferred.

### Payment Conversion (Real → Demo)
- Real DB: `saleorderpayments` table with `orderid` column (direct FK to saleorders)
- Demo DB: `payments` table + `payment_allocations` junction table
- Conversion: one `saleorderpayment` row → one `payments` row + one `payment_allocations` row
- Field mapping:

| Real DB (saleorderpayments) | Demo DB (payments) |
|---|---|
| `id` | `id` (same UUID) |
| `partnerid` | `customer_id` |
| `amount` | `amount` |
| `date` | `payment_date` |
| `note` | `notes` |
| `state` | `status` |
| `orderid` | → `payment_allocations.invoice_id` |
| `amount` | → `payment_allocations.allocated_amount` |
| — | `method` = 'cash' (default, real DB doesn't store method at this level) |
| — | `service_id` = NULL (unused column) |

### Saleorder Residual/Totalpaid Update
- After all payments and allocations are inserted for a saleorder:
  - `totalpaid` = SUM of all `payment_allocations.allocated_amount` for that saleorder
  - `residual` = `amounttotal` - `totalpaid`
- This fixes the existing bug where `totalpaid` stays at 0 even when payments exist.

### Employee Matching Logic
1. Extract doctor name from real DB `employees.name`
2. Search demo DB `partners` where `employee = true AND name ILIKE '%doctor_name%'`
3. If found → use that partner's UUID as `doctorid` everywhere
4. If not found → INSERT a new partner with:
   - `id` = real DB employee's UUID
   - `name` = real DB employee name
   - `employee = true`, `isdoctor = true`, `active = true`
   - `companyid` = real DB branch UUID
   - `customer = false`
   - Other fields: NULL or sensible defaults

### Empty Record Skipping
- Saleorders where `amounttotal = 0 AND has no order lines` → skip with log entry
- Saleorderlines where `pricetotal = 0 AND productid IS NULL` → skip with log entry
- Payments where `amount = 0` → skip with log entry
- Appointments are never skipped (even zero-duration ones are real visits)

### Idempotency
- Before inserting any record, check `WHERE id = $uuid`. If exists, skip (assume already migrated).
- Product UUID sync: check if old → new mapping already applied before UPDATEing.
- This allows safe re-runs after partial failures.

## Testing Decisions

### What makes a good test
- Tests verify **external behavior** (data in database after migration), not implementation details (which functions were called).
- Each test runs against a fresh test database or uses transactions that roll back.

### Test scenarios
1. **Happy path**: Migrate Trần Đỗ Gia Hân → verify all 3 orders, 13 payments, 21 appointments exist in demo DB with correct relationships.
2. **Product UUID sync**: Verify demo DB product "Niềng Mắc Cài Kim Loại Tiêu Chuẩn" now has the real DB UUID, and all existing saleorderlines reference the new UUID.
3. **Employee creation**: Verify "Bác sĩ 29" is created as a new partner with `isdoctor = true` at the correct branch.
4. **Payment allocation**: Verify each payment has exactly 1 allocation row pointing to the correct saleorder, and the saleorder's `totalpaid`/`residual` are updated.
5. **Skip empty orders**: Verify SO18200 (amounttotal=0, no lines) is skipped and logged.
6. **Idempotency**: Run migration twice → second run produces no new records, no errors.
7. **Dry run**: Run with `--dry-run` → no records written, full migration plan printed.

### Manual validation checklist
After migration, open the browser and verify:
- Customer "Trần Đỗ Gia Hân" appears in Customers list
- Profile tab shows correct phone, gender, DOB, branch
- Records tab shows 3 service orders (SO22819, SO27257, SO27259)
- Click SO27259 → shows "Niềng Mắc Cài Kim Loại Tiêu Chuẩn", total 25,070,000₫, residual 0₫
- Payment tab shows 13 payments totaling 25,670,000₫
- Click a payment → "Allocated to invoice" shows SO27259 (or SO22819 for the first payment)
- Appointments tab shows 21 appointments with correct dates and doctor name
- Calendar page shows her appointments on the correct dates

## Out of Scope
- **Bidirectional sync** — this is one-way only (real → demo)
- **Accounting entries** (`accountmoves`, `accountmovelines`) — too complex, not needed for UI
- **Monthly plan migration** — demo DB schema differs significantly; can be added later
- **Dotkhams (treatment sessions)** — demo DB has empty dotkham tables; can be added later
- **Insurance, lab orders, prescriptions** — not part of the current UI
- **File attachments / photos** — stored outside the database
- **SMS/marketing history** — not relevant to customer profile display
- **User/auth migration** — demo DB uses its own auth system
- **Automated scheduling** — this is a manual CLI tool, not a background job
- **Product category migration** — demo DB has its own categories; products are matched by name only

## Further Notes

### Schema Divergence Summary
| Aspect | Real DB (tdental_real) | Demo DB (tdental_demo) |
|---|---|---|
| Size | 5.6 GB, 398 tables | 12 MB, 27 tables |
| Employees | Separate `employees` table with `partnerid` FK | Employee fields directly on `partners` table |
| Products | 443 active, per-branch duplicates | 160 items, single global catalog |
| Payments | `saleorderpayments` with direct `orderid` FK | `payments` + `payment_allocations` junction |
| Appointments | Identical schema | Identical schema ✅ |
| Partners | 87 columns | 100 columns (has extra auth/face fields) |
| Sale Orders | 40 columns | 18 columns |

### Trần Đỗ Gia Hân Data Summary
| Entity | Count | Notes |
|---|---|---|
| Customer profile | 1 | Female, born 2008-01-20, ref 9915 |
| Branch | 1 | Tấm Dentist Thủ Đức |
| Doctor | 1 | "Bác sĩ 29" (needs creation in demo DB) |
| Saleorders | 4 | 3 valid + 1 empty (SO18200, skip) |
| Products involved | 3 UUIDs | 2 × "Niềng Mắc Cài Kim Loại Tiêu Chuẩn" + 1 × "Trám răng" |
| Payments | 13 | 12 for SO27259 + 1 for SO22819 |
| Appointments | 21 | From 2024-08-21 to 2026-03-16 |

### Real DB → Demo DB Column Mapping (Saleorders)

| Real DB | Demo DB | Transform |
|---|---|---|
| `id` | `id` | Direct |
| `name` | `name` | Direct (e.g., "SO27259") |
| `partnerid` | `partnerid` | Direct |
| `companyid` | `companyid` | Direct |
| `doctorid` | `doctorid` | Remap to matched/created employee UUID |
| `amounttotal` | `amounttotal` | Direct |
| `residual` | `residual` | Recalculate from payments |
| `totalpaid` | `totalpaid` | Recalculate from payments |
| `state` | `state` | Direct |
| `note` | `notes` | Rename |
| `datecreated` | `datecreated` | Direct |
| `lastupdated` | `lastupdated` | Direct |
| `isdeleted` | `isdeleted` | Direct |
| — | `assistantid` | NULL |
| — | `quantity` | 1 |
| — | `unit` | 'răng' |
| — | `dentalaideid` | NULL |
| — | `datestart` | NULL or `dateorder` |
| — | `dateend` | NULL |
