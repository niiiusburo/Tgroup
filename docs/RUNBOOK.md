# TGroup Clinic — Runbook

> Deploy steps, rollback procedure, health checks, common incidents, per environment.

## Environments

| Environment | URL | Containers | Notes |
|---|---|---|---|
| Local | `http://localhost:5175` | `tgroup-db`, `tgroup-api`, `tgroup-web`, `face-service` (optional), `compreface-*` (optional) | Dev server + Docker Compose |
| Staging | `https://nk2.2checkin.com` | `tgroup-staging-web`, `tgroup-staging-api`, `tgroup-staging-face-service` | Pre-production verification |
| Production | `https://nk.2checkin.com` | `tgroup-web`, `tgroup-api`, `tgroup-face-service`, `tgroup-db` | Live clinic operations |

## Pre-Deploy Checklist

1. **Git status clean** on intended branch.
2. **Local verification gates passed:**
   - Frontend: `npm --prefix website run lint && npm --prefix website test && npm --prefix website run build`
   - API: `npm --prefix api test`
   - Contracts: `npm --prefix contracts run build`
   - Infra: `bash -n scripts/deploy-tbot.sh && docker compose config`
3. **Version and changelog aligned:**
   - `website/package.json` version bumped if runtime code changed.
   - `docs/CHANGELOG.md` entry appended.
4. **Migrations verified locally:**
   - Run unapplied migrations against local Docker DB.
   - Confirm idempotency (`IF NOT EXISTS`).
5. **Permission/data seeds verified:**
   - If new permissions added, confirm they are in `group_permissions` seed or UI.
6. **Nginx timeout check:**
   - If exports changed, confirm `proxy_read_timeout 300s` in production nginx.

## Deploy Steps

```bash
# 1. Run the deploy script
bash scripts/deploy-tbot.sh

# 2. Watch container health
docker ps

# 3. Check API health
curl -s https://nk.2checkin.com/api/health | jq .
# Expected: { "status": "ok", "faceService": true|false, "db": "connected" }

# 4. Verify web build version
curl -s https://nk.2checkin.com/version.json | jq .
# Expected: { "version": "x.y.z", "buildTime": "..." }

# 5. Apply any pending DB migrations on VPS
for f in /opt/tgroup/api/migrations/*.sql; do
  docker exec -i tgroup-db psql -U postgres -d tdental_demo < "$f"
done
```

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
- `status: "ok"`
- `db: "connected"`
- `faceService: true|false` (optional; `false` is acceptable per INV-014)

### Database Connectivity
```bash
docker exec -i tgroup-db pg_isready -U postgres -d tdental_demo
```

### Face Service
```bash
curl http://localhost:8000/health
# or from API container:
curl $FACE_SERVICE_URL/health
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
- **Cause:** `face-service` container down or model download failed.
- **Fix:** `docker logs tgroup-face-service`; restart container. Check `FACE_SERVICE_URL` connectivity from API container.

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
