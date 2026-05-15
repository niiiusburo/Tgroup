# PORTS.md

> Local and production port map.

## Local Defaults

| Service | Default | Notes |
|---|---:|---|
| Website dev server | `5175` | Used by E2E scripts and local browser checks |
| API server | `3002` | `/api` routes in local development |
| PostgreSQL | project env dependent | Read from `.env` / Docker Compose |
| Playwright base URL | `http://localhost:5175` | Configured by E2E scripts |

## Production

| Surface | URL |
|---|---|
| Website/API through nginx | `https://nk.2checkin.com` |
| API path | `https://nk.2checkin.com/api` |

## Staging

| Surface | URL |
|---|---|
| Website/API through nginx | `https://nk2.2checkin.com` |
| API path | `https://nk2.2checkin.com/api` |

## Rules

- `check live` means production `nk.2checkin.com`.
- `check stage` means staging `nk2.2checkin.com`.
- `check local` means this local checkout on the user's computer.
- Before trusting a browser result, check which process owns the port.
- Do not claim local verification from a stale dev server.
- If a port changes, update E2E scripts/config, docs, and runbooks together.

Useful checks:

```bash
lsof -nP -iTCP:5175 -sTCP:LISTEN
lsof -nP -iTCP:3002 -sTCP:LISTEN
```
