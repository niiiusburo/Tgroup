# Architecture: Prebuilt-Image Deploy Pipeline Integration

**Project:** TG Clinic v2.0 Deploy Speed Refactor
**Researched:** 2026-05-10
**Focus:** Integration points, build order, and phase boundaries for GHCR-based atomic deploys

---

## Executive Summary

The TG Clinic stack is a Docker Compose monorepo (api + web + face-service + optional compreface) with an image-based deployment path already partially scaffolded (`scripts/build-and-push.sh`, `scripts/deploy-vps.sh`, `docker-compose.prod.yml` referenced but missing).

The prebuilt-image pipeline is **achievable with minimal service boundary changes**. The main work lies in:

1. **CI workflow** — GitHub Actions to build & push images on merge to main
2. **Compose refactoring** — Separate prod-pull compose from dev-build compose
3. **Healthcheck endpoints** — Already exist (`/api/health`, `/health` in face-service), but need versioning & graceful shutdown
4. **Contracts build** — Integrate pre-built artifact into api image
5. **Migrations** — Move from VPS-manual to image-init-job or app-startup
6. **Nginx unification** — One config template with env substitution
7. **Registry secrets** — GHCR integration on VPS

**Build order dependency graph:**
- Contracts build (fast, independent)
- api image + web image + face-service image (parallel, 15–20 min total)
- Push to GHCR (sequential after builds)
- VPS pull & swap (5–10 min)

**Target cycle:** Commit → merged → GHCR push (5 min) → VPS swap (5 min) = **~10 min total** vs current 8–15 min.

---

## 1. Directory Structure for New Artifacts

### 1a. CI/CD Workflows
```
.github/workflows/
├── ci.yml                          [EXISTING] — Lint/typecheck/E2E
├── build-and-push-ghcr.yml         [NEW] — On main: build + GHCR push
├── pr-checks.yml                   [EXISTING]
└── release-tag.yml                 [EXISTING]
```

**New file:** `.github/workflows/build-and-push-ghcr.yml`
- Trigger: On push to `main` branch
- Jobs: build api, web, face-service in parallel (BuildKit cache mounts for speed)
- Push to GHCR as `ghcr.io/niiiusburo/tgroup-{api,web,face-service}:{sha}`, `:{version}`, `:latest`
- Also update `docker-compose.prod.yml` (commit-and-push after build OR generated at deploy time)

### 1b. Deploy & Compose Files
```
docker-compose.yml                 [KEEP] — Local dev, builds from source
docker-compose.prod.yml            [NEW] — VPS, pulls from GHCR
docker-compose.dev.yml             [NEW] — Local prod-parity, pulls GHCR
scripts/
├── build-and-push.sh              [KEEP] — Local builds (dev use only now)
├── deploy-vps.sh                  [ENHANCE] — Add healthcheck-gated swap + rollback
└── deploy.sh                       [NEW] — Local wrapper for docker-compose.prod.yml
```

**New files:**
- `docker-compose.prod.yml` — Images from GHCR, volumes from VPS, replaces on-VPS builds
- `docker-compose.dev.yml` — Images from GHCR, local volumes, ports, for testing prod flow locally
- `scripts/deploy.sh` — Wrapper that:
  - Validates env vars (DOCKER_REGISTRY, DOCKER_IMAGE_TAG)
  - Runs `docker-compose -f docker-compose.prod.yml pull`
  - Runs `docker-compose -f docker-compose.prod.yml up -d api web face-service`
  - Polls `/api/health` and `/health` with timeout
  - On failure, restores previous compose state

### 1c. Dockerfile Multi-Stage & BuildKit Improvements
```
Dockerfile.api                      [ENHANCE] — Multi-stage, BuildKit cache mounts
Dockerfile.web                      [ENHANCE] — Multi-stage, separate builder/runner
face-service/Dockerfile            [ENHANCE] — Cache model downloads, slim runtime
```

**Changes:**
- **Dockerfile.api:** Contracts pre-built step + cache mount for node_modules
- **Dockerfile.web:** Separate builder stage, output only dist/ to nginx-alpine runner
- **face-service:** Model downloads go into build stage only (avoid re-download on rebuild)

