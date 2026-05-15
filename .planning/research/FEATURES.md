# Feature Landscape: Deploy Speed Refactor v2.0

**Domain:** Docker-based CI/CD pipeline for fast production deployment  
**Researched:** 2026-05-10  
**Confidence Level:** HIGH (existing scripts + modern docs)

---

## Executive Summary

The TG Clinic deployment pipeline currently requires 8–15 minutes from code fix to live (manual ssh + git pull + docker compose build). v2.0 will cut this to **under 3 minutes** by adopting:

1. **Prebuilt images** pushed to GHCR on every commit (eliminates VPS build time)
2. **Atomic image swap** with healthcheck validation (recreate vs rolling — tested locally first)
3. **Prod-parity local dev stack** (docker-compose.dev.yml with volumes + hot reload)
4. **Versioning scheme** tying images to commits + semver (SHA + branch + v.X.Y.Z tags)
5. **Observability hooks** (deploy notifications, version display, audit logging)

**Current state:**
- ✓ `build-and-push.sh` and `deploy-vps.sh` scripts exist (2026-05-10)
- ✓ `docker-compose.prod.yml` pulls from registry (not building on VPS)
- ✓ CI runs lint/typecheck/build/E2E but does NOT push images to GHCR
- ✓ Local dev still uses `docker-compose.yml` (builds on dev machine)
- ⚠️ No healthcheck-gated rollback; no zero-downtime rolling strategy
- ⚠️ No pre-deploy migration container; migrations run manually post-deploy
- ⚠️ Secrets still managed as plain .env files in /opt/tgroup (VPS)

---

## Table Stakes (v2.0 Must-Have)

These features block a fast deploy pipeline from existing. Without them, the pipeline is incomplete.

### 1. CI Image Build & Push to GHCR

**Feature:** GitHub Actions workflow that builds api, web, and face-service images on every push to main, tags with semantic version + git SHA, and pushes to ghcr.io/niiiusburo/Tgroup.

**Expected behavior:**
- Trigger: every push to `main` branch (or every merge to main from PR)
- Build: `Dockerfile.api`, `Dockerfile.web`, `face-service/Dockerfile` using Docker buildx
- Tags generated: `v{semver}`, `sha-{7-char-commit}`, `latest` (on main only)
- Registry: GHCR (free, per-org, public or private)
- Build time: ~2–3 min with cache reuse (target: 70–90% cache hit on unchanged layers)
- Push: Both image and cache metadata

**Complexity:** M  
**Dependencies:** website/package.json versioning must be kept up-to-date (manual, not auto)  
**Rationale:** Shifts compile work from VPS to CI, eliminates 5–8 min of VPS docker build time.

### 2. Dockerfile Optimization with BuildKit Cache

**Feature:** Multi-stage Dockerfiles for api + web + face-service using Docker BuildKit with inline caching and layer-level optimization.

**Expected behavior:**
- Dockerfile.api: separates dependencies layer (contracts + api/package.json) from source code layer → caches dependency installs unless package-lock changes
- Dockerfile.web: multi-stage build (node build + nginx runtime) with `--build-arg VITE_API_URL` passed at image-build time, inline cache metadata for CI reuse
- face-service/Dockerfile: Python virtualenv layer cached separately from model download (if applicable)
- BuildKit enabled by default in GitHub Actions (no manual setup)
- Cache mount for pip/npm caches if applicable (optional, nice-to-have)

**Complexity:** M  
**Dependencies:** Requires reordering Dockerfile instructions (no breaking changes to runtime)  
**Rationale:** 70–90% faster CI builds by reusing unchanged dependency layers. Turns 3 min builds into 20–40 sec on cache hits.

### 3. Image Registry (GHCR) & Retention Policy

**Feature:** GitHub Container Registry (GHCR) namespace at ghcr.io/niiiusburo/Tgroup with retention/cleanup policy to prevent unbounded growth.

