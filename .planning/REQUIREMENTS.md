# Requirements — TG Clinic

## v1 Requirements (KOL Integration — historical)

### VietQR Payments
- **PAY-01**: User can generate a VietQR code for a service payment with amount and description
- **PAY-02**: User can upload payment proof screenshot after patient transfer
- **PAY-03**: Admin can configure clinic bank account (BIN, account number, account name) in settings
- **PAY-04**: QR description auto-generates from customer name + phone last 4 digits

### Facial Recognition
- **FACE-01**: Receptionist can enroll a new customer's face during registration (multi-angle capture)
- **FACE-02**: Receptionist can scan a customer's face to verify identity and pull up profile
- **FACE-03**: Customer list shows face-enrolled badge for customers with biometrics
- **FACE-04**: System stores 128-dim face descriptor linked to customer record

### Backend / Data
- **DATA-01**: Database migration adds `partner_biometrics` and `partner_biometric_images` tables
- **DATA-02**: Database migration adds `company_bank_settings` table for clinic bank config
- **DATA-03**: API endpoints exist for biometric enroll, match, and phone-check
- **DATA-04**: API endpoints exist for bank settings CRUD

## v1.1 — Architecture Shifts (validated)

- **REQ-06**: Two-tier customer delete with permission gating and FK-safe confirmation dialogs
- **REQ-12**: Multi-branch employee assignment via junction table and dual-selector UI
- **REQ-15**: Payment allocation expanded to dotkhams (examination vouchers) via tabbed UI

---

## v2.0 Requirements — Deploy Speed Refactor

**Milestone goal:** Cut "code fix → live in production" cycle from 8–15 min to **under 3 min** via prebuilt Docker images, GHCR registry, and atomic VPS swap.

**Decisions locked:**
- Auto-rollback on healthcheck failure (60s window)
- Optional migration sidecar (Phase 11; deploy.sh keeps current manual `docker exec` pattern in v2.0)
- GHCR images **private** (PAT-authenticated VPS pulls)
- 2 parallel teams (Backend + Infra)

### Observability — `/api/health` and version surface
- **OBS-01**: `/api/health` endpoint returns 200 with `{ status, db: "up"|"down", uptime_s }` when API can reach Postgres; returns 503 when DB unreachable
- **OBS-02**: `/api/version.json` endpoint returns `{ version, sha, built_at }` sourced from build-time env vars baked into the image
- **OBS-03**: Web frontend `VersionDisplay` component reads `/api/version.json` and shows the running image SHA in the dev tooltip
- **OBS-04**: face-service exposes `/health` endpoint that returns 200 only when ONNX models are loaded (not on cold boot)

### Lifecycle — graceful shutdown
- **LIFE-01**: API process traps SIGTERM, stops accepting new connections, drains in-flight requests within 30s, then exits 0
- **LIFE-02**: face-service Python process traps SIGTERM and exits cleanly within 30s
- **LIFE-03**: nginx (web) reloads gracefully on container stop signal (default behavior verified, not regressed)

### Image — Dockerfile multi-stage rewrites
- **IMG-01**: `Dockerfile.api` is multi-stage: `deps` → `build-contracts` → `runtime`; uses `RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev` so warm rebuilds <20s
- **IMG-02**: `Dockerfile.web` is multi-stage: `deps` → `build` → `nginx-runtime`; strips Playwright/devDeps from runtime; warm rebuilds <30s; final image <80MB
- **IMG-03**: `face-service/Dockerfile` separates ONNX model download into a stable cached layer; warm rebuilds <15s
- **IMG-04**: All three Dockerfiles use BuildKit syntax (`# syntax=docker/dockerfile:1.7`) and pass `docker buildx build` with `--cache-from=type=gha --cache-to=type=gha,mode=max`
- **IMG-05**: `.dockerignore` files exclude `node_modules`, `dist`, `.env*`, `tests/`, `playwright-report/`, `screenshots/` from build context

### Compose — pull-from-GHCR + dev parity
- **CMP-01**: `docker-compose.prod.yml` exists; every custom service uses `image: ghcr.io/niiiusburo/tgroup-{api|web|face}:${TAG}` with `${TAG}` env-substituted; no `build:` blocks for prod images
- **CMP-02**: `docker-compose.dev.yml` exists as override; mounts `./api/src` and `./website/src` for hot reload; uses `build:` to rebuild locally when iterating
- **CMP-03**: `scripts/local-prod-mirror.sh` runs `docker compose -f docker-compose.prod.yml pull && up -d`, hits health endpoints, and prints "✅ matches prod" or fails with diff
- **CMP-04**: `make dev` (or `npm run dev:full`) brings up the entire local stack (api + web + db + face-service + compreface) in one command

### CI — GitHub Actions → GHCR
- **CI-01**: `.github/workflows/build-and-push-ghcr.yml` triggers on push to `main` and on tags `v*`
- **CI-02**: Workflow builds `tgroup-api`, `tgroup-web`, `tgroup-face` in parallel matrix using `docker/build-push-action@v6` with `cache-from: type=gha` + `cache-to: type=gha,mode=max`
- **CI-03**: Each image tagged with: `:${{ github.sha }}`, `:main` (branch), and `:v${VERSION}` extracted from `website/package.json`
- **CI-04**: Workflow authenticates to GHCR using built-in `GITHUB_TOKEN` (no manual PAT needed for push)
- **CI-05**: Workflow does NOT push `:latest` tag (avoid mutability footgun); rollback uses explicit semver tags
- **CI-06**: Workflow fails if any image build exceeds 5 min (caching regression alarm)