### 1d. Nginx & Config Management
```
nginx.conf                          [KEEP for VPS native SSL] — Production TLS termination
nginx.docker.conf                   [ENHANCE] — Add templating for env vars
nginx.template.conf                 [NEW optional] — Jinja/envsubst if full unification chosen
```

**Decision:** Keep two files (VPS has different SSL path, compreface upstream differs).

---

## 2. Service Boundary Changes

### 2a. API (`api/src/server.js`)

**Minimal changes for prebuilt pipeline:**

| Requirement | Change | File | Rationale |
|-------------|--------|------|-----------|
| Healthcheck endpoint | Already exists: `GET /api/health` | `api/src/routes/health.js` (or embedded in server.js) | Reported in deploy-vps.sh; add version + startup readiness |
| Graceful shutdown | Add signal handlers | `api/src/server.js` | SIGTERM → drain connections, allow 30s before exit |
| Version endpoint | `GET /api/version.json` → returns `{version, commit, buildTime}` | `api/src/routes/version.js` (new) | Mirrors frontend; read from env `BUILD_VERSION`, `BUILD_COMMIT` |
| Startup check | Health endpoint returns `{"ok":true,"database":bool,"faceService":bool}` | `api/src/routes/health.js` | Gated healthcheck: services not ready until DB + face-service are up |
| Secrets at startup | Validate required env vars (JWT_SECRET, DATABASE_URL, etc.) exist | `api/src/server.js` | Fail fast if missing, log to stdout |

**No schema changes, no new endpoints beyond version/health.**

### 2b. Website (`website/src/`)

**Minimal changes:**

| Requirement | Change | File | Rationale |
|-------------|--------|------|-----------|
| Version file in dist | `public/version.json` built at Vite build time | `website/scripts/generate-version.js` (enhance) | Already exists; include `buildTime`, `commit` from CI env |
| Graceful shutdown | Not applicable (static site) | N/A | nginx handles shutdown |

**Current state:** `website/scripts/generate-version.js` already generates version.json. Enhance it to include CI `GITHUB_SHA` and build timestamp.

### 2c. Face Service (`face-service/main.py`)

**Minimal changes:**

| Requirement | Change | File | Rationale |
|-------------|--------|------|-----------|
| Health endpoint | Already exists: `GET /health` | `face-service/main.py` | Add readiness check for model availability |
| Graceful shutdown | Add signal handler | `face-service/main.py` | Allow 10s for in-flight requests before exit |
| Version info | Optional: `GET /version` endpoint | `face-service/main.py` | For completeness; return model versions |

**Model downloads:** Currently in `face-service/Dockerfile` (build time). This is **correct for prebuilt images** — models are baked in, no runtime download, consistent across replicas.

---

## 3. Contracts Build Integration

**Current state:** `contracts/package.json` exists, version 1.0.0, builds to `dist/index.js + dist/index.d.ts`.

**Integration into api image:**

### Option A (Recommended): Pre-built artifact in CI
```dockerfile
# Dockerfile.api
FROM node:20-alpine AS build-contracts
WORKDIR /contracts
COPY contracts/package.json contracts/package-lock.json ./
RUN npm ci --omit=dev
COPY contracts/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build-contracts /contracts/dist /contracts/dist
COPY --from=build-contracts /contracts/package.json /contracts/
COPY api/package.json api/package-lock.json ./
RUN npm ci --production && npm link /contracts
COPY api/src ./src
EXPOSE 3002
CMD ["node", "src/server.js"]
```

**Pros:**
- Contracts built once per image
- No pre-built artifacts to manage in CI
- api layer remains independent

**Cons:**
- Slightly slower build (contracts compiles in every api image)

### Option B: GHCR artifact (overcomplicated for size)
Push `@tgroup/contracts@1.0.0` as a separate image, fetch from registry. **Not worth it** for a 50KB artifact.

**Recommendation:** Use Option A — contracts as multi-stage step in `Dockerfile.api`.

---

## 4. Nginx Configuration Strategy

### Current state
- **VPS**: `nginx.conf` — Has SSL cert paths (`/etc/letsencrypt/live/tbot.vn/...`), proxies `/api` to `http://api:3002`, configured for one domain
- **Docker**: `nginx.docker.conf` — No SSL, proxies to `http://api:3002`, simpler header set

### Integration approach: Unify with env substitution

**Decision: Keep two configs** (easier maintenance, different operational contexts).

