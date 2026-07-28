# 03 — Module Inventory

**Baseline:** `22d691535` · Stable Module IDs from R1; status is **this checkout only**.

| ID | Name | Location | Purpose | Status | Primary lane |
|---|---|---|---|---|---|
| MOD-001 | Authority governance | `AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md`, `BEHAVIOR.md`, `DECISIONS.md`, `product-map/**` | Workflow + domain ownership | Active; LOB claims drift | M |
| MOD-002 | API server shell | `api/src/server.js` | Express, CORS, helmet, rate limit, mounts | Active | L/B |
| MOD-003 | DB pool | `api/src/db.js` | Single pg Pool + `withTransaction` | Active single-DB; dual-pool absent | M/F |
| MOD-004 | Auth middleware | `api/src/middleware/auth.js` | `requireAuth`, `requirePermission` | Active | B |
| MOD-005 | Permission service | `api/src/services/permissionService.js` | Effective perms + investor scope | Active | B |
| MOD-006 | Auth routes | `api/src/routes/auth.js` | login / me / change-password | Active; no lob_scope in response | B |
| MOD-007 | IP access | `middleware/ipAccess.js`, `routes/ipAccess.js` | IP allowlist | Active; fail-open on DB error | C/B |
| MOD-008 | Partners / customers API | `api/src/routes/partners/**` | Customer CRUD, KPIs, investor visibility | Active; resolve IDOR hole | D |
| MOD-009 | Appointments API | `api/src/routes/appointments/**` | Schedule CRUD | Active | E |
| MOD-010 | Payments API | `api/src/routes/payments.js` + `payments/**` | payments, deposits, refunds, void, proof | Active high-risk | F |
| MOD-011 | Sale orders / treatments | `saleOrders/**`, `saleOrderLines.js` | patient services | Active | F/G |
| MOD-012 | Products catalog API | `products.js`, `productCategories.js` | service catalog | Active; POST/PUT broken (missing import) | G |
| MOD-013 | Employees API | `employees.js` + `employees/**` | staff CRUD, location scopes | Active; mutation hash leak | H |
| MOD-014 | Permissions API | `routes/permissions.js` | groups, overrides, employee perms | Active | B |
| MOD-015 | Reports API | `routes/reports/**`, `dashboardReports.js` | KPI aggregates | Active; investor fail-open revenue | I |
| MOD-016 | Exports service | `routes/exports.js`, `services/exports/**` | Excel preview/download | Active | I |
| MOD-017 | Monthly plans | `routes/monthlyPlans.js` | installments | Active; pay ≠ canonical payment | F |
| MOD-018 | Feedback | `routes/feedback/**`, `larkNotifier.js` | threads + attachments + Lark | Active | J |
| MOD-019 | Face recognition | `faceRecognition.js`, `face-service/` | register/recognize | Active optional; investor gap | K |
| MOD-020 | External checkups | `externalCheckups.js`, `hosoonlineClient.js` | Hosoonline proxy | Active optional | K |
| MOD-021 | Settings / system | systemPreferences, bankSettings, customerSources, places, telemetry, … | ops config | Active; UI gaps | C |
| MOD-022 | Commissions legacy | `commissions.js`, `hrPayslips.js` | schemes + payslips | Active legacy; payslips auth-only | H |
| MOD-023 | Legacy / dead routes | `account.js`, `session.js`, `services.js` | historical APIs | **Unmounted** | L |
| MOD-024 | Website app shell | `App.tsx`, `main.tsx`, `Layout.tsx` | router + ProtectedRoute | Active; overview parent gate | A |
| MOD-025 | AuthContext / LocationContext | `website/src/contexts/*` | session + location filter | Active | A/B |
| MOD-026 | FE API core | `website/src/lib/api/core.ts` + domain clients | apiFetch boundary | Active; LOB rewrite stubs | A |
| MOD-027 | FE pages | `website/src/pages/**` | operational UI | Active | A + domain |
| MOD-028 | Shared UI | `components/shared/**`, `components/modules/**` | tables, selectors, check-in | Active | A |
| MOD-029 | i18n | `website/src/i18n/**` | en/vi | Active; hardcode debt | A |
| MOD-030 | Contracts package | `contracts/*.ts` | Zod Partner/Appointment/Payment | Partial coverage (6/92 writes) | L |
| MOD-031 | Product-map domains | `product-map/domains/*.yaml` | ownership maps | Mixed truth vs code | M |
| MOD-032 | Migrations | `api/migrations/*.sql` (+ supplemental `api/src/db/migrations`) | schema evolution | Active; numbering gaps; no 047 LOB | M |
| MOD-033 | Import / repair scripts | `api/scripts/*`, `scripts/**` | TDental/XLSX/Q10 | Active high-risk | M |
| MOD-034 | Deploy / CI | workflows, deploy-*, husky | gates + release | Active; CI FE-heavy | L |
| MOD-035 | Hermes observer | `hermes/**` | external watcher | Present; **tracked credential fields** | K |
| MOD-036 | Blueprint / frontend-truth | `blueprint/`, `frontend-truth/` | design artifacts | Non-runtime | — |
| MOD-037 | Cosmetic LOB / CTV / dual-DB | claimed paths | multi-LOB | **Not in baseline** | M |
| MOD-038 | Earnings engine (D13) | claimed `commissionEngine.js` | append-only earnings | **Not in baseline** | F/M |

---

## Dependency sketch (high blast radius)

```text
MOD-002 server → MOD-004 auth → MOD-005 permissionService → MOD-003 db
                → route modules (008–022)
MOD-024 App → MOD-025 AuthContext → MOD-026 apiFetch → API
MOD-010 payments ↔ MOD-011 saleOrders (residuals)
MOD-016 exports → MOD-005 investorExportScope
MOD-037/038 → absent (docs only)
```

---

## Audit status legend

| Status | Meaning |
|---|---|
| Active | Present and mounted/used on baseline |
| Active high-risk | Present; money/auth critical findings open |
| Unmounted | File exists; not in server mounts |
| Not in baseline | Documented elsewhere; missing on pin |
| Mixed truth | Docs and code disagree |
