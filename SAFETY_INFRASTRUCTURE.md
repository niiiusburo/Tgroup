# SAFETY_INFRASTRUCTURE.md

> Proposed additions to bring the codebase to a "4-pillar" governance target state.
> Audit date: 2026-04-18

---

## 1. Dependency-Cruiser Config (Module Boundary Enforcement)

**Status:** Missing entirely. No `.dependency-cruiser.js` or `dependency-cruiser` in any `package.json`.

**Why needed:** The `product-map/contracts/dependency-rules.yaml` documents intended boundaries (e.g., `website/src/components/shared/` should not import from `website/src/pages/`), but nothing enforces them. Circular imports and layer violations are currently possible.

**Proposed config highlights:**

```js
// .dependency-cruiser.js (root)
module.exports = {
  forbidden: [
    // Shared components must not depend on pages or domain components
    {
      name: 'shared-no-pages',
      severity: 'error',
      from: { path: '^website/src/components/shared/' },
      to: { path: '^website/src/pages/' }
    },
    {
      name: 'shared-no-domain',
      severity: 'error',
      from: { path: '^website/src/components/shared/' },
      to: { path: '^website/src/components/(customer|payment|appointments|employees|services|reports)/' }
    },
    // Hooks must not depend on pages
    {
      name: 'hooks-no-pages',
      severity: 'error',
      from: { path: '^website/src/hooks/' },
      to: { path: '^website/src/pages/' }
    },
    // API clients must not depend on components
    {
      name: 'api-no-ui',
      severity: 'error',
      from: { path: '^website/src/lib/api/' },
      to: { path: '^website/src/components/' }
    },
    // Contexts must not depend on pages
    {
      name: 'contexts-no-pages',
      severity: 'error',
      from: { path: '^website/src/contexts/' },
      to: { path: '^website/src/pages/' }
    },
    // Backend routes must not import each other (only shared db.js and middleware)
    {
      name: 'routes-no-cross-import',
      severity: 'warn',
      from: { path: '^api/src/routes/' },
      to: { path: '^api/src/routes/' }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'website/tsconfig.json' },
    enhancedResolveOptions: { exportsFields: ['exports'] }
  }
};
```

**Installation:**
```bash
cd website && npm install --save-dev dependency-cruiser
cd ../api && npm install --save-dev dependency-cruiser
npx depcruise --init
```

**CI integration:** Add a `dependency-cruise` step to both frontend and backend CI jobs. Fail on `severity: 'error'`.

---

## 2. Worktree / Branch Safety Protocol for Parallel Agents

**Status:** No protocol exists. Multiple agents can dispatch into the same worktree or branch with no guardrails.

**Proposed protocol:**

### A. Lock File Convention
Before an agent begins work, it MUST create a `.agent-lock` file in the worktree root:

```yaml
# .agent-lock
agent_id: AGENT_1
dispatched_at: 2026-04-18T14:30:00Z
task: "Fix payment allocation bug"
affected_domains:
  - payments-deposits
  - customers-partners
branch: ai-develop
worktree: /Users/thuanle/Documents/TamTMV/Tgroup/.worktrees/core-pillars-infra
```

If `.agent-lock` already exists, the agent MUST read it and:
- If the affected domains overlap, the agent MUST NOT start and MUST report a conflict.
- If the domains are disjoint, the agent MAY append its entry and proceed.

### B. Branch Naming for Feature Work
Instead of all agents pushing to `ai-develop`, use ephemeral branches:

```
ai-develop
  ├── ai-develop-feat/payment-fix-001
  ├── ai-develop-feat/customer-crud-002
  └── ai-develop-feat/appointment-ui-003
```

Each agent checks out a new branch from `ai-develop`, works in the **same worktree** (or a dedicated worktree per branch), and opens a PR back to `ai-develop`.

### C. Merge Gate
No agent may merge its own branch. An orchestrator or human MUST:
1. Verify `ci.yml` passes on the branch.
2. Verify `product-map/` artifacts are updated if schema/API/permission changes occurred.
3. Run `bash -n scripts/deploy-tbot.sh` if deployment files changed.
4. Fast-forward merge to `ai-develop`.

