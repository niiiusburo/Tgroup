# 06 — Findings Register (MASTER)

**Baseline:** `22d691535` · website `0.32.59` · api `1.2.2`  
**Rule:** Do not invent findings absent from lane reports. Duplicates merged; lane IDs retained in Evidence.  
**Spot-verify:** See §Spot-verification and `11-agent-coverage-ledger.md`.

### Column legend

ID · Severity · Priority · Confidence · Category · Module · Flow · BusinessRule · Finding · Evidence · Impact · Reproduction · RootCause · RecommendedFix · Complexity · Dependencies · Owner · Validation · Status

---

## S0

| ID | Sev | Pri | Conf | Category | Module | Flow | BusinessRule | Finding | Evidence | Impact | Reproduction | RootCause | RecommendedFix | Complexity | Dependencies | Owner | Validation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AUD-001 | S0 | P0 | Confirmed | Data destruction footgun | MOD-032/033 | FLOW-038 | runbook safety | Canonical migration glob can re-execute `008_*` data migrations that `TRUNCATE` core operational tables (payments, saleorders, appointments, …) | M-F004; `api/migrations/008_data_migration_from_tdental_v3.sql` L457+; RUNBOOK blind glob; **spot-verified** TRUNCATE lines present | Catastrophic data loss if ops re-runs full `*.sql` on nonempty DB | Apply runbook “run all migrations” on DB with data | One-shot import SQL kept beside additive DDL without guard | Move 008_* out of default deploy glob; require explicit destructive flag; document non-idempotent set; add CI deny-list | M | Captain ops policy | Data/Money + Infra | Runbook review + dry-run listing; CI check forbids TRUNCATE in default path | Open |

---

## S1