**Both configs MUST stay aligned on these proxy directives:**
```nginx
proxy_read_timeout 300s;
proxy_send_timeout 300s;
send_timeout 300s;
client_max_body_size 25m;
```

**Enhancement:** Add environment templating to docker config to support optional Compreface upstream.

```nginx
# nginx.docker.conf (with envsubst)
location /api {
    client_max_body_size 25m;
    proxy_pass http://${API_UPSTREAM:-api:3002};  # or inject at container startup
    ...
}
```

**How:** In `docker-compose.prod.yml`, mount a script that `envsubst < nginx.docker.conf > /etc/nginx/conf.d/default.conf` at startup, OR inject at build time.

**Simplest:** Hardcode both configs, keep API_UPSTREAM as `http://api:3002` (always the Docker service name).

---

## 5. Database Migrations in Prebuilt Pipeline

**Current state:** Manual on VPS (`deploy-vps.sh` snippet in DEPLOYMENT.md runs migrations post-deploy).

### Migration Strategy: Init Container Job

**Option A (Recommended): Init sidecar in compose**
```yaml
# docker-compose.prod.yml
services:
  api-migrations:
    image: ghcr.io/niiiusburo/tgroup-api:${DOCKER_IMAGE_TAG}
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DATABASE_URL=...
      - RUN_MIGRATIONS=true
    command: bash -c "
      for f in src/db/migrations/*.sql; do
        echo \"Applying \$f...\";
        psql -U postgres -d tdental_demo < \"\$f\";
      done;
      node src/server.js
    "
    profiles: ["migrations"]
```

**Usage:**
```bash
# Run once per deploy
docker compose -f docker-compose.prod.yml --profile migrations run api-migrations

# Then start normally
docker compose -f docker-compose.prod.yml up -d api web
```

**Option B: Embedded in api startup**
If `RUN_MIGRATIONS=true` env var, run migrations on app startup (slow, blocks app readiness).

**Option C: Manual gate in deploy.sh**
```bash
# scripts/deploy.sh
if [[ "$RUN_MIGRATIONS" == "true" ]]; then
  docker compose -f docker-compose.prod.yml --profile migrations run api-migrations
fi
docker compose -f docker-compose.prod.yml up -d api web
```

**Recommendation:** Option C — migrations as optional, gated profile. Keeps app startup fast. Requires explicit `--profile migrations` or env var.

---

## 6. Image Tag Flow & Versioning

### Tag strategy

| Tag | When | Example | Used By |
|-----|------|---------|---------|
| `${SHA}` | Every commit to main | `ghcr.io/niiiusburo/tgroup-api:a1b2c3d` | CI for traceability; can pin for rollback |
| `v${VERSION}` | When website/package.json version changes | `v0.31.30` | Release channels; manual deploys |
| `latest` | After every successful build | Always points to newest main | Default for local dev pulls |

### Proposed CI workflow

```yaml
# .github/workflows/build-and-push-ghcr.yml
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract version
        id: version
        run: |
          VERSION=$(node -p "require('./website/package.json').version")
          echo "version=${VERSION}" >> $GITHUB_OUTPUT
          echo "sha_short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
      
      - name: Build and push API
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.api
          push: true
          tags: |
            ghcr.io/niiiusburo/tgroup-api:${{ github.sha }}
            ghcr.io/niiiusburo/tgroup-api:v${{ steps.version.outputs.version }}
            ghcr.io/niiiusburo/tgroup-api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Build and push Web
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.web
          push: true
          tags: |
            ghcr.io/niiiusburo/tgroup-web:${{ github.sha }}
            ghcr.io/niiiusburo/tgroup-web:v${{ steps.version.outputs.version }}
            ghcr.io/niiiusburo/tgroup-web:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Build and push Face Service
        uses: docker/build-push-action@v5
        with:
          context: ./face-service
          file: ./face-service/Dockerfile
          push: true
          tags: |
            ghcr.io/niiiusburo/tgroup-face-service:${{ github.sha }}
            ghcr.io/niiiusburo/tgroup-face-service:v${{ steps.version.outputs.version }}
            ghcr.io/niiiusburo/tgroup-face-service:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### VPS rollback strategy

**Record last-good tag in a file:**
```bash
# scripts/deploy.sh or post-deploy hook
echo "v${DOCKER_IMAGE_TAG}" > /opt/tgroup/.last-good-image