### D. Shared Session Memory Sync
After any agent finishes, it MUST run:
```bash
bash scripts/sync-claude-mem.sh
```
This ensures `.claude/memory.md` is current before the next agent reads it.

---

## 3. CI Gate Checklist (Expanded)

**Current state:** `ci.yml` has frontend lint, typecheck, build, and E2E. `pr-checks.yml` has PR title, branch name, file size, secrets scan, and version bump check. Backend has ZERO gates.

**Proposed unified CI gate:**

| Gate | Current | Proposed | Owner |
|------|---------|----------|-------|
| **Frontend Lint** | ✅ Exists (`eslint`) | Keep | `ci.yml` |
| **Frontend TypeCheck** | ✅ Exists (`tsc --noEmit`) | Keep | `ci.yml` |
| **Frontend Build** | ✅ Exists (`vite build`) | Keep | `ci.yml` |
| **Frontend Unit Tests** | ✅ Exists (`vitest run`) | Add to CI (currently missing) | `ci.yml` |
| **Frontend Depcheck** | ❌ Missing | Add `depcheck` or `npm audit --production` | `ci.yml` |
| **Frontend Dependency-Cruiser** | ❌ Missing | Add `depcruise --output-type err` | `ci.yml` |
| **Backend Lint** | ❌ Missing | Add `eslint` to `api/` (or `standard`/`semistandard`) | New job |
| **Backend Tests** | ❌ Missing | Add `jest` run to CI (only 1 test exists; need more) | New job |
| **Backend Depcheck** | ❌ Missing | Add `depcheck` to `api/` | New job |
| **E2E Tests** | ✅ Exists (`playwright`) | Remove `continue-on-error: true` so failures block merge | `ci.yml` |
| **Secrets Scan** | ⚠️ Basic grep | Upgrade to `trufflehog` or `git-secrets` | `pr-checks.yml` |
| **Version + CHANGELOG Bump** | ✅ Exists | Keep | `pr-checks.yml` + `.husky/pre-commit` |
| **Schema-Map Drift Check** | ❌ Missing | Add script: compare `api/migrations/` filenames against `schema-map.md` table names | New job |
| **Product-Map Domain Check** | ❌ Missing | Add script: verify domain YAML `owns` files still exist | New job |

**Recommended `ci.yml` structure:**
```yaml
jobs:
  frontend-lint-typecheck:
    # lint + tsc --noEmit
  frontend-unit-tests:
    needs: frontend-lint-typecheck
    # vitest run
  frontend-depcruise:
    needs: frontend-lint-typecheck
    # npx depcruise --output-type err website/src
  frontend-build:
    needs: [frontend-lint-typecheck, frontend-unit-tests]
  backend-lint:
    # eslint api/src/**/*.js
  backend-tests:
    # jest api/tests/
  backend-depcheck:
    # npx depcheck api/
  e2e-tests:
    needs: [frontend-build, backend-tests]
    # playwright test --reporter=list
    # REMOVE continue-on-error: true
```

---

## 4. Pre-Commit Hooks (Expanded)

**Current state:** `.husky/pre-commit` only checks version bump + CHANGELOG alignment. It does not run lint, typecheck, tests, or formatting.

**Proposed `.husky/pre-commit`:**