| ID | Sev | Pri | Conf | Category | Module | Flow | BusinessRule | Finding | Evidence | Impact | Reproduction | RootCause | RecommendedFix | Complexity | Dependencies | Owner | Validation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AUD-002 | S1 | P0 | Confirmed | Authz / investor fail-open | MOD-015 | FLOW-026 | BL-005, INV-021 | Empty investor allowlist omits partner filter in `canonicalRevenue.buildWhere` → paid revenue fail-open on Dashboard/Doctors/Locations | B-F001, I-F001, I-F011; `canonicalRevenue.js` only filters when `allowedCustomerIds.length`; unit test encodes omit-on-empty; callers pass `[]`; **spot-verified** | Investor with empty assignments sees company-wide paid revenue (split-brain vs fail-closed sibling metrics/exports) | Login as investor with empty allowlist; open reports dashboard paid revenue | Fail-open branch treated as “no filter” | Always apply `= ANY([])` / `FALSE` when investor; invert unit test; align with `investorExportScope` | S | — | Backend + Reports | Unit + investor fixture e2e | Open |
| AUD-003 | S1 | P0 | Confirmed | Authz / IDOR | MOD-008 | FLOW-013 | BL-005, INV-021 | `GET /api/Partners/resolve` lacks `resolveInvestorScope`; returns id/code/name/phone for any customer | B-F002(a), D-F001; `resolveHandler.js` no scope; `partners.js` `customers.view`; FE deep-link uses resolve; **spot-verified** no scope import | Investor (or any customers.view) enumerates/resolves non-allowlisted patients | Resolve by phone/ref of non-assigned customer as investor | Missing scope call + global cache keys | Add scope; principal-scoped cache; 404 on miss | S | AUD-004 family | Backend + Customers | Investor IDOR tests | Open |
| AUD-004 | S1 | P0 | Confirmed | Authz / PII | MOD-019 | FLOW-032 | BL-005, INV-021 | Face recognize/status/register lack investor allowlist; recognize returns name/phone for any match | B-F002(b), K-F001; `faceRecognition.js` perm only; `faceMatchEngine.js` joins all embeddings; investor seed has `customers.view` | Cross-patient biometric/PII leak to investors | Investor face-recognize against enrolled non-allowlisted patient | No resolveInvestorScope on face routes | Scope register targets + filter match candidates; strip phone for investors if product requires | M | AUD-003 patterns | Backend + Integrations | Investor face tests (currently none) | Open |
| AUD-005 | S1 | P0 | Confirmed | Authz / PII family | MOD-020, MOD-021 | FLOW-033 | BL-005, INV-021 | Customer-derived surfaces missing investor scope: ExternalCheckups (incl. image-by-name), StockPickings GET auth-only + partner filter | B-F002(c)(d), K-F004; externalCheckups handlers; stockPickings.js | Clinical images / stock rows outside allowlist | Investor or low-priv JWT with granted view/upload | Same root as B-F002 family | Apply resolveInvestorScope; bind image proxy to customer; requirePermission on stock | M | AUD-003 | Backend | IDOR matrix | Open |
| AUD-006 | S1 | P0 | Confirmed | Money integrity | MOD-010 | FLOW-017 | BL-011, INV-003/012 | Allocation residual check is TOCTOU — plain SELECT residual, no `FOR UPDATE` | F-F001; `helpers.js` checkInvoiceResidual; **spot-verified** no FOR UPDATE | Concurrent double-pay both pass; residual driven to 0 with 2× collected | Two concurrent POST Payments full residual | Missing row lock in tx | `SELECT residual … FOR UPDATE` inside payment tx | S | AUD-007/008 | Backend + Money | Concurrent test | Open |
| AUD-007 | S1 | P0 | Confirmed | Money integrity | MOD-010 | FLOW-017 | BL-011, INV-012 | Multi-allocation lines against same invoice not accumulated in validator | F-F002; validateAllocationResidual independent loop | Two lines 600+600 on residual 1000 both pass; GREATEST hides negative | POST with two alloc lines same invoice | Per-line only validation | Accumulate per invoice/dotkham inside request before compare | S | AUD-006 | Backend + Money | Matrix M3 | Open |
| AUD-008 | S1 | P0 | Confirmed | Money integrity | MOD-010 | FLOW-017 | BL-011, INV-012 | No `sum(allocated_amount) ≤ payment.amount` | F-F003; create path after per-invoice checks only | Over-claim cash vs allocations; residual corruption | POST amount 100 with alloc sum 500 | Missing payment-level constraint | Reject if sum(alloc) > amount (+ε) | S | AUD-006 | Backend + Money | Matrix M4 | Open |
| AUD-009 | S1 | P0 | Confirmed | Money integrity | MOD-010 | FLOW-019 | INV-010 spirit, BL-011 | `PATCH /Payments/:id` can set `status=voided` without reversing allocations | F-F004; allowedFields includes status; **spot-verified** PATCH path; contrast dedicated void endpoint | Shadow void: residual stays depressed; SO recalc disagrees | PATCH status voided on posted allocated payment | Void semantics split across endpoints | Disallow status→voided on PATCH or route through void reverse logic | S | — | Backend + Money | paymentsTransaction + negative test | Open |
| AUD-010 | S1 | P0 | Confirmed | Broken primary write | MOD-012 | FLOW-022 | BL-014, BL-015 | `products.js` POST/PUT call `normalizeVietnamese` without importing it → ReferenceError | G-F001; import set lacks helper; calls L236/L278; **spot-verified** | Catalog create/update completely broken | POST/PUT Products with name | Missing import after search util split | Import `normalizeVietnamese` from `utils/search` | XS | — | Backend + Catalog | POST Products test | Open |
| AUD-011 | S1 | P0 | Confirmed | Credential material leak | MOD-013 | FLOW-023 | staff SMI | Employee create/update `RETURNING *` includes `password_hash` in JSON response | H-F001; mutations.js INSERT/UPDATE RETURNING *; **spot-verified** | bcrypt hash leaves server to any `employees.edit` client | POST/PUT Employees | SELECT * convenience vs explicit GET columns | Return explicit safe column list; never hash | XS | — | Backend + HR | Assert response keys | Open |
| AUD-012 | S1 | P0 | Confirmed | Authz / payroll PII | MOD-022 | FLOW-023 | least privilege | `/api/HrPayslips*` is auth-only — no `requirePermission`; full payroll aggregates + employee contact | H-F002; hrPayslips.js zero requirePermission; **spot-verified** | Any JWT incl. investor reads netsalary/tax/insurance | GET HrPayslips as investor | Middleware omission (B-F006 pattern, higher severity) | requirePermission employees/payroll appropriate; deny investors | S | B-F006 | Backend + HR | Investor 403 test | Open |
| AUD-013 | S1 | P0 | Confirmed | Infra / exports | MOD-016/034 | FLOW-027 | INV-019, BL-016 | Tracked nginx configs lack 300s export timeouts claimed fixed in docs | I-F004; nginx.conf + nginx.docker.conf no proxy_read/send_timeout; **spot-verified** | Large Excel downloads 504-prone after deploy from these templates | Deploy template nginx; large export | Docs claim without config | Add 300s timeouts to both confs; document VPS parity check | XS | — | Infra | Config assert + soak | Open |
| AUD-014 | S1 | P0 | Confirmed | Secrets | MOD-035 | FLOW-043 | DEC-20260502-04 | Hermes map tracked with non-empty credential fields (site password, telegram bot token, model API keys) | K-F002, R1 RK-001/CX-017; `git ls-files hermes/hermes-map.yaml`; field presence **spot-verified** (values not published here) | Credential leak via git history/clone | `git show` map on baseline | yaml not gitignored; secrets committed | Rotate all exposed secrets; purge history or replace file with env placeholders; ignore secrets; use HERMES_* env (config already supports) | M | Ops rotation | Sec + Ops | git grep clean; env-only run | Open |
| AUD-015 | S1 | P0 | Confirmed | Governance false assurance | MOD-001/037/038 | FLOW-041/042 | BL-022/023 | Authority/product-map/SECURITY-class docs claim Cosmetic LOB v2 implemented; runtime + mig 047 missing on pin | M-F001, M-F003, R1 CX-001/018; path probes **spot-verified** missing | Agents/humans assume dual-DB isolation and earnings that do not exist | Read AGENTS LOB vs `ls` runtime | Docs advanced ahead of mainline merge | Captain hold: demote docs / banner / separate pin (see 12) | M | captain `lob-authority-truth`, `lob-round2-pin` | Architecture | Doc/code parity check | Blocked |

