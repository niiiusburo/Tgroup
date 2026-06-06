# NK3 Performance Runbook (tmv.2checkin.com)

> Applied 2026-06-07. **NK3-only** — nk/nk2 untouched. Branch `nk3-perf-quickwins` (api code).
> Root cause: admin pages fan out 6–15 parallel XHRs; a single Node process with a default
> pg pool (10/DB) serialized them, and the delivery layer shipped everything uncompressed.

## What changed (4 layers)

### 1. DB connection pool — env-driven (`api/src/db.js`)
`createPool` now reads `DB_POOL_MAX` / `DB_POOL_MIN` / `DB_POOL_IDLE_MS` / `DB_POOL_CONN_TIMEOUT_MS`.
Default `max` stays 10 (pg default) so nk/nk2 are unchanged.

### 2. API clustering — opt-in (`api/src/server.js`)
`WEB_CONCURRENCY>1` forks N workers (capped at CPU count). Default 1 = current single process.
**Connection budget:** `workers × 2 pools (dental+cosmetic) × DB_POOL_MAX < postgres max_connections (100)`.

### 3. Permission cache (`api/src/services/permissionService.js`)
`requireAuth` resolves permissions on every request. Now memoized by `(employeeId, authLob)` as an
in-flight **promise** (TTL `PERM_CACHE_TTL_MS`, default 5000ms) so a page's concurrent `/me` calls
share one DB resolution. `PERM_CACHE_TTL_MS=0` disables. Tests clear it via `_clearPermissionCache()`.

### 4. Frontend (`website/src/components/shared/FeedbackWidget.tsx`)
Initial unread-count fetch deferred 1.5s off the critical path. **Not yet deployed** (needs a web rebuild).

## NK3 runtime settings — `/opt/tgroup-nk3/.env.nk3`
```
DB_POOL_MAX=10
WEB_CONCURRENCY=4        # 4 workers × 2 pools × 10 = 80 conns < 100
# PERM_CACHE_TTL_MS=5000 (default; omit unless tuning)
```
Apply: `cd /opt/tgroup-nk3 && COSMETIC_LOB_ENABLED=true docker compose -f runtime/docker-compose.nk3.yml up -d --force-recreate api`
Verify: `docker exec tgroup-nk3-api sh -c 'ps -eo pid,ppid,comm | grep node'` → 1 primary + 4 workers.

## Delivery layer — host nginx gzip (the biggest page-load win)
HTTP/2 and immutable `/assets/*` caching were already correct. **Compression was off**
(`gzip_proxied`/`gzip_types` commented out globally → proxied responses never compressed).
Fix is **server-scoped** inside `/etc/nginx/sites-enabled/tmv.2checkin.com` (NK3-only), in the `:443` block:
```nginx
    gzip on;
    gzip_proxied any;
    gzip_vary on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript application/x-javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
```
Apply: `nginx -t && nginx -s reload`. This is a **host** edit (not in repo) — re-apply if the host nginx is rebuilt.
Backup: `/opt/tgroup-nk3/app/.perf-bak/tmv.2checkin.com.bak`.

## Results (before → after)
| Metric | Before | After |
|---|---|---|
| Server concurrency (6 parallel, cosmetic/Companies) | 465ms | **27ms** (localhost) |
| `/api/Auth/me` server-side | 702ms | **5ms** |
| `/api/cosmetic/SaleOrders` server-side | 1346ms | **58ms** |
| JS bundle transfer | 565KB | **176KB** (gzip, −69%) |
| `/api/Permissions/employees` transfer | 186KB | **25KB** (gzip, −87%) |
| Page `/` (remote client) | 1914ms | **975ms** |
| Page `/services` | 2301ms | **1175ms** |

## Rollback
- API code: restore `/opt/tgroup-nk3/app/.perf-bak/{db,server,permissionService}.js.bak`, rebuild api.
- Clustering only: set `WEB_CONCURRENCY=1` in `.env.nk3`, `up -d --force-recreate api`.
- gzip: restore `tmv.2checkin.com.bak`, `nginx -t && nginx -s reload`.

## Durability note
`/opt/tgroup-nk3/app` is rsynced (not a git checkout). The api code changes are live but would be
reverted by a full re-rsync from a branch that lacks them — **merge `nk3-perf-quickwins` into the
deploy branch** to make them permanent. Env + host-nginx changes survive container rebuilds.

## Remaining (optional) levers
- Deploy the FeedbackWidget defer + lazy cosmetic-LOB fetching (web rebuild) to cut per-page XHR count.
- These mainly help high-RTT/remote clients; users near the VPS already get sub-second loads.
