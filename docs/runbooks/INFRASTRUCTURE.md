# INFRASTRUCTURE.md

> Infrastructure map for TGClinic.

## Runtime Components

- `nginx`: TLS termination, static web serving, `/api` proxy.
- `tgroup-web`: built Vite frontend.
- `tgroup-api`: Express API.
- `tgroup-db`: PostgreSQL 16 with `dbo` schema.
- Optional Compreface services for face recognition.
- External Hosoonline service for health-checkup images.

## Configuration

Real env files are local/prod secrets and must not be tracked. Use `.env.example` as the documented shape and keep real values in local/VPS secret storage.

Important env groups:

- PostgreSQL connection values.
- JWT secret.
- Google Places key.
- Compreface URL/API key.
- Hosoonline base URL, API key, username, password.
- Allowed origins / frontend URLs.

## Nginx

`nginx.conf` and `nginx.docker.conf` must stay aligned for API proxy behavior and upload/static paths.

Large exports may require longer proxy timeouts. If export behavior changes, verify nginx timeouts locally or on production after deploy.

## Docker

For compose-level changes:

```bash
docker compose config
bash -n scripts/deploy-tbot.sh
```

Do not mix infra changes with unrelated UI/API feature work in the same commit unless the infra change is required for that feature and documented.