---

## S2 (selected master rows — full lane depth retained via Evidence)

| ID | Sev | Pri | Conf | Category | Module | Flow | BusinessRule | Finding | Evidence | Impact | Reproduction | RootCause | RecommendedFix | Complexity | Dependencies | Owner | Validation | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AUD-016 | S2 | P1 | Confirmed | Authz | MOD-024 | FLOW-006+ | FE shell | Parent `ProtectedRoute path="/"` requires `overview.view` for all nested routes | A-F001; App.tsx Layout wrapper | Roles with only calendar/customers perms blocked | User without overview.view opens /calendar | Shell gate coupled to overview | Auth-only parent; overview.view on index only | S | captain `overview-shell-gate` | Frontend | Perm matrix unit | Blocked |
| AUD-017 | S2 | P1 | Confirmed | LOB residue | MOD-024/026 | FLOW-041 | BL-023 | `is_ctv===true` redirects to `/ctv` with no route; API does not emit is_ctv | A-F002, M-F002; App.tsx; core.ts LOB stubs | Dead-end blank if flag ever set | Force user.is_ctv in FE | LOB scar tissue | Remove/flag redirect until LOB ships | XS | lob holds | Frontend | Unit | Open |
| AUD-018 | S2 | P1 | High | Authz | MOD-010/009/008 | FLOW-017/008/011 | DEC investor writes | Investor write paths lack object-level deny; seed omission only | B-F005, F-F009, E-F007, D-F004 | Mis-grant → IDOR writes money/appts/customers | Grant write perm to investor | No resolveInvestorScope on mutations | Hard deny isInvestor on writes or scope every mutation | M | AUD-003 | Backend | Override fixture | Open |
| AUD-019 | S2 | P1 | Confirmed | Authz | MOD-012/021 | multiple | BL-001 residual | Auth-only GETs: StockPickings, ProductCategories, CustomerSources, journals, telemetry mgmt | B-F006, C-F005, G-F005 note | Any JWT reads operational data | Investor GET those routes | Missing requirePermission | Add perms; registry align | S | AUD-012 | Backend | readRoutePermissions expand | Open |
| AUD-020 | S2 | P1 | Confirmed | Auth | MOD-006 | FLOW-004 | DEC investor | Change-password ignores investor_accounts | B-F003; auth.js | Investor password change updates wrong table / fails intent | Login via IA; change password | Single-table assumption | Branch on principal type | S | — | Backend | authInvestor test | Open |
| AUD-021 | S2 | P1 | Confirmed | Money | MOD-010 | FLOW-018 | deposit wallet | Refund and deposit_used ignore wallet balance | F-F005, F-F006 | Silent overdraft; UI clamps to zero | Refund > balance | No balance precondition | Hard block or admin+audit (captain) | M | captain `deposit-overdraft-policy` | Money | Balance fixtures | Blocked |
| AUD-022 | S2 | P1 | Confirmed | Money | MOD-010 | FLOW-019 | residual | Void/DELETE reverse uncapped; residual can exceed amounttotal | F-F007 | Residual > total after SO shrink+void | Shrink SO; void payment | Dual residual model | Recompute residual from allocs (captain SoT) | M | captain `residual-source-of-truth` | Money | Matrix | Blocked |
| AUD-023 | S2 | P1 | Confirmed | Money | MOD-010 | FLOW-019 | INV-010 | PATCH amount/method on allocated payment leaves alloc+residual stale | F-F008 | Staff footgun wrong books | PATCH amount after alloc | No guard | Reject amount change if allocations exist | S | — | Money | Negative test | Open |
| AUD-024 | S2 | P1 | Confirmed | Money | MOD-017 | FLOW-020 | BL-013 | Monthly plan installment pay is status-only; no payments/allocations | F-F010 | Cash movement not in canonical ledger | Pay installment | Product incomplete | Captain: status-only disclaimer vs auto payment vs block | M | captain `monthly-plan-cash-link` | Money | FLOW-020 e2e | Blocked |
| AUD-025 | S2 | P1 | Confirmed | Money | MOD-010/011 | FLOW-017/016 | residual SoT | Dual residual: pay decrements column; SO edit recomputes from allocs | F-F011 | Drift between column and truth | Mix pay + SO amount edit + void | Two algorithms | Single recompute-after-write | M | captain residual | Money | Reconcile job/tests | Blocked |
| AUD-026 | S2 | P1 | Confirmed | Money | MOD-010 | FLOW-018 | BL-012 | Deposit classification split-brain create vs list vs CustomerBalance | F-F012 | Wrong deposit totals | Create edge deposit_type/method | Divergent predicates | Unify classifier function | M | — | Money | Classification matrix | Open |
| AUD-027 | S2 | P1 | Confirmed | Catalog/export | MOD-011/016 | FLOW-015/027 | state enum | Services export state filter vocab mismatch (active/completed/cancelled vs sale/done/cancel) | G-F002 | Empty/wrong exports | Export filtered completed | FE/BE vocabulary split | Map FE filters to BE states; fix cancelled count | S | — | Backend + FE | Export tests | Open |
| AUD-028 | S2 | P1 | Confirmed | Authz UX | MOD-011 | FLOW-015 | perm model | SO writes use customers.edit; FE create ungated; registry claims wrong FE guard | G-F003, A-F016 | View-only open form → API 403; docs lie | services.view only user clicks New Service | Split product intent | Captain so-write-permission; gate UI | S | captain `so-write-permission` | Product + FE/BE | Perm matrix | Blocked |
| AUD-029 | S2 | P1 | Confirmed | UX fiction | MOD-027 | FLOW-016 | treatment model | Cancel + multi-visit on Services page are local-only | G-F004 | Cancel reverts on refetch; visits never persist | Cancel from Services list | No API wiring | Captain multi-visit-model | M | captain `multi-visit-model` | Product + FE | Refetch proof | Blocked |
| AUD-030 | S2 | P1 | Confirmed | Catalog | MOD-012 | FLOW-022 | categories | Category delete ignores group siblings; GET auth-only | G-F005 | Orphan products / wrong delete guards | Delete representative category UUID | Group key collapse vs UUID checks | Delete by group; require services.edit on GET if needed | M | — | Catalog | Category fixtures | Open |
| AUD-031 | S2 | P1 | Confirmed | HR reliability | MOD-013 | FLOW-023 | — | PUT employee checks `result.length` on pg Result object → wrong 404/crash path | H-F003 | Broken updates | PUT employee edge | client.query Result vs rows helper | Use result.rows | XS | — | HR | Unit | Open |
| AUD-032 | S2 | P1 | Confirmed | HR / perms | MOD-013/014 | FLOW-023 | tier sync | Tier dual-write incomplete on employee create/clear | H-F004, B-F008 | Stale employee_permissions | Create with tier_id; clear tier | Incomplete mirror of PermissionBoard | Upsert/clear employee_permissions with tier | S | B-F008 | HR + Authz | Tier tests | Open |
| AUD-033 | S2 | P1 | Confirmed | Authz / HR via reports | MOD-015 | FLOW-026 | BL-005 | Investors with reports.view get full employee roster + unscoped employee_count | I-F002, I-F003 | HR PII to investors | Open /reports/employees as investor | No scope; seed includes reports.view | Captain investor-hr-via-reports | S | captain hold | Reports | Investor fixture | Blocked |
| AUD-034 | S2 | P1 | Confirmed | Compliance | MOD-016 | FLOW-027 | BL-016 | Export audit best-effort / fire-and-forget; untested | I-F005 | Silent loss of audit trail | Download export; kill mid-stream | Non-transactional audit | Await audit before stream or durable outbox; tests | M | — | Exports | Audit assertions | Open |
| AUD-035 | S2 | P1 | Confirmed | Feedback security | MOD-018 | FLOW-029 | attachments | Attachment write trusts client MIME + original ext; sharp fail-open; delete allowlist mismatch | J-F003 | Malicious file types on unauth static path | Upload crafted attachment | Weak validation | Server-side type sniff; fail closed; align delete | M | AUD-036, captain attachment access | Feedback | Upload suite | Blocked |
| AUD-036 | S2 | P1 | Confirmed | Feedback authz model | MOD-018/024 | FLOW-029 | CX-009 | Admin uses permissions.view/edit; mig 045 feedback.* unused | J-F001, B-F007 | Wrong staff access model | Compare seeds vs runtime | Product/impl drift | Captain feedback-admin-perm-model | S | captain hold | Feedback | Perm tests | Blocked |
| AUD-037 | S2 | P1 | Confirmed | CMS | MOD-018 | FLOW-030 | — | PUT WebsitePages SEO-only returns 404 after write | J-F009 | FE thinks failure after success | PUT SEO fields | Control-flow bug | Return updated entity 200 | XS | — | CMS | Unit | Open |
| AUD-038 | S2 | P1 | Confirmed | Integrations | MOD-002/019 | FLOW-035 | BL-017 | Health 503 when optional face provider down | K-F003 | Orchestrators mark app down | Stop face-service; GET /api/health | allHealthy requires face | Degrade face check; keep 200 if DB ok | XS | — | Integrations | Health matrix | Open |
| AUD-039 | S2 | P1 | Confirmed | Privacy egress | MOD-019/020/035 | FLOW-032/033/043 | INV-005/013 | PII/biometric egress underdocumented (CompreFace images, Hosoonline, face phone return) | K-F005 | Compliance/privacy risk | Trace outbound payloads | Missing privacy boundary docs + controls | Document + minimize fields; DPA checklist | M | AUD-004/014 | Sec | Privacy review | Open |
| AUD-040 | S2 | P1 | Confirmed | Platform | MOD-030 | many writes | validation | Zod validate() covers only 6/92 write registrations | L-F001, F-F016 | Shape bugs; inconsistent 400/500 | Mutate unvalidated routes | Partial rollout | Expand contracts; use result.data | L | — | Platform | Coverage inventory CI | Open |
| AUD-041 | S2 | P1 | Confirmed | CI | MOD-034 | — | quality gate | CI FE-heavy; full api jest not on PR; e2e continue-on-error; contracts build absent | L-F002 | Regressions merge silently | Inspect workflows | Historical FE focus | Make api suite + contracts build blocking; e2e policy decision | M | — | Platform | CI green policy | Open |
| AUD-042 | S2 | P1 | Confirmed | False green test | MOD-023/034 | — | BL-014 | enterprise-verification services.ts path one `..` short → always passes while file exists | L-F004, G-F012 | Dead client retained with green CI | Node resolve path in test | Wrong relative path | Fix path; delete dead client or assert absence correctly | XS | dead-route hold | Platform | Test fix | Open |
| AUD-043 | S2 | P1 | Confirmed | Settings | MOD-021 | FLOW-031 | sources | CustomerSources admin UI not mounted on Settings | C-F001 | Ops cannot maintain taxonomy in-app | Open Settings tabs | Missing tab wire-up | Mount CustomerSourcesConfig | S | — | Settings | UI test | Open |
| AUD-044 | S2 | P1 | Confirmed | Settings | MOD-021 | FLOW-031 | prefs | System Preferences UI/API type contract broken (string vs toggle widgets) | C-F002 | Blank controls | Open system prefs | Type vocabulary mismatch | Align types + mapper labels/options | M | — | Settings | Fixture prefs | Open |
| AUD-045 | S2 | P1 | Confirmed | Settings / money | MOD-021 | FLOW-021 | bank | Bank settings FE settings.edit vs BE payment.edit | C-F003 | Save 403 or unreachable edit | Cross perm matrix | Split registry intent | Align FE canEdit to payment.edit | S | — | Settings | Perm matrix | Open |
| AUD-046 | S2 | P1 | Confirmed | Secrets hygiene | MOD-021 | FLOW-031 | Places key | Places accepts VITE_GOOGLE_PLACES_API_KEY fallback; docs require server-only | C-F004 | Encourages browser-prefixed secrets in API env | Set only VITE_ key | Compatibility footgun | Remove VITE fallback; fix i18n instructions | XS | — | Settings | Env test | Open |
| AUD-047 | S2 | P1 | Confirmed | Partners | MOD-008 | FLOW-012/013 | resolve | Resolve includes soft-deleted; process-global cache not principal-scoped | D-F002, D-F003 | Deleted patients deep-linkable; future scope cache leak | Resolve deleted ref | Cache design | Filter isdeleted; cache key includes principal | S | AUD-003 | Customers | Cache tests | Open |
| AUD-048 | S2 | P1 | Confirmed | Partners SMI | MOD-008 | FLOW-011 | BL-007 | get/update Partners lack customer=true guard; can touch employee rows | D-F005 | Staff edit employee via Customers API | GET/PUT employee id via Partners | Missing SMI guard | Require customer=true on customer routes | S | — | Customers | SMI tests | Open |
| AUD-049 | S2 | P1 | Confirmed | Appointments | MOD-009/027 | FLOW-008 | product-map | Drag-to-reschedule dead; DayView omits drag props | E-F001 | Claimed feature missing | Drag card in day view | Incomplete wire | Captain appt-drag-reschedule | M | captain hold | Calendar | UI e2e | Blocked |
| AUD-050 | S2 | P1 | Confirmed | Appointments | MOD-027 | FLOW-008 | time columns | Latent drag handler omits `time` column even if wired | E-F002 | Slot time stale after reschedule | Call update with date only | Partial payload | Send date+time | XS | AUD-049 | Calendar | Unit | Blocked |
| AUD-051 | S2 | P1 | Confirmed | Appointments | MOD-027 | FLOW-009 | BL-010 | Edit form status collapse can downgrade done/in-treatment → arrived | E-F003, A-F009 | Clears clinical completion on save | Edit done appt note and save | Mapper collapse + 3-state picker | Preserve unmapped states; captain status subset | M | captain `fe-appointment-status-subset` | Calendar | Status matrix | Blocked |
| AUD-052 | S2 | P1 | Confirmed | Appointments | MOD-009 | FLOW-008 | BL-009 | AP###### allocation race / no UNIQUE | E-F005 | Duplicate names under concurrency | Parallel creates | MAX+1 without lock | Sequence or UNIQUE + retry | M | — | Appointments | Concurrent test | Open |
| AUD-053 | S2 | P2 | Confirmed | Appointments | MOD-009 | FLOW-008 | product | No doctor/time overlap prevention | E-F006 | Double-booking | Two appts same doctor overlap | No policy enforcement | Captain appt-conflict-policy | M | captain hold | Calendar | Policy tests | Blocked |
| AUD-054 | S2 | P1 | Confirmed | Migrations | MOD-032 | — | LOB/docs | Dual migration dirs; prefix duplicates; supplemental not in default loop; 047 LOB missing while docs point to it | M-F003, M-F005, M-F006 | Wrong restore order; false LOB claims | ls both migration trees | Process drift | Single inventory; captain LOB pin | M | lob holds | Data | Migration graph doc | Open |
| AUD-055 | S2 | P1 | Confirmed | Imports | MOD-033 | FLOW-038 | safety | Unguarded legacy importers + hardcoded local DSNs | M-F009 | Accidental prod-shaped writes | Run import-*.js | Legacy scripts retained | Guard rails; archive; require --confirm | M | — | Data | Script inventory | Open |
| AUD-056 | S2 | P2 | Confirmed | LOB tests without runtime | MOD-037 | FLOW-041 | BL-022 | Cosmetic LOB import + unit tests exist without schema/runtime | M-F008 | False feature completeness | Run cosmeticLobImport tests alone | Partial land | Gate tests on schema presence or move to LOB pin | S | lob holds | Data | — | Open |

