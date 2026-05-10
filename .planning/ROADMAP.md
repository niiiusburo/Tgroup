# ROADMAP — TG Clinic v2.0 Deploy Speed Refactor

**Milestone:** v2.0 Deploy Speed Refactor  
**Goal:** Cut "code fix → live in production" cycle from 8–15 min to **under 3 min** via prebuilt Docker images, GHCR registry, and atomic VPS swap  
**Duration:** 12–14 days (2–3 engineers, parallel teams)  
**Created:** 2026-05-10

---

## Phases

- [ ] **Phase 5: Health & Version Endpoints** — Backend team — Observable service status
- [ ] **Phase 6: Graceful Shutdown** — Backend team — Clean process termination
- [ ] **Phase 7: Dockerfile Multi-Stage Rewrites** — Infra team — Fast, cached image builds
- [ ] **Phase 8: Compose Files + Local Prod-Parity** — Infra team — Registry-pull compose + local override
- [ ] **Phase 9: GitHub Actions → GHCR** — CI team — Build & push workflow with caching
- [ ] **Phase 10: Atomic Deploy Script** — Backend team — Healthcheck-gated swap + rollback
- [ ] **Phase 11: Migration Sidecar (optional)** — Infra team — Explicit migration runner
- [ ] **Phase 12: Docs + E2E Cycle Verification** — Either team — Runbooks + <3 min timing validation

---

## Wave Execution Plan

### Wave 1 (Days 1–4) — 2 Teams Parallel

**Backend Team (Phase 5 → 6)** | **Infra Team (Phase 7 → 8)**
- Phase 5: Health & Version Endpoints | Phase 7: Dockerfile Multi-Stage Rewrites
- Phase 6: Graceful Shutdown | Phase 8: Compose Files + Prod-Parity

**Unblocking:** Phase 7–8 only need code to compile; they don't need Phase 5–6 to be merged. Each team produces independently mergeable PRs.

### Wave 2 (Days 5–7) — 1 Team Sequential

**CI Team (Phase 9)**
- Depends on: Phase 7 + Phase 8 (Dockerfiles and compose files merged)
- Phase 9: GitHub Actions → GHCR (builds images, pushes to registry)

### Wave 3 (Days 8–10) — 2 Teams Parallel

**Backend Team (Phase 10)** | **Infra Team (Phase 11, optional)**
- Phase 10: Atomic Deploy Script | Phase 11: Migration Sidecar
- (Needs Phase 5 + 6 + 9 merged) | (Independent; can run in parallel)

**Unblocking:** Phase 10 blocks Phase 12; Phase 11 is optional (deferred to v2.1 if time is short).

### Wave 4 (Days 11–12) — 1 Team

**Either Team (Phase 12)**
- Depends on: All phases merged
- Phase 12: Docs + E2E Cycle Verification

---

## Phase Details

### Phase 5: Health & Version Endpoints

**Goal:** Observable service status — `/api/health` and `/api/version.json` endpoints report connectivity and deployment metadata  
**Team:** Backend  
**Depends on:** Nothing  
**Blocks:** Phase 10 (deploy script needs endpoints to healthcheck)  
**Requirements:** OBS-01, OBS-02, OBS-03, OBS-04  

**Success Criteria** (what must be TRUE when phase completes):
1. GET `/api/health` returns 200 with `{ status, db: "up"|"down", uptime_s }` when DB is reachable; returns 503 when DB is unreachable
2. GET `/api/version.json` returns `{ version, sha, built_at }` with values from build-time env vars (not hardcoded)
3. Web `VersionDisplay` component reads `/api/version.json` and displays running image SHA in dev tooltip
4. GET `/health` on face-service returns 200 only after ONNX models fully loaded (not on cold boot)