# To rollback:
LAST_GOOD=$(cat /opt/tgroup/.last-good-image)
DOCKER_IMAGE_TAG=$LAST_GOOD bash scripts/deploy-vps.sh
```

---

## 7. Build Order & Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 0: Contracts Build (within api Dockerfile)            │
│ Trigger: Every api build                                     │
│ Time: 20s (npm ci + tsc)                                     │
│ Output: /contracts/dist/                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Build API     │   │ Build Web     │   │ Build Face    │
│ Time: 5-8 min │   │ Time: 8-10m   │   │ Time: 12-15m  │
│ (parallel)    │   │ (parallel)    │   │ (parallel)    │
└───────────────┘   └───────────────┘   └───────────────┘
        ↓                     ↓                     ↓
        └─────────────────────┼─────────────────────┘
                              ↓
                   Push to GHCR (sequential)
                   Time: 3-5 min total
                   Output: 3 image refs
                              ↓
                   VPS Pull & Swap
                   Time: 5-10 min
                   Depends: GHCR images available
```

**Critical path:** Face-service build (~15 min) + Push (~2 min) + VPS swap (~5 min) = **~22 min from CI trigger to live**.

**Optimization opportunities:**
- BuildKit cache mounts for node_modules (api/web)
- Parallel GHCR pushes (use `docker buildx build --output` to push directly)
- Preemptive image pull on VPS during CI build (advanced)

---

## 8. Proposed Phase Structure (5–8 phases)

Each phase is independently mergeable and testable. **Bold = blocking for next phase.**

### Phase 5: Healthcheck & Version Endpoints (Weeks 1)
**Deliverables:**
- `api/src/routes/health.js` — enhanced with db + face-service checks
- `api/src/routes/version.js` — returns `{version, commit, buildTime}`
- `website/scripts/generate-version.js` — enhanced to include `buildTime`, `commit` from CI env
- Both deployed locally; verified with `curl http://localhost:3002/api/health`

**Blocking:** Nothing; can land independently.
**Integration test:** Health endpoint reports correct service status.

### Phase 6: **Graceful Shutdown & Signal Handlers** (Week 1)
**Deliverables:**
- `api/src/server.js` — SIGTERM handlers (drain, 30s timeout)
- `face-service/main.py` — SIGTERM handler (drain, 10s timeout)

**Blocking:** Nothing immediately, but required for atomic swaps.
**Integration test:** `docker stop` takes correct time, no orphaned requests.

### Phase 7: **Dockerfile Multi-Stage Rewrites** (Weeks 1–2)
**Deliverables:**
- Enhanced `Dockerfile.api` with contracts build stage + BuildKit cache mounts
- Enhanced `Dockerfile.web` with separate builder/runner stages
- Enhanced `face-service/Dockerfile` with model downloads in build stage
- Verified locally: `docker compose -f docker-compose.yml build`

**Blocking:** CI workflow (Phase 8).
**Integration test:** Images build successfully, run locally with same behavior.

### Phase 8: **docker-compose.prod.yml & Local Dev Parity** (Week 2)
**Deliverables:**
- `docker-compose.prod.yml` — pulls from GHCR (template with `${DOCKER_IMAGE_TAG}`)
- `docker-compose.dev.yml` — pulls from GHCR, local data volumes
- Enhanced `scripts/deploy.sh` — wrapper for prod compose
- Verified locally: `DOCKER_REGISTRY=ghcr.io/test DOCKER_IMAGE_TAG=latest docker compose -f docker-compose.dev.yml up`

**Blocking:** Phase 9 (CI workflow).
**Integration test:** Prod compose pulls images, services start, health checks pass.

### Phase 9: **GitHub Actions CI Workflow (build-and-push-ghcr.yml)** (Week 2–3)
**Deliverables:**
- `.github/workflows/build-and-push-ghcr.yml` — on push to main: build 3 images, push to GHCR
- GHCR credentials configured on repo
- Verified: Merge dummy commit to main, watch CI build & push

**Blocking:** Phase 10 (VPS deploy scripts).
**Integration test:** Images appear in GHCR with correct tags.

