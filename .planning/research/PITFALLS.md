# Deployment Pitfalls: GHCR + Atomic Swap for Live TG Clinic

**Domain:** Docker Compose multi-service production deployment with prebuilt images and atomic VPS swap

**Researched:** 2026-05-10

**Overall confidence:** MEDIUM-HIGH (codebase-specific pitfalls researched; some require phase-specific validation)

## Executive Summary

Adding GHCR + CI-driven image builds + atomic swap to an existing live production Docker Compose stack introduces 14 critical failure modes. Each pitfall has proven warning signs and known prevention strategies. Many pitfalls stem from the VPS transition from source-on-server builds to pulling prebuilt images, creating new failure surfaces around registry authentication, image tag management, multi-stage build correctness, database migration ordering, and cache poisoning.

The TG Clinic stack uses:
- Multi-service compose (`db`, `api`, `face-service`, `compreface-*`, `web`) with named volumes (`tgroup-pgdata`, `compreface-*`)
- npm workspace (`contracts/` → `file:../contracts` in `api/package.json` and `website/package.json`)
- Multi-stage Dockerfile.web with Vite build
- Single-layer Dockerfile.api with contracts install
- nginx with cache headers for static assets (1y immutable)
- Hardcoded `compreface:1.2.0` public registry image

Each pitfall maps to a specific prevention guard rail, applicable to Phase 2 (GHA workflow), Phase 3 (docker-compose.yml refactor), or Phase 4 (deploy script + healthcheck).

## Critical Pitfalls (BLOCKING)

### Pitfall 1: GHCR Token Expires or Permissions Wrong → VPS Cannot Pull Images

**What goes wrong:**
- GHA pushes images to GHCR successfully
- VPS `docker pull` fails at deploy time: `Error response from daemon: Head "https://ghcr.io/...": unauthorized`
- Production is down while you troubleshoot auth (0 downtime guarantee broken)