**Test in isolation:**
```bash
# Start API + DB locally
docker compose up -d db api

# Wait for API to be ready
sleep 5

# Test /api/health
curl http://localhost:3002/api/health
# Expected: 200 { "status": "healthy", "db": "up", "uptime_s": X }

# Stop DB
docker compose stop db

# Test /api/health with DB down
curl http://localhost:3002/api/health
# Expected: 503 { "status": "unhealthy", "db": "down" }

# Restart DB
docker compose up -d db

# Test /api/version.json
curl http://localhost:3002/api/version.json
# Expected: 200 { "version": "0.4.15", "sha": "abc123...", "built_at": "2026-05-10T00:00:00Z" }

# Test face-service /health
curl http://localhost:5000/health
# Expected: 200 when models loaded
```

**Plans:** TBD

---

### Phase 6: Graceful Shutdown

**Goal:** Clean process termination on SIGTERM — API, face-service drain in-flight requests and exit without data corruption  
**Team:** Backend  
**Depends on:** Nothing (can parallel with Phase 5)  
**Blocks:** Phase 10 (deploy script relies on graceful shutdown for zero-downtime swap)  
**Requirements:** LIFE-01, LIFE-02, LIFE-03  

**Success Criteria** (what must be TRUE when phase completes):
1. API process traps SIGTERM, stops accepting new connections, drains existing requests within 30s, exits 0
2. face-service Python process traps SIGTERM and exits cleanly within 30s
3. nginx graceful reload on SIGTERM verified (default Docker behavior, no regression)

**Test in isolation:**
```bash
# Start API
docker compose up -d api

# Send SIGTERM to container
docker compose stop api --timeout=30

# Check logs for graceful shutdown message
docker compose logs api | tail -20
# Expected: "Received SIGTERM" or similar, then "Exiting gracefully"
# Expected: exit code 0 (not 1 or 137)

# Start face-service
docker compose up -d face-service

# Send SIGTERM
docker compose stop face-service --timeout=30

# Verify face-service exited cleanly
docker compose ps face-service
# Expected: status "Exited (0)" not "Exited (137)"

# Verify nginx reload
docker compose exec web nginx -s reload
# Expected: no errors
```

**Plans:** TBD

---

### Phase 7: Dockerfile Multi-Stage Rewrites

**Goal:** Fast, cached image builds — multi-stage Dockerfiles with BuildKit cache mounts for api, web, face-service  
**Team:** Infra  
**Depends on:** Nothing  
**Blocks:** Phase 9 (CI workflow needs correct Dockerfiles to build)  
**Requirements:** IMG-01, IMG-02, IMG-03, IMG-04, IMG-05  

**Success Criteria** (what must be TRUE when phase completes):
1. `Dockerfile.api` is multi-stage (deps → build-contracts → runtime); warm cache rebuilds <20s
2. `Dockerfile.web` is multi-stage (deps → build → nginx-runtime); final image <80MB; warm rebuilds <30s
3. `face-service/Dockerfile` separates ONNX model download into stable cached layer; warm rebuilds <15s
4. All Dockerfiles use BuildKit syntax and pass `docker buildx build` with GHA cache flags
5. `.dockerignore` files exclude non-essential files (node_modules, dist, tests, playwright, etc.)

**Test in isolation:**
```bash
# Test api Dockerfile warm cache rebuild
docker buildx build -f Dockerfile.api -t tgroup-api:test . --cache-from=type=local,src=/tmp/buildx-cache --cache-to=type=local,dest=/tmp/buildx-cache,mode=max
# First run: 1–2 min, Second run: <20s expected

# Verify final image size
docker build -f Dockerfile.api -t tgroup-api:test .
docker image ls tgroup-api:test
# Expected: image size reasonable for Node.js app (100–200 MB)

# Test web Dockerfile final size
docker build -f Dockerfile.web -t tgroup-web:test .
docker image ls tgroup-web:test
# Expected: <80 MB

# Test face-service warm rebuild
docker build -f face-service/Dockerfile -t tgroup-face:test face-service
# First run: 2–3 min, Second run: <15s expected

# Verify .dockerignore excludes unnecessary files
docker build -f Dockerfile.api -t test . --progress=plain 2>&1 | grep -i "COPY\|ADD"
# Should not see node_modules, dist, tests, etc. being copied
```

**Plans:** TBD

