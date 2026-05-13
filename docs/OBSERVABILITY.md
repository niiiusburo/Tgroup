# TGroup Clinic — Observability

> Log format, metric names, trace ID conventions, alert thresholds, dashboards.

## Log Format

### API Logs

All API logs are written to stdout/stderr and collected by Docker logging driver.

**Structured log shape (where implemented):**
```json
{
  "timestamp": "2026-05-13T10:00:00+07:00",
  "level": "error|warn|info",
  "service": "tgroup-api",
  "requestId": "uuid",
  "method": "POST",
  "path": "/api/Payments",
  "statusCode": 201,
  "durationMs": 45,
  "userId": "partner-uuid",
  "message": "Payment created",
  "meta": { "paymentId": "uuid", "amount": 500000 }
}
```

**Legacy log shape (most routes still use `console.error` / `console.log`):**
```
[2026-05-13T10:00:00+07:00] ERROR: requirePermission error: Error message
```

**Migration goal:** Move all routes to structured logging via `api/src/infrastructure/logging/logger.js`.

### Frontend Error Reporting

- **Production only:** `apiFetch` reports API errors to the AutoDebugger pipeline.
- **ErrorBoundary:** Catches React render errors and calls `POST /api/telemetry/errors`.
- **Shape:**
```json
{
  "errorMessage": "Cannot read properties of undefined",
  "stackTrace": "...",
  "browserInfo": "Mozilla/5.0 ...",
  "url": "https://nk.2checkin.com/calendar",
  "version": "0.27.27"
}
```

## Metric Names

| Metric | Type | Source | Description |
|---|---|---|---|
| `tgroup_api_request_duration_ms` | Histogram | API middleware | Request duration by route |
| `tgroup_api_request_total` | Counter | API middleware | Total requests by method, path, status |
| `tgroup_api_error_total` | Counter | API middleware | 5xx errors by route |
| `tgroup_db_query_duration_ms` | Histogram | `db.js` wrapper | SQL query duration |
| `tgroup_face_recognition_total` | Counter | Face service | Recognize attempts |
| `tgroup_face_match_rate` | Gauge | Face service | Match confidence distribution |
| `tgroup_export_duration_ms` | Histogram | Export routes | Excel generation time |
| `tgroup_export_size_bytes` | Histogram | Export routes | Download file size |
| `tgroup_telemetry_errors_total` | Counter | Telemetry route | Ingested error events |

**Note:** These metrics are aspirational. Current implementation relies on logs and manual inspection. Prometheus or similar metrics collection is not yet wired.

## Trace ID Conventions

- **Request ID:** Generated at API entry (not yet implemented globally). Target: UUIDv4 in `X-Request-ID` header.
- **Correlation:** Frontend → Backend trace correlation is not yet implemented.
- **Log search:** Use `requestId` field when structured logging is adopted.

## Alert Thresholds (Proposed)

| Condition | Threshold | Action |
|---|---|---|
| API 5xx rate > 5% in 5 min | > 5% | Page on-call |
| API p99 latency > 2s | > 2000ms | Investigate slow query |
| DB connection pool exhausted | pool.waitingCount > 0 | Scale or restart API |
| Face service down > 5 min | health = false | Warn (optional, INV-014) |
| Export timeout rate > 10% | > 10% | Check nginx timeout + query performance |
| Login failure rate > 20% | > 20% | Check rate limiter + credential issues |
| Disk usage > 85% | > 85% | Clean logs or expand volume |

**Current state:** Alerts are not automated. Thresholds are documented here for manual monitoring and future automation.

## Dashboards

### Manual Checks

```bash
# API health
curl -s https://nk.2checkin.com/api/health | jq .

# Recent 5xx errors (on VPS)
docker logs --since 1h tgroup-api 2>&1 | grep "ERROR"

# DB connection status
docker exec tgroup-db pg_isready -U postgres -d tdental_demo

# Container resource usage
docker stats --no-stream

# Nginx error log
docker exec tgroup-web cat /var/log/nginx/error.log | tail -n 50
```

### Log Aggregation

- **Local:** Docker Compose logs to local driver (`docker logs tgroup-api`).
- **Production:** VPS syslog / journald. No centralized log aggregation (ELK/Loki) is currently deployed.

## Health Endpoints

| Endpoint | Purpose | Expected |
|---|---|---|
| `GET /api/health` | API + DB + face service status | `{"status":"ok","db":"connected","faceService":true\|false}` |
| `GET /health` (face-service) | Face inference service | `{"status":"ok"}` |
| `GET /version.json` | Frontend build version | `{"version":"x.y.z","buildTime":"..."}` |

## Debugging Playbook

1. **User reports slowness:** Check `docker stats`; inspect slow query log if enabled; check export downloads in progress.
2. **Feature works local but not prod:** Compare `version.json`; check for unapplied migrations; verify env vars.
3. **Intermittent 403s:** Check `partners.tier_id` for affected employee; verify `resolveEffectivePermissions` consistency.
4. **Face recognition degraded:** Check `face-service` logs; verify model files present; test `/api/face/recognize` directly.
