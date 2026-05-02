# VERIFICATION.md

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
rg -n "TV2codex|Tradeverse|TVNUKE|CopyRelation|AtlasGo|USDT" AGENTS.md ARCHITECTURE.md DESIGN.md BEHAVIOR.md DECISIONS.md COORDINATION_REQUESTS.md IDEA.md docs/runbooks --glob '!docs/runbooks/VERIFICATION.md'
```

Expected: no whitespace errors; no leaked Tradeverse product rules in TGClinic authority docs.

## Frontend Changes

```bash
npm --prefix website run lint
npm --prefix website test
npm --prefix website run build
```

For UI changes, add browser verification or Playwright coverage for the affected page.

## API Changes

```bash
npm --prefix api test
```

For route changes, add or update Supertest/Jest coverage where practical.

## Contracts Changes

```bash
npm --prefix contracts run build
```

Then run affected frontend/API tests.

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