**Expected behavior:**
- Images tagged with semver + SHA
- Retention rule: keep last 30 versions of each image (api, web, face-service) + keep all tags from main branch + delete old patch versions
- VPS has read-pull access (via ~/.docker/config.json or VPS GitHub token)
- Images are public (no GHCR credential wall for nginx/Docker Compose pull)
- Bandwidth cost: free for public images, push-to-GH included

**Complexity:** S  
**Dependencies:** Create GitHub Personal Access Token for VPS docker login (gitignored in .agents/live-site.env pattern)  
**Rationale:** Central image repository, versioning, automatic cleanup, no Docker Hub account required.

### 4. docker-compose.prod.yml Refinement (Already Exists)

**Feature:** Production compose file that pulls prebuilt images from GHCR instead of building. Extends existing docker-compose.prod.yml.

**Expected behavior:**
- Requires env vars: `DOCKER_REGISTRY`, `DOCKER_IMAGE_TAG`
- Services: api, web, face-service pull from `${DOCKER_REGISTRY}/tgroup-{service}:${DOCKER_IMAGE_TAG}`
- Database persists across redeploys (volumes)
- Healthchecks defined on api and face-service (required for gated swaps)
- Network-isolated services (inter-service DNS via Docker Compose networks)
- No build contexts — only image references

**Complexity:** S  
**Dependencies:** None (already partially implemented)  
**Rationale:** Stateless, predictable, rollback-safe. Image version is the single source of truth.

### 5. VPS Deploy Script with Healthcheck-Gated Swap

**Feature:** `scripts/deploy-vps.sh` enhanced to pull images, validate health, and swap containers atomically with automatic rollback on healthcheck fail.

**Expected behavior:**
- Input: `DOCKER_REGISTRY`, `DOCKER_IMAGE_TAG` env vars
- Steps:
  1. Pull images from GHCR
  2. Start new containers (via `docker compose up -d`)
  3. Wait 10–15 sec for startup
  4. Check healthchecks: GET /api/health (200 + valid JSON) and GET /health on face-service
  5. If all healthy: log success, exit 0
  6. If any fail: rollback (restore previous image tag), log failure, exit 1
- Dry-run flag (optional, nice-to-have): `--dry-run` shows what would be deployed without pulling/starting
- No manual confirmation (unattended, CI-ready)

**Complexity:** M  
**Dependencies:** Requires /api/health endpoint returning machine-readable status (should already exist)  
**Rationale:** Prevents broken deployments from going live. Automatic rollback saves 3–5 min of manual triage.

### 6. Database Migration Handling (Explicit, Manual)

**Feature:** Document and enforce pre-deploy migration execution pattern (migrations run before image swap, never auto-run by container startup).

**Expected behavior:**
- Migration files live in `api/src/db/migrations/*.sql` (idempotent, use `IF NOT EXISTS`)
- Pre-deploy checklist: verify unapplied migrations in `/opt/tgroup/api/src/db/migrations/`
- Run manually via: `docker exec -i tgroup-db psql -U postgres -d tdental_demo < migration.sql`
- No automatic migration in container startup (explicit beats implicit)
- Documented in `docs/runbooks/DEPLOYMENT.md` as a required pre-swap step

**Complexity:** S  
**Dependencies:** DBA review if schema changes are complex  
**Rationale:** Schemas live longer than code; explicit migrations prevent accidental breakage. Idempotent migrations allow safe reruns.

### 7. One-Command Local Prod-Parity Stack

**Feature:** `docker-compose.dev.yml` (or docker-compose.override.yml pattern) that mirrors production but with hot reload + local volume mounts for development.

**Expected behavior:**
- Spin up: `docker compose -f docker-compose.dev.yml up` (or just `docker compose up` if override pattern is used)
- Volumes mount local source:
  - `./api/src:/app/src` (read-write) for live reload
  - `./website/src:/app/src` (read-write) for Vite hot reload
  - `./contracts:/contracts` (read-only, shared)
- Environment: use `.env.local` or `.env.development` (gitignored)
- Services: api, web, db, compreface (same as prod)
- Healthchecks pass locally (same endpoints as VPS)
- File watching: Node auto-restart on source changes (via nodemon or similar)
- Vite: hot module reload (HMR) over port 5175

