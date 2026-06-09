# NK3 Crossref Breadcrumbs

The breadcrumb effect is source traceability, not visual navigation. It keeps route, module, API, backend, and migration files linked to their domain authority and regression tests.

Required file-level triad:

```ts
/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 SPA page route: website/src/pages/CTV/CtvDashboard]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
```

SQL migrations use SQL comments:

```sql
-- @crossref:domain[earnings-commissions]
-- @crossref:used-in[NK3 schema migration: api/migrations/055_earnings_service_card_created]
-- @crossref:uses[product-map/domains/earnings-commissions.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
```

High-blast CTV, LOB, commission, payment, payout, service-card, and live-repair files also require one of:

- `@crossref:route[...]`
- `@crossref:endpoint[...]`
- `@crossref:function[...]`

Verification:

```bash
npm run verify:crossrefs
npm --prefix website test -- src/__tests__/crossrefBreadcrumbs.test.ts src/__tests__/Breadcrumbs.test.tsx
```

Do not use breadcrumbs to restate every import. Keep them as impact-routing metadata: domain, consumers, and the authority/test files to read before changing behavior.
