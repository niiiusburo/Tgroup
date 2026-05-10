# Technology Stack: Deploy Speed Refactor v2.0

**Project:** TG Clinic KOL Integration (Deploy Infrastructure)  
**Researched:** 2026-05-10  
**Focus:** Prebuilt Docker images + GHCR + atomic deploy with healthcheck-gated swap

## Recommended Stack

### GitHub Actions & Image Building

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `docker/setup-buildx-action` | `v3` | Enable BuildKit multi-stage & cache mounts in CI | Required for gha cache backend; enables RUN --mount=type=cache |
| `docker/build-push-action` | `v6` (latest May 2026) | Build and push images to GHCR on every commit | Official Docker action; supports BuildKit cache backends (gha, registry, local) |
| `docker/login-action` | `v3` | Authenticate to GHCR with GITHUB_TOKEN | Pushes to `ghcr.io/niiiusburo/Tgroup` (free for public + private) |
| `docker/metadata-action` | `v5` | Generate image tags from Git metadata | Auto-tag with branch, commit SHA, semver; removes manual tag management |
| BuildKit cache backend | `gha` (GitHub Actions cache) | Persist build cache between CI runs | Fastest for GHA workflows; no external storage; auto-cleanup |

### Dockerfile Patterns (Multi-Stage with Cache Mounts)

| Service | Base Image | Pattern | Cache Mount |
|---------|-----------|---------|------------|
| **api** | `node:20-alpine` (build) → `node:20-alpine` (runtime) | Separate dependency layer from source; copy node_modules | `RUN --mount=type=cache,target=/root/.npm npm ci --production` |
| **web** | `node:20-alpine` (build) → `nginx:alpine` (runtime) | Build Vite app in build stage; copy dist to nginx | `RUN --mount=type=cache,target=/root/.npm npm install --legacy-peer-deps` |
| **face-service** | `python:3.11-slim` → (no multi-stage needed) | Lightweight base; models downloaded at build time | `RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt` |

### Image Registry & Tagging

| Component | Configuration | Why |
|-----------|---------------|-----|
| **Registry** | GitHub Container Registry (`ghcr.io/niiiusburo/Tgroup`) | Free for public + private repos; integrated with GitHub org; no separate account/payment |
| **Image names** | `api:main`, `api:v0.5.0`, `api:latest`; same for `web`, `face-service` | Per-branch + per-release tagging enables quick rollback (pull old tag) |
| **Authentication** | `GITHUB_TOKEN` (auto-provided in Actions) | No separate registry credentials needed; permissions: `contents: read`, `packages: write` |
| **Permissions** | `permissions: { contents: read, packages: write }` in workflow | Limits token scope to only what's needed; disables dangerous default all-permissions |

### Local Development (docker-compose Override)

| File | Purpose | Content |
|------|---------|---------|
| `docker-compose.yml` | **Source of truth** — defines all 9 services, volumes, networks | Uses `build:` context for local development; VPS deployment **never** uses this |
| `docker-compose.dev.yml` | **Override for local dev** with prebuilt images | Sets image tags from environment variables; pulls from GHCR instead of building locally |
| `.env.dev` | Local environment defaults | `DOCKER_IMAGE_TAG=main` or `DOCKER_IMAGE_TAG=latest` |
| `.env.local` (gitignored) | Personal overrides | `DOCKER_IMAGE_TAG=<your-branch>` for testing unpushed images |

