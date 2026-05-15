# Research Summary — v2.0 Deploy Speed Refactor

**Synthesized from:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Date:** 2026-05-10
**Confidence:** MEDIUM-HIGH (ready for requirements definition)

---

## Executive Summary

**Goal:** Cut deployment cycle from 8–15 minutes to **under 3 minutes** via prebuilt Docker images, GHCR registry, and atomic VPS swap.

**Approach:**
1. GitHub Actions builds 3 images in parallel (api, web, face-service) with BuildKit cache mounts
2. Push to GHCR with semver + SHA + branch tags (no mutable `:latest` for production)
3. VPS pulls prebuilt images, swaps with healthcheck-gated validation
4. Auto-rollback on healthcheck failure (or manual gate — see open question 2)

**No breaking changes** to APIs, schemas, or features. Pure infra/DX work.

**Risk profile:** 14 pitfalls catalogued in PITFALLS.md, each with a phase-assigned prevention guard. Highest risks: GHCR auth, tag mutability, migration ordering — all preventable.

---

## Recommended Phase Split (8 phases, continuing from v1.1's Phase 4)

| # | Phase | Goal | Parallel-with | Blocks |
|---|-------|------|---------------|--------|
| 5 | Healthcheck & Version Endpoints | `/api/health`, `/api/version.json` | 6, 7, 8 | 10 |
| 6 | Graceful Shutdown | SIGTERM handlers in api + face-service | 5, 7, 8 | 10 |
| 7 | Dockerfile Multi-Stage Rewrites | api / web / face-service with BuildKit cache mounts | 5, 6, 8 | 9 |
| 8 | docker-compose.prod.yml + Dev Parity Override | Pull-from-GHCR compose + local dev override + smoke test script | 5, 6, 7 | 9, 10 |
| 9 | GitHub Actions CI → GHCR | Build & push workflow with cache + semver tags | — | 10 |
| 10 | VPS Atomic Deploy Script | `scripts/deploy.sh` with healthcheck-gated swap + rollback | 11 | 12 |
| 11 | Migration Sidecar (optional) | Explicit migration runner with `--profile migrations` | 10 | 12 |
| 12 | Docs + E2E Cycle Verification | DEPLOYMENT.md rewrite + end-to-end <3 min validation | — | — |

**Each phase is independently testable:**
- Phase 5: hit `/api/health` returns 200 with DB status
- Phase 6: send SIGTERM, assert clean exit within 30s
- Phase 7: `docker build` warm cache <30s, image size targets met
- Phase 8: `docker compose -f docker-compose.dev.yml up` boots full stack, smoke test passes
- Phase 9: push to a test branch → image appears in GHCR within 5 min
- Phase 10: `./scripts/deploy.sh` on a staging tag → healthcheck pass → rollback works
- Phase 11: bad migration triggers fail-stop, doesn't deploy app
- Phase 12: stopwatch a real fix-to-live cycle, must be <3 min

---

## Parallel Team Strategy (per user request)

**Wave 1 (Days 1–4) — 2 teams parallel:**
- **Team A (Backend):** Phase 5 (health/version endpoints) → Phase 6 (graceful shutdown)
- **Team B (Infra):** Phase 7 (Dockerfile rewrites) → Phase 8 (compose files + dev override)

**Wave 2 (Days 5–7) — 1 team:**
- **Team C (CI):** Phase 9 (GH Actions → GHCR push)

**Wave 3 (Days 8–10) — 2 teams parallel:**
- **Team A (Deploy):** Phase 10 (atomic swap script)
- **Team B (Migrations, optional):** Phase 11

**Wave 4 (Day 11–12) — 1 team:**
- **Team C (Wrap):** Phase 12 (docs + E2E timing validation)

**Total:** 12–14 days with 2–3 engineers in parallel, vs ~24 days sequential.

---

## Top 5 Stack Picks

| Choice | Version | Why |
|--------|---------|-----|
| `docker/build-push-action` | v6 | Official; BuildKit + GHA cache built-in |
| `docker/setup-buildx-action` | v3 | Enables `RUN --mount=type=cache` for npm/pip |
| BuildKit `gha` cache backend | (built-in) | Free, ~10GB, persists across runs |
| GHCR (`ghcr.io/niiiusburo/tgroup-*`) | v2 API | Free for private; uses `GITHUB_TOKEN` |
| Plain bash `deploy.sh` | — | No watchtower/k8s; single VPS doesn't need orchestration |

**Explicitly NOT picking:** Watchtower (no rollback), docker-rollout (needs 2x capacity), Kubernetes/Helm (overkill).

---

## Features by Tier

### TABLE STAKES (must ship in v2.0)