---

## S3 (condensed master — lane IDs in Evidence)

| ID | Sev | Pri | Conf | Category | Module | Flow | Finding | Evidence | Impact | RootCause | RecommendedFix | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AUD-057 | S3 | P2 | Confirmed | UX nav | MOD-024 | FLOW-030 | `/website` routed but omitted from nav | A-F003 | Hidden CMS | Nav omission | Add nav or retire route | FE | Open |
| AUD-058 | S3 | P2 | Confirmed | UX | MOD-024 | — | Parent nav groups always visible; empty flyouts | A-F004 | Dead-end UX | No group perm | Hide empty groups | FE | Open |
| AUD-059 | S3 | P2 | Confirmed | BEHAVIOR | MOD-027/028 | FLOW-010 | Customers list + DataTable collapse errors into empty | A-F005, A-F006, D-F014 | Failed fetch looks empty | No error channel | error/onRetry props | FE | Open |
| AUD-060 | S3 | P2 | Confirmed | Placeholder honesty | MOD-027 | FLOW-028/036 | Commission + Notifications fabricated KPIs | A-F007, A-F008, H-F005 | Misleading ops numbers | Placeholder pages | Captain placeholder-fake-metrics | FE/Product | Blocked |
| AUD-061 | S3 | P2 | Confirmed | Status subset | MOD-027 | FLOW-009 | FE appointment status picker 3 states only | A-F009, E coord | Cannot set BE states from UI | Product subset? | Captain fe-appointment-status-subset | FE | Blocked |
| AUD-062 | S3 | P2 | Confirmed | Mock coupling | MOD-028 | — | ReferralCodeInput empty mock; camera quick-add fake PII; SEO MOCK_PAGES | A-F011–013, J-F007 | Broken/hollow UX | Leftover mocks | Wire APIs or disable | FE | Open |
| AUD-063 | S3 | P2 | Confirmed | i18n | MOD-029 | many | Hard-coded EN despite 0 missing keys; Reports tabs EN | A-F014, A-F018, I-F006 | VI portal English chrome | Key audit only covers t() | Literal lint + migrate | FE | Open |
| AUD-064 | S3 | P2 | Confirmed | Auth session | MOD-006 | FLOW-003 | `/me` skips partners.active | B-F009 | Deactivated users up to 24h | me query weaker than login | Check active on /me | BE | Open |
| AUD-065 | S3 | P2 | Confirmed | IP ACL | MOD-007 | FLOW-005 | Fail-open on DB error / missing IP; IPv4 exact only | B-F010, C-F008, C-F007 | ACL weak under outage | Availability bias | Fail closed or cache last-known; CIDR support | BE | Open |
| AUD-066 | S3 | P1 | Confirmed | Static unauth | MOD-018 | FLOW-029 | `/uploads/feedback` static without auth | B-F011, J-F002 | Attachment disclosure if URL known | express.static public | Captain feedback-attachment-access | BE | Blocked |
| AUD-067 | S3 | P2 | Confirmed | Password policy | MOD-006 | FLOW-004 | Min length 6 only | B-F014, H-S004 | Weak passwords | Policy lax | Strengthen policy | BE | Open |
| AUD-068 | S3 | P2 | Confirmed | Telemetry | MOD-021 | FLOW-034 | Auth-only mgmt + public ingest spoof; dual POST diverge | C-F005, C-F009, J-F004 | Log injection; stack exposure | Trust client fields | Authz + schema harden | BE | Open |
| AUD-069 | S3 | P2 | Confirmed | Timezone | MOD-025 | FLOW-031 | Device-local TZ presented as system setting | C-F006 | Divergent “today” | localStorage only | Clinic-level preference | FE | Open |
| AUD-070 | S3 | P2 | Confirmed | Partners data | MOD-008 | FLOW-010/013 | List counts hardcoded 0; GetKPIs never 404; delete list stale; hard-delete omits face FK; dual view_all strings; PUT ref rewrite; email oracle | D-F006–D-F013 | UX/data integrity | Multiple partial migrations | Patch set per sub-item | BE/FE | Open |
| AUD-071 | S3 | P2 | Confirmed | Appointments | MOD-009 | FLOW-006/008 | Create default confirmed vs FE scheduled; search omits phone; Zod partial; date dual mapping; overview limit 200; map owns missing page | E-F004, E-F008–E-F012 | Aggregates split; truncation | Defaults/docs drift | Captain default state; align search; paginate | BE/FE | Blocked |
| AUD-072 | S3 | P2 | Confirmed | Money edges | MOD-010/011 | FLOW-017–020 | Mixed breakdown FE-only; physical DELETE; Zod non-positive alloc; SO soft-delete money orphan; legacy accountPayments dual-read; plans non-tx; earnings absent | F-F013–F-F018, F-F015, F-F021–022 | Auditability / residual | Incomplete money platform | Captain payment-physical-delete; expand validation | Money | Blocked |
| AUD-073 | S3 | P2 | Confirmed | Catalog UX | MOD-012/027 | FLOW-022 | Naming collision services; dual editors limit 200; dead category filter; no product validate on SO; price model incomplete; supplies tabs chrome; authority drift | G-F006–G-F014 | Operator confusion | Product debt | Captain catalog-editor-surfaces; clean maps | Catalog | Blocked |
| AUD-074 | S3 | P2 | Confirmed | HR/commission | MOD-013/022 | FLOW-023/028 | Wage on list; soft-delete active only; employees.add unused; doctor-assistant flags; calc/engine absent; map name drift | H-F006–H-F013 | PII breadth; role drift | Legacy SMI | Least-privilege columns; docs | HR | Open |
| AUD-075 | S3 | P2 | Confirmed | Reports | MOD-015 | FLOW-026 | Legacy GetSumary mounted divergent; dead overview hooks; product-map missing by-source; FE export no AbortSignal; category preamble unscoped | I-F007–I-F012 | Dead surface / drift | Legacy retention | Captain legacy-dashboard-reports-getsumary | Reports | Blocked |
| AUD-076 | S3 | P2 | Confirmed | Feedback/CMS | MOD-018 | FLOW-029/030 | Lark PII preview; Website services empty; DELETE always success; multer cwd; unwired PageEditor; FE gate stricter | J-F005–J-F014 | Hollow CMS / ops noise | Incomplete CMS | Wire or hide; path unify | FE/BE | Open |
| AUD-077 | S3 | P2 | Confirmed | Integrations config | MOD-019/020 | FLOW-032/033 | Prod defaults; weak CompreFace DB default; permission string drift create vs upload; no investor tests | K-F006–K-F008 | Misconfig / test gap | Compose convenience | Profiles; tests | Integrations | Open |
| AUD-078 | S3 | P2 | Confirmed | Platform docs | MOD-023/034 | — | Dead routes retained; unknowns stale mounted; PUBLIC_PATHS footgun; validate drops Zod data; session.js broken; GAPS stale; husky no api gate | L-F003, L-F005–L-F011 | Agent footguns | Doc lag | Captain dead-route-retention; refresh docs | Platform | Blocked |
| AUD-079 | S3 | P2 | Confirmed | LOB map | MOD-031 | — | Registry LOB keys; LOB commits local diverge; users-table residual in yaml | M-F010–M-F012 | Agent confusion | Multi-branch history | Captain lob-round2-pin | Architecture | Blocked |