### Phase 10: **VPS Deploy Script Enhancements** (Week 3)
**Deliverables:**
- Enhanced `scripts/deploy-vps.sh` — read DOCKER_IMAGE_TAG, pull from GHCR, healthcheck-gated swap
- `.last-good-image` recording for rollback
- GHCR auth configured on VPS (docker login or GitHub PAT)
- Verified on VPS: Manually deploy with `DOCKER_IMAGE_TAG=v0.31.30 bash scripts/deploy-vps.sh`

**Blocking:** Phase 11 (CI-to-prod integration).
**Integration test:** Deploy script pulls correct image, swaps containers, health checks pass.

### Phase 11: **Database Migration Strategy** (Week 3)
**Deliverables:**
- Migration sidecar option in `docker-compose.prod.yml` (optional profile)
- `scripts/deploy.sh` extended to run migrations if `RUN_MIGRATIONS=true`
- Tested: Manual migration run, then normal deploy

**Blocking:** Nothing (can run manually or gated).
**Integration test:** Migrations apply cleanly, app starts after migration.

### Phase 12: **Full E2E Integration & Documentation** (Week 4)
**Deliverables:**
- Updated `docs/runbooks/DEPLOYMENT.md` — new image-based flow
- Updated `docs/runbooks/INFRASTRUCTURE.md` — GHCR registry, env vars for image tag
- CI badge in README
- Verified: Full flow from commit → CI → GHCR → VPS → live

**Blocking:** Nothing; wrap-up phase.
**Integration test:** End-to-end deploy under 3 min.

---

## 9. Service Architecture Details

### Data Flow (Unchanged)

```
[Browser] → nginx:443 (TLS) → nginx:80 (Docker)
              ↓
           /api → tgroup-api:3002
           /uploads → tgroup-api:3002
           /assets → cached dist/
              ↓
           tgroup-api → PostgreSQL:5432 (or 55433 Docker)
                     → compreface:8000 (optional)
                     → face-service:8000
                     → hosoonline (external)
```

### Dependency Sequence

**Startup order (enforced by `depends_on: condition: service_healthy`):**

```
1. PostgreSQL — must be healthy first
2. face-service — polls detection models, then reports /health
3. tgroup-api — depends on db + face-service healthy
4. nginx/web — depends on api
```

### Compose Profiles for Optional Services

```yaml
services:
  compreface-api:
    profiles: ["compreface"]  # Only start if --profile compreface
  api-migrations:
    profiles: ["migrations"]  # Only for migration runs
```

---

## 10. Integration Points Summary

| Integration Point | File | Phase | Change Type |
|-------------------|------|-------|-------------|
| Health endpoint | `api/src/routes/health.js` | 5 | New file |
| Version endpoint | `api/src/routes/version.js` | 5 | New file |
| Graceful shutdown | `api/src/server.js` | 6 | Signal handler addition |
| Face-service health | `face-service/main.py` | 6 | Signal handler addition |
| Contracts in api image | `Dockerfile.api` | 7 | Multi-stage build |
| Web dist isolation | `Dockerfile.web` | 7 | Multi-stage build |
| Prod compose | `docker-compose.prod.yml` | 8 | New file |
| Dev parity compose | `docker-compose.dev.yml` | 8 | New file |
| CI/CD workflow | `.github/workflows/build-and-push-ghcr.yml` | 9 | New workflow |
| VPS deploy | `scripts/deploy-vps.sh` | 10 | Enhanced script |
| Migration sidecar | `docker-compose.prod.yml` | 11 | Profile addition |
| Docs | `docs/runbooks/DEPLOYMENT.md` | 12 | Update |

---

## 11. New Files Checklist

| File | Type | Purpose |
|------|------|---------|
| `.github/workflows/build-and-push-ghcr.yml` | Workflow | Build & push images on main push |
| `docker-compose.prod.yml` | Compose | VPS production, pulls from GHCR |
| `docker-compose.dev.yml` | Compose | Local prod-parity dev stack |
| `api/src/routes/health.js` | Code | Enhanced health checks |
| `api/src/routes/version.js` | Code | Build version info |
| `scripts/deploy.sh` | Script | Local prod-parity deploy wrapper |
| `.ghcr-token.txt` | Secret (gitignored) | VPS GHCR auth (optional, use docker login instead) |

---