1. CI builds api + web + face-service images on push to main, pushes to GHCR
2. Dockerfiles use multi-stage + BuildKit cache mounts
3. Images tagged with semver (from `website/package.json`) + SHA
4. `docker-compose.prod.yml` references `image:` not `build:`
5. Atomic deploy: `./scripts/deploy.sh` pulls + healthcheck-gates swap
6. `/api/health` endpoint reports DB connectivity
7. `/api/version.json` endpoint reports SHA + version
8. Local prod-parity stack (`docker-compose.dev.yml` override)
9. Manual rollback to last-good tag in <30s
10. Updated DEPLOYMENT.md runbook

### DIFFERENTIATORS (nice if time permits, otherwise v2.1)

11. Auto-rollback on healthcheck failure (vs manual)
12. Slack/Discord deploy notifications
13. Migration sidecar with `--profile migrations`
14. Image SBOM generation
15. Multi-arch builds (linux/arm64 for future)

### OUT OF SCOPE (defer indefinitely)

- Kubernetes / Helm / ArgoCD
- Blue-green deploys (single VPS)
- Auto-scaling
- Staging environment on the same VPS
- SOPS / Doppler / Vault (env files in `/opt/tgroup` stay)
- Cosign image signing
- CI-triggered auto-deploy to prod (deploy stays human-initiated)

---

## Top 5 Critical Pitfalls (must become success criteria)

| # | Pitfall | Phase | Guard |
|---|---------|-------|-------|
| 1 | GHCR auth fails on VPS | 9, 10 | `echo $GHCR_TOKEN \| docker login ghcr.io` test in deploy.sh; rotate quarterly |
| 2 | `:latest` overwritten — rollback impossible | 9 | Always push semver `:v0.5.0` AND `:${SHA}`; deploy uses semver, never bare latest |
| 3 | `contracts/` workspace not resolvable in Docker build | 7 | COPY contracts/ BEFORE `npm ci`; verify with `docker build -f Dockerfile.api .` from repo root |
| 4 | DB migration breaks rollback | 10, 11 | Migrations must be backward-compatible (one release behind); run BEFORE swap |
| 5 | `docker compose up -d` recreates dependent services → 3–5s downtime | 10 | Use `--no-deps api web`; nginx healthcheck-gated upstream |

(Full 14-pitfall catalog in PITFALLS.md.)

---

## Architecture Integration Points

**Files created (new):**
- `.github/workflows/build-and-push-ghcr.yml` (Phase 9)
- `docker-compose.prod.yml` (Phase 8)
- `docker-compose.dev.yml` (Phase 8)
- `scripts/deploy.sh` (Phase 10) — replaces partial existing scripts
- `scripts/local-prod-mirror.sh` (Phase 8)
- `api/src/routes/health.js` (Phase 5)
- `api/src/routes/version.js` (Phase 5)
- `migrations/Dockerfile` + sidecar entry (Phase 11, optional)

**Files modified:**
- `Dockerfile.api`, `Dockerfile.web`, `face-service/Dockerfile` (Phase 7)
- `docker-compose.yml` — refactor to template, or keep as dev-source-build version (Phase 8)
- `api/src/server.js` — wire health/version routes + SIGTERM (Phase 5, 6)
- `face-service/main.py` — SIGTERM handler (Phase 6)
- `docs/runbooks/DEPLOYMENT.md` (Phase 12)
- `docs/runbooks/INFRASTRUCTURE.md` (Phase 12)

**Build order constraint:**
- Phase 5, 6, 7, 8 are mutually independent → fully parallelizable
- Phase 9 needs Phase 7 (Dockerfiles) + Phase 8 (compose) merged
- Phase 10 needs Phase 9 (images in GHCR) + Phase 5/6 (health endpoints + graceful shutdown)
- Phase 11 is fully independent of Phase 10 (sidecar runs separately)
- Phase 12 needs everything else

---

## Unresolved Questions for User

These three need user decision before requirements are finalized:

1. **Auto-rollback vs manual gate** on healthcheck failure?
   - Auto: deploy.sh auto-reverts on fail. Faster recovery (~30s) but risk of flapping.
   - Manual: deploy.sh stops, prints rollback command. Safer but slower (~5 min triage).

2. **Mandatory vs optional migration sidecar**?
   - Mandatory: Phase 11 ships in v2.0; deploy.sh always runs migrations first.
   - Optional: Phase 11 deferred; v2.0 keeps current "manual `docker exec` migration" pattern.

3. **GHCR private vs public**?
   - Private (recommended): requires PAT on VPS (one-time setup), keeps clinic code closed.
   - Public: simpler auth, but exposes Docker images publicly (source code stays private but image layers are public).

---

## Confidence Levels

| Area | Confidence | Why |
|------|-----------|-----|
| Stack | HIGH | All 2026-current; widely used patterns |
| Features | HIGH | Clear MVP vs deferred; endpoints partly implemented |
| Architecture | HIGH | Phase ordering clear; no circular deps |
| Pitfalls | MEDIUM-HIGH | 14 specific guards; some need empirical validation (face-service slow boot) |
| Effort | MEDIUM | 12–14 days assumes no VPS surprises |

**Overall: ready for requirements definition.**
