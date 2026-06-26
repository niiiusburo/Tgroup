# Coding Reference Catalog for NK3 Cross-Check

> Consolidated battle-tested patterns from `library/`. Use this catalog to drive agent audits of the NK3 codebase for simplicity, bottlenecks, and contradictions.
>
> Scope: NK3 first (`tmv.2checkin.com`, `tdental_nk3` + `tcosmetic_nk3`). NK/NK2 promotion is a separate runbook.

## How to Use This Catalog

1. Pick a **domain** below.
2. Read the **reference patterns** and **key files**.
3. Cross-check the **TGClinic files** listed under "Audit Target".
4. File findings as concrete issues: **simplicity**, **bottleneck**, or **contradiction**.
5. Do not rewrite code blindly. Propose incremental, test-backed changes.

---

## Domain 1 — Money & Decimal Handling

### Reference Patterns
- `library/money-flow/medici/` — double-entry ledger, integer cents
- `library/money-flow/blnk/` — Go ledger with `big.Int`
- `library/money-flow/leadedge/ledger-cli/` — CLI ledger with deterministic parsing

### Patterns to Apply
- Replace `parseFloat(amount || 0)` with `toCents()` / `fromCents()` helpers.
- Avoid float math on money; use integer cents for sums.
- Centralize rounding strategy (banker's vs arithmetic).

### Audit Targets
- `api/src/routes/payments.js`
- `api/src/routes/payouts.js`
- `api/src/routes/earnings.js`
- `api/src/routes/monthlyPlans.js`
- `api/src/routes/ctv.js` (totals aggregation)
- `api/src/services/commissionEngine.js`

### Red Flags
- `parseFloat(... || 0)` repeated inline
- `toFixed(2)` used for monetary comparison
- Summing floats in SQL or JS without cents normalization

---

## Domain 2 — Transactions & DB Connection Handling

### Reference Patterns
- `library/express-patterns/Z3r0J-nodejs-clean-architecture/src/infrastructure/UnitOfWork.ts`
- `library/postgresql-patterns/postgres-migrations/schema-versioning/`
- `library/postgresql-patterns/node-postgres-transactions/`

### Patterns to Apply
- Centralize `BEGIN/COMMIT/ROLLBACK/release` in a `withTransaction(queryable, async (client) => ...)` helper.
- Avoid early `return` inside a transaction without explicit rollback.
- Use a unit-of-work pattern for multi-table money writes.

### Audit Targets
- `api/src/routes/payments.js`
- `api/src/routes/payouts.js`
- `api/src/routes/monthlyPlans.js`
- `api/src/routes/saleOrderLines.js`
- `api/src/routes/employees/mutations.js`
- `api/src/routes/feedback/adminRoutes.js`
- `api/src/routes/feedback/userRoutes.js`

### Red Flags
- Repeated `pool.connect()` / `BEGIN` / `COMMIT` / `ROLLBACK` / `release` blocks
- Early `return` from inside a transaction
- Swallowed rollback errors

---

## Domain 3 — RBAC & Permission Checks

### Reference Patterns
- `library/auth-rbac/casl/packages/casl-ability/src/Ability.ts`
- `library/auth-rbac/casl/packages/casl-react/src/Can.ts`
- `library/auth-rbac/multi-tenant-rbac/src/config/permissions.ts`

### Patterns to Apply
- Declarative `<Can I="payment.view">...</Can>` component on frontend.
- Centralized permission resolver on backend; avoid inline `employee_permissions` table lookups.
- Action/subject shape should be consistent (`{ action, subject }`).

### Audit Targets
- `website/src/components/settings/PermissionGroupConfig.tsx`
- `api/src/middleware/requirePermission.js`
- `api/src/services/permissionService.js`
- `api/src/routes/permissions.js`

### Red Flags
- Inline permission string literals duplicated in JSX and backend
- `requireAdmin` still used instead of resolved permissions
- Mixed tier-id and legacy `employee_permissions` models

---

## Domain 4 — CTV / Referral / Commission

### Reference Patterns
- `library/ctv-referral/`
- `library/commissions-mlm/prathammahajan-affiliate/CommissionEngine.js`
- `library/commissions-mlm/formance-ledger/`

### Patterns to Apply
- Shared CTV summary aggregator across `ctv.js` and `ctvClientJourneys.js`.
- Idempotency keys for commission engine runs.
- Dual-DB mirror writes centralized, not copy-pasted.

### Audit Targets
- `api/src/routes/ctv.js`
- `api/src/routes/ctvClientJourneys.js`
- `api/src/services/commissionEngine.js`
- `api/src/services/createEarningsForPayment.js`
- `api/src/services/createEarningsForServiceCard.js`
- `website/src/components/commission/CtvManagementTab.tsx`
- `website/src/components/commission/EarningsPayoutsTabs.tsx`

### Red Flags
- Duplicated earnings total derivation
- No idempotency key for commission creation
- Best-effort dual-DB write without rollback coordination

---

## Domain 5 — Payment Processing

### Reference Patterns
- `library/money-flow/formance-ledger/`
- `library/express-patterns/restuwahyu13-express-rest-api-clean-architecture/`

### Patterns to Apply
- Extract domain service from route (`PaymentService`).
- Separate read models from write models.
- Receipt / allocation / residual logic as discrete commands.

### Audit Targets
- `api/src/routes/payments.js`
- `api/src/routes/payments/readHandlers.js`
- `api/src/services/paymentReceipt.js`
- `api/src/services/paymentAllocation.js`

### Red Flags
- Route file > 500 lines
- Same SQL SELECT duplicated for list/export/search
- Receipt + allocation + residual all inline

---

## Domain 6 — Frontend Component Structure

### Reference Patterns
- `library/react-patterns/bulletproof-react/`
- `library/react-patterns/shadcn-ui/`

### Patterns to Apply
- Feature folders: `components/`, `hooks/`, `types/`, `api/` per feature.
- Container/presentational split for large tabs.
- Shared `FormField` primitives.

### Audit Targets
- `website/src/components/commission/CtvManagementTab.tsx`
- `website/src/components/settings/FeedbackAdminContent.tsx`
- `website/src/components/commission/EarningsPayoutsTabs.tsx`
- `website/src/components/services/ServiceForm.tsx`
- `website/src/components/payment/PaymentForm.tsx`
- `website/src/components/shared/AddressAutocomplete.tsx`

### Red Flags
- File > 500 lines or > 10,000 chars
- Component mixes data fetching, state, modals, and table rendering
- Form field markup duplicated across forms

---

## Domain 7 — PostgreSQL Query Patterns

### Reference Patterns
- `library/postgresql-patterns/postgresql-audit-log/`
- `library/postgresql-patterns/postgres-migrations/`
- `library/postgresql-patterns/cursor-pagination/`

### Patterns to Apply
- Cursor-based pagination for unbounded lists.
- Materialized views / rollups for heavy aggregations.
- Audit triggers for high-blast tables.

### Audit Targets
- `api/src/routes/reports/**/*.js`
- `api/src/routes/ctv.js` (summary aggregations)
- `api/src/routes/payments/readHandlers.js`
- `api/src/db/migrations/` (index coverage)

### Red Flags
- `String_AGG` / `ARRAY_AGG` over unbounded date ranges
- OFFSET pagination on large tables
- Missing index on foreign-key + date filters

---

## Domain 8 — Testing

### Reference Patterns
- `library/testing-patterns/alexrusin-api-testing/`
- `library/testing-patterns/typical-data/`
- `library/testing-patterns/checkly-playwright-examples/`

### Patterns to Apply
- Dependency injection for external clients (fetch, CompreFace).
- Factory-based test data, not hardcoded IDs.
- Page Object Model for E2E.

### Audit Targets
- `api/src/services/__tests__/comprefaceClient.test.js`
- `api/src/services/__tests__/faceEngineClient.test.js`
- `api/src/services/__tests__/commissionEngine.test.js`
- `website/src/__tests__/` (E2E / integration structure)

### Red Flags
- `jest.spyOn(global, 'fetch')`
- Hardcoded database IDs in tests
- Tests that require real network

---

## Domain 9 — Bank Statement Import (NK3-ONLY future domain)

### Reference Patterns
- `library/bank-statements/bankstatementparser/`
- `library/bank-statements/firefly-data-importer/`

### Patterns to Apply
- Parser → Normalizer → Matcher → Preview → Commit pipeline.
- Deterministic SHA-256 dedup.
- Pluggable parser drivers per bank/format.

### Audit Targets
- `docs/runbooks/MONEY_FLOW.md`
- `product-map/domains/payments-deposits.yaml`
- Existing migration scripts that parse bank descriptions

### Red Flags
- Hardcoded Vietnamese bank parsers in shared code
- No dedup strategy
- Direct mutation before preview

---

## Cross-Domain Invariants (Never Break)

1. **Dual-DB topology:** no cross-DB JOINs. Use `getDb(lob)` factory.
2. **CTV SSOT:** any CTV creation change co-updates `CtvCreationForm/` + 3 consumers + backend + product-map + tests.
3. **Money precision:** never compare floats for equality; use integer cents.
4. **NK3-first:** no hardcoded `tdental_nk3` strings in shared code.
5. **§16 docs:** contract/schema/API/workflow changes update docs in the same commit.

---

## Agent Output Format

For each finding, produce:

```markdown
### Finding N — [Domain]: [File/Pattern]
- **Type:** simplicity | bottleneck | contradiction
- **Severity:** high | medium | low
- **Evidence:** exact file + line + snippet
- **Reference pattern:** library/.../file.ext
- **Proposed fix:** one-paragraph description
- **Risk:** what could break
- **Files to change:** list
```

Do not implement without an explicit go-ahead per `AGENTS.md` §16 and §5.1.