**Complexity:** M  
**Dependencies:** Requires `.env.local` setup guide in README  
**Rationale:** Developers test exact prod stack locally before shipping. Catches environment bugs early.

### 8. Version Display & Audit Trail

**Feature:** App displays deployed version in UI (dev-mode indicator + version tooltip). Changelog stored in `website/public/CHANGELOG.json`.

**Expected behavior:**
- Version injected at build time: `docker build --build-arg VITE_VERSION=0.31.30` → stored in .env or versionInfo.ts
- UI shows version in lower-right corner (small, de-emphasized on prod; prominent on dev)
- Click version → tooltip shows: version, commit SHA, deploy timestamp
- `website/public/CHANGELOG.json` is a versioned artifact updated on every semver bump (manual, not auto)
- Version check on app load: if deployed version ≠ localStorage version → prompt "New version available, refresh?" (already partly implemented)

**Complexity:** S  
**Dependencies:** None (frontend-only; connect to existing version system)  
**Rationale:** Quick visual proof of deploy success. Debugging aid for support ("what version are you on?").

---

## Differentiators (v2.0 Nice-to-Have)

These features accelerate deploy velocity further or enable advanced rollout strategies. Not blocking v2.0, but improve DX.

### 9. CI Multi-Architecture Image Builds (AMD64 + ARM64)

**Feature:** GitHub Actions uses `docker/build-push-action` with `docker buildx` to build multi-arch images (linux/amd64 and linux/arm64) for broader compatibility.

**Expected behavior:**
- Build matrix includes both architectures
- Push single manifest to GHCR that contains both variants
- VPS pulls native architecture (amd64)
- Enables future migration to ARM-based VPS or CI runners
- Build time: ~1 min extra per arch (parallelized, so not 2x slowdown)

**Complexity:** M  
**Dependencies:** None (docker/build-push-action is standard GA)  
**Rationale:** Future-proofs infrastructure. Useful if scaling to ARM cloud providers (Graviton, Apple Silicon CI runners).

**Status for v2.0:** DEFER to v2.1. Single-arch (amd64) is sufficient for current VPS.

### 10. Image Signing & SBOM (Software Bill of Materials)

**Feature:** Sign images with cosign and generate SBOM with syft for security scanning + attestation.