---

### Phase 8: Compose Files + Local Prod-Parity

**Goal:** Registry-pull compose for production + dev override for local testing  
**Team:** Infra  
**Depends on:** Phase 7 (needs correct Dockerfiles)  
**Blocks:** Phase 9 (CI workflow needs to know what images to build)  
**Requirements:** CMP-01, CMP-02, CMP-03, CMP-04  

**Success Criteria** (what must be TRUE when phase completes):
1. `docker-compose.prod.yml` exists; every custom service uses `image: ghcr.io/niiiusburo/tgroup-{api|web|face}:${TAG}` with env-substituted TAG; no `build:` blocks
2. `docker-compose.dev.yml` override exists; mounts `./api/src` and `./website/src` for hot reload; uses `build:` to rebuild locally
3. `scripts/local-prod-mirror.sh` runs `docker compose -f docker-compose.prod.yml pull && up -d`, hits `/api/health` + `/health`, prints "✅ matches prod" or shows diff
4. `make dev` (or `npm run dev:full`) brings entire local stack up in one command with hot reload

**Test in isolation:**
```bash
# Test prod compose file validation
docker-compose -f docker-compose.prod.yml config > /dev/null
# Expected: no errors

# Test local dev compose file
docker-compose -f docker-compose.dev.yml config > /dev/null
# Expected: no errors

# Start full local stack with dev overrides
docker compose -f docker-compose.dev.yml up -d
sleep 10

# Verify all services healthy
docker compose -f docker-compose.dev.yml ps
# Expected: all services "Up" or "healthy"

# Test local-prod-mirror.sh (requires pulling from GHCR; will fail without auth, but script structure is verified)
bash scripts/local-prod-mirror.sh
# Expected: pulls images, boots, hits healthchecks (or fails gracefully with clear error if images don't exist)

# Verify hot reload (edit a file in ./api/src, check if API reloads)
touch api/src/dummy.txt
sleep 2
docker compose -f docker-compose.dev.yml logs api | tail -5
# Expected: some indication of file watch or reload (varies by framework)
```

**Plans:** TBD

---

### Phase 9: GitHub Actions → GHCR

**Goal:** Build & push workflow with caching to GHCR  
**Team:** CI (can be either backend or infra)  
**Depends on:** Phase 7 + Phase 8 (Dockerfiles and compose structure finalized)  
**Blocks:** Phase 10 (deploy script pulls from GHCR)  
**Requirements:** CI-01, CI-02, CI-03, CI-04, CI-05, CI-06  

**Success Criteria** (what must be TRUE when phase completes):
1. `.github/workflows/build-and-push-ghcr.yml` triggers on push to `main` and tags `v*`
2. Workflow builds `tgroup-api`, `tgroup-web`, `tgroup-face-service` in parallel matrix with GHA cache backend
3. Each image tagged with `:${GITHUB_SHA}`, `:main` (branch), and `:v${VERSION}` extracted from `website/package.json`
4. Workflow authenticates to GHCR using built-in `GITHUB_TOKEN` (no manual PAT for push)
5. Workflow does NOT push `:latest` tag (immutable semver tags only)
6. Workflow fails if any image build exceeds 5 min (caching regression alarm)

**Test in isolation:**
```bash
# Test workflow by pushing to a test branch
git checkout -b test/ghcr-workflow
git push origin test/ghcr-workflow

# Monitor GitHub Actions logs
# Expected: Workflow runs, builds all 3 images, pushes to GHCR with semver + SHA tags
# Expected: Each build completes in <2 min (with cache hit)

# Verify images in GHCR
gh api repos/niiiusburo/Tgroup/contents/ghcr.io/niiiusburo/tgroup-api
# Or manually check GitHub Actions UI under "Packages"
# Expected: Images appear with tags like "v0.4.15", "abc1234..." (SHA)

# Verify no :latest tag
docker pull ghcr.io/niiiusburo/tgroup-api:latest
# Expected: fails or pulls an old image (no auto-push of :latest)

# Verify build time <5 min
# Check GitHub Actions workflow logs
# Expected: "Build and push" step completes in ~2 min (with cache), <5 min even on cache miss
```