---

## S4 (hygiene — index)

| ID | Sev | Pri | Conf | Finding | Evidence | Status |
|---|---|---|---|---|---|---|
| AUD-080 | S4 | P3 | Confirmed | QuickActionsBar unused; MODULE_REGISTRY stale | A-F010 | Open |
| AUD-081 | S4 | P3 | Confirmed | Layout title fallback Dashboard; nested catch-all only | A-F015, A-F017 | Open |
| AUD-082 | S4 | P3 | Confirmed | PUBLIC_PATHS Account casings; no server logout/revocation | B-F012, B-F013 | Open |
| AUD-083 | S4 | P3 | Confirmed | Config stub null; bank err.message leak; Places param encoding; prefs DELETE always success; sources type weak | C-F013–C-F017 | Open |
| AUD-084 | S4 | P3 | Confirmed | Domain yaml owns path drift Customers | D-F015 | Open |
| AUD-085 | S4 | P3 | Confirmed | dependency-cruiser unwired; deploy preflight not in GHA | L-F010, L-F012 | Open |
| AUD-086 | S4 | P3 | Confirmed | Schedule/linked-employees FE empty shells | H-F011 | Open |

---

## Dedup map (lane → AUD)

| Lane IDs | AUD |
|---|---|
| M-F004 | AUD-001 |
| B-F001, I-F001, I-F011 | AUD-002 |
| B-F002(a), D-F001 | AUD-003 |
| B-F002(b), K-F001 | AUD-004 |
| B-F002(c)(d), K-F004 | AUD-005 |
| F-F001..004 | AUD-006..009 |
| G-F001 | AUD-010 |
| H-F001 | AUD-011 |
| H-F002 | AUD-012 |
| I-F004 | AUD-013 |
| K-F002 | AUD-014 |
| M-F001, M-F003, CX-001 | AUD-015 |
| A-F007, H-F005 | AUD-060 |
| A-F005/006, D-F014 | AUD-059 |
| A-F013, J-F007 | AUD-062 |
| A-F018, I-F006 | AUD-063 |
| B-F007, J-F001 | AUD-036 |
| B-F011, J-F002 | AUD-066 |
| B-F010, C-F008 | AUD-065 |
| L-F004, G-F012 | AUD-042 |
| A-F002, M-F002 | AUD-017 |
| B-F005 + D/E/F slices | AUD-018 |
| F-F015, MOD-038 | AUD-072 (earnings slice) |

