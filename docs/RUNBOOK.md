# TGroup Clinic — Runbook

> **Cosmetic LOB v2 addition:** See `docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-governance-delta.md` and runbooks/DEPLOYMENT.md + VERIFICATION.md for flag rollout, tcosmetic_demo provisioning/backup, "local only" verification gates, and rollback. Feature flag COSMETIC_LOB_ENABLED controls visibility until Phase 4. Two-DB (tdental_demo + tcosmetic_demo) backup/restore procedures added in runbooks.

> Deploy steps, rollback procedure, health checks, common incidents, per environment.

**Cosmetic LOB v2 sync (2026-05-19):** Feature flag rollout, tcosmetic_demo backup/restore steps, dual DB connection strings (DATABASE_URL + COSMETIC_DATABASE_URL), getDb pools. See docs/runbooks/DEPLOYMENT.md, INFRASTRUCTURE.md, PORTS.md. partners/earnings in both DBs.



## Environments

| Environment | URL | Containers | Notes |
|---|---|---|---|
| Local | `http://localhost:5175` | `tgroup-db`, `tgroup-api`, `tgroup-web`, `face-service` (optional), `compreface-*` (optional) | Dev server + Docker Compose; Face ID provider selected by `FACE_RECOGNITION_PROVIDER` |
| Staging | `https://nk2.2checkin.com` | `tgroup-staging-web`, `tgroup-staging-api`, `tgroup-staging-face-service` | Pre-production verification |
| Production | `https://nk.2checkin.com` | `tgroup-web`, `tgroup-api`, `tgroup-face-service`, `tgroup-db` | Live clinic operations |

## Pre-Deploy Checklist

1. **Git status clean** on intended branch.
2. **Local verification gates passed:**
   - Frontend: `npm --prefix website run lint && npm --prefix website test && npm --prefix website run build`
   - API: `npm --prefix api test`
   - Contracts: `npm --prefix contracts run build`
   - Infra: `bash -n scripts/deploy-tbot.sh && docker compose config`
   - Governance: `bash scripts/verify-docs.sh`
3. **Version and changelog aligned:**
   - `website/package.json` version bumped if runtime code changed.
   - `docs/CHANGELOG.md` entry appended.
   - `testbright.md` updated when the change touches frontend, feature behavior, or backend data flow.
4. **Migrations verified locally:**
   - Run unapplied migrations against local Docker DB.
   - Confirm idempotency (`IF NOT EXISTS`).
5. **Permission/data seeds verified:**
   - If new permissions added, confirm they are in `group_permissions` seed or UI.
6. **Nginx timeout check:**
   - If exports changed, confirm `proxy_read_timeout 300s` in production nginx.
7. **Save round-trip smoke (two-DB persistence gate):**
   - Run the NK3 save round-trip harness (see below) whenever a create/edit
     path or the cosmetic LOB write logic changed. It catches the bug class
     where a form looks saved but silently drops a row/scope (e.g. a CTV
     scoped dental+cosmetic that fails to write the dental auth row).

## Save Round-Trip Smoke Harness

`scripts/nk3-only/nk3-save-roundtrip-smoke.py` drives the real create endpoints
against the local two-DB stack (`tdental_demo` + `tcosmetic_demo` on 5433), then
reads each written row back out of **both** physical databases and asserts what
actually persisted. It is the durable guard against the "save dropped my data"
class of bug — most importantly the two-DB Cosmetic LOB v2 split where a
dental+cosmetic CTV must land in BOTH DBs and a cosmetic-only selection must
still create the dental auth row. It is local-only and self-cleaning (every
fixture it creates is deleted, and a unique marker lets a crashed run be swept).
Exit code is 0 (all pass) or 1 (any fail) so it slots into a pre-deploy gate.

```bash
# 1. Start the API locally with cosmetic mirrors enabled (separate shell):
cd api && TZ=Asia/Ho_Chi_Minh JWT_SECRET=devsecret \
    COSMETIC_LOB_ENABLED=true PORT=3002 node src/server.js

# 2. Run the harness (forges an admin JWT from a discovered admin-group member):
JWT_SECRET=devsecret python3 scripts/nk3-only/nk3-save-roundtrip-smoke.py
# Expected tail: "4/4 save round-trip checks passed", exit 0.
```

It is verified to FAIL (exit 1) if the dental-forcing logic in
`api/src/routes/ctv.js` regresses — i.e. it reproduces and catches the original
reported CTV bug. Add new `test_*` functions as more create/edit surfaces need
round-trip coverage (one assertion per persistence invariant).

## Deploy Steps

```bash
# 1. Run the deploy script
bash scripts/deploy-tbot.sh

# 2. Watch container health
docker ps

# 3. Check API health
curl -s https://nk.2checkin.com/api/health | jq .
# Expected: { "status": "healthy"|"degraded", "checks": { "db": true|false, "faceService": true|false }, "faceProvider": "local"|"compreface"|... }

# 4. Verify web build version
curl -s https://nk.2checkin.com/version.json | jq .
# Expected: { "version": "x.y.z", "buildTime": "..." }

# 5. Apply any pending canonical DB migrations on VPS
for f in /opt/tgroup/api/migrations/*.sql; do
  docker exec -i tgroup-db psql -U postgres -d tdental_demo < "$f"
done
```

`api/migrations/` is the canonical migration path for deployment. `api/src/db/migrations/`
currently contains supplemental straggler SQL files (`003_add_payment_category.sql`,
`046_customer_face_embeddings.sql`); review `docs/MIGRATIONS.md` before deploy when a
change depends on either supplemental migration, and consolidate or run it explicitly
instead of assuming it is covered by the canonical loop.

## Rollback Procedure

