# 04 — Flow Inventory

**Baseline:** `22d691535` · Discovery depth from R1; deep-trace status from lanes A–M.

| ID | Flow | Entry → outcome | Actors | Modules | Deep-trace | Key findings |
|---|---|---|---|---|---|---|
| FLOW-001 | Staff login | `/login` → POST `/api/Auth/login` → JWT localStorage → `/` | Staff | 006,025,024 | B | BL-003/004 OK; JWT localStorage XSS class |
| FLOW-002 | Investor login | same login → investor_accounts → restricted portal | Investor | 006,005 | B | Same portal; allowlist holes on other flows |
| FLOW-003 | Session restore | `/api/Auth/me` + permissions | Any | 006,025 | B | `/me` skips `active` check (B-F009) |
| FLOW-004 | Change password | modal → POST change-password | Staff/Investor | 006 | B | Ignores investor_accounts hash (B-F003) |
| FLOW-005 | IP blocked login | enforceIpAccess before auth | All | 007 | C/B | Fail-open on DB error |
| FLOW-006 | Overview dashboard | `/` → today appts + check-in | Staff | 024,027,009 | A/E | Parent overview.view gate; limit 200 |
| FLOW-007 | Calendar browse/filter | `/calendar` → Appointments list | Staff | 009,027 | A/E | Accent search OK; drag dead |
| FLOW-008 | Appointment create/edit/reschedule | modals → POST/PUT | Staff | 009 | E | No conflict check; drag unwired; time omit |
| FLOW-009 | Appointment status transitions | StatusDropdown → PUT state | Staff | 009 | A/E | FE 3-state; done→arrived collapse |
| FLOW-010 | Customer list/search | `/customers` → GET Partners | Staff/Investor | 008,027 | D/A | Error looks empty; BE accent |
| FLOW-011 | Customer create/edit | forms → POST/PUT Partners | Staff | 008,030 | D | ref rewrite; Zod partial |
| FLOW-012 | Customer soft/hard delete | PATCH/DELETE | Staff | 008 | D | List stale after delete; face FK hard-delete |
| FLOW-013 | Customer profile deep link | `/customers/:id` → resolve + KPIs | Staff/Investor | 008 | D | **Resolve IDOR** (D-F001) |
| FLOW-014 | Investor visibility admin | Customers checkbox | Admin | 008,005 | B/D | — |
| FLOW-015 | Service/treatment create | Services/profile → SaleOrders | Staff | 011,012 | G/F | Write perm customers.edit; no product validate |
| FLOW-016 | Service state patch | PATCH SaleOrders/:id/state | Staff | 011 | G | Profile OK; Services page cancel local-only |
| FLOW-017 | Payment create + allocate | PaymentForm → POST Payments | Staff | 010,030 | F | **S1 allocation matrix holes** |
| FLOW-018 | Deposit create/use/refund | deposits + CustomerBalance | Staff | 010 | F | No wallet balance check |
| FLOW-019 | Payment void/proof/confirm | void + proof chain | Staff | 010 | F | PATCH shadow void; physical DELETE |
| FLOW-020 | Monthly installment plans | MonthlyPlans CRUD | Staff | 017 | F | Pay status-only (no canonical payment) |
| FLOW-021 | VietQR / bank settings | bank settings | Admin | 021 | C | FE/BE perm split |
| FLOW-022 | Service catalog CRUD | `/service-catalog` → Products | Staff | 012 | G | **POST/PUT ReferenceError** |
| FLOW-023 | Employees CRUD + tiers | `/employees` | Admin | 013 | H | password_hash leak; tier dual-write |
| FLOW-024 | Permission board edit | `/permissions` | Admin | 014 | B | Dual admin definitions |
| FLOW-025 | Locations view | `/locations` → Companies | Staff | 021 | — | — |
| FLOW-026 | Reports subpages | `/reports/*` | Staff/Investor | 015 | I | **Empty allowlist revenue fail-open** |
| FLOW-027 | Excel export | ExportMenu → Exports API | Staff/Investor | 016 | I | Nginx timeout missing; audit best-effort |
| FLOW-028 | Commission page | `/commission` | Staff | 022,027 | H/A | Placeholder fake KPIs; no FE API |
| FLOW-029 | Feedback user/admin | widget + `/feedback` | Staff | 018 | J | perm model; unauth uploads |
| FLOW-030 | Website CMS | `/website` | Staff | 018 | J/A | Nav orphan; SEO mock; PUT 404 |
| FLOW-031 | Settings | `/settings` | Admin | 021 | C | Sources UI missing; prefs type break |
| FLOW-032 | Face register/recognize | camera → `/api/face/*` | Staff | 019 | K | **Investor PII via recognize** |
| FLOW-033 | External checkup images | profile → ExternalCheckups | Staff | 020 | K | Unscoped image proxy |
| FLOW-034 | Telemetry error report | public POST telemetry/errors | Public | 021 | C/J | Spoofable fields; feedback+Lark |
| FLOW-035 | Health check | GET `/api/health` | Ops | 002,019 | K | 503 if face down |
| FLOW-036 | Notifications page | `/notifications` | Staff | 027 | A | Placeholder fake volumes |
| FLOW-037 | Relationships page | `/relationships` | Admin | 027 | A | Hybrid API + static graph |
| FLOW-038 | TDental / XLSX import | scripts | Ops | 033 | M | High-risk writes |
| FLOW-039 | Q10 customer source repair | data-repairs | Ops | 033 | M | Ops only |
| FLOW-040 | Deploy NK/NK2 preflight | deploy-build-args + preflight | Ops | 034 | L | Local discipline; not GHA |
| FLOW-041 | Cosmetic LOB toggle + CTV | claimed | — | 037 | M | **Blocked — not in baseline** |
| FLOW-042 | D13 earnings on payment | claimed | — | 038 | F/M | **Blocked — engine missing** |
| FLOW-043 | Hermes synthetic monitoring | hermes flows | Ops | 035 | K | Tracked credential fields |

---

## Deep-trace priority for remediation

| Priority | Flows | Why |
|---|---|---|
| P0 | 017, 018, 019, 026, 013, 032, 022, 023, 043, 038 | Money, investor PII, broken writes, secrets, data destroy footgun |
| P1 | 001–005, 008–012, 015–016, 020, 027, 029 | Authz completeness, appointments integrity, exports |
| P2 | 006–007, 021, 024, 028, 030–031, 036 | UX honesty, settings, placeholders |
| Blocked | 041, 042 | Need LOB pin decision |