**Plans:** TBD

---

### Phase 10: Atomic Deploy Script

**Goal:** Healthcheck-gated swap + auto-rollback  
**Team:** Backend  
**Depends on:** Phase 5 + Phase 6 + Phase 9 (health endpoints, graceful shutdown, images in GHCR)  
**Blocks:** Phase 12 (needs deploy script to work for E2E cycle test)  
**Requirements:** DEP-01 through DEP-08  

**Success Criteria** (what must be TRUE when phase completes):
1. `scripts/deploy.sh TAG` accepts semver (v0.4.15) or SHA (abc1234...), SSHes to VPS, verifies tag exists in GHCR before SSH
2. On VPS: `docker compose pull` → record `:${SHA}` as `.last-good-image` → `docker compose up -d --no-deps api web` → poll `/api/health` + `/health` for 60s
3. If healthcheck passes within 60s → log success, tag deploy as complete
4. If healthcheck fails → auto-rollback: re-pull `.last-good-image`, `docker compose up -d --no-deps`, verify recovery, log failure
5. Total elapsed time from invocation to "live" is <3 min
6. VPS authenticates to GHCR via long-lived PAT in `/opt/tgroup/.env` (file mode 600, gitignored)
7. Manual rollback: `./scripts/deploy.sh $(cat /opt/tgroup/.last-good-image)` completes in <30s

**Test in isolation:**
```bash
# Test deploy.sh with a staging tag (e.g., v0.4.14 already in GHCR)
bash scripts/deploy.sh v0.4.14

# Expected: Script runs, connects to VPS, pulls image, healthchecks pass, script exits 0
# Expected: Total time <3 min
# Expected: VPS logs show successful swap

# Monitor VPS during deploy
ssh root@76.13.16.68 "tail -f /opt/tgroup/deploy.log"

# Test auto-rollback by tagging a broken image as test-broken
# (In practice: temporarily introduce a deliberate healthcheck failure in a PR, push to test branch)
bash scripts/deploy.sh test-broken

# Expected: Script pulls test-broken, healthcheck fails at 60s, script auto-rolls back to .last-good-image
# Expected: /api/health returns 200 after rollback
# Expected: Script exits with non-zero code (indicates failure)

# Test manual rollback
LAST_GOOD=$(ssh root@76.13.16.68 "cat /opt/tgroup/.last-good-image")
bash scripts/deploy.sh $LAST_GOOD
# Expected: Swap completes in <30s, healthcheck passes
```

**Plans:** TBD

---

### Phase 11: Migration Sidecar (optional)

**Goal:** Explicit migration runner service (deferred if time is short)  
**Team:** Infra  
**Depends on:** Phase 10 (migrations are logically separate from app swap, but deploy.sh acts as gate)  
**Blocks:** Phase 12 (optional; v2.0 keeps current manual `docker exec` pattern if deferred)  
**Requirements:** MIG-01, MIG-02, MIG-03, MIG-04  

**Success Criteria** (what must be TRUE when phase completes):
1. `migrations/Dockerfile` builds an image that runs the existing migration runner against `${DATABASE_URL}`
2. `docker-compose.prod.yml` defines a `migrations` service under `profiles: [migrations]` (not started by default)
3. `scripts/migrate.sh TAG` runs `docker compose --profile migrations run --rm migrations` against prod DB
4. Migration runner exits non-zero on failure (deploy.sh can detect and gate app swap)

**Test in isolation:**
```bash
# Test migrations Dockerfile build
docker build -f migrations/Dockerfile -t tgroup-migrations:test .
# Expected: image builds without errors

# Test migration runner locally
docker compose run --rm migrations
# Expected: runs migrations, exits 0 if no changes, or applies pending migrations

# Test on VPS: run migration for a test version
ssh root@76.13.16.68 "cd /opt/tgroup && bash scripts/migrate.sh v0.4.15"
# Expected: migrations applied successfully

# Test failure case: intentionally broken migration
# (In a test branch: add invalid SQL to a pending migration)
bash scripts/migrate.sh test-broken-migration
# Expected: migration runner fails, exits non-zero
# Expected: app swap is NOT triggered (verify deploy.sh logic gates this)
```