1. **Identify last known good commit.**
2. **Checkout good commit** on VPS or rebuild from good image tag.
3. **Restart containers:**
   ```bash
   docker compose down && docker compose up -d
   ```
4. **Verify health** (same checks as deploy step 3-5).
5. **If schema migration was applied:**
   - Manual rollback SQL must be run (migrations do not auto-down).
   - Consult `docs/MIGRATIONS.md` for rollback notes per migration.

## Health Checks

### API Health Endpoint
```bash
curl https://nk.2checkin.com/api/health
```
Expected fields:
- `status: "healthy"|"degraded"`
- `checks.db: true|false`
- `checks.faceService: true|false` (optional provider failures are acceptable per INV-014 when the changed flow does not require Face ID)
- `faceProvider: "local"|"compreface"|...`

### Database Connectivity
```bash
docker exec -i tgroup-db pg_isready -U postgres -d tdental_demo
```

### Daily Database Backups
The VPS root crontab runs read-only `pg_dump` backups for the live/smoke
databases from the `tgroup-db` PostgreSQL 16 container. The shared script is:

```bash
/opt/tgroup/scripts/backup-nk-db.sh
```

The script creates compressed PostgreSQL custom-format dumps, writes `.sha256`
checksums, and keeps the latest 7 dump sets for each configured database. It
does not restore, import, truncate, or modify database rows.

| Database | Schedule (Vietnam time) | VPS backup directory | Local download directory |
|---|---:|---|---|
| `tdental_demo` | 12:00 | `/opt/tgroup/backups/nk-db-daily/` | `backups/nk-db-daily/` |
| `tdental_smoketest` | 12:15 | `/opt/tgroup/backups/nk3-dental-smoketest-db-daily/` | `backups/nk3-dental-smoketest-db-daily/` |
| `tcosmetic_smoketest` | 12:30 | `/opt/tgroup/backups/nk3-cosmetic-db-daily/` | `backups/nk3-cosmetic-db-daily/` |

Manual verification for one target:

```bash
backup_dir=/opt/tgroup/backups/nk-db-daily
db_name=tdental_demo
backup=$(ls -1 "${backup_dir}/nk-${db_name}-"*.dump | sort | tail -1)
sha256sum -c "${backup}.sha256"
docker exec -i tgroup-db pg_restore -l < "$backup" | head -20
find "${backup_dir}" -maxdepth 1 -type f -name "nk-${db_name}-*.dump" | wc -l
crontab -l | grep -E "tdental_demo|tdental_smoketest|tcosmetic_smoketest"
```

The Codex daily backup verification automation verifies all three targets,
checks checksums and archive readability, downloads the newest verified dump and
checksum for each target to the matching local directory above, and keeps the
latest 7 local dump sets.

### Face Service
```bash
curl http://localhost:8001/health
# or from API/API container when FACE_RECOGNITION_PROVIDER=local:
curl $FACE_SERVICE_URL/health
```

### CompreFace Face ID Provider
```bash
# Host port defaults to 8002 so it does not collide with other local services.
docker compose up -d compreface-postgres-db compreface-api compreface-core
curl -H "x-api-key: $COMPREFACE_API_KEY" http://localhost:8002/api/v1/recognition/subjects
# API health should include: "faceProvider":"compreface"
curl -s http://localhost:3002/api/health | jq .
```

### Nginx / Static Serving
```bash
curl -I https://nk.2checkin.com/
# Expect 200 + correct cache headers
```

## Common Incidents

### Incident A: API returns 500 with `relation "dbo.xxx" does not exist`
- **Cause:** Migration not applied on VPS.
- **Fix:** Run pending migrations (see Deploy Step 5).
- **Prevention:** Add migration run to deploy script checklist.

### Incident B: Login fails for all users (`Invalid email or password`)
- **Cause:** `password_hash` column added as NOT NULL without updating legacy employees; or `JWT_SECRET` changed.
- **Fix:** Check `partners.password_hash IS NULL` rows; set temporary hashes or allow NULL. Verify `JWT_SECRET` env var.

### Incident C: Exports timeout at 60s
- **Cause:** Nginx proxy timeout default is 60s.
- **Fix:** Update nginx `proxy_read_timeout`, `proxy_send_timeout`, `send_timeout` to `300s`.

### Incident D: Face recognition stops working
- **Cause:** Configured provider is down: `face-service` container/model failure for local mode, or CompreFace container/API-key failure for CompreFace mode.
- **Fix:** Check `FACE_RECOGNITION_PROVIDER`, `/api/health.faceProvider`, and provider logs (`docker logs tgroup-face-service` or `docker logs compreface-api`). Confirm `FACE_SERVICE_URL` or `COMPREFACE_URL` connectivity from the API runtime.

### Incident E: Permission "No permissions" for active employee
- **Cause:** `partners.tier_id` is NULL (INC-20260506-01).
- **Fix:** Admin assigns permission group in `/permissions` or direct DB update.

### Incident F: Hosoonline images not loading (mixed content)
- **Cause:** Upstream returns `http://` image URLs on HTTPS page.
- **Fix:** Frontend HTTPS fallback (`AuthenticatedCheckupImage`); backend proxy normalization.

## Environment-Specific Notes

### Production
- Do NOT deploy big features during Vietnam work hours (09:00–21:00 ICT).
- Small fixes should still be verified locally first.
- Keep `tgroup-db` backups before schema migrations.

### Staging
- Staging may share the same VPS as production; use distinct container names and ports.
- `FACE_SERVICE_HOST_PORT` must differ if both prod and staging face services run.

### Local
- Dev server port is `5175` (not `3002`).
- PostgreSQL exposed on `127.0.0.1:55433` for direct psql access.
- `TZ=Asia/Ho_Chi_Minh` must be set in API environment for correct timestamp parsing.
