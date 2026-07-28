# 02 — Business Logic Register

**Baseline:** `22d691535` · Sources: R1 BL seed + lanes A–M enforcement checks.

| ID | Rule statement | Source of truth | Confidence | Implementations | Tests | Gaps / contradictions |
|---|---|---|---|---|---|---|
| BL-001 | JWT required on `/api/*` except PUBLIC_PATHS | `server.js`, SECURITY.md | Confirmed | global `requireAuth` | health/login tests | PUBLIC_PATHS retains unmounted Account login casings |
| BL-002 | Effective perms = group ± overrides; `*` wildcard | `permissionService.js`, INV-008 | Confirmed | middleware + login/me | permissionService tests | registry/FE/BE string drift (AUD perm family) |
| BL-003 | Staff login via partners.employee + bcrypt; investor via investor_accounts | `auth.js` | Confirmed | auth.js | authInvestor*, authSharedEmail* | API_ROUTE_INDEX still says aspnetusers (stale) |
| BL-004 | Ambiguous multi-account same email+password refused | auth.js `resolveFromMatches` | Confirmed | auth.js | authSharedEmailLogin | — |
| BL-005 | Investor same-portal; customer allowlist fail-closed | INV-021, DEC-20260704-01 | Confirmed intent | many reads scoped | investor* tests | **Fail-open holes:** canonicalRevenue empty list; resolve/face/external/stock; writes seed-only |
| BL-006 | Location scope primarily FE (`LocationContext`); list APIs generally unscoped | INV-009 | High | LocationContext | partial | Direct API can bypass location filter |
| BL-007 | Partners SMI: customers+employees share `dbo.partners` | schema-map, INV-001 | Confirmed | partners + employees routes | partner tests | get/update Partners can touch employee rows (D-F005) |
| BL-008 | Customer source attribution stable; partner source read-only on normal writes | INV-023/025 | Confirmed | partners mutationHandlers, SO source | mutation + Q10 guards | Settings admin UI for sources not mounted (C-F001) |
| BL-009 | Appointment names `AP######` backend-generated | INV-002 | High | appointments mutationHandlers | appointments tests | No UNIQUE / race on MAX+1 (E-F005) |
| BL-010 | Appointment VALID_STATES wide set on BE | appointment-scheduling.md | High | appointments helpers | status tests | FE picker 3 states; edit can collapse done→arrived |
| BL-011 | Payment residual never negative; over-allocation rejected | INV-003/012 | Confirmed intent | payments helpers | paymentsTransaction tests | TOCTOU, multi-line, no sum≤amount, PATCH void shadow |
| BL-012 | Deposit classification heuristic | INV-004 | High | payments + customerBalance | partial | Create vs list vs balance formulas diverge |
| BL-013 | Canonical money = payments + payment_allocations | MONEY_FLOW.md | Confirmed | payments routes | legacy fallback tests | Monthly plan pay status-only; accountPayments still mounted read |
| BL-014 | Service catalog = `dbo.products`; `/api/Services` dead | services-catalog.yaml, server unmount | Confirmed | products.js; services.js unmounted | enterprise-verification (false-green path bug) | unknowns.md stale “still mounted” |
| BL-015 | Accent-insensitive search everywhere | INV-006, AGENTS §1.1 | High | FE `normalizeText`; BE `utils/search` | utils + search tests; calendar e2e | Edge UIs; customers/employees accent e2e missing |
| BL-016 | Exports use current filters; audit rows; investor scope | exportRegistry, BEHAVIOR | High | exports builders | export lock tests | Audit best-effort; nginx timeout missing |
| BL-017 | Face embeddings local SFace; CompreFace optional | INV-005/014 | High | face-service, faceMatchEngine | face* tests | Health 503 if face down; investor scope missing |
| BL-018 | Hosoonline images must be proxied | INV-013 | High | externalCheckups | externalCheckups.test.js | Image proxy unbound to investor allowlist |
| BL-019 | Deploy candidate must contain live gitCommit | INV-022, DEC-20260704-02 | Confirmed script | deploy-preflight.js | — | Not enforced in GHA |
| BL-020 | Website version bump on FE runtime changes | DEC-20260502-05, INV-020 | Confirmed | package.json 0.32.59 | husky | — |
| BL-021 | Legacy commission schemes agent/employee types | commission-rules.md | Medium | commissions.js read APIs | sparse | Auto-calc absent; FE fake KPIs |
| BL-022 | Cosmetic LOB dual-DB + requireLobScope + D13 earnings | LOB yamls, AGENTS | **Low on baseline** | **No runtime files** | cosmeticLobImport.test.js only | **Major doc/code contradiction** |
| BL-023 | CTV is_ctv redirect to /ctv; cross-DB commission | ctv.yaml | **Low here** | FE redirect only; no /ctv route; API no is_ctv | — | Dead-end if ever set |
| BL-024 | Feedback Lark notify optional | feedback-cms.yaml | Medium | larkNotifier.js | larkNotifier.test.js | needs env |
| BL-025 | IP access enforced before auth | server.js order | Confirmed | ipAccess middleware | e2e | Fail-open on DB error / missing IP |

---

## Notes

- **Confirmed on baseline** means enforcement observed in code for the dental single-DB portal.
- **BL-022/023** must not be treated as implemented until a LOB pin is chosen and re-audited.
- Money rules (BL-011–013) have **Confirmed intent** with **Confirmed holes** in the findings register.
