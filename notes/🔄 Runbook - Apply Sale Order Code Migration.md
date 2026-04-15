# 🔄 Runbook — Apply Sale Order Code Migration

> **Purpose:** Backfill and expose `SO-` reference codes on every sale order, and link payments to those codes.
> **Migration file:** `api/migrations/020_saleorder_code.sql`
> **Affected systems:** Database (PostgreSQL), Backend API (`saleOrders.js`, `payments.js`), Frontend (`website`).

## What this migration does

1. **Adds a `code` column** to `dbo.saleorders`.
2. **Creates a sequence** `dbo.saleorder_code_seq` for auto-generating new codes.
3. **Backfills every existing record:**
   - Legacy records with `sequenceprefix` + `sequencenumber` get codes like `SO-00001`.
   - All other records get auto-generated codes like `SO-2024-0001`, `SO-2024-0002`, etc.
4. **Enforces uniqueness** on active (non-deleted) sale order codes.

## How to run it

From the repo root:

```bash
cd api
psql "$DATABASE_URL" -f migrations/020_saleorder_code.sql
```

If you are running inside a Docker container or on a VPS, make sure `DATABASE_URL` points to the live DB (or set it in `.env` first).

## Verification

After running the migration, check that codes exist:

```sql
SELECT id, name, code, state
FROM dbo.saleorders
WHERE isdeleted = false
ORDER BY datecreated DESC
LIMIT 10;
```

You should see a `code` value like `SO-2024-001` on every row.

## Frontend behavior after migration

- **Treatment History** (`/customers/:id` → Records tab): displays the `SO-` code as the **first** badge on each treatment row.
- **Payment form**: pre-fills the sale order code when paying for a specific service.
- **Payment allocations** (Payment tab → expand a payment): shows the linked `SO-` code instead of the service description.

## New codes for future records

Whenever a user creates a new service/treatment in the frontend, the backend (`POST /api/SaleOrders`) automatically:
- Keeps the service name in `name` (e.g., "Abutment")
- Generates a unique code in `code` (e.g., `SO-2024-0042`)

No manual action required.

## Rollback (if needed)

```sql
ALTER TABLE dbo.saleorders DROP COLUMN IF EXISTS code;
DROP INDEX IF EXISTS dbo.uniq_saleorders_code;
DROP SEQUENCE IF EXISTS dbo.saleorder_code_seq;
```

> ⚠️ Rolling back will remove all `SO-` codes from the UI.
