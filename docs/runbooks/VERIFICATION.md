# VERIFICATION.md

> **Cosmetic LOB v2:** New verification gates (dental regression 100%, LOB isolation, CTV aggregation, rollback dry-run, real-browser toggle + CTV + earnings attribution + screenshots) listed in v2 design § Pre-deploy verification gates + PLAN Phase 0-4 checklists + governance-delta.md. All runs local-first on 127.0.0.1. Playwright + real browser required after every UI change. testbright.md + artifacts/cosmetic/ for evidence.

> Verification gates for TGClinic changes.

## Before Running Commands

Dependencies are local artifacts and may not be installed after cleanup. Install per package as needed:

```bash
npm --prefix website install
npm --prefix api install
npm --prefix contracts install
```

## Docs-Only Changes

```bash
git diff --check
npm run verify:prompt
npm run verify:governance
bash scripts/verify-docs.sh
test -f testbright.md
rg -n "/website.*routes to ServiceCatalog|/website.*renders.*ServiceCatalog|/api/version/event|NOT IMPLEMENTED" product-map docs/runbooks docs/superpowers/reviews --glob '!docs/runbooks/VERIFICATION.md'
rg -n "TV2codex|Tradeverse|TVNUKE|CopyRelation|AtlasGo|USDT" AGENTS.md ARCHITECTURE.md DESIGN.md BEHAVIOR.md DECISIONS.md COORDINATION_REQUESTS.md IDEA.md docs/runbooks --glob '!docs/runbooks/VERIFICATION.md'
! rg -n -e "<claude-mem-context>" -e "</claude-mem-context>" AGENTS.md ARCHITECTURE.md DESIGN.md BEHAVIOR.md DECISIONS.md docs product-map --glob '!docs/runbooks/VERIFICATION.md'
```

Expected: no whitespace errors; prompt-level authority, doc/changelog/TestSprite enforcement, pre-commit, and PR gates pass; no stale product-map contracts for current routes; no leaked Tradeverse product rules or generated memory blocks in TGClinic authority docs.

## Frontend Changes

```bash
npm --prefix website run lint
npm --prefix website test
npm --prefix website run build
```

For UI changes, add browser verification or Playwright coverage for the affected page.
Update root `testbright.md` with the changed URLs/API routes, roles, data flows, happy paths, edge cases, regressions, and setup/login state for TestSprite.

## API Changes

```bash
npm --prefix api test
```

For route changes, add or update Supertest/Jest coverage where practical.
Update root `testbright.md` with the changed API routes, affected data flows, roles, happy paths, edge cases, regressions, and setup/login state for TestSprite.

Export route changes should also run or update:

```bash
npm --prefix website run test:e2e -- e2e/export-downloads.spec.ts
```

## Contracts Changes

```bash
npm --prefix contracts run build
```

Then run affected frontend/API tests.
Update root `testbright.md` when the contract change affects a feature or backend data flow.

## Deployment/Infra Changes

```bash
bash -n scripts/deploy-tbot.sh
docker compose config
```

Run local Docker smoke before VPS deployment when the change affects containers, nginx, env vars, or migrations.

## Production Verification

Production verification must name:

- Exact URL checked.
- Expected version.
- Auth state used.
- API endpoint or UI flow checked.
- Any data/customer ref used for proof.