### Deploy — atomic swap + auto-rollback
- **DEP-01**: `scripts/deploy.sh` accepts a `TAG` argument (semver or SHA), runs from operator's laptop, SSHes to VPS
- **DEP-02**: deploy.sh verifies the tag exists in GHCR before SSH (fail fast)
- **DEP-03**: deploy.sh on VPS: `docker compose pull` → record current `:${SHA}` as `.last-good-image` → `docker compose up -d --no-deps api web` → poll `/api/health` and `/health` for 60s
- **DEP-04**: If healthcheck passes within 60s → tag deploy as success, log to `/opt/tgroup/deploy.log`
- **DEP-05**: If healthcheck fails within 60s → auto-rollback: re-pull `.last-good-image`, `docker compose up -d --no-deps`, verify recovery, log failure
- **DEP-06**: deploy.sh prints total elapsed time at end; target <3 min from invocation to "live"
- **DEP-07**: VPS authenticates to GHCR via long-lived PAT stored in `/opt/tgroup/.env` (gitignored, file mode 600)
- **DEP-08**: Manual rollback is a one-command operation: `./scripts/deploy.sh $(cat /opt/tgroup/.last-good-image)`

### Migrations — optional sidecar (Phase 11)
- **MIG-01**: `migrations/Dockerfile` builds an image that runs the existing migration runner against `${DATABASE_URL}`
- **MIG-02**: `docker-compose.prod.yml` defines a `migrations` service under `profiles: [migrations]` (not started by default)
- **MIG-03**: `scripts/migrate.sh TAG` runs `docker compose --profile migrations run --rm migrations` against the production DB
- **MIG-04**: Migration runner exits non-zero on failure; v2.0 keeps deploy.sh and migrate.sh as separate operator steps (mandatory chaining deferred to v2.1)

### Documentation
- **DOC-01**: `docs/runbooks/DEPLOYMENT.md` rewritten to describe the new flow: push → CI build → `./scripts/deploy.sh ${TAG}`
- **DOC-02**: `docs/runbooks/INFRASTRUCTURE.md` updated with GHCR namespace, PAT rotation procedure, and `:latest` tag policy
- **DOC-03**: `CLAUDE.md` "Verification Rule" section updated to reference `local-prod-mirror.sh` as the new pre-deploy gate
- **DOC-04**: A new `docs/runbooks/ROLLBACK.md` describes the manual rollback flow with command examples

## v2.1 / Future (deferred from v2.0)

- Auto-chained migrate-then-deploy via single `deploy.sh` invocation (currently 2 commands)
- Slack / Discord deploy notifications via webhook
- Multi-arch image builds (linux/arm64 for future M-series VPS)
- Cosign image signing + verification on VPS pull
- SBOM generation per image
- Blue-green deploys (requires second VPS)

## Out of Scope (v2.0 explicit exclusions)

- Kubernetes / Helm / ArgoCD — single VPS, doesn't need orchestration
- Auto-scaling — single tenant, fixed capacity
- Staging environment — current scale doesn't justify
- Sops / Doppler / Vault — `/opt/tgroup/.env` file with mode 600 is sufficient
- CI-triggered auto-deploy to production — deploy stays human-initiated
- Migration of compreface stack to a private registry — keep public `exadel/compreface:1.2.0` pinned

## Traceability

| REQ-ID | Phase | Notes |
|--------|-------|-------|
| OBS-01 | 5 | `/api/health` endpoint |
| OBS-02 | 5 | `/api/version.json` endpoint |
| OBS-03 | 5 | Web VersionDisplay update |
| OBS-04 | 5 | face-service `/health` endpoint |
| LIFE-01 | 6 | API SIGTERM handler |
| LIFE-02 | 6 | face-service SIGTERM handler |
| LIFE-03 | 6 | nginx graceful reload (verify) |
| IMG-01 | 7 | Dockerfile.api rewrite |
| IMG-02 | 7 | Dockerfile.web rewrite |
| IMG-03 | 7 | face-service/Dockerfile rewrite |
| IMG-04 | 7 | BuildKit cache mounts |
| IMG-05 | 7 | .dockerignore audit |
| CMP-01 | 8 | docker-compose.prod.yml |
| CMP-02 | 8 | docker-compose.dev.yml |
| CMP-03 | 8 | local-prod-mirror.sh |
| CMP-04 | 8 | one-command full stack |
| CI-01 | 9 | Trigger config |
| CI-02 | 9 | Parallel matrix build + cache |
| CI-03 | 9 | Tag strategy |
| CI-04 | 9 | GITHUB_TOKEN auth |
| CI-05 | 9 | No `:latest` push |
| CI-06 | 9 | Build time ceiling |
| DEP-01 | 10 | deploy.sh signature |
| DEP-02 | 10 | Tag pre-flight |
| DEP-03 | 10 | Atomic swap |
| DEP-04 | 10 | Success path logging |
| DEP-05 | 10 | Auto-rollback |
| DEP-06 | 10 | <3 min target |
| DEP-07 | 10 | VPS GHCR auth (PAT) |
| DEP-08 | 10 | Manual rollback command |
| MIG-01 | 11 | migrations Dockerfile |
| MIG-02 | 11 | compose profile |
| MIG-03 | 11 | migrate.sh |
| MIG-04 | 11 | non-zero exit |
| DOC-01 | 12 | DEPLOYMENT.md rewrite |
| DOC-02 | 12 | INFRASTRUCTURE.md update |
| DOC-03 | 12 | CLAUDE.md verification rule |
| DOC-04 | 12 | ROLLBACK.md |