**Why it happens:**
- Personal access token (PAT) expired or was never created with `read:packages` scope
- Fine-grained tokens not supported by GHCR (GitHub's limitation as of Feb 2026)
- VPS has stale/missing `.docker/config.json` or `~/.docker/config.json`
- Image is private but VPS auth only has `repo` scope (insufficient for cross-account GHCR read)
- Using `GITHUB_TOKEN` from GHA to push, but VPS expects a different credential

**Consequences:**
- Atomic swap blocked — cannot pull new image
- Manual SSH intervention required — breaks "one-command deploy"
- If rolled back manually, next deploy attempt fails again
- Codebase specific: `tgroup-api`, `tgroup-web`, `tgroup-face-service` images all fail to pull simultaneously

**Prevention:**
1. **Phase 2 (GHA workflow):**
   - Create personal access token (classic, NOT fine-grained) with `write:packages` + `read:packages` + `repo` scopes
   - Store as `GH_PAT` secret in GitHub repo settings
   - Document: "GHCR PAT expires [date] — set reminder to refresh before production deploy"

2. **Phase 3 (docker-compose.yml refactor):**
   - Create VPS `docker-compose.prod.yml` with explicit registry auth:
     ```yaml
     services:
       api:
         image: ghcr.io/niiiusburo/tgroup/tgroup-api:${DOCKER_IMAGE_TAG}
         pull_policy: always  # Force pull; never use cached image
     ```
   - Document registry config in `.env.production`:
     ```bash
     DOCKER_REGISTRY=ghcr.io/niiiusburo/tgroup
     DOCKER_IMAGE_TAG=${VERSION}
     ```

3. **Phase 4 (deploy script):**
   - Before swap, test pull: `docker pull ${DOCKER_REGISTRY}/tgroup-api:${DOCKER_IMAGE_TAG}`
   - Exit with clear error if pull fails
   - Log auth failure with remediation: "Run `docker login ghcr.io` on VPS before retry"

**Detection:**
- Warning: GHA workflow pushes images but local `docker pull` fails on workstation
- Warning: VPS deploy script logs `Error response from daemon: Head ...: unauthorized`
- Warning: Production is live but stack is stale (version mismatch after attempted deploy)

---

### Pitfall 2: Image Tag Mutability — `:latest` Tag Overwritten, Rollback Impossible

**What goes wrong:**
- GHA CI pushes new build with tag `:latest`
- Image has a bug; you want to rollback to previous build
- But `:latest` has been overwritten — it now points to the broken image
- Previous image digest is unreachable (no other tag references it)
- Users see broken build forever until next push

**Why it happens:**
- All mutable registries allow re-tagging the same tag to a different image
- Using `:latest` only in production (no semver tags)
- CI pushes `tgroup-api:latest` and `tgroup-api:0.4.15`, but deploy script only pulls `:latest`
- If CI re-runs on same SHA (e.g., retry after timeout), `:latest` gets re-pushed to identical image — safe, but CI logs don't show this
- Time-of-check vs. time-of-use (TOCTOU): image verified by GHA security scan, but by deploy time `:latest` points to different image

**Consequences:**
- Rollback to previous version requires code push (not a simple image swap)
- If rollback is urgent, emergency git revert + re-push + wait for CI = 5–10 min vs. 10 seconds with immutable tags
- Codebase specific: `tgroup-web` images serve via long-cache-header nginx, so stale bundle persists in browser cache even after image swap (see Pitfall 11)

**Prevention:**
1. **Phase 2 (GHA workflow):**
   - Push two tags: semver (e.g., `0.4.15`) + `latest`
     ```yaml
     - name: Push to GHCR
       run: |
         docker tag tgroup-api:build $REGISTRY/tgroup-api:$VERSION
         docker tag tgroup-api:build $REGISTRY/tgroup-api:latest
         docker push $REGISTRY/tgroup-api:$VERSION
         docker push $REGISTRY/tgroup-api:latest
     ```
   - Extract version from `website/package.json` (source of truth)
   - Tag on Git commit SHA as fallback: `0.4.15-abc1234`

2. **Phase 3 (docker-compose.prod.yml):**
   - Deploy script accepts explicit tag: `DOCKER_IMAGE_TAG=0.4.15` (never `:latest`)
   - Default to tag from `website/package.json`, not `:latest`:
     ```bash
     DOCKER_IMAGE_TAG=$(jq -r '.version' website/package.json)
     ```

3. **Phase 4 (deploy script):**
   - Before pull, verify image exists (digest is not latest): `docker inspect ${REGISTRY}/tgroup-api:${TAG}`
   - Verify previous tag is still available for rollback: `docker image ls | grep ${REGISTRY}/tgroup-api`
   - Document rollback: "To rollback: `DOCKER_IMAGE_TAG=0.4.14 bash scripts/deploy.sh`"

**Detection:**
- Warning: GHA shows image pushed, but you can't reference a previous build by tag
- Warning: `docker image ls ghcr.io/niiiusburo/tgroup/tgroup-api` shows only `:latest`, no semver tags
- Warning: Deploy script only pulls `:latest`, not a versioned tag

---

### Pitfall 3: Contracts Workspace Not Found in Docker Build → npm install Fails

**What goes wrong:**
- GHA builds Dockerfile.api: `COPY contracts/ /contracts/` and `RUN npm install --omit=dev`
- Build fails: `npm error 404 Not Found - GET https://registry.npmjs.org/@tgroup/contracts ...`
- Or succeeds but api container has 0-size contracts install, causing runtime `Cannot find module '@tgroup/contracts'`

**Why it happens:**
- `api/package.json` has `"@tgroup/contracts": "file:../contracts"`, but Docker COPY only copies from build context root
- Dockerfile.api at repo root tries `COPY contracts/ /contracts/`, but `COPY` runs relative to `docker build . --file Dockerfile.api`
- If build context is `/opt/tgroup/api`, then `COPY contracts/` looks for `api/contracts/` (doesn't exist)
- npm tries to resolve `file:../contracts` to local tarball or registry lookup, fails
- Codebase: both `api/package.json` and `website/package.json` use `file:../contracts`, but in Docker build they're in different stages/contexts

**Consequences:**
- GHA workflow fails during build → images never pushed
- Deploy cannot proceed (no new images available)
- Production is stuck on previous version until CI is fixed
- Rollback is clean (old images still exist), but pressure is high

**Prevention:**
1. **Phase 2 (GHA workflow):**
   - Verify `docker build` is invoked with full repo context, not from subdirectory:
     ```bash
     docker build -f Dockerfile.api -t tgroup-api:$VERSION .
     # NOT: cd api && docker build ...
     ```
   - Test build locally with full context before pushing to GHA

2. **Phase 3 (Dockerfile.api refactor):**
   - Build at repo root, not `api/` directory
   - Current Dockerfile.api (CORRECT):
     ```dockerfile
     FROM node:20-alpine
     WORKDIR /app
     COPY contracts/ /contracts/
     RUN cd /contracts && npm install --omit=dev --no-audit --no-fund
     COPY api/package.json api/package-lock.json ./
     RUN npm ci --production
     COPY api/src ./src
     ```
   - This assumes `docker build -f Dockerfile.api .` from repo root ✓

3. **Phase 3 (Dockerfile.web refactor):**
   - Similarly, ensure contracts is copied before Vite build:
     ```dockerfile
     FROM node:20-alpine AS build
     WORKDIR /app
     COPY contracts/ /contracts/
     COPY website/package.json website/package-lock.json ./
     RUN npm install --legacy-peer-deps
     ```
   - This avoids symlink resolution issues during multi-stage build

**Detection:**
- Warning: GHA build log shows npm 404 for `@tgroup/contracts`
- Warning: Local `docker build -f Dockerfile.api .` works, but GHA build fails (context mismatch)
- Warning: Building from `api/` directory: `cd api && docker build -f ../Dockerfile.api .` (wrong relative path for COPY)

---

### Pitfall 4: Database Migration Runs on Old Image, Then Swap Breaks Rollback

**What goes wrong:**
- You prepare a backward-incompatible schema migration (e.g., drop column, rename table)
- GHA builds image with new API code that expects new schema
- Deploy script: run migrations on prod DB, then swap image
- If migration fails partway, you rollback to previous image
- But previous image code expects OLD schema (now partially migrated) → 500 errors, data corruption
- Or: migration never runs because `depends_on` waits for DB only, not for migrations to complete

**Why it happens:**
- docker-compose.yml `api` has `depends_on: db: condition: service_healthy`, but no explicit migration step
- Migration is embedded in `api/src/db/migrations/` but only runs if API explicitly runs migrations on startup
- Current `.planning/PROJECT.md` shows: "migrations are not auto-run. Loop them with `for f in /opt/tgroup/api/src/db/migrations/*.sql ...`"
- Backward-incompatible schema change breaks old code: old image expects column X, new schema removed it → 500 errors during rollback window
- Codebase: TG Clinic uses PostgreSQL with `dbo` schema; migrations must be idempotent (`IF NOT EXISTS` guards), but partial migration state can be incoherent

**Consequences:**
- Rollback fails because old image is incompatible with new schema state
- Window of 5–10 minutes where data is inconsistent
- If you force rollback anyway, API returns 500 errors (users see broken dashboard)
- Data loss if rollback deletes partially-migrated columns

**Prevention:**
1. **Phase 2 (GHA workflow):**
   - Document: migrations are NOT part of image build
   - Migrations are VPS-only, run as separate step before swap
   - Create checklist in `.github/workflows/deploy.yml`:
     ```yaml
     - name: Verify migration safety
       run: |
         # Check for backward-incompatible migrations
         if grep -r "DROP COLUMN\|ALTER TABLE.*TYPE" api/src/db/migrations/; then
           echo "ERROR: Found backward-incompatible migration"
           exit 1
         fi
     ```

2. **Phase 3 (docker-compose.prod.yml):**
   - Do NOT auto-run migrations in compose
   - Include explicit migration runner step in deploy script (see Phase 4)
   - Keep migration files in image, but don't execute on startup:
     ```dockerfile
     # In Dockerfile.api
     COPY api/src/db ./src/db  # Include migrations for reference
     CMD ["node", "src/server.js"]  # Do NOT run migrations here
     ```

3. **Phase 4 (deploy script — `scripts/deploy.sh`):**
   - Step 1: Pull new image (don't start yet)
   - Step 2: **Test** new image against current DB schema (dry-run)
   - Step 3: Run migrations **before** swap:
     ```bash
     # Connect to current DB, apply new migrations
     docker exec tgroup-db psql -U postgres -d tdental_demo < api/src/db/migrations/*.sql
     # Or use a migration runner service
     ```
   - Step 4: Verify old image still works with new schema (backward compatibility test)
   - Step 5: Swap image
   - Step 6: Smoke test (verify API responds 200)
   - If Step 2, 4, or 5 fails, **do not proceed**; manual intervention required

4. **Phase 3 (API code):**
   - Migrations must be backward-compatible:
     - ADD COLUMN with default value ✓
     - Rename via trigger or view alias ✓
     - DROP COLUMN only after old code is removed (2+ releases) ✗

**Detection:**
- Warning: Deploy script doesn't explicitly run migrations before swap
- Warning: Migrations are auto-run in API startup (risky ordering)
- Warning: Backward-incompatible migration (DROP COLUMN, TYPE change) without multi-release timeline
- Warning: Old image code doesn't have fallback for missing columns

---

## High-Severity Pitfalls (DATA/UPTIME RISK)

### Pitfall 5: docker-compose up -d Recreates Dependent Services → Connections Drop

**What goes wrong:**
- Current deploy: `docker compose up -d` to swap api image
- Compose sees `web.depends_on.api`, so it tears down web before recreating api
- While web is down, users see connection refused / 502 Bad Gateway
- Nginx upstream cache might hold old api IP, further delaying recovery

**Why it happens:**
- docker-compose.yml has `api: depends_on: [db]` and `web: depends_on: [api]`
- `docker compose up -d api` alone won't work; you need `--no-deps` to skip dependency chain
- Without `--no-deps`, compose will recreate both api and web, interrupting requests
- The update-without-downtime approach requires `--no-deps` or a rolling restart tool

**Consequences:**
- Atomic swap becomes 3–5 second downtime (users see 502 errors)
- "Under 3 min" deploy goal is met (CI + swap), but uptime impact is not 0-downtime
- Load balancer or monitoring systems may trigger alerts

**Prevention:**
1. **Phase 3 (docker-compose.prod.yml):**
   - Change dependency structure to allow independent updates:
     ```yaml
     services:
       api:
         depends_on:
           db:
             condition: service_healthy
         # No depends_on on web (web depends on api, not vice versa)
       web:
         depends_on:
           api:
             condition: service_healthy
     ```

2. **Phase 4 (deploy script):**
   - Use `--no-deps` flag when swapping individual services:
     ```bash
     docker compose -f docker-compose.prod.yml up -d --no-deps api
     docker compose -f docker-compose.prod.yml up -d --no-deps web
     ```
   - This skips re-creating dependent services
   - But verify web healthcheck before considering deploy complete

3. **Phase 4 (deploy script — improved):**
   - Use rolling restart pattern (new container + old in parallel, then kill old):
     ```bash
     # Scale api to 2 replicas temporarily
     docker compose -f docker-compose.prod.yml up -d --scale api=2 api
     # Wait for new replica to pass healthcheck
     sleep 5 && docker compose -f docker-compose.prod.yml ps
     # Remove old replica
     docker compose -f docker-compose.prod.yml up -d --scale api=1 api
     ```
   - Current VPS setup uses single-node, so this isn't zero-downtime, but reduces it

**Detection:**
- Warning: Deploy script doesn't use `--no-deps` when updating services
- Warning: Web container restarts during api update (check `docker compose logs`)
- Warning: Users report 502 errors during deploy window

---

### Pitfall 6: Healthcheck False Positives — API Responds 200 but DB is Down

**What goes wrong:**
- `depends_on: condition: service_healthy` waits for api healthcheck to pass
- Api healthcheck is simple: `curl http://localhost:3002/api/health` → 200 OK
- But /api/health returns 200 even if DB connection is broken (no actual query executed)
- New `tgroup-web` starts, tries to load customers, API crashes: `Error: connect ECONNREFUSED 127.0.0.1:5432`
- false-positive healthcheck masked the real problem

**Why it happens:**
- Current compose has:
  ```yaml
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d tdental_demo"]
      interval: 5s
      timeout: 3s
      retries: 10
  api:
    # No explicit healthcheck in docker-compose.yml
  ```
- Without explicit api healthcheck, compose considers it "healthy" once the container starts (PID 1 running)
- If there is a healthcheck, it's often shallow: just pings a port, doesn't verify DB connectivity
- Codebase: API doesn't have a `/health` or `/healthz` endpoint that checks DB connectivity

**Consequences:**
- Compose thinks api is ready, starts dependent services
- API crashes immediately when dependent service (web) makes DB query
- Cascade failure: web gets 502, users see broken dashboard
- Atomic swap appears successful, but is actually broken

**Prevention:**
1. **Phase 2 (API code):**
   - Add explicit `/health` endpoint that checks DB connectivity:
     ```javascript
     app.get('/health', async (req, res) => {
       try {
         await db.query('SELECT 1');
         res.json({ status: 'healthy', db: 'connected' });
       } catch (err) {
         res.status(503).json({ status: 'unhealthy', db: 'disconnected' });
       }
     });
     ```

2. **Phase 3 (docker-compose.prod.yml):**
   - Add explicit api healthcheck:
     ```yaml
     api:
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
         interval: 5s
         timeout: 3s
         start_period: 10s  # Give API time to warm up
         retries: 5
       depends_on:
         db:
           condition: service_healthy
     ```

3. **Phase 3 (docker-compose.dev.yml):**
   - Mirror prod healthcheck for local testing:
     ```yaml
     api:
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
         interval: 5s
         timeout: 3s
         start_period: 10s
         retries: 5
     ```

**Detection:**
- Warning: API container starts but crashes with DB connection error
- Warning: Healthcheck passes but API is not actually serving requests
- Warning: No `/health` endpoint in API (check `curl http://localhost:3002/health`)
- Warning: compose logs show `tgroup-api exited with code 1` shortly after starting

---

### Pitfall 7: Nginx Serves Stale SPA Bundle After Image Swap Due to Browser Cache

**What goes wrong:**
- You deploy new `tgroup-web` image with updated React bundle
- Docker swap completes, healthcheck passes
- Users refresh browser, but browser serves **cached old bundle** from disk cache
- JavaScript errors or feature not available because old code is running
- User thinks deploy failed

**Why it happens:**
- Current `nginx.conf` has:
  ```nginx
  location ~* \.(js|css|png|jpg|...svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  ```
- Vite generates filenames with content hash, so versioned assets get long cache headers (correct ✓)
- But if you rebuild Vite and file hashes stay the same (e.g., no code change in asset), cache key collision
- Browser has `app.abc123.js` cached; new build also produces `app.abc123.js` (same hash) → browser uses cache
- Or: Vite hash changes, but browser cache entry for `/app.js` (without hash) points to old version
- Codebase: Vite is properly configured for cache-busting (hashed filenames), but nginx `index.html` also needs no-cache headers:
  ```nginx
  location = /index.html {
    add_header Cache-Control "no-cache, must-revalidate" always;
  }
  ```

**Consequences:**
- Deploy appears successful (compose, healthcheck, nginx all pass)
- But users see broken app (old JS code + new API incompatibility)
- Hard to debug: works locally, fails in production
- Cache persists until browser cache expires (browser-dependent, could be weeks)

**Prevention:**
1. **Phase 3 (Dockerfile.web):**
   - Verify Vite is configured to hash all assets:
     ```javascript
     // vite.config.js
     export default {
       build: {
         rollupOptions: {
           output: {
             entryFileNames: '[name].[hash].js',
             chunkFileNames: '[name].[hash].js',
             assetFileNames: '[name].[hash][extname]'
           }
         }
       }
     }
     ```

2. **Phase 3 (nginx.conf):**
   - Confirm current config:
     ```nginx
     location = /index.html {
       add_header Cache-Control "no-cache, must-revalidate" always;
       add_header Pragma "no-cache" always;
       expires -1;
     }
     location ~* \.(js|css|...svg|woff2)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
     }
     ```
   - Current file is CORRECT ✓

3. **Phase 4 (deploy script):**
   - After swap, verify new bundle is served:
     ```bash
     curl -s http://localhost:5175/index.html | grep '<script' | head -1
     # Should show new bundle hash
     ```
   - Or: clear nginx cache and browser cache before deploy (optional, not required)

4. **Phase 3 (optional — version.json):**
   - Expose deployed version to frontend:
     ```bash
     # In build step
     echo '{"version":"'$VERSION'","commit":"'$COMMIT'"}' > website/public/version.json
     ```
   - Frontend can poll for version change and show "New version available" banner
   - Existing file: `website/public/CHANGELOG.json` + VersionDisplay component already does this ✓

**Detection:**
- Warning: User reports "deploy succeeded but feature X is broken"
- Warning: New JS bundle is served, but old bundle is still cached (browser DevTools shows old asset timestamps)
- Warning: `/index.html` has long `Cache-Control` header (should be `no-cache`)

---

### Pitfall 8: GHA Cache Poisoning — Feature Branch Injects Malicious Layer Into Main Branch Cache

**What goes wrong:**
- Attacker (or compromised dependency) runs in a feature branch with code execution
- Captures GHA cache token and modifies Docker layer cache (e.g., injects secret, trojan code)
- Pushes modified cache to GitHub's cache storage
- Main branch GHA workflow runs, pulls the poisoned cache layer
- Main branch image contains trojan code / leaked secret
- GHCR receives poisoned image

**Why it happens:**
- GitHub Actions caches are accessible by any workflow in the same branch + parent/child branches
- Feature branch is child of main, so it can **write to** main's cache
- Only the branch boundary is enforced server-side; cache key validation is not
- If attacker has code execution (vulnerable dependency, loose CI permissions), they can craft a cache entry that matches main's expected layers
- BuildKit + GHA cache backend allows layer-level cache poisoning

**Consequences:**
- Trojan code is pushed to GHCR as official image
- VPS pulls and runs poisoned image in production
- Users' data compromised, API serves malicious responses
- Detection is hard (image looks legitimate; only reverse-engineering reveals backdoor)

**Prevention:**
1. **Phase 2 (GHA workflow):**
   - Use `GITHUB_TOKEN` (short-lived, per-workflow) instead of personal PAT:
     ```yaml
     - uses: docker/login-action@v3
       with:
         registry: ghcr.io
         username: ${{ github.actor }}
         password: ${{ secrets.GITHUB_TOKEN }}  # Built-in, not PAT
     ```
   - Restrict cache to main branch only:
     ```yaml
     - uses: docker/setup-buildx-action@v3
       with:
         cache-source: type=gha,scope=main  # Only use main's cache
         cache-target: type=gha,scope=${{ github.ref_name }}  # Write to current branch only
     ```

2. **Phase 2 (GHA workflow):**
   - Pin dependencies to exact versions (prevent dependency injection):
     ```yaml
     - uses: docker/login-action@v3  # Pinned version
     - uses: docker/setup-buildx-action@v3  # Pinned version
     ```
   - Use `composer --validate` to check for suspicious package changes:
     ```bash
     npm audit --production  # Run in CI before build
     ```

3. **Phase 2 (GHA workflow):**
   - Sign images with cosign (optional, but recommended for high-risk):
     ```yaml
     - name: Sign image
       run: cosign sign --key env://COSIGN_KEY ghcr.io/...@${{ steps.docker_build.outputs.digest }}
     ```

4. **Phase 3 (docker-compose.prod.yml):**
   - Verify image digest on VPS before running:
     ```bash
     docker pull ghcr.io/niiiusburo/tgroup/tgroup-api:$TAG
     DIGEST=$(docker inspect --format='{{.RepoDigests}}' ghcr.io/niiiusburo/tgroup/tgroup-api:$TAG)
     echo "Pulled image digest: $DIGEST"
     # Compare against GHA output or expect-list
     ```

**Detection:**
- Warning: GHA cache grows unexpectedly (10GB+ limit may be exceeded)
- Warning: Feature branch GHA job shows cache hit from unexpected source
- Warning: VPS logs show unexpected behavior after pulling main-branch image
- Warning: Security scan tool (Trivy, Snyk) flags new vulnerabilities in image

---

## Moderate Pitfalls (OPERABILITY RISK)

### Pitfall 9: docker-compose down -v Deletes Named Volumes → Data Loss on VPS

**What goes wrong:**
- During troubleshooting, you SSH to VPS and run `docker compose down` to reset stack
- You accidentally add `-v` flag: `docker compose down -v`
- All named volumes are deleted: `tgroup-pgdata` (20GB of production data) and `compreface-db-data` vanish
- Database is gone; Postgres container won't start without the data volume

**Why it happens:**
- `-v` flag removes all named volumes declared in docker-compose.yml
- Data is stored in Docker named volumes, not on host filesystem
- Easy to forget the flag implications during emergency debugging
- docker-compose.yml declares:
  ```yaml
  volumes:
    tgroup-pgdata:
    compreface-db-data:
  ```
  These are named volumes; `down -v` removes them

**Consequences:**
- Production database is lost
- Restore from backup required (delays recovery by 10–30 min, depending on backup size)
- If backup is stale, data loss
- Codebase: backup is initialized from `.docker-entrypoint-initdb.d/01-init.sql` (see docker-compose.yml line 14), so recovery is possible, but tedious

**Prevention:**
1. **Phase 3 (docker-compose.prod.yml):**
   - Mark data volumes as external or protected (optional, but safer):
     ```yaml
     volumes:
       tgroup-pgdata:
         driver: local
       compreface-db-data:
         driver: local
     ```

2. **Phase 4 (deploy script + runbook):**
   - Document: **NEVER** run `docker compose down -v` on production
   - Update `docs/runbooks/DEPLOYMENT.md`:
     ```markdown
     ## ⚠️ DANGER: Do NOT use -v flag on production
     
     WRONG: docker compose down -v  # DELETES ALL DATA
     RIGHT: docker compose down     # Preserves volumes
     ```

3. **VPS setup:**
   - Create backup script that runs hourly:
     ```bash
     #!/bin/bash
     docker exec tgroup-db pg_dump -U postgres tdental_demo | gzip > /backups/tdental_demo_$(date +%Y%m%d_%H%M%S).sql.gz
     ```
   - Store backups on separate storage (EBS, S3, or external drive)

4. **Phase 4 (deploy script):**
   - Never call `down -v`; use `pull` + `up -d` instead:
     ```bash
     docker compose -f docker-compose.prod.yml pull
     docker compose -f docker-compose.prod.yml up -d
     ```

**Detection:**
- Warning: You run `docker compose down` during troubleshooting and immediately realize volumes are gone
- Warning: VPS logs show Postgres startup errors (volume missing)
- Warning: `docker volume ls` shows no named volumes but docker-compose.yml expects them

---

### Pitfall 10: Compreface Public Image Tag Republished → Security/Compatibility Issues

**What goes wrong:**
- docker-compose.yml pulls `exadel/compreface:1.2.0` from Docker Hub (public registry)
- 3 months later, Exadel rebuilds `compreface:1.2.0` with different dependencies (e.g., security patch in base OS)
- VPS `docker pull exadel/compreface:1.2.0` fetches the new image (tag mutability!)
- New Compreface has incompatible ML model format; face detection breaks
- Or: new image has security vulnerability → needs security patch

**Why it happens:**
- Docker Hub allows re-tagging (tag mutability is default)
- Public registries can republish images under existing tags
- If base image (Alpine, Java) is updated, entire Compreface image changes
- Pinning semver (1.2.0) doesn't protect against tag mutation
- Protection: use image digest (SHA256 hash), not semver tag

**Consequences:**
- Compreface detection breaks unexpectedly
- Users can't enroll/verify faces → feature blocked
- Codebase: `face-service` Python container depends on Compreface for enrollment; if Compreface breaks, face-service fails
- Rollback requires knowing the old image digest (not obvious from logs)

**Prevention:**
1. **Phase 2 (GHA workflow):**
   - When pinning Compreface, also capture image digest:
     ```bash
     docker pull exadel/compreface:1.2.0
     COMPREFACE_DIGEST=$(docker inspect --format='{{.RepoDigests}}' exadel/compreface:1.2.0)
     echo "COMPREFACE_DIGEST=$COMPREFACE_DIGEST" >> $GITHUB_OUTPUT
     ```

2. **Phase 3 (docker-compose.prod.yml):**
   - Replace semver tag with digest:
     ```yaml
     compreface-api:
       image: exadel/compreface@sha256:abc123...  # Use digest, not tag
       # OR: exadel/compreface:1.2.0@sha256:abc123...
     compreface-core:
       image: exadel/compreface-core@sha256:def456...
     ```
   - Update `docs/runbooks/DEPLOYMENT.md` with digest reference

3. **Phase 3 (optional — mirror to GHCR):**
   - Pull Compreface once, tag it, push to GHCR (private namespace):
     ```bash
     docker pull exadel/compreface:1.2.0
     docker tag exadel/compreface:1.2.0 ghcr.io/niiiusburo/tgroup/compreface:1.2.0
     docker push ghcr.io/niiiusburo/tgroup/compreface:1.2.0
     # Update docker-compose.prod.yml to use ghcr.io version
     ```
   - Ensures VPS pulls from a controlled source
   - Requires extra storage (copy of large image)

4. **Phase 3 (docs):**
   - Document: "Compreface is public, pinned to semver. Monitor releases for security updates: https://github.com/exadel-labs/CompreFace/releases"

**Detection:**
- Warning: Face enrollment / detection fails after deploy (new Compreface image incompatible)
- Warning: `docker images | grep compreface` shows different SHA for same tag across VPS instances
- Warning: Compreface logs show unexpected errors

---

### Pitfall 11: npm Workspace Resolution Fails in Multi-Stage Dockerfile → Build Hangs or Uses Old Version

**What goes wrong:**
- Dockerfile.api or Dockerfile.web tries to `npm install` with `"@tgroup/contracts": "file:../contracts"`
- In Docker, `COPY contracts/ /contracts/` succeeds, but npm resolution is cached or stale
- Build uses outdated contracts workspace (e.g., old type definitions)
- API runs, but types don't match runtime data → TypeScript errors or runtime crashes
- Or: npm install hangs indefinitely waiting for resolution

**Why it happens:**
- npm workspaces use symlinks locally; Docker `COPY` resolves symlinks, which can break references
- `npm install` caches resolved paths in `node_modules/.package-lock.json`
- Multi-stage build: if build stage installs deps, then production stage copies `node_modules`, the cached path references may be invalid
- Current Dockerfile.api:
  ```dockerfile
  COPY contracts/ /contracts/
  RUN cd /contracts && npm install --omit=dev --no-audit --no-fund
  COPY api/package.json api/package-lock.json ./
  RUN npm ci --production
  ```
  This assumes contracts is in `/contracts`, but npm resolves `file:../contracts` relative to `/app` (WORKDIR), not `/contracts`

**Consequences:**
- Build fails: `npm error ERESOLVE unable to resolve dependency tree`
- Or: build succeeds but API crashes at runtime due to type/interface mismatch
- Deploy is blocked; rollback to previous image required
- Codebase: contracts module exports types for Partner, Appointment, Payment; if API uses stale types, data validation fails

**Prevention:**
1. **Phase 3 (Dockerfile.api refactor):**
   - Ensure npm can resolve workspace locally:
     ```dockerfile
     FROM node:20-alpine
     WORKDIR /app
     
     # Copy contracts first (it's a dependency)
     COPY contracts/ ./contracts/
     
     # Install contracts' own deps
     RUN cd ./contracts && npm install --omit=dev --no-audit
     
     # Now install api with contracts as local workspace
     COPY api/package.json api/package-lock.json ./
     RUN npm ci --production
     
     # Copy source
     COPY api/src ./src
     CMD ["node", "src/server.js"]
     ```

2. **Phase 3 (Dockerfile.web refactor):**
   - Similar pattern for web:
     ```dockerfile
     FROM node:20-alpine AS build
     WORKDIR /app
     
     COPY contracts/ ./contracts/
     RUN cd ./contracts && npm install --omit=dev
     
     COPY website/package.json website/package-lock.json ./
     RUN npm install --legacy-peer-deps
     
     COPY website/ .
     ARG VITE_API_URL
     ENV VITE_API_URL=${VITE_API_URL}
     RUN npm run build
     
     FROM nginx:alpine
     COPY --from=build /app/dist /usr/share/nginx/html
     ```

3. **Phase 2 (GHA workflow):**
   - Test builds locally with full context:
     ```bash
     docker build -f Dockerfile.api -t test .
     docker build -f Dockerfile.web -t test .
     ```

**Detection:**
- Warning: `npm install` hangs or shows `ERESOLVE unable to resolve dependency tree`
- Warning: Build succeeds locally but fails in GHA
- Warning: API crashes at runtime with `Cannot find module '@tgroup/contracts/...`

---

## Lower-Severity Pitfalls (DEBUGGING/EFFICIENCY)

### Pitfall 12: docker-compose.prod.yml and docker-compose.dev.yml Drift → Local Dev ≠ Production

**What goes wrong:**
- Production uses `docker-compose.prod.yml` with prebuilt images
- Local development uses `docker-compose.dev.yml` with `build:` contexts
- One file is updated, the other is forgotten
- Developer tests locally with old configuration, deploys to prod with new configuration
- Bugs appear in production that don't reproduce locally

**Why it happens:**
- Two files to maintain: `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.dev.yml`
- Easy to forget to update both
- DEPLOYMENT.md says: "Use `docker-compose.prod.yml` on VPS", but doesn't enforce consistency checks

**Consequences:**
- Dev/prod parity lost → hard to debug production issues
- Developers waste time reproducing prod bugs locally
- Risky: you deploy something that you haven't actually tested

**Prevention:**
1. **Phase 3 (File structure):**
   - Single compose file with environment override:
     ```yaml
     # docker-compose.yml (base)
     services:
       api:
         image: ${API_IMAGE:-tgroup-api:latest}
         environment:
           DATABASE_URL: ${DATABASE_URL}
     
     # .env.development (local)
     API_IMAGE=tgroup-api:latest
     DATABASE_URL=postgresql://...@db:5432/...
     
     # .env.production (VPS)
     API_IMAGE=ghcr.io/niiiusburo/tgroup/tgroup-api:0.4.15
     DATABASE_URL=postgresql://...@db:5432/...
     ```
   - Single docker-compose.yml, environment-specific overrides via `.env` files

2. **Phase 3 (alternative — explicit compose override):**
   - Keep two files, but enforce consistency via checklist:
     ```markdown
     # docs/runbooks/DEPLOYMENT.md
     
     ## Consistency Check (before deploy)
     - [ ] api service image is identical (except registry domain)
     - [ ] healthcheck config is identical
     - [ ] volume config is identical
     - [ ] network config is identical
     ```

3. **Phase 4 (deploy script):**
   - Verify compose file syntax:
     ```bash
     docker-compose -f docker-compose.prod.yml config > /dev/null || exit 1
     ```

**Detection:**
- Warning: `docker-compose.prod.yml` and `docker-compose.dev.yml` have different service definitions
- Warning: Locally it works, but in production it fails
- Warning: .env files differ between dev and prod in non-obvious ways

---

### Pitfall 13: Stale node_modules Cached in Image Layer → Dependency Bugs in Production

**What goes wrong:**
- First build: `npm install` adds a dependency, layer is cached in GHA
- Second build: `package.json` specifies new version of dependency (e.g., bump from ^2.0.0 to ^2.5.0)
- But `package-lock.json` wasn't regenerated (you forgot to `npm install` locally before pushing)
- GHA cache hit: old node_modules layer is reused
- New code expects features from 2.5.0, but image contains 2.0.0 code → runtime errors
- Or: old version has security vulnerability, code expects patch to be applied

**Consequences:**
- Subtle version mismatch bugs (hard to reproduce)
- Security vulnerability not actually patched despite code change
- Rollback to previous image works (old node_modules were consistent)
- But next build also fails if cache isn't cleared

**Prevention:**
1. **Phase 2 (GHA workflow):**
   - Hash package.json + package-lock.json for cache key:
     ```yaml
     - name: Build Docker image
       uses: docker/build-push-action@v5
       with:
         context: .
         file: Dockerfile.api
         cache-from: type=gha
         cache-to: type=gha,mode=max
         build-context: .
         # GHA automatically uses Dockerfile + all COPY'd files as cache key
     ```

2. **Phase 2 (local discipline):**
   - Enforce: `npm install` before push if you modify package.json
   - CI checklist:
     ```bash
     if git diff --name-only | grep -E 'package.json|package-lock.json'; then
       if ! git diff | grep -q 'package-lock.json'; then
         echo "ERROR: package.json changed but package-lock.json was not updated"
         exit 1
       fi
     fi
     ```

3. **Phase 3 (Dockerfile):**
   - Use `npm ci` (clean install from lock file) instead of `npm install`:
     ```dockerfile
     COPY api/package.json api/package-lock.json ./
     RUN npm ci --production  # Respects lock file; fails if versions mismatch
     ```
   - Current Dockerfile.api already uses `npm ci` ✓

**Detection:**
- Warning: `npm install` works locally, but production code behaves differently
- Warning: Dependency version reported by `npm list` in image doesn't match package.json
- Warning: GHA cache hit despite package.json change

---

### Pitfall 14: BuildKit Cache Size Exceeds 10GB → GHA Eviction or Slow Builds

**What goes wrong:**
- GHA BuildKit cache grows with each build (Docker layers accumulate)
- After 50–100 builds, cache reaches 10GB (GitHub's limit)
- GitHub auto-evicts oldest cache entries
- Next build is a cache miss → full rebuild takes 5–10 min instead of 30 sec
- Repeated cache eviction creates cache thrashing

**Why it happens:**
- Each Docker layer is cached independently
- If Dockerfile has many `RUN` steps (e.g., install, build, cleanup), each creates a layer
- Multi-stage builds create intermediate layers that persist in cache
- No cache pruning configured
- Codebase: Dockerfile.web is multi-stage (build + nginx); layers include node_modules, Vite build artifacts, etc.

**Consequences:**
- Build times increase (10x slower during eviction cycle)
- Deploy time regresses to 3+ min (breaks "under 3 min" goal)
- Unpredictable performance (cache available some days, not others)

**Prevention:**
1. **Phase 2 (GHA workflow):**
   - Minimize layer count in Dockerfile:
     ```dockerfile
     # BAD: 10 layers
     RUN apt-get update
     RUN apt-get install -y curl
     RUN npm install
     RUN npm build
     
     # GOOD: 1 layer
     RUN apt-get update && apt-get install -y curl && npm install && npm run build
     ```

2. **Phase 2 (GHA workflow):**
   - Use `docker/setup-buildx-action@v3` with cache cleanup:
     ```yaml
     - uses: docker/setup-buildx-action@v3
       with:
         cache-binary-format: oci  # Use OCI format (more efficient)
     ```

3. **Phase 3 (Dockerfile optimization):**
   - Consolidate RUN steps:
     ```dockerfile
     # Dockerfile.api (current)
     RUN npm ci --production  # Only one RUN step ✓
     
     # Dockerfile.web (current)
     # Two stages; review for unnecessary layers
     FROM node:20-alpine AS build
     RUN npm install && npm run build  # Can be combined
     ```

4. **Phase 2 (GHA workflow — optional):**
   - Clear cache periodically (monthly):
     ```yaml
     - name: Clear old cache
       if: github.event_name == 'schedule'  # Run on schedule
       run: gh actions-cache delete --all --confirm
       env:
         GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
     ```

**Detection:**
- Warning: Build time increases from 30 sec to 5 min (cache eviction symptom)
- Warning: GHA cache size reported at bottom of workflow log exceeds 8GB
- Warning: Cache hit rate drops below 50%

---

## Summary by Pitfall Severity & Phase

| Pitfall | Severity | Phase 2 | Phase 3 | Phase 4 | Prevention Cost |
|---------|----------|---------|---------|---------|-----------------|
| 1. GHCR token auth | CRITICAL | Create PAT, add secret | `.env.production` config | Test pull before swap | Low |
| 2. Tag mutability | CRITICAL | Semver tags + latest | Extract version from package.json | Verify tag before deploy | Low |
| 3. Contracts workspace | CRITICAL | Test builds locally | Fix COPY paths in Dockerfile | N/A | Low |
| 4. Migration ordering | CRITICAL | Add backward-compat check | Separate migrations from image | Run migrations before swap | Medium |
| 5. Dependent service restart | HIGH | N/A | Use `--no-deps` pattern | Script this logic | Low |
| 6. Healthcheck false positives | HIGH | Add `/health` endpoint | Add healthcheck to compose | Verify in deploy | Low |
| 7. nginx cache stale assets | HIGH | N/A | Verify cache headers | Test after deploy | Low |
| 8. Cache poisoning | HIGH | Use short-lived tokens | Restrict cache by branch | Sign images (optional) | Medium |
| 9. Named volumes deleted | MODERATE | N/A | Protect volumes in compose | Document in runbook | Low |
| 10. Compreface tag mutation | MODERATE | Capture digest | Use digest instead of tag | Mirror to GHCR (optional) | Low |
| 11. npm workspace stale | MODERATE | Test builds locally | Fix COPY order in Dockerfile | N/A | Low |
| 12. Compose file drift | MODERATE | N/A | Single file + .env overrides | Consistency checks | Low |
| 13. Stale node_modules cache | MODERATE | Enforce package-lock update | Use `npm ci` in Dockerfile | N/A | Low |
| 14. BuildKit cache size | MODERATE | Consolidate RUN steps | Minimize layers | Monitor cache size | Low |

---

## Implications for Roadmap Phases

### Phase 2: GHA Workflow
- **Success criteria:**
  - [ ] Builds complete in <2 min
  - [ ] Images pushed to GHCR with semver + latest tags
  - [ ] Backward-compat migrations detected (fail build if found)
  - [ ] Cache uses short-lived GITHUB_TOKEN, not PAT
  - [ ] Semver tag extracted from `website/package.json`
  - [ ] `docker build -f Dockerfile.api .` succeeds locally (contracts resolved)

### Phase 3: docker-compose.yml Refactor
- **Success criteria:**
  - [ ] `docker-compose.prod.yml` pulls images from GHCR with specific tags (no `:latest`)
  - [ ] All services have explicit healthchecks (db, api, web, compreface)
  - [ ] nginx headers verified: `index.html` → `no-cache`, assets → `1y immutable`
  - [ ] `/health` endpoint added to API (checks DB connectivity)
  - [ ] Named volumes protected (can't be accidentally deleted)
  - [ ] `docker compose -f docker-compose.prod.yml config` validates without errors

### Phase 4: Deploy Script + Atomic Swap
- **Success criteria:**
  - [ ] `docker pull` tested before swap (auth verified)
  - [ ] Migrations run **before** image swap
  - [ ] `docker compose up -d --no-deps api` used (skips unnecessary restarts)
  - [ ] Healthchecks gate swap (wait for api, then web to be healthy)
  - [ ] Rollback to previous tag works (`DOCKER_IMAGE_TAG=0.4.14 bash scripts/deploy.sh`)
  - [ ] Deploy completes in <3 min (CI + swap + healthcheck)
  - [ ] Smoke tests verify API responds and web loads

---

## Key Research Gaps (For Phase-Specific Validation)

1. **Phase 2:** Does GHA BuildKit support `RUN --mount=type=secret` for build args? (Prevent ARG secret leaks)
2. **Phase 3:** What is the exact behavior of `docker-compose up -d --no-deps` with depends_on chains?
3. **Phase 4:** Does Compreface healthcheck need special config (currently using default startup, may not timeout correctly)?
4. **General:** Confirmation that `contracts/` file: protocol resolution works in Docker multi-stage build (hasn't been tested).

---

## Sources

- [Working with the Container registry - GitHub Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [How to Handle Docker Image Tagging](https://oneuptime.com/blog/post/2026-02-02-docker-image-tagging/view)
- [Attack of the mutant tags! Or why tag mutability is a real security threat | Sysdig](https://www.sysdig.com/blog/toctou-tag-mutability)
- [GitHub Actions cache | Docker Docs](https://docs.docker.com/build/cache/backends/gha/)
- [The Monsters in Your Build Cache - GitHub Actions Cache Poisoning | Adnan Khan - Security Research](https://adnanthekhan.com/2024/05/06/the-monsters-in-your-build-cache-poisoning/)
- [Control startup and shutdown order in Compose | Docker Docs](https://docs.docker.com/compose/how-tos/startup-order/)
- [How to Update Running Containers Without Downtime](https://oneuptime.com/blog/post/2026-01-06-docker-update-without-downtime/view)
- [Docker Compose Health Checks: An Easy-to-follow Guide | Last9](https://last9.io/blog/docker-compose-health-checks/)
- [How to Create Docker Compose Health Checks](https://oneuptime.com/blog/post/2026-01-30-docker-compose-health-checks/view)
- [NGINX Browser Caching: Cache-Control & Expires Headers Guide (2026)](https://www.getpagespeed.com/server-setup/nginx/nginx-browser-caching)
- [How to Configure Nginx for Production React SPAs](https://oneuptime.com/blog/post/2026-01-15-configure-nginx-production-react-spa/view)
- [Docker Secrets Explained: Setup, Best Practices & Examples | Wiz](https://www.wiz.io/academy/container-security/docker-secrets)
- [SecretsUsedInArgOrEnv | Docker Docs](https://docs.docker.com/reference/build-checks/secrets-used-in-arg-or-env/)
- [How to Plan and Execute Database Migrations Safely](https://oneuptime.com/blog/post/2026-02-20-database-migration-strategies/view)
- [Decoupling database migrations from server startup: why and how](https://pythonspeed.com/articles/schema-migrations-server-startup/)
- [Docker Compose Down Not Deleting Volumes: Data Loss Prevention Guide 2026](https://copyprogramming.com/howto/data-lost-after-docker-compose-down-volume)
- [Using Volumes with Compose](https://apxml.com/courses/docker-for-ml-projects/chapter-6-docker-compose-ml-workflows/compose-volumes)
- [Working with Docker | pnpm](https://pnpm.io/docker)
- [Exploring the Monorepo #5: Perfect Docker - DEV Community](https://dev.to/jonlauridsen/exploring-the-monorepo-5-perfect-docker-52aj)
- [Using npm Workspaces with Docker • Nathan Fries](https://nathanfries.com/posts/docker-npm-workspaces/)