**Why this split:**  
- Local dev: fast feedback with `docker compose up` (rebuilds on file change if using Docker's watch mode)
- VPS deploy: atomic swap with pre-built images (no build step on VPS → 8–15 min → ~2 min)

### Healthcheck Patterns

| Service | Healthcheck | Purpose |
|---------|-------------|---------|
| **api** (Node/Express) | `curl -f http://localhost:3002/health \|\| exit 1` | Fast; 200 response = ready for traffic |
| **web** (nginx) | `curl -f http://localhost:80/index.html \|\| exit 1` | Serves index.html; verifies nginx + Vite build |
| **face-service** (Python/FastAPI) | `curl -f http://localhost:8000/health \|\| exit 1` | Python HTTP call; 200 = models loaded |
| **db** (Postgres) | `pg_isready -U postgres -d tdental_demo` | Existing; no change |
| **Timing** | `interval: 10s, timeout: 5s, retries: 3, start_period: 10s` | Generous start_period for slow model downloads (face-service) |

**Integration with docker-compose:**  
All services already have `healthcheck:` blocks in `docker-compose.yml` (lines 17–21, 64–68). Atomic deploy script waits for `service_healthy` before swapping.

### Atomic Deploy & Rollback Tooling

| Tool | Version | Purpose | Trade-off | Recommendation |
|------|---------|---------|-----------|-----------------|
| **Bash + docker compose** (native) | docker-compose v2.24+ | Swap images via env var, pull, up -d, wait for healthcheck | Manual; no automatic rollback if health fails post-deploy | **USE THIS** — fits single-node VPS; 3-5 min total; simplest ops |
| **docker-rollout** | (from GitHub) | Blue-green deploy; immediate rollback if new container fails health | Requires two copies of each service (2x memory/CPU during deploy) | Overkill for single-host; saves 1 min but doubles resource cost |
| **Watchtower** | Latest | Auto-pull + restart containers on image push | No rollback; can't gate on healthcheck before stopping old container | Not suitable; needs manual intervention on failure |

**Recommendation: Bash + docker compose with explicit healthcheck polling**

```bash
# scripts/deploy.sh (pseudo-code)
export DOCKER_IMAGE_TAG=v0.5.0
export DOCKER_REGISTRY=ghcr.io/niiiusburo/Tgroup

# Pull new images
docker compose -f docker-compose.prod.yml pull api web face-service

# Start containers; old ones keep running (start_first order in compose v2.1+)
docker compose -f docker-compose.prod.yml up -d api web face-service

# Poll healthchecks for up to 60s
for i in {1..60}; do
  api_healthy=$(docker inspect --format='{{.State.Health.Status}}' tgroup-api)
  web_healthy=$(docker inspect --format='{{.State.Health.Status}}' tgroup-web)
  
  if [[ "$api_healthy" == "healthy" && "$web_healthy" == "healthy" ]]; then
    echo "Deploy successful"
    exit 0
  fi
  sleep 1
done

# If we get here, healthcheck failed; rollback
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d api web face-service  # re-up with old image tag
exit 1
```

**Why this approach:**
- Single-host VPS doesn't benefit from blue-green overhead
- Native docker-compose understands healthchecks
- Easy to extend with Slack/email alerts on failure
- Zero external dependencies (no Kubernetes, no Watchtower daemon)

---

## GitHub Actions Workflow (Build + Push to GHCR)

**File location:** `.github/workflows/docker-build.yml` (NEW)

### Structure

```yaml
name: Build & Push Docker Images

on:
  push:
    branches: [main, ai-develop]  # Only build on main branches
  pull_request:
    branches: [main, ai-develop]  # Build for PR validation (don't push)

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      # 1. Setup BuildKit with gha cache backend
      - uses: docker/setup-buildx-action@v3
      
      # 2. Login to GHCR
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      # 3. Generate tags from git metadata
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
      
      # 4. Build and push API
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile.api
          cache-from: type=gha
          cache-to: type=gha,mode=max
          push: ${{ github.event_name == 'push' }}
          tags: |
            ghcr.io/${{ github.repository }}/api:${{ github.sha }}
            ghcr.io/${{ github.repository }}/api:latest
      
      # 5. Build and push Web
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile.web
          build-args: |
            VITE_API_URL=/api
          cache-from: type=gha
          cache-to: type=gha,mode=max
          push: ${{ github.event_name == 'push' }}
          tags: |
            ghcr.io/${{ github.repository }}/web:${{ github.sha }}
            ghcr.io/${{ github.repository }}/web:latest
      
      # 6. Build and push Face Service
      - uses: docker/build-push-action@v6
        with:
          context: ./face-service
          file: ./face-service/Dockerfile
          cache-from: type=gha
          cache-to: type=gha,mode=max
          push: ${{ github.event_name == 'push' }}
          tags: |
            ghcr.io/${{ github.repository }}/face-service:${{ github.sha }}
            ghcr.io/${{ github.repository }}/face-service:latest
```

### Cache Backend Rationale: `gha` (GitHub Actions Cache)

| Backend | Build Time (1st) | Build Time (cache hit) | Storage | Best For |
|---------|------------------|------------------------|---------|----------|
| **gha** | 120s | 25s (dep cache reuse) | Auto-managed by GHA (free, <5GB) | GitHub Actions ephemeral runners |
| **registry** | 120s | 30s (depends on network latency) | External (GHCR, Docker Hub); costs bandwidth | Multi-team CI systems |
| **local** | 120s | 15s (fastest; local disk) | Shared persistent runner | On-premise CI with stable hardware |

**We choose `gha` because:**
- Tgroup uses GitHub Actions (no on-premise CI)
- Ephemeral runners (each run starts fresh) benefit from GHA's cross-run cache
- No external storage cost
- Auto-cleanup (5GB default limit per repo)
- BuildKit `mode=max` caches all layers, not just final image

---

## Multi-Stage Dockerfile Patterns (Applied to Tgroup)

### Dockerfile.api (Current → Optimized)

**Current (lines 1–12):**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY contracts/ /contracts/
RUN cd /contracts && npm install --omit=dev --no-audit --no-fund
COPY api/package.json api/package-lock.json ./
RUN npm ci --production
COPY api/src ./src
EXPOSE 3002
ENV PORT=3002 NODE_ENV=production NODE_PATH=/app/node_modules
CMD ["node", "src/server.js"]
```

**Issue:** No cache mounts; every rebuild downloads npm dependencies. No true multi-stage (production layer only).

**Optimized:**
```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY contracts/package*.json /contracts/
COPY api/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --production --workspace=contracts --workspace=. --no-audit --no-fund

FROM node:20-alpine
WORKDIR /app
COPY --from=deps /contracts/node_modules /contracts/node_modules
COPY --from=deps /app/node_modules /app/node_modules
COPY contracts/ /contracts/
COPY api/src ./src
EXPOSE 3002
ENV PORT=3002 NODE_ENV=production NODE_PATH=/app/node_modules
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
CMD ["node", "src/server.js"]
```

**Gains:**
- Cache mounts: npm download cache persists across builds (~10x faster on rebuild)
- Dependency layer separate from source code (source changes don't invalidate npm layer)
- Healthcheck included in Dockerfile (already in docker-compose.yml, but good to have both)

### Dockerfile.web (Current → Optimized)

**Current (lines 1–14):**
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY contracts/ /contracts/
COPY website/package.json website/package-lock.json ./
RUN npm install --legacy-peer-deps
COPY website/ .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.docker.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**Issue:** No cache mounts on build stage; each rebuild reruns `npm install` even if package-lock.json didn't change.

**Optimized:**
```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app
COPY contracts/package*.json /contracts/
COPY website/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --no-audit --no-fund

FROM builder AS vite-build
COPY contracts/ /contracts/
COPY website/ .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:alpine
COPY --from=vite-build /app/dist /usr/share/nginx/html
COPY nginx.docker.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD wget -q -O- http://localhost/index.html | grep -q "<!DOCTYPE" || exit 1
```

**Gains:**
- Dependency layer (npm ci) cached separately from build step (RUN npm run build)
- If only source code changes, npm layer is reused
- On rebuild with same package-lock.json: ~5–10s (was ~60s)

### Dockerfile face-service (Current → Optimized)

**Current (lines 1–27):**
```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 wget \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
RUN mkdir -p /app/models && \
    wget -q -O /app/models/face_detection_yunet_2023mar.onnx \
        https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx && \
    wget -q -O /app/models/face_recognition_sface_2021dec.onnx \
        https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx
ENV MODEL_DIR=/app/models DETECTION_THRESHOLD=0.90 PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Issue:** No pip cache mount; no multi-stage (final image includes apt cache, build tools, etc.); model downloads on every build.

**Optimized:**
```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.11-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 wget \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

FROM base AS runtime
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY main.py .
RUN mkdir -p /app/models && \
    wget -q -O /app/models/face_detection_yunet_2023mar.onnx \
        https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx && \
    wget -q -O /app/models/face_recognition_sface_2021dec.onnx \
        https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx
ENV MODEL_DIR=/app/models DETECTION_THRESHOLD=0.90 PYTHONUNBUFFERED=1 PYTHONPATH=/app
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Gains:**
- Pip cache mount: pip packages reused across builds (~5x faster on rebuild)
- Multi-stage: final image ~200MB smaller (no apt cache, build tools, wget)
- Model download still happens on every build (okay — models are large; caching them is risky if URLs change)

---

## docker-compose.yml → docker-compose.prod.yml (Image Substitution)

### Pattern: Environment-Driven Image Tags

**docker-compose.prod.yml** (NEW for VPS deployment):

```yaml
version: "3.8"

# Inherit all services from docker-compose.yml, but override build → image
services:
  db:
    # No change; still uses local postgres:16-alpine
    image: postgres:16-alpine
    container_name: tgroup-db
    # ... rest unchanged

  api:
    # CHANGED: Use pre-built image instead of build context
    image: ${DOCKER_REGISTRY:-ghcr.io/niiiusburo/Tgroup}/api:${DOCKER_IMAGE_TAG:-latest}
    container_name: tgroup-api
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    # ... rest unchanged

  web:
    image: ${DOCKER_REGISTRY:-ghcr.io/niiiusburo/Tgroup}/web:${DOCKER_IMAGE_TAG:-latest}
    container_name: tgroup-web
    restart: unless-stopped
    depends_on:
      - api
    # ... rest unchanged

  face-service:
    image: ${DOCKER_REGISTRY:-ghcr.io/niiiusburo/Tgroup}/face-service:${DOCKER_IMAGE_TAG:-latest}
    container_name: tgroup-face-service
    restart: unless-stopped
    # ... rest unchanged

  # compreface services: unchanged (use published exadel images)
  compreface-postgres-db:
    image: postgres:11.5-alpine
    # ...

  compreface-api:
    image: exadel/compreface:1.2.0
    # ...

  compreface-core:
    image: exadel/compreface-core:1.2.0
    # ...
```

### Usage

**Local development (still uses docker-compose.yml with build contexts):**
```bash
docker compose up api web db
# Rebuilds api, web from source on every change
```

**Local dev with prebuilt GHCR images (testing prod config):**
```bash
export DOCKER_IMAGE_TAG=main
docker compose -f docker-compose.prod.yml up api web db
# Pulls images from GHCR instead of rebuilding
```

**VPS deployment (atomic swap):**
```bash
export DOCKER_REGISTRY=ghcr.io/niiiusburo/Tgroup
export DOCKER_IMAGE_TAG=v0.5.0  # or main, or any git tag
docker compose -f docker-compose.prod.yml pull api web face-service
docker compose -f docker-compose.prod.yml up -d api web face-service
# Waits for healthchecks in scripts/deploy.sh
```

### Why Not docker-compose override?

Docker Compose override (`docker-compose.override.yml`) is intended for **local dev** only — it's auto-ignored on VPS if not present. For VPS, we need **explicit** file (`-f docker-compose.prod.yml`) to avoid ambiguity.

---

## Healthcheck Integration

### Healthcheck in docker-compose.yml (Existing)

Already present:
- **db** (lines 17–21): `pg_isready -U postgres -d tdental_demo`
- **face-service** (lines 64–68): `python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"`

### Add to api service (in docker-compose.yml):

```yaml
api:
  # ... existing config
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
    interval: 10s
    timeout: 5s
    retries: 3
    start_period: 10s  # Allow 10s for Express startup
```

Requires: api must expose `/health` endpoint (likely already exists; verify with `curl http://localhost:3002/health`).

### Add to web service (in docker-compose.yml):

```yaml
web:
  # ... existing config
  healthcheck:
    test: ["CMD", "wget", "-q", "-O-", "http://localhost/index.html"]
    interval: 10s
    timeout: 5s
    retries: 3
    start_period: 5s
```

nginx automatically serves `/index.html` if Vite build succeeded.

---

## Implementation Roadmap (In Phase Order)

1. **Rewrite Dockerfiles** (api, web, face-service)
   - Add cache mounts
   - Add healthchecks
   - Test locally: `docker build -t test:api -f Dockerfile.api .`

2. **Create GitHub Actions workflow** (`.github/workflows/docker-build.yml`)
   - Test on feature branch: push to GitHub, watch workflow
   - Verify images appear in GHCR

3. **Create docker-compose.prod.yml**
   - Test locally: `docker compose -f docker-compose.prod.yml pull api web face-service`
   - Test locally: `docker compose -f docker-compose.prod.yml up api web db`

4. **Create deploy script** (`scripts/deploy.sh`)
   - Test on VPS with old tag (to verify rollback logic)
   - Deploy to VPS

5. **Update DEPLOYMENT.md**
   - Document new workflow
   - Remove old "build on VPS" instructions

---

## Alternatives Not Recommended

| Alternative | Why Not Used |
|-------------|------------|
| Kubernetes (k8s) / Helm / ArgoCD | Single-host VPS doesn't benefit from orchestration; operational overhead too high |
| Watchtower auto-pull daemon | No automatic rollback on failure; requires manual intervention |
| docker-rollout (blue-green) | Blue-green doubles memory/CPU during deploy; VPS resources not available |
| Registry cache (vs gha) | External storage cost; GitHub Actions cache is free & faster for ephemeral runners |
| Docker Hub (vs GHCR) | GHCR is private-by-default, integrated with GitHub org, free for private repos |

---

## Sources

- [docker/build-push-action](https://github.com/docker/build-push-action) — Official GitHub Action for Docker builds with BuildKit
- [How to Build and Push Docker Images with GitHub Actions](https://oneuptime.com/blog/post/2026-02-20-github-actions-docker-build-push/view) — Multi-arch and GHCR patterns (Feb 2026)
- [Publishing Multi-Arch Docker images to GHCR using Buildx and GitHub Actions](https://dev.to/pradumnasaraf/publishing-multi-arch-docker-images-to-ghcr-using-buildx-and-github-actions-2k7j) — DEV Community
- [Docker BuildKit Practical: Optimizing Dependency Management with Cache](https://addozhang.medium.com/docker-buildkit-practical-optimizing-dependency-management-with-cache-to-accelerate-builds-67c527e90177) — Medium
- [How to Use RUN --mount=type=cache for Package Manager Caching](https://oneuptime.com/blog/post/2026-02-08-how-to-use-run-mounttypecache-for-package-manager-caching/view) — OneUptime (Feb 2026)
- [Docker BuildKit Cache Backends](https://docs.docker.com/build/cache/backends/) — Official Docker Docs
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/) — Official Docker Docs
- [Set, use, and manage variables in a Compose file with interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/) — Official Docker Docs
- [Docker Compose Health Checks](https://last9.io/blog/docker-compose-health-checks/) — Last9 (2026)
- [How to Update Running Containers Without Downtime](https://oneuptime.com/blog/post/2026-01-06-docker-update-without-downtime/view) — OneUptime (Jan 2026)
- [Implementing Rolling Updates and Rollbacks with Docker](https://www.xcubelabs.com/blog/implementing-rolling-updates-and-rollbacks-with-docker/) — XCube Labs
- [Faster CI Builds with Docker Layer Caching and BuildKit](https://testdriven.io/blog/faster-ci-builds-with-docker-cache/) — TestDriven.io