**Expected behavior:**
- GitHub Actions: after push, sign image with cosign (leverages GitHub's OIDC)
- Generate SBOM via syft: `syft docker:<image>` → attach as artifact
- Attestation stored in GHCR alongside image
- VPS can verify image signature before pull (optional, security-hardening feature)

**Complexity:** M  
**Dependencies:** requires cosign CLI, syft CLI  
**Rationale:** Security compliance. Proves images haven't been tampered with post-push. Nice-to-have for regulated environments.

**Status for v2.0:** DEFER to v2.1. Compliance requirement, not a speed blocker.

### 11. Rolling Update Strategy (Blue-Green or Canary)

**Feature:** Deploy new version alongside old, switch traffic after validation, or gradually roll out to canary.

**Expected behavior:**
- Blue-green: run two stacks (blue = current, green = new), switch nginx upstream after green is healthy
- Canary: route small % of traffic to new version, increase % gradually
- Implement via `docker-compose.prod.yml` with dual service definitions or separate named volumes
- Traffic switching via nginx upstream or load balancer rule change

**Complexity:** L  
**Dependencies:** Requires nginx upstream config or load balancer integration  
**Rationale:** True zero-downtime. If new code breaks, users on blue keep working while green is fixed.

**Status for v2.0:** DEFER to v2.1. Recreate strategy (existing) is sufficient. Rolling requires orchestration (Docker Swarm or light k8s).

### 12. Zero-Downtime Rolling Restart (docker-rollout)

**Feature:** Use [docker-rollout](https://github.com/Wowu/docker-rollout) to restart containers one-by-one without service interruption.

**Expected behavior:**
- Current: `docker compose up -d api` stops api, starts new api → ~5 sec downtime
- With rolling: `docker-rollout compose up -d api` → old container drains connections, new container starts, switch → <1 sec downtime
- Requires graceful shutdown handlers in Node/Python (SIGTERM → finish requests → exit)

**Complexity:** M  
**Dependencies:** Docker Compose >= 1.29, graceful shutdown in api + face-service  
**Rationale:** Imperceptible deploy to users. Useful for Compreface (doesn't have graceful shutdown, so skip rolling).

**Status for v2.0:** DEFER to v2.1 (requires testing graceful shutdown). Current healthcheck-gated swap is acceptable.

### 13. Automatic Rollback on Failed Healthcheck

**Feature:** Deploy script automatically reverts to previous image if healthcheck fails within 30 sec post-startup.

**Expected behavior:**
- Store previous image tag in `.last-stable-tag` file
- After healthcheck fails: `docker compose pull <previous-tag>`, `docker compose up -d`, verify health
- Log rollback with reason + previous-tag
- Alert (optional): send notification to Slack/email

**Complexity:** M  
**Dependencies:** None (extends existing deploy-vps.sh)  
**Rationale:** Recovery from broken deploys in <2 min without manual SSH.

**Status for v2.0:** PARTIALLY DONE. Current deploy-vps.sh exits 1 on healthcheck fail. Add rollback logic in Phase 2.

### 14. Secret Management with Doppler or SOPS

**Feature:** Centralized secret management replacing plain .env files in /opt/tgroup.

**Expected behavior - Doppler:**
- VPS runs `doppler run -- docker compose up -d` → secrets injected as env vars
- No secrets in docker-compose.yml or .env files
- Audit trail of who accessed/rotated secrets

**Expected behavior - SOPS:**
- Encrypted .env.encrypted.yaml in repo
- CI and VPS decrypt with sops before compose up
- Encryption key in CI secrets / VPS /opt/secrets/

**Complexity:** L (Doppler) / M (SOPS)  
**Dependencies:** Doppler account or SOPS key management  
**Rationale:** Eliminates plain-text secrets on VPS. Better for compliance/security.

**Status for v2.0:** DEFER to v2.1. Current .env in /opt/tgroup is acceptable for single-tenant demo clinic app.

### 15. Deploy Notification (Slack/Email)

**Feature:** GitHub Actions posts deploy status to Slack channel or sends email.

**Expected behavior:**
- On successful push-to-GHCR: notify #deployments "Built v0.31.30 (sha-abc1234)"
- On VPS deploy completion: notify "Deployed v0.31.30 to nk.2checkin.com"
- Include: version, commit message, deployer (if run manually), health status
- Implement via Slack webhook or similar

**Complexity:** S  
**Dependencies:** Slack workspace + webhook URL  
**Rationale:** Team visibility. Useful for multi-person teams to avoid double-deploys.

**Status for v2.0:** DEFER to v2.1 (nice-to-have visibility feature).

### 16. Sidecar or Init Container for Pre-Deploy Migrations (Advanced)

**Feature:** Spin up a migration sidecar container before swapping api image. Runs pending migrations, exits on success, blocks swap on failure.

**Expected behavior:**
- New service in docker-compose.prod.yml: `migrations` image = api image, but CMD = `["npm", "run", "migrate"]`
- Deploy script: `docker compose up migrations`, wait for exit code 0, then swap api
- If migrations fail: exit 1, don't swap api
- On success: migrations container stops, api container starts with fresh schema

**Complexity:** L  
**Dependencies:** Requires `npm run migrate` script in api/package.json  
**Rationale:** Guarantees schema is ready before code runs. Enables true zero-downtime with backward-compatible migrations.

**Status for v2.0:** DEFER to v2.1. Manual pre-deploy migration check is sufficient for now.

---

## Anti-Features (Deliberately NOT Building)

### What Not to Do in v2.0

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Kubernetes** | Single-node Docker Compose VPS is not Kubernetes-sized. K8s introduces complexity (etcd, kubelet, ingress) that v2.0 doesn't need. | Stay on Docker Compose for v2.0. If scale demands K8s later, reuse images (no rebuild needed). |
| **Auto-scaling on VPS** | Single VPS doesn't have spare capacity. Horizontal scaling requires load balancer + multiple VPS nodes. | Vertical scale (bigger VPS instance) if needed. For true HA, switch to cloud k8s in v3.0+. |
| **CI-Triggered VPS Deploy** | CI pushing to VPS via webhook is convenient but risky (CI compromise = auto-deploy); also VPS firewall may block inbound webhooks. | Deploy manually from laptop or scheduled cron on VPS pulling latest tag weekly (ops-driven, safer). |
| **Multiple Simultaneous Environments on One VPS** | "Staging + Prod on Same VPS" leads to cross-environment DB confusion and port contention. Current DEPLOYMENT.md forbids staging from sharing prod DB. | If staging needed, use separate VPS or local docker-compose. Prod stays pure. |
| **Encrypted Database Backups in Docker Volumes** | Docker named volumes are on the host filesystem; encryption at rest requires full-disk encryption (outside Docker). | For sensitive data, VPS full-disk encryption (LUKS, VeraCrypt) handles all volumes uniformly. |

---

## Feature Dependencies & Phasing

### Phase 1 (v2.0 MVP)

Must complete before Phase 2. No external blockers.

**Features:** 1, 2, 3, 4, 5, 6, 7, 8

**Output:**
- GitHub Actions workflow pushes images to GHCR
- Deploy script pulls and healthcheck-validates
- Local stack mirrors production
- Deployment docs updated
- Version display in UI

**Deployment time:** 8–15 min → **under 3 min**

### Phase 2 (v2.0+ Polish)

Can run in parallel with Phase 1 or immediately after. Refinements.

**Features:** 13 (auto-rollback), optional 9, 15

**Output:**
- Automatic rollback on healthcheck fail
- Optional: multi-arch images
- Optional: deploy notifications

### Phase 3 (v2.1+)

Deferred. Requires separate infrastructure decisions or testing.

**Features:** 10 (SBOM), 11 (blue-green), 12 (rolling), 14 (SOPS), 16 (migration sidecar)

---

## MVP Feature Map

**Minimum for v2.0** = Reduce deploy time from 8–15 min to under 3 min:

```
User commits code to main
  ↓
GitHub Actions (1 min):
  - Lint, typecheck, build, E2E
  - Multi-stage Docker build (cached, ~30 sec)
  - Push api, web, face-service to GHCR
  ↓
Manual trigger (or laptop): `bash scripts/deploy-vps.sh`
  ↓
VPS (2 min):
  - Pull images from GHCR
  - Check migrations (manual pre-step)
  - docker compose up -d (new images)
  - Wait 10s + healthcheck
  - If healthy: success, else: rollback
  ↓
Live at https://nk.2checkin.com
```

**Checklist for v2.0 completion:**
- [ ] Feature 1: GitHub Actions workflow building + pushing to GHCR (triggered on main)
- [ ] Feature 2: Dockerfiles optimized with BuildKit caching
- [ ] Feature 3: GHCR namespace created + retention policy set
- [ ] Feature 4: docker-compose.prod.yml verified (already exists, minor tweaks)
- [ ] Feature 5: deploy-vps.sh enhanced with healthcheck gating
- [ ] Feature 6: Migration checklist documented in DEPLOYMENT.md
- [ ] Feature 7: docker-compose.dev.yml or override pattern tested locally
- [ ] Feature 8: Version display updated + CHANGELOG.json documented

---

## Complexity & Effort Estimates

| Feature | Size | Effort (Days) | Owner | Blocker? |
|---------|------|---------------|-------|----------|
| 1. CI Build & Push | M | 1–2 | DevOps/Backend | YES |
| 2. BuildKit Caching | M | 0.5–1 | DevOps | YES |
| 3. GHCR Setup | S | 0.5 | DevOps | YES |
| 4. docker-compose.prod | S | 0.25 | DevOps | NO (exists) |
| 5. Deploy Script Enhanced | M | 1–1.5 | DevOps | YES |
| 6. Migration Docs | S | 0.5 | Backend/DevOps | YES |
| 7. Local Dev Stack | M | 1 | DevOps | YES |
| 8. Version Display | S | 0.5 | Frontend | YES |
| 9. Multi-Arch Builds | M | 0.5 | DevOps | NO (defer) |
| 10. Image Signing | M | 1 | DevOps | NO (defer) |
| 11. Blue-Green | L | 2–3 | DevOps | NO (defer) |
| 12. Rolling Updates | M | 1.5 | DevOps | NO (defer) |
| 13. Auto-Rollback | M | 1 | DevOps | NO (phase 2) |
| 14. SOPS/Doppler | L | 1–2 | DevOps | NO (defer) |
| 15. Slack Notification | S | 0.5 | DevOps | NO (defer) |
| 16. Migration Sidecar | L | 1.5 | Backend | NO (defer) |

**Total v2.0 MVP:** 8–9 days (1–2 weeks with review/testing)

---

## Success Criteria

Deploy pipeline v2.0 is complete when:

1. ✅ Code push to main triggers GitHub Actions CI → builds + tests → pushes images to GHCR (all in <3 min)
2. ✅ `bash scripts/deploy-vps.sh` pulls images, validates health, logs success/failure (no manual docker CLI on VPS)
3. ✅ Local `docker compose up` mirrors production (same services, healthchecks, env structure)
4. ✅ Version displayed in UI; user can verify deploy succeeded
5. ✅ Broken deploys don't go live (healthcheck-gated, or manual rollback documented)
6. ✅ Migration checklist is explicit and documented
7. ✅ End-to-end test: push code fix, pull latest on VPS, see live in <3 min

---

## Risk & Mitigation

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| **GHCR auth fails on VPS** | Medium | Test docker login with VPS GitHub token in staging first. Store token in .agents/live-site.env (gitignored). |
| **Healthcheck endpoint slow to respond** | Low | Current /api/health should respond in <1 sec. Verify on load testing. |
| **Migrations cause downtime** | Medium | Enforce pre-deploy manual migration step in checklist. Add audit log of which migrations were run. |
| **Secrets leak into image** | Low | Use ARG for build-time injection, never COPY .env into image. Audit Dockerfiles. |
| **Rollback to broken previous image** | Low | Store `.last-stable-tag` only after health validates. Manual approval for edge cases. |
| **VPS disk fills with image layers** | Medium | GHCR retention + `docker image prune` weekly on VPS. Monitor `/var/lib/docker` disk usage. |

---

## Sources

- [Multi-stage Docker Builds — Docker Docs](https://docs.docker.com/build/building/multi-stage/)
- [Docker BuildKit Caching Strategies — Oneuptime](https://oneuptime.com/blog/post/2026-02-09-container-image-caching-ci/view)
- [GitHub Actions Docker Build & Push — Dev.to](https://dev.to/msrabon/automating-docker-image-versioning-build-push-and-scanning-using-github-actions-388n)
- [Manage Tags with docker/metadata-action — Docker Docs](https://docs.docker.com/build/ci/github-actions/manage-tags-labels/)
- [Docker Compose Production Deployment — BetterLink Blog](https://eastondev.com/blog/en/posts/dev/20260424-docker-compose-production/)
- [Docker Compose Override for Local Dev — Oneuptime](https://oneuptime.com/blog/post/2026-01-30-docker-compose-override-strategies/view)
- [Database Migrations Pre-Deploy — Oneuptime](https://oneuptime.com/blog/post/2026-02-09-database-migration-jobs-before-rollouts/view)
- [Hot Reload with Docker Compose — Medium](https://olshansky.medium.com/hot-reloading-with-local-docker-development-1ec5dbaa4a65)
- [Docker Secrets & Secret Management — GitGuardian](https://blog.gitguardian.com/how-to-handle-secrets-in-docker/)
- [docker-rollout — GitHub](https://github.com/Wowu/docker-rollout)