---

## Spot-verification (this package, worktree `22d691535`)

| # | AUD | Path checked | Result |
|---|---|---|---|
| 1 | AUD-002 | `api/src/services/reports/canonicalRevenue.js` allowlist branch | **Confirmed** — filter only if `allowedCustomerIds.length` |
| 2 | AUD-006 | `api/src/routes/payments/helpers.js` residual SELECT | **Confirmed** — no FOR UPDATE |
| 3 | AUD-009 | `api/src/routes/payments.js` PATCH allowedFields | **Confirmed** — status in PATCH fields |
| 4 | AUD-010 | `api/src/routes/products.js` imports + normalizeVietnamese calls | **Confirmed** — call without import |
| 5 | AUD-011 | `api/src/routes/employees/mutations.js` RETURNING * | **Confirmed** |
| 6 | AUD-001 | `api/migrations/008_data_migration_from_tdental_v3.sql` TRUNCATE | **Confirmed** |
| 7 | AUD-014 | `git ls-files hermes/hermes-map.yaml` + field names | **Confirmed** presence (values not recorded) |
| 8 | AUD-012 | `api/src/routes/hrPayslips.js` requirePermission | **Confirmed** absent |
| 9 | AUD-003 | `api/src/routes/partners/resolveHandler.js` | **Confirmed** no resolveInvestorScope |
| 10 | AUD-013 | nginx.conf / nginx.docker.conf timeouts | **Confirmed** absent |
| 11 | AUD-015 | LOB paths / 047 migrations | **Confirmed** missing |

---

## Counts (master after merge)

| Sev | Approx master rows |
|---|---|
| S0 | 1 |
| S1 | 14 |
| S2 | 41 |
| S3 | 23 condensed (+ sub-bullets) |
| S4 | 7 condensed |
| **Lane raw before merge** | ~145 lane-prefixed rows |

All master rows **Open** on baseline unless marked Blocked on captain decision. None marked Fixed on this SHA.