**Plans:** TBD

---

### Phase 12: Docs + E2E Cycle Verification

**Goal:** Runbook updates + end-to-end <3 min validation  
**Team:** Either (integrating phase)  
**Depends on:** All phases (Phase 5–11)  
**Blocks:** Nothing (final integration)  
**Requirements:** DOC-01, DOC-02, DOC-03, DOC-04  

**Success Criteria** (what must be TRUE when phase completes):
1. `docs/runbooks/DEPLOYMENT.md` rewritten to describe flow: push → CI build → `./scripts/deploy.sh ${TAG}`
2. `docs/runbooks/INFRASTRUCTURE.md` updated with GHCR namespace, PAT rotation procedure, `:latest` tag policy, pitfall guards
3. `CLAUDE.md` "Verification Rule" section updated to reference `local-prod-mirror.sh` as pre-deploy gate
4. New `docs/runbooks/ROLLBACK.md` describes manual rollback with command examples
5. **End-to-end timing validation:** Stopwatch a real code fix (e.g., change a comment in api/src or website) → push to main → CI builds → deploy.sh completes in **<3 min total**

**Test in isolation:**
```bash
# Make a trivial change (e.g., update API version in package.json or comment in code)
# Push to main
git commit -am "test: bump for e2e timing" && git push origin main

# Time the full cycle
time bash scripts/deploy.sh $(jq -r '.version' website/package.json)

# Verify result
curl https://nk.2checkin.com/api/health
# Expected: returns updated version if applicable
# Expected: total elapsed time (from push to live) <3 min

# Verify runbooks are accurate and complete
cat docs/runbooks/DEPLOYMENT.md | grep -i "deploy.sh"
# Expected: instructions match actual script behavior

# Check rollback procedure
cat docs/runbooks/ROLLBACK.md
# Expected: clear, actionable rollback steps with examples
```

**Plans:** TBD

---

## Requirement Traceability

| REQ-ID | Phase | Category | Status |
|--------|-------|----------|--------|
| OBS-01 | 5 | Observability | Pending |
| OBS-02 | 5 | Observability | Pending |
| OBS-03 | 5 | Observability | Pending |
| OBS-04 | 5 | Observability | Pending |
| LIFE-01 | 6 | Lifecycle | Pending |
| LIFE-02 | 6 | Lifecycle | Pending |
| LIFE-03 | 6 | Lifecycle | Pending |
| IMG-01 | 7 | Image | Pending |
| IMG-02 | 7 | Image | Pending |
| IMG-03 | 7 | Image | Pending |
| IMG-04 | 7 | Image | Pending |
| IMG-05 | 7 | Image | Pending |
| CMP-01 | 8 | Compose | Pending |
| CMP-02 | 8 | Compose | Pending |
| CMP-03 | 8 | Compose | Pending |
| CMP-04 | 8 | Compose | Pending |
| CI-01 | 9 | CI/CD | Pending |
| CI-02 | 9 | CI/CD | Pending |
| CI-03 | 9 | CI/CD | Pending |
| CI-04 | 9 | CI/CD | Pending |
| CI-05 | 9 | CI/CD | Pending |
| CI-06 | 9 | CI/CD | Pending |
| DEP-01 | 10 | Deploy | Pending |
| DEP-02 | 10 | Deploy | Pending |
| DEP-03 | 10 | Deploy | Pending |
| DEP-04 | 10 | Deploy | Pending |
| DEP-05 | 10 | Deploy | Pending |
| DEP-06 | 10 | Deploy | Pending |
| DEP-07 | 10 | Deploy | Pending |
| DEP-08 | 10 | Deploy | Pending |
| MIG-01 | 11 | Migration | Pending |
| MIG-02 | 11 | Migration | Pending |
| MIG-03 | 11 | Migration | Pending |
| MIG-04 | 11 | Migration | Pending |
| DOC-01 | 12 | Documentation | Pending |
| DOC-02 | 12 | Documentation | Pending |
| DOC-03 | 12 | Documentation | Pending |
| DOC-04 | 12 | Documentation | Pending |