## 12. Modified Files Checklist

| File | Changes | Phase |
|------|---------|-------|
| `Dockerfile.api` | Multi-stage contracts build + BuildKit cache | 7 |
| `Dockerfile.web` | Multi-stage builder/runner separation | 7 |
| `face-service/Dockerfile` | Model download in build stage | 7 |
| `api/src/server.js` | SIGTERM handler + version endpoint mount | 5–6 |
| `api/package.json` | Script for running health checks in tests | 5 |
| `website/scripts/generate-version.js` | Include buildTime, commit, buildId | 5 |
| `scripts/deploy-vps.sh` | GHCR pull + healthcheck-gated swap + rollback | 10 |
| `docs/runbooks/DEPLOYMENT.md` | New image-based flow, migration sidecar | 12 |
| `docs/runbooks/INFRASTRUCTURE.md` | GHCR credentials, image tag env vars | 12 |

---

## 13. Confidence Assessment

| Area | Confidence | Notes |
|------|-----------|-------|
| Healthcheck/version endpoints | HIGH | Already partially implemented; minimal additions |
| Dockerfile multi-stage | HIGH | Standard pattern; no breaking changes |
| Compose refactoring | HIGH | Existing docker-compose.yml works; split is straightforward |
| Contracts build integration | HIGH | Already used by api; just moving to Dockerfile stage |
| Nginx config unification | MEDIUM | Two configs easier than one template; both exist; alignment needed |
| Database migrations | MEDIUM | Sidecar pattern is standard; requires testing with real migrations |
| CI/CD workflow | HIGH | GitHub Actions buildx is mature; GHCR is free for public repos |
| VPS deploy script | HIGH | Existing script works; adding pull + healthcheck-gated swap is low-risk |
| Image tag flow | HIGH | Semantic versioning well-established; rollback via file record is simple |
| Phase ordering | HIGH | Phases have clear data dependencies; each can be merged independently |

---

## 14. Key Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| GHCR push fails, CI incomplete | HIGH | Re-run workflow; images tagged by SHA so no collision |
| VPS docker login expires | MEDIUM | Store PAT in `/opt/tgroup/.dockerconfig`; rotate quarterly |
| Old image still running after pull | MEDIUM | Always run `docker compose pull` before `up -d` |
| Migration sidecar conflicts with running api | MEDIUM | Use `--profile migrations` to run in isolation before starting api |
| Nginx config drift between prod/docker | MEDIUM | Add lint step to CI to validate both nginx configs |
| Models fail to download in build stage | MEDIUM | Retry in Dockerfile (already implemented) + test image locally before push |
| Healthcheck times out, deploy rolled back | LOW | Adjust timeouts in deploy.sh; monitor first 3 live deploys |

---

## 15. Performance Targets

| Metric | Target | Current | Gain |
|--------|--------|---------|------|
| Build time (all 3 images) | <12 min | N/A (builds on VPS currently) | Parallel on CI runner |
| Push time (GHCR) | <3 min | N/A | Parallel pushes |
| VPS pull time | <2 min | N/A | Smaller image, closer registry |
| VPS swap time | <5 min | 8–15 min | Healthcheck-gated, no recompile |
| Total cycle (commit → live) | <20 min | 8–15 min | 2–3x improvement |
| Local dev parity setup | <2 min | N/A | `docker compose -f docker-compose.dev.yml up` |

---

## 16. Operational Checklist for Phase Transitions

Before merging each phase:

- [ ] Branch has no conflicts with main
- [ ] All files in `.planning/research/` updated for new discoveries
- [ ] Phase build order verified (no phase blocks a previous phase)
- [ ] Integration test passed locally (or in CI)
- [ ] New endpoints documented in API comments
- [ ] No hardcoded env vars, paths, or secrets in code
- [ ] DEPLOYMENT.md updated if phase affects deployment
- [ ] Version bump in `website/package.json` if any user-facing change (phases 5–11 are infra, phase 12 is docs)

---

## Conclusion

The prebuilt-image pipeline is **architecturally sound** with this project's existing structure. No breaking changes to contracts, API schemas, or database are needed. All integration points are **contained to CI/CD infrastructure and the deployment flow**.

**Next step:** Roadmapper uses this to split into 5–8 independent phases, each with clear success criteria and integration tests.
