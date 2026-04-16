# Business Logic: Commission Rules

> How commissions are defined, calculated, and reported in `api/src/routes/commissions.js`.

## 1. Commission Types

The backend recognizes two commission scheme types:
- **`agent`** — COM-01: Hoa hồng ngưới giới thiệu (Referral/agent commission)
- **`employee`** — COM-02: Hoa hồng nhân viên (Employee commission)

## 2. Core Tables

| Table | Purpose |
|-------|---------|
| `commissions` | Commission scheme definitions (name, type, active, companyid) |
| `commissionproductrules` | Product-specific rules within a scheme (percentage, fixedamount, minamount, maxamount) |
| `commissionhistories` | Calculation runs / historical statements |
| `saleorderlinepartnercommissions` | Actual commission payouts per sale order line |

## 3. Commission Scheme (`GET /api/Commissions/:id`)

Returns:
- Scheme metadata (name, type, company, timestamps)
- **`rules`** array from `commissionproductrules`:
  - `productid` + `productname`
  - `percentage`
  - `fixedamount`
  - `minamount`
  - `maxamount`

> **Important:** The API does **not** enforce that `percentage` and `fixedamount` are mutually exclusive. The actual calculation rule (percentage vs fixed vs hybrid) is not implemented in the visible backend code.

## 4. Partner Commissions (`GET /api/Commissions/SaleOrderLinePartnerCommissions`)

Returns individual commission line items:
- `partnerid` (who earned it)
- `saleorderlineid` (which line item triggered it)
- `amount` (final calculated amount)
- `percentage` (rate used)
- `commissiontype` (`agent` or `employee`)
- `datecreated`

Aggregate included in response:
- `totalCommission` — sum of all `amount` values matching the query filters.

## 5. Commission Histories (`GET /api/Commissions/:id/Histories`)

Represents past commission calculation runs (statements):
- `datefrom` / `dateto` — period covered
- `totalamount` — total commission for the period
- `state` — likely `draft`, `confirmed`, `paid`

## 6. Auto-Calculation Gap

**There is no visible auto-calculation trigger in the repo.**

The tables `saleorderlinepartnercommissions` and `commissionhistories` are read-only in the current backend routes. No cron job, trigger, or webhook was found that:
- Creates `commissionhistories` records automatically
- Scans `saleorderlines` and applies `commissionproductrules` to generate `saleorderlinepartnercommissions`

> **Unknown:** This logic may exist in the legacy Odoo system, in an uncommitted script, or in a manual admin process.

## 7. Frontend Commission Page

The frontend page (`/commission`) and components (`website/src/pages/Commission.tsx`) consume:
- `GET /api/Commissions` — list of schemes
- `GET /api/Commissions/:id` — scheme details
- `GET /api/Commissions/:id/Histories` — past statements

## 8. Risks

| Risk | Impact |
|------|--------|
| No backend write endpoints for commissions or rules | Frontend cannot create/edit commission schemes via the current API |
| No auto-calculation trigger | Commission data may be stale or manually maintained |
| `amount` in `saleorderlinepartnercommissions` is not recalculated on rule changes | Historical payouts may not reflect current rules |
| `commissionproductrules.minamount` / `maxamount` exist but no validation logic is visible | Caps may not be enforced |