**Total Mapped:** 36/36 requirements ✓

---

## Progress Table

| Phase | Goal | Team | Wave | Plans Complete | Status | Completed |
|-------|------|------|------|----------------|--------|-----------|
| 5 | Health & Version Endpoints | Backend | 1 | 0/TBD | Not started | — |
| 6 | Graceful Shutdown | Backend | 1 | 0/TBD | Not started | — |
| 7 | Dockerfile Multi-Stage Rewrites | Infra | 1 | 0/TBD | Not started | — |
| 8 | Compose Files + Prod-Parity | Infra | 1 | 0/TBD | Not started | — |
| 9 | GitHub Actions → GHCR | CI | 2 | 0/TBD | Not started | — |
| 10 | Atomic Deploy Script | Backend | 3 | 0/TBD | Not started | — |
| 11 | Migration Sidecar (optional) | Infra | 3 | 0/TBD | Not started | — |
| 12 | Docs + E2E Verification | Either | 4 | 0/TBD | Not started | — |

---

## Key Decisions Locked

1. **Auto-rollback on healthcheck failure:** Deploy script auto-reverts to `.last-good-image` on healthcheck miss (60s window)
2. **Migration sidecar placement:** Phase 11 (optional); if time is short, v2.0 keeps current `docker exec` pattern for manual migrations
3. **GHCR privacy:** Images are **private** (PAT-authenticated VPS pulls); registry is under `niiiusburo/Tgroup` namespace
4. **Parallel team structure:** 2 teams (Backend + Infra) with Wave 1 fully parallelizable (no dependencies between teams)

---

## Pitfall Guards (Researched)

This roadmap incorporates 14 pitfall prevention guards from PITFALLS.md. Key guards encoded in success criteria:

- **Pitfall 1 (GHCR auth):** Phase 9 + 10 — VCS PAT with `write:packages` scope; Phase 10 tests pull before swap
- **Pitfall 2 (tag mutability):** Phase 9 — Semver tags extracted from `website/package.json`; no `:latest` push
- **Pitfall 3 (contracts workspace):** Phase 7 — COPY contracts before `npm install`; test locally with full context
- **Pitfall 4 (migration ordering):** Phase 11 — Migrations run before app swap; backward-compat guards in CI
- **Pitfall 5 (dependent service restart):** Phase 10 — Use `--no-deps` flag in deploy script
- **Pitfall 6 (healthcheck false positives):** Phase 5 + 8 — `/api/health` checks DB connectivity; explicit healthchecks in compose
- **Pitfall 7 (nginx cache stale):** Phase 8 — Verify cache headers (`/index.html` → no-cache, assets → 1y)
- **Additional pitfalls 8–14:** Documented in PITFALLS.md with phase assignments

---

## Definition of Done (per phase)

Each phase is complete when:
1. ✓ All success criteria verified (observable, repeatable)
2. ✓ "Test in isolation" commands pass without manual intervention
3. ✓ All associated REQ-IDs satisfied
4. ✓ PR passes CI (lint, type check, build)
5. ✓ Merged to `ai-develop` (staging gate before `main`)
6. ✓ Plans documented in PLAN.md (via `/gsd-plan-phase`)

---

## Next Steps

1. **User approval:** Confirm wave structure, team assignments, and success criteria
2. **Phase 5 planning:** `/gsd-plan-phase 5` — Backend team starts with health endpoints
3. **Parallel Phase 7 planning:** `/gsd-plan-phase 7` — Infra team starts with Dockerfile rewrites
4. **Daily standup:** Check progress, unblock Phase 9 dependency (CI workflow trigger)
5. **Wave 2 trigger:** Once Phases 7–8 are merged, Phase 9 (CI) can begin

---

*Last updated: 2026-05-10*
