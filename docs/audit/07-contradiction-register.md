# 07 — Contradiction Register

**Baseline:** `22d691535` · Sources: R1 CX leads + lane confirmations.

| ID | Type | Claim A | Claim B / code | Sev | Related AUD | Resolution posture |
|---|---|---|---|---|---|---|
| CX-001 | Doc vs code | AGENTS/product-map/SECURITY/CONTRACTS/schema-map: LOB v2 implemented (requireLobScope, getDb, CTV, earnings, mig 047) | All LOB runtime paths MISSING; no 047 in `api/migrations/`; auth has no lob_scope/is_ctv | S1 | AUD-015 | **Captain hold** `lob-authority-truth` |
| CX-002 | Doc vs doc | LOB design v1 users table / shared.employee_lob_scope vs v2 partners-canonical | Specs still mix users-table text with partners-canonical | S3 | AUD-079 | Refresh specs on chosen pin |
| CX-003 | Doc vs code | api-index Auth response includes is_ctv/lob_scope | auth.js returns id/name/email/company only | S2 | AUD-015/017 | Align index to baseline or LOB pin |
| CX-004 | Doc vs code | appointments-calendar.yaml owns `pages/Appointments/index.tsx` | Path absent; Calendar absorbs | S3 | AUD-071 | Update product-map |
| CX-005 | Doc vs code | auth.yaml owns `middleware/permissions.js` | File missing; only auth.js/errorHandler/ipAccess/validate | S3 | AUD-078 | Fix domain yaml |
| CX-006 | Doc vs code | unknowns.md: services still mounted | server.js unmounted + enterprise test intent | S3 | AUD-078/042 | Refresh unknowns |
| CX-007 | Index vs code | API_ROUTE_INDEX auth → aspnetusers | auth uses partners + investor_accounts | S3 | AUD-078 | Regenerate index |
| CX-008 | FE vs BE | Appointment status options FE subset | BE VALID_STATES wider; edit collapse done→arrived | S2 | AUD-051/061 | **Captain** `fe-appointment-status-subset` |
| CX-009 | FE vs BE | Feedback gated permissions.view; feedback.* seeded unused | Runtime admin permissions.*; mig 045 feedback.* | S2 | AUD-036 | **Captain** `feedback-admin-perm-model` |
| CX-010 | Design risk | INV-009 location filter FE-only | API clients can query other locations with view perm | S2 | (risk) | Product accept or BE scope |
| CX-011 | Health vs optional face | Face optional product-wise | `/api/health` 503 unless face ok | S2 | AUD-038 | Decouple health |
| CX-012 | Prior audit vs code | AUDIT CRIT unauthenticated CRUD | global requireAuth present | — | — | **Resolved improved** (historical) |
| CX-013 | GAPS vs code | No Zod / few api tests | zod present; ~77 api tests; partial validate coverage | S3 | AUD-040/041 | Refresh GAPS |
| CX-014 | Contracts vs routes | 3 contract modules | dozens of writes without shared Zod | S2 | AUD-040 | Expand contracts |
| CX-015 | Mock types | Pages import types from `data/mock*` | Couples production types to mock modules | S4 | AUD-062 | Move types |
| CX-016 | LOB audit vs LOB audit | Some LOB status files claimed production-ready | May-19 brutal audit ~40–55% / park | Hist | — | Other-tree only |
| CX-017 | Hermes vs DEC secrets | DEC-20260502-04 secrets out of git | hermes-map.yaml credential fields tracked | S1 | AUD-014 | Rotate + purge |
| CX-018 | schema-map vs migrations | schema-map / MIGRATIONS.md cite 047 LOB | no 047 LOB file; duplicate numeric prefixes; dual dirs | S1 | AUD-015/054 | Captain + inventory |
| CX-019 | FE vs BE create default | FE appointment default scheduled | BE default confirmed | S3 | AUD-071 | **Captain** `appt-default-create-state` |
| CX-020 | FE vs BE services export | FE state active/completed/cancelled | BE sale/done/cancel | S2 | AUD-027 | Map vocabulary |
| CX-021 | FE vs BE bank perms | FE settings.edit for bank form | BE payment.edit on PUT | S2 | AUD-045 | Align |
| CX-022 | FE vs BE SO writes | FE route services.view; create ungated | BE customers.edit on SO writes | S2 | AUD-028 | **Captain** `so-write-permission` |
| CX-023 | Docs vs nginx | INV-019 / FM claim 300s timeouts fixed | nginx.conf templates lack timeouts | S1 | AUD-013 | Fix confs |
| CX-024 | Registry vs FE services guard | registry risk customers.edit on /services | code services.view | S4 | A-F016 | Refresh registry |
| CX-025 | Commission docs vs FE | commission-rules claims FE consumes APIs | Commission page fake KPIs; no client | S3 | AUD-060 | Wire or docs |
| CX-026 | i18n complete vs hardcode | audit-i18n 0 missing keys | Widespread JSX English | S3 | AUD-063 | Expand audit |
| CX-027 | MODULE_REGISTRY QuickActions | claims Overview/Sidebar | component unused | S4 | AUD-080 | Refresh registry |
| CX-028 | Enterprise test vs tree | claims services.ts deleted | file exists; path resolve wrong | S2 | AUD-042 | Fix test |
| CX-029 | DATA-MODEL SO states | draft/confirmed/done/cancelled | code sale/done/cancel/draft | S3 | AUD-073 | Align model doc |
| CX-030 | permission-registry LOB | lists CTV/LOB keys as enforced | no routes on baseline | S3 | AUD-079 | Mark planned |

---

## Disposition classes

| Class | Action |
|---|---|
| **Captain decision** | CX-001/008/009/019/022 and money holds |
| **Eng fix without product choice** | CX-006/007/011/013/017/020/021/023/024/028 |
| **Historical resolved** | CX-012 (auth global) — do not re-open as active CRIT |
| **Other-branch only** | CX-016 — do not treat as baseline proof |
