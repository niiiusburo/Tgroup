# 05 — Test and Validation Matrix

**Baseline:** `22d691535` · Commands inventoried from package.json / workflows.<br>
**Note:** This audit package did **not** execute full suites as a pass/fail gate. Lane scouts ran targeted proofs only.

---

## 1. Root commands

| Command | Purpose | Needs DB/network? |
|---|---|---|
| `npm run verify:prompt` | authority file gate | no |
| `npm run verify:docs` | docs governance | git |
| `npm run verify:deploy-preflight` | deploy preflight | network to live version.json |
| `npm run verify:deploy-worktree-audit` | worktree risk audit | optional network |
| `npm run audit:deploy-worktrees` | multi-site worktree audit | optional network |
| `npm run verify:governance` | prompt+docs+diff | no |

---

## 2. Website

| Command | Purpose | Needs? |
|---|---|---|
| `npm --prefix website run dev` | Vite dev | no |
| `npm --prefix website run build` | version + tsc + vite | no |
| `npm --prefix website run build:prod` | prod build | no |
| `npm --prefix website run lint` | eslint | no |
| `npm --prefix website exec -- tsc --noEmit` | typecheck (CI runs the equivalent from `website/`) | no |
| `npm --prefix website test` | vitest run | no |
| `npm --prefix website run test:e2e` | playwright via dev-e2e.sh | **local stack** |
| `npm --prefix website run test:e2e:module-audit` | module audit | local 5175+3002 |
| `npm --prefix website run test:e2e:module-audit:live` | live nk.2checkin.com | **prod network** |
| `npm --prefix website run dev:e2e` / `stop` / `status` | e2e stack | docker/local |

**Inventory (R1):** ~99 unit tests under `website/src/**/*.test.*`; ~77 e2e specs under `website/e2e/*.spec.ts`.

---

## 3. API

| Command | Purpose | Needs? |
|---|---|---|
| `npm --prefix api start` | server | **DB + env** |
| `npm --prefix api test` | jest `tests` + `src` | many unit; some DB/env |
| `npm --prefix api test -- --runInBand` | serial jest | same |

**Inventory (R1):** ~77 `*.test.js` under api.

**PR subset only** (pr-checks.yml): customer-source + dbTransaction guards — not full suite.

---

## 4. Contracts

| Command | Purpose | Needs? |
|---|---|---|
| `npm --prefix contracts run build` | tsc → dist | no |
| `npm --prefix contracts run watch` | tsc watch | no |

**No test script** in contracts/package.json.

---

## 5. CI workflows

| Workflow | What runs | Blocking? |
|---|---|---|
| `ci.yml` | FE lint (continue-on-error), FE tsc, FE build, Playwright e2e (continue-on-error), code-review | Partial |
| `pr-checks.yml` | verify-docs, memory leak grep, **subset** api jest, subset website vitest, PR title/branch, secret grep | Partial |
| `ai-code-review.yml` | review comment template | n/a |
| `release-tag.yml` | release tagging | n/a |

**Gap:** full api jest not default-blocking; FE e2e `continue-on-error: true` in ci.yml (L-F002).

---

## 6. Coverage by domain (qualitative)

| Domain | Unit strength | E2E / integration | Known false signals |
|---|---|---|---|
| Auth / investor scope | Medium–High (many investor* tests) | Partial | canonicalRevenue test **encodes** fail-open |
| Partners / sources | High on source guards | Partial | resolve IDOR untested |
| Appointments | Medium | calendar accent e2e | drag not tested live |
| Payments | Medium (tx tests) | sparse | allocation matrix holes untested |
| Products catalog | **None** for POST/PUT | — | missing import would fail any real create test |
| Employees / payslips | Low–Medium | — | RETURNING * leak untested |
| Reports / exports | Medium | export e2e subset | I-F001 locked by unit test |
| Face / external | Medium unit | — | **no investor IDOR tests** |
| Feedback / CMS | Medium | — | attachment static unauth |
| LOB | import script tests only | — | no runtime to test |
| Enterprise verification | present | — | **false green** services.ts path (L-F004) |

---

## 7. Suggested verification bundles (real commands only)

```bash
# Governance
npm run verify:governance

# FE static
npm --prefix website ci
npm --prefix website run lint
npm --prefix website exec -- tsc --noEmit
npm --prefix website test
npm --prefix website run build

# API unit
npm --prefix api ci
npm --prefix api test -- --runInBand

# Contracts
npm --prefix contracts ci
npm --prefix contracts run build

# E2E (needs stack)
npm --prefix website run dev:e2e
npm --prefix website run test:e2e
```

---

## 8. Validation mapping for top findings

| AUD theme | Minimum validation after fix |
|---|---|
| Investor fail-closed revenue | Invert canonicalRevenue empty-allowlist test; investor fixture dashboard/doctors/locations |
| Resolve/face IDOR | investor with empty + non-empty allowlist; negative cases |
| Payment allocation matrix | concurrent pay; multi-line same invoice; sum≤amount; PATCH voided rejected or reversed |
| products normalizeVietnamese | POST/PUT Products integration |
| password_hash leak | assert response keys exclude hash |
| HrPayslips authz | investor JWT → 403 |
| nginx timeouts | config assert + large export soak |
| Hermes secrets | `git ls-files` clean of credential values; env-only |
| Migration 008 | runbook forbids blind glob; CI/docs guard |
| LOB docs | authority text matches pin or marked planned |

---

## 9. Not run / blocked in this package

- Full api/website test suites as green proof
- Live DB schema introspection
- Production/VPS access
- Playwright against prod
- LOB-bearing commit checkout