```sh
#!/usr/bin/env sh

# 1. Staged file check
STAGED_WEBSITE=$(git diff --cached --name-only | grep -E '^website/(src/|public/)' || true)
STAGED_API=$(git diff --cached --name-only | grep -E '^api/src/' || true)
STAGED_PRODUCT_MAP=$(git diff --cached --name-only | grep -E '^product-map/' || true)

# 2. Backend lint (fast)
if [ -n "$STAGED_API" ]; then
  echo "Running backend lint..."
  cd api && npm run lint || { echo "Backend lint failed"; exit 1; }
  cd ..
fi

# 3. Frontend lint (fast)
if [ -n "$STAGED_WEBSITE" ]; then
  echo "Running frontend lint..."
  cd website && npm run lint || { echo "Frontend lint failed"; exit 1; }
  cd ..
fi

# 4. Frontend typecheck (medium)
if [ -n "$STAGED_WEBSITE" ]; then
  echo "Running frontend typecheck..."
  cd website && npx tsc --noEmit || { echo "Typecheck failed"; exit 1; }
  cd ..
fi

# 5. Dependency-cruiser (medium)
if [ -n "$STAGED_WEBSITE" ]; then
  echo "Running dependency-cruiser..."
  cd website && npx depcruise --output-type err src/ || { echo "Dependency rules violated"; exit 1; }
  cd ..
fi

# 6. Version + CHANGELOG bump check (existing logic, keep)
if [ -n "$STAGED_WEBSITE" ]; then
  PKG_VERSION_MAIN=$(git show origin/main:website/package.json 2>/dev/null | grep '"version"' | head -1 | sed 's/.*: "\(.*\)",/\1/')
  PKG_VERSION_HEAD=$(grep '"version"' website/package.json | head -1 | sed 's/.*: "\(.*\)",/\1/')
  if [ "$PKG_VERSION_MAIN" = "$PKG_VERSION_HEAD" ]; then
    echo "Website files staged but version not bumped."
    exit 1
  fi
  CHANGELOG_TOP=$(node -e "console.log(JSON.parse(require('fs').readFileSync('website/public/CHANGELOG.json'))[0].version)")
  if [ "$CHANGELOG_TOP" != "$PKG_VERSION_HEAD" ]; then
    echo "CHANGELOG mismatch"
    exit 1
  fi
fi

# 7. Product-Map drift warning (lightweight)
if [ -n "$STAGED_PRODUCT_MAP" ]; then
  echo "Product-map changes detected. Ensure schema-map.md and domain YAMLs are consistent."
fi

echo "Pre-commit checks passed."
```

**Note:** Pre-commit should NOT run E2E tests (too slow) or full build (too slow). Those belong in CI only.

---

## 5. Zod / Runtime Validation (Backend & Frontend)

**Status:** Zod is NOT installed in `website/package.json` or `api/package.json`. The only `package.json` with Zod is `frontend-truth/app/package.json` (a separate blueprint artifact).

**Why needed:** The backend accepts raw Express `req.body` with zero validation. The frontend trusts API responses without runtime shape checks. Recent breakages (e.g., `password_hash` NOT NULL constraint) could have been caught earlier with runtime validation.

**Proposed rollout:**

### Phase 1: Backend request validation
Install `zod` in `api/` and add a thin validation middleware:

```js
// api/src/middleware/validate.js
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
  if (!result.success) return res.status(400).json({ errors: result.error.issues });
  next();
};
```

Start with the highest-risk routes: `partners.js`, `payments.js`, `appointments.js`.

### Phase 2: Frontend API response validation
Install `zod` in `website/` and wrap `apiFetch`:

```ts
// website/src/lib/api/core.ts
export async function apiFetch<T>(url: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
  const res = await fetch(...);
  const json = await res.json();
  return schema.parse(json); // throws on mismatch, caught by error boundary
}
```

Start with `ApiPartner`, `ApiPayment`, `ApiAppointment` schemas.

---

## 6. Summary Checklist

| Infrastructure Item | Priority | Effort | Current |
|---------------------|----------|--------|---------|
| Dependency-cruiser config | High | 1-2 days | ❌ Missing |
| Worktree/branch safety protocol | High | 1 day | ❌ Missing |
| Backend CI lint + tests | High | 2-3 days | ❌ Missing |
| `depcheck` in CI | Medium | 2 hours | ❌ Missing |
| Zod validation (backend requests) | High | 3-5 days | ❌ Missing |
| Zod validation (frontend responses) | Medium | 3-5 days | ❌ Missing |
| Expanded pre-commit hooks | Medium | 1 day | ⚠️ Partial |
| Schema-map drift CI check | Low | 4 hours | ❌ Missing |
| Product-map domain file-existence CI check | Low | 4 hours | ❌ Missing |
